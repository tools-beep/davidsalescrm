# 🔍 Debug Queries - Run These First!

Before we try to fix anything else, let's see what's actually in your database.

---

## Query 1: Check if tables exist

```sql
SELECT 
  tablename,
  schemaname
FROM pg_tables
WHERE tablename IN (
  'conversations',
  'conversation_participants',
  'messages',
  'eod_submissions',
  'eod_submission_tasks',
  'eod_submission_images',
  'user_profiles'
)
ORDER BY tablename;
```

**Expected Result:** Should show all 7 tables  
**If missing:** We need to run the migrations!

---

## Query 2: Check EOD Submissions

```sql
SELECT 
  COUNT(*) as total_submissions,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(submitted_at) as first_submission,
  MAX(submitted_at) as last_submission
FROM eod_submissions;
```

**This tells us:**
- How many EOD reports exist
- How many users have submitted
- Date range of submissions

**If returns 0:** No one has submitted EODs yet - that's why Admin shows "No reports"!

---

## Query 3: See actual EOD data

```sql
SELECT 
  id,
  user_id,
  submitted_at,
  total_hours,
  LEFT(summary, 50) as summary_preview
FROM eod_submissions
ORDER BY submitted_at DESC
LIMIT 10;
```

**This shows the actual submissions**

---

## Query 4: Check user profiles

```sql
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as with_first_name,
  COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email
FROM user_profiles;
```

**This tells us if user profiles exist**

---

## Query 5: Check conversations

```sql
SELECT 
  COUNT(*) as total_conversations
FROM conversations;
```

```sql
SELECT 
  COUNT(*) as total_participants
FROM conversation_participants;
```

**If both return 0:** No conversations created yet

---

## Query 6: Check RLS policies

```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('conversations', 'conversation_participants', 'messages')
ORDER BY tablename, policyname;
```

**This shows all RLS policies**

---

## Query 7: Test creating a conversation (as your current user)

```sql
-- Try to insert a conversation
INSERT INTO conversations DEFAULT VALUES
RETURNING *;
```

**If this works:** You get back an ID  
**If this fails:** Shows the exact error

---

## Query 8: Check if RPC function exists

```sql
SELECT 
  proname as function_name,
  prokind as kind,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'get_all_users_for_eod';
```

**Should return 1 row if function exists**

---

## Quick Diagnostic Steps

### For Messaging Issue:

1. Run Query 1 → Check tables exist
2. Run Query 5 → Check conversations count
3. Run Query 6 → Check RLS policies
4. Open browser console (F12) when you try to create chat
5. Look for console logs that start with "Starting conversation"

### For EOD Admin Issue:

1. Run Query 1 → Check tables exist
2. Run Query 2 → **THIS IS THE KEY ONE** - tells us if any EODs exist
3. Run Query 4 → Check user profiles
4. If Query 2 shows 0 submissions:
   - Go to EOD Portal as a regular user
   - Add some tasks
   - Click "Submit EOD"
   - Then check Admin again

---

## Most Likely Issues

### Issue 1: Tables don't exist
**Solution:** Run the migrations from `RUN_THIS_NOW.md`

### Issue 2: No EOD submissions yet
**Solution:** Submit at least one EOD as a user first

### Issue 3: RLS blocking everything
**Solution:** Check Query 6 output and compare to our migration

---

## Report Back Format

After running these queries, tell me:

1. **Query 1 result:** How many tables exist? (Should be 7)
2. **Query 2 result:** How many submissions? (This is the smoking gun!)
3. **Query 5 result:** How many conversations?
4. **Any errors?** Copy the exact error message

This will tell me EXACTLY what's wrong! 🎯

