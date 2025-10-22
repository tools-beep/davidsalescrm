-- ============================================
-- COPY THIS ENTIRE FILE AND RUN IN SUPABASE
-- ============================================

-- Fix ALL messaging policies

-- 1. Fix CONVERSATIONS table policies
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "view_conversations" ON public.conversations;
DROP POLICY IF EXISTS "insert_conversations" ON public.conversations;

-- Allow viewing conversations you're part of
CREATE POLICY "view_conversations" 
ON public.conversations
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- Allow ANY authenticated user to create conversations
CREATE POLICY "insert_conversations" 
ON public.conversations
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. Fix CONVERSATION_PARTICIPANTS table policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "view_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "insert_participants" ON public.conversation_participants;

-- Allow viewing all participants
CREATE POLICY "view_participants" 
ON public.conversation_participants
FOR SELECT 
USING (true);

-- Allow authenticated users to add participants
CREATE POLICY "insert_participants" 
ON public.conversation_participants
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix MESSAGES table policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "view_messages" ON public.messages;
DROP POLICY IF EXISTS "insert_messages" ON public.messages;

-- Allow viewing messages in conversations you're part of
CREATE POLICY "view_messages" 
ON public.messages
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Allow sending messages to conversations you're part of
CREATE POLICY "insert_messages" 
ON public.messages
FOR INSERT 
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Done! Now try creating a conversation.

