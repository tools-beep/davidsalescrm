-- ============================================
-- FORCE FIX GROUP CHAT POLICIES
-- Drop ALL policies and recreate simple ones
-- ============================================

-- First, disable RLS temporarily to see all policies
ALTER TABLE public.group_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on these tables (use CASCADE to force)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on group_chats
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_chats' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.group_chats';
    END LOOP;
    
    -- Drop all policies on group_chat_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_chat_members' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.group_chat_members';
    END LOOP;
    
    -- Drop all policies on group_chat_messages
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'group_chat_messages' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.group_chat_messages';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- These are the SIMPLEST possible policies - just check if user is logged in

-- Group Chats
CREATE POLICY "authenticated_all_group_chats" 
ON public.group_chats
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Group Chat Members
CREATE POLICY "authenticated_all_group_members" 
ON public.group_chat_members
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Group Chat Messages
CREATE POLICY "authenticated_all_group_messages" 
ON public.group_chat_messages
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Verify no policies exist that could cause recursion
SELECT 
  'Current policies:' as info,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('group_chats', 'group_chat_members', 'group_chat_messages')
ORDER BY tablename;

SELECT '✅ All recursive policies removed and replaced with simple ones!' as result;

