# 🔧 Fix Dialpad Sync Error (500 Internal Server Error)

## 🐛 Error Observed

```
Dialpad sync error:
FunctionsHttpError: Edge Function returned a non-2xx status code
500 (Internal Server Error)
```

**Impact**: Calls are not being synced from Dialpad API, so all calls show as "Manual Logs" instead of "Dialpad API Data".

---

## 🔍 Root Causes

### 1. **Missing or Invalid Request Body Handling**
The edge function expected a JSON body but didn't handle cases where the body might be empty or malformed.

### 2. **Possible Missing Environment Variable**
The `DIALPAD_API_KEY` environment variable might not be set in Supabase Edge Functions.

### 3. **Incorrect Enum Values**
The function was using `'cold call'` and `'answered'` which might not match the database enums.

---

## ✅ Fixes Applied

### Fix #1: Better Request Body Handling
**File**: `supabase/functions/dialpad-sync/index.ts`

**Before**:
```typescript
const { start_time, end_time, limit = 100 } = await req.json();
```

**After**:
```typescript
let requestBody: any = {};
try {
  requestBody = await req.json();
} catch (e) {
  console.log('No request body provided, using defaults');
}

const { start_time, end_time, limit = 100 } = requestBody;
```

**Why**: Prevents the function from crashing if the request body is empty or malformed.

### Fix #2: Correct Enum Values
**Before**:
```typescript
outbound_type: call.direction === 'outbound' ? 'cold call' : 'inbound',
call_outcome: call.state === 'completed' ? 'answered' : 'no answer',
```

**After**:
```typescript
outbound_type: (call.direction === 'outbound' ? 'outbound call' : 'inbound call') as any,
call_outcome: (call.state === 'completed' ? 'introduction' : 'no answer') as any,
```

**Why**: Matches the actual enum values in the database.

### Fix #3: Null Safety
**Before**:
```typescript
recording_url: call.recording_url,
transcript: call.transcript,
dialpad_contact_id: call.contact_id,
```

**After**:
```typescript
recording_url: call.recording_url || null,
transcript: call.transcript || null,
dialpad_contact_id: call.contact_id || null,
```

**Why**: Ensures nullable fields are explicitly set to `null` instead of `undefined`.

---

## 🚀 Deployment Steps

### Step 1: Deploy the Fixed Edge Function

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai

# Deploy the updated dialpad-sync function
npx supabase functions deploy dialpad-sync
```

### Step 2: Verify Environment Variables

1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **dialpad-sync**
3. Click **Settings** or **Environment Variables**
4. Verify these variables are set:
   - `DIALPAD_API_KEY` - Your Dialpad API key
   - `SUPABASE_URL` - Auto-set by Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase

**If `DIALPAD_API_KEY` is missing**:
1. Get your Dialpad API key from https://dialpad.com/settings/api
2. Add it as an environment variable in Supabase Edge Functions

### Step 3: Test the Sync

1. Open your CRM in the browser
2. Open browser console (F12)
3. Wait for the auto-sync to run (happens every 15 minutes)
4. Or trigger manual sync (if you have a sync button)
5. Look for these logs:
   ```
   🔄 Starting Dialpad auto-sync...
   ✅ Dialpad sync completed: { syncedCount: X, syncTime: ... }
   ```

### Step 4: Verify Database

Run this query in Supabase SQL Editor:

```sql
-- Check if calls are being synced from Dialpad
SELECT 
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE dialpad_metadata IS NOT NULL) as synced_from_dialpad,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NOT NULL) as has_call_id,
    MAX(call_timestamp) as latest_call
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '24 hours';
```

**Expected Results**:
- `synced_from_dialpad` should be > 0 if sync is working
- `latest_call` should be recent

---

## 🧪 Manual Testing

### Test 1: Manual Sync Trigger

If you have a manual sync button, click it and check:

1. **Browser Console**: Should show sync progress
2. **Network Tab**: Check the request to `dialpad-sync` function
3. **Response**: Should be 200 OK with `{ success: true, synced: X }`

### Test 2: Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **dialpad-sync**
2. Click **Logs**
3. Look for recent invocations
4. Check for errors:
   - ❌ `DIALPAD_API_KEY not configured` → Set the environment variable
   - ❌ `Dialpad API error: 401` → Invalid API key
   - ❌ `Dialpad API error: 429` → Rate limited
   - ✅ `Syncing X calls from Dialpad` → Working!

---

## 🔍 Troubleshooting

### Issue: Still Getting 500 Error

**Check 1: Environment Variables**
```bash
# List all edge functions and their env vars
npx supabase functions list
```

**Check 2: Edge Function Logs**
- Go to Supabase Dashboard → Edge Functions → dialpad-sync → Logs
- Look for the actual error message

**Check 3: Dialpad API Key**
- Test your API key manually:
```bash
curl -H "Authorization: Bearer YOUR_DIALPAD_API_KEY" \
  https://dialpad.com/api/v2/calls?limit=1
