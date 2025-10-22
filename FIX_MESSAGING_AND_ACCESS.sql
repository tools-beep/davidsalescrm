-- ============================================
-- FIX MESSAGING & USER ACCESS
-- ============================================

-- 1. Fix RLS for conversation_participants (allow reading)
DROP POLICY IF EXISTS "allow_all_participants" ON public.conversation_participants;
CREATE POLICY "allow_all_participants" ON public.conversation_participants
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix RLS for conversations (allow reading)
DROP POLICY IF EXISTS "allow_all_conversations" ON public.conversations;
CREATE POLICY "allow_all_conversations" ON public.conversations
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix RLS for messages (allow reading)
DROP POLICY IF EXISTS "allow_all_messages" ON public.messages;
CREATE POLICY "allow_all_messages" ON public.messages
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Fix RLS for group chats
DROP POLICY IF EXISTS "allow_all_group_chats" ON public.group_chats;
CREATE POLICY "allow_all_group_chats" ON public.group_chats
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow_all_group_members" ON public.group_chat_members;
CREATE POLICY "allow_all_group_members" ON public.group_chat_members
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "allow_all_group_messages" ON public.group_chat_messages;
CREATE POLICY "allow_all_group_messages" ON public.group_chat_messages
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Ensure user_profiles has proper RLS for reading
DROP POLICY IF EXISTS "view_all_profiles" ON public.user_profiles;
CREATE POLICY "view_all_profiles" ON public.user_profiles
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- 6. Set correct user roles (update as needed)
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'lukejason05@gmail.com';

UPDATE public.user_profiles 
SET role = 'user' 
WHERE email = 'pintermax0710@gmail.com';

-- 7. Verify the changes
SELECT 
  email,
  role,
  first_name,
  last_name
FROM public.user_profiles
ORDER BY role DESC, email;

-- Done! ✅

