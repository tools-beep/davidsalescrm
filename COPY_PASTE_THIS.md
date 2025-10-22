# 📋 Copy & Paste These 3 SQL Queries

## Instructions
1. Open Supabase Dashboard → SQL Editor
2. Copy each query below
3. Paste and click "Run"
4. Do all 3 in order

---

## Query 1: Messaging System (UPDATED - No More Errors!)

**This is now safe to run even if tables exist!**

Copy the **entire file**: `supabase/migrations/20251021030000_messaging_system.sql`

**Or run this quick check first:**
```sql
-- Check if messaging tables exist
SELECT 
  EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations') as conversations_exists,
  EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') as messages_exists;
```

If both return `false`, you need to run the full migration!

---

## Query 2: EOD Admin View

```sql
-- Create view for EOD admin
CREATE OR REPLACE VIEW public.eod_admin_overview AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(up.first_name || ' ' || up.last_name, u.email) as full_name,
  s.id as submission_id,
  s.submitted_at,
  s.clocked_in_at,
  s.clocked_out_at,
  s.total_hours,
  s.summary,
  s.email_sent,
  DATE(s.submitted_at) as submission_date
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.eod_submissions s ON u.id = s.user_id;

GRANT SELECT ON public.eod_admin_overview TO authenticated;
ALTER VIEW public.eod_admin_overview SET (security_invoker = true);
```

**Click "Run"** ✅

---

## Query 3: Get Users Function

```sql
-- Create function to get all users
CREATE OR REPLACE FUNCTION public.get_all_users_for_eod()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    COALESCE(
      NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''),
      u.email::TEXT,
      'Unknown User'
    ) as full_name
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON u.id = up.user_id
  WHERE u.deleted_at IS NULL
  ORDER BY u.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_users_for_eod() TO authenticated;
```

**Click "Run"** ✅

---

## ✅ Done!

After running all 3:
- Messaging will work ✅
- EOD Admin will show users ✅
- No more errors ✅

Test by:
1. Go to `/messages` → New Chat (should work!)
2. Go to Admin → EOD Reports (should see users!)