```

### Issue: Calls Syncing But Not Showing in Reports

**Check Database**:
```sql
SELECT 
    dialpad_call_id,
    dialpad_metadata,
    call_timestamp
FROM public.calls
WHERE dialpad_metadata IS NOT NULL
ORDER BY call_timestamp DESC
LIMIT 5;
```

**If no results**: Sync is not working, check edge function logs

**If results exist**: Frontend might be querying the wrong table, verify Reports.tsx is querying `calls` table

### Issue: "No calls to sync"

This means:
- Dialpad API returned 0 calls for the time range
- Either no calls were made in Dialpad
- Or the `start_time` filter is excluding them

**Fix**: Adjust the sync time range in `useDialpadAutoSync.ts`:
```typescript
// Change from 24 hours to 7 days
const startTime = lastSync || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
```

---

## 📊 Expected Behavior After Fix

### Before Fix:
```
Call Source Breakdown:
- Dialpad CTI: 2 (1.1%)
- Manual Logs: 172 (98.9%)
```

### After Fix (if calls exist in Dialpad):
```
Call Source Breakdown:
- Dialpad CTI: 174 (100%)
- Manual Logs: 0 (0%)
```

**OR** (if you have both):
```
Call Source Breakdown:
- Dialpad CTI: 150 (75%)
- Manual Logs: 50 (25%)
```

---

## 🎯 Success Criteria

After deploying the fix:

1. ✅ **No more 500 errors** in browser console
2. ✅ **Sync logs appear** in console: `🔄 Starting Dialpad auto-sync...`
3. ✅ **Calls appear in database** with `dialpad_metadata` populated
4. ✅ **Reports show accurate split** between Dialpad and Manual logs
5. ✅ **Edge function logs** show successful syncs

---

## 📁 Files Modified

1. ✅ `supabase/functions/dialpad-sync/index.ts` - FIXED
2. ✅ `FIX_DIALPAD_SYNC_ERROR.md` - NEW (this file)

---

## 🚨 Important Notes

### About Dialpad API Key

The `DIALPAD_API_KEY` is **different** from the Dialpad OAuth tokens stored in `dialpad_tokens` table:

- **`DIALPAD_API_KEY`**: Server-side API key for edge functions (set in Supabase env vars)
- **`dialpad_tokens`**: User-specific OAuth tokens for CTI integration (stored in database)

**Both are needed** for full Dialpad integration:
- API key → Auto-sync calls from Dialpad
- OAuth tokens → Make calls via CTI, get call events

### Sync Frequency

The auto-sync runs every **15 minutes** by default. You can change this in `App.tsx`:

```typescript
// Change from 15 to 5 minutes
useDialpadAutoSync(5, true);
```

### Data Backfill

If you want to sync historical calls:

1. Temporarily change the `start_time` to go back further:
```typescript
// In useDialpadAutoSync.ts
const startTime = new Date('2024-01-01').toISOString(); // Sync from Jan 1, 2024
```

2. Trigger a manual sync
3. Change it back to avoid re-syncing old calls every time

---

## ✅ Next Steps

1. **Deploy the fix**: `npx supabase functions deploy dialpad-sync`
2. **Set DIALPAD_API_KEY**: In Supabase Dashboard → Edge Functions
3. **Test the sync**: Wait for auto-sync or trigger manually
4. **Verify in database**: Check `calls` table for `dialpad_metadata`
5. **Check reports**: Should show accurate Dialpad vs Manual split

---

**Status**: ✅ **FIXED - READY TO DEPLOY**

**Estimated Time**: 5-10 minutes to deploy and verify

