# EOD Submission Diagnostic Guide

## 🚨 Issue: Some Users Not Getting EOD Submission Records

### Root Causes Identified:

Based on code analysis, here are the potential failure points:

---

## **Critical Failure Points**

### 1. **RLS Policy Mismatch** ⚠️ (MOST LIKELY)

**Location:** `supabase/migrations/20251021010000_eod_improvements.sql` line 78-80

```sql
CREATE POLICY "Users can insert own submissions"
  ON public.eod_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**The Problem:**
The policy checks if `auth.uid()` (authenticated user) matches `user_id` in the insert.

**Code:** `src/pages/EODPortal.tsx` line 4022-4031
```typescript
const { data: submission, error: submissionError } = await supabase
  .from('eod_submissions')
  .insert([{
    user_id: user.id,  // ❌ This might not match auth.uid()
    ...
  }])
```

**Why It Fails:**
- If `user.id` is not set or wrong, RLS blocks the insert
- If user auth session expired, `auth.uid()` returns null
- If user has multiple auth sessions, IDs might mismatch

---

### 2. **User Not Set** ⚠️

**Code:** `src/pages/EODPortal.tsx` line 923
```typescript
const [user, setUser] = useState<any>(null);
```

**Set at:** Line 1848 in `checkAuth()` function
```typescript
const { data: { user: authUser } } = await supabase.auth.getUser();
if (!authUser) {
  navigate('/login');
  return;
}
setUser(authUser);
```

**Why It Fails:**
- If `checkAuth()` hasn't run yet (race condition)
- If auth session expired during the day
- If user refreshes page and auth check is slow
- User tries to submit before `checkAuth()` completes

---

### 3. **Missing Required Columns** ⚠️

**Columns being inserted:** (line 4022-4031)
- `user_id` ✅
- `report_id` ✅  
- `clocked_in_at` ✅
- `clocked_out_at` ✅
- `total_hours` ✅
- `total_active_seconds` ✅
- `planned_shift_minutes` ✅
- `daily_task_goal` ✅

**Missing columns that might be required:**
- `summary` - Not included but has default NULL
- `actual_hours` - Added in later migration, might not have default
- `rounded_hours` - Added in later migration, might not have default

---

### 4. **Silent Error Handling** ⚠️

**Code:** Line 4035
```typescript
if (submissionError) throw submissionError;
```

But the error gets caught at line 4543 and only shows to user:
```typescript
} catch (e: any) {
  toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
}
```

**Problem:** Error doesn't get logged to database or sent to admin

---

## **Diagnostic Steps**

### Step 1: Check Database RLS

Run this query in Supabase SQL Editor:

```sql
-- Check if eod_submissions table has RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'eod_submissions';

-- List all policies on eod_submissions
SELECT * FROM pg_policies 
WHERE tablename = 'eod_submissions';
```

### Step 2: Check User IDs Match

Add this logging before the insert (line 4019):

```typescript
console.log('=== EOD SUBMISSION DEBUG ===');
console.log('user object:', user);
console.log('user.id:', user?.id);

const { data: { user: currentAuthUser } } = await supabase.auth.getUser();
console.log('auth.getUser() result:', currentAuthUser);
console.log('currentAuthUser.id:', currentAuthUser?.id);
console.log('IDs match?:', user?.id === currentAuthUser?.id);
```

### Step 3: Add Error Logging

Replace line 4035 with detailed logging:

```typescript
if (submissionError) {
  console.error('=== SUBMISSION ERROR ===');
  console.error('Error code:', submissionError.code);
  console.error('Error message:', submissionError.message);
  console.error('Error details:', submissionError.details);
  console.error('Error hint:', submissionError.hint);
  console.error('User ID:', user?.id);
  console.error('Report ID:', reportId);
  
  // Log to database for admin review
  await supabase.from('error_logs').insert({
    user_id: user?.id,
    error_type: 'eod_submission_failed',
    error_message: submissionError.message,
    error_details: JSON.stringify(submissionError),
    timestamp: new Date().toISOString()
  });
  
  throw submissionError;
}
```

### Step 4: Test with Different Users

1. **Test User A** (working):
   - Submit EOD
   - Check console for user ID
   - Check `eod_submissions` table for record

2. **Test User B** (not working):
   - Submit EOD
   - Check console for user ID
   - Check for any errors
   - Compare IDs with User A

### Step 5: Check Auth Session

Add this check before submission (line 3960):

```typescript
setLoading(true);
try {
  // ✅ Verify auth session is still valid
  const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !currentUser) {
    toast({ 
      title: 'Session expired', 
      description: 'Please log in again', 
      variant: 'destructive' 
    });
    navigate('/login');
    return;
  }
  
  // ✅ Refresh user state if needed
  if (currentUser.id !== user?.id) {
    console.warn('User ID mismatch detected, refreshing...');
    setUser(currentUser);
  }
  
  // Continue with rest of submission...
