# 🎯 RUN THIS NOW - 3 Queries

Copy each query below into Supabase SQL Editor and click "Run"

---

## Query 1: Messaging System (Fixed!)

**Copy the entire file:**  
`supabase/migrations/20251021030000_messaging_system.sql`

Or if you prefer, just run this quick fix:

```sql
-- Fix the RLS policy that was causing 500 errors
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;

CREATE POLICY "Users can add participants to their conversations" 
ON public.conversation_participants
FOR INSERT WITH CHECK (true);
```

✅ **Click "Run"**

---

## Query 2: EOD Admin View

```sql
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
```

✅ **Click "Run"**

---

## Query 3: Get Users Function

```sql
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

✅ **Click "Run"**

---

## Done! 🎉

Now test:
1. **/messages** → New Chat (should work!)
2. **Admin → EOD Reports** (should show data!)
3. **Deals page** (no more warnings!)

All fixed! 🚀

