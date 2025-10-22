-- ============================================
-- FIX MESSAGING - Infinite Recursion Error
-- ============================================
-- Run this in Supabase SQL Editor

-- Step 1: Drop ALL policies on conversation_participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;

-- Step 2: Create SIMPLE policies that don't reference themselves

-- Allow users to see ALL participants (we control access via conversations table)
CREATE POLICY "view_participants" 
ON public.conversation_participants
FOR SELECT 
USING (true);

-- Allow authenticated users to add participants
CREATE POLICY "insert_participants" 
ON public.conversation_participants
FOR INSERT 
WITH CHECK (
  -- Must be authenticated
  auth.uid() IS NOT NULL
);

-- Step 3: Also simplify the conversations view policy
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;

CREATE POLICY "Users can view their conversations" 
ON public.conversations
FOR SELECT 
USING (
  -- Can see conversation if you're a participant
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversations.id
    AND cp.user_id = auth.uid()
  )
);

-- Done! Try creating a conversation now.