```

---

## **Quick Fixes**

### Fix 1: Use Fresh Auth User (RECOMMENDED)

Replace line 4022 with:

```typescript
// ✅ Get fresh auth user instead of using state
const { data: { user: freshUser } } = await supabase.auth.getUser();

if (!freshUser) {
  throw new Error('Not authenticated');
}

const { data: submission, error: submissionError } = await supabase
  .from('eod_submissions')
  .insert([{
    user_id: freshUser.id,  // ✅ Use fresh auth user
    report_id: reportId,
    clocked_in_at: earliestClockIn,
    clocked_out_at: latestClockOut || new Date().toISOString(),
    total_hours: totalHours,
    total_active_seconds: totalActiveSeconds,
    planned_shift_minutes: clockInRecord?.planned_shift_minutes || null,
    daily_task_goal: clockInRecord?.daily_task_goal || null,
  }])
  .select('*')
  .single();
```

### Fix 2: Add Missing Columns

Update the insert to include all columns:

```typescript
.insert([{
  user_id: user.id,
  report_id: reportId,
  clocked_in_at: earliestClockIn,
  clocked_out_at: latestClockOut || new Date().toISOString(),
  total_hours: totalHours,
  total_active_seconds: totalActiveSeconds,
  planned_shift_minutes: clockInRecord?.planned_shift_minutes || null,
  daily_task_goal: clockInRecord?.daily_task_goal || null,
  summary: null,  // ✅ Add explicitly
  actual_hours: null,  // ✅ Add explicitly
  rounded_hours: null,  // ✅ Add explicitly
}])
```

### Fix 3: Add Service Role Fallback

If RLS is blocking legitimate submissions, add a service role fallback:

```typescript
// Try regular insert first
let submission, submissionError;

({ data: submission, error: submissionError } = await supabase
  .from('eod_submissions')
  .insert([{ ... }])
  .select('*')
  .single());

// If RLS blocked it, try with service role
if (submissionError && submissionError.code === '42501') {  // Permission denied
  console.warn('RLS blocked insert, trying service role...');
  
  // Call Edge Function with service role
  const { data, error } = await supabase.functions.invoke('create-eod-submission', {
    body: {
      user_id: user.id,
      report_id: reportId,
      // ... all other fields
    }
  });
  
  if (error) throw error;
  submission = data;
}
```

---

## **Monitoring Solution**

### Create Error Logging Table

```sql
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  error_type TEXT NOT NULL,
  error_message TEXT,
  error_details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
```

### Add to Submission Error Handler

```typescript
} catch (e: any) {
  // Log error to database
  await supabase.from('error_logs').insert({
    user_id: user?.id,
    error_type: 'eod_submission_failed',
    error_message: e.message,
    error_details: {
      reportId,
      hasUser: !!user,
      userId: user?.id,
      stack: e.stack
    }
  });
  
  toast({ 
    title: 'Failed to submit', 
    description: e.message, 
    variant: 'destructive' 
  });
}
```

---

## **Next Steps**

1. ✅ Add diagnostic logging (Step 2)
2. ✅ Implement Fix 1 (use fresh auth user)
3. ✅ Test with affected users
4. ✅ Set up error logging table
5. ✅ Monitor for 24-48 hours
6. ✅ Review error logs for patterns

---

## **Expected Outcome**

After implementing Fix 1 + Error Logging:
- All submissions should work regardless of auth session timing
- Any failures will be logged to `error_logs` table
- Admin can query `error_logs` to see which users are affected
- Console logs will show exact point of failure

---

## **Contact Point**

If issue persists after fixes:
1. Check `error_logs` table in Supabase
2. Run diagnostic queries in Step 1
3. Share console logs from affected users
4. Verify RLS policies are correct


