-- ============================================
-- FIX GROUP CHAT RLS POLICIES
-- ============================================

-- Drop all existing policies for group chat tables
DROP POLICY IF EXISTS "allow_all_group_chats" ON public.group_chats;
DROP POLICY IF EXISTS "allow_all_group_members" ON public.group_chat_members;
DROP POLICY IF EXISTS "allow_all_group_messages" ON public.group_chat_messages;

-- Create simple, non-recursive policies

-- 1. Group Chats - Allow authenticated users to do everything
CREATE POLICY "allow_all_group_chats" ON public.group_chats
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Group Chat Members - Allow authenticated users to do everything
CREATE POLICY "allow_all_group_members" ON public.group_chat_members
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Group Chat Messages - Allow authenticated users to do everything
CREATE POLICY "allow_all_group_messages" ON public.group_chat_messages
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('group_chats', 'group_chat_members', 'group_chat_messages')
ORDER BY tablename, policyname;

SELECT '✅ Group chat RLS policies fixed!' as result;

