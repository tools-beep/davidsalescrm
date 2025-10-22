-- ============================================
-- FIX MESSAGING RLS - RUN THIS NOW!
-- ============================================

-- 1. Fix conversation_participants RLS (this is causing the 406 error)
DROP POLICY IF EXISTS "allow_all_participants" ON public.conversation_participants;
CREATE POLICY "allow_all_participants" ON public.conversation_participants
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix conversations RLS
DROP POLICY IF EXISTS "allow_all_conversations" ON public.conversations;
CREATE POLICY "allow_all_conversations" ON public.conversations
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix messages RLS
DROP POLICY IF EXISTS "allow_all_messages" ON public.messages;
CREATE POLICY "allow_all_messages" ON public.messages
  FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Make sure user_profiles is readable
DROP POLICY IF EXISTS "view_all_profiles" ON public.user_profiles;
CREATE POLICY "view_all_profiles" ON public.user_profiles
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Done! Now refresh your browser and try messaging again.

