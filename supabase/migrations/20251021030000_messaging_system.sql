-- Messaging System Tables

-- Direct Message Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Participants (for 1-on-1 and group DMs)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Group Chats
CREATE TABLE IF NOT EXISTS public.group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Group Chat Members
CREATE TABLE IF NOT EXISTS public.group_chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,
  UNIQUE(group_id, user_id)
);

-- Group Chat Messages
CREATE TABLE IF NOT EXISTS public.group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_edited BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_user ON public.group_chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_members_group ON public.group_chat_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group ON public.group_chat_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender ON public.group_chat_messages(sender_id);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Conversations, Participants, and Messages
-- Using simple policies to avoid recursion and complexity
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "view_conversations" ON public.conversations;
DROP POLICY IF EXISTS "insert_conversations" ON public.conversations;
DROP POLICY IF EXISTS "allow_all_conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "view_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "insert_participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "allow_all_participants" ON public.conversation_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "view_messages" ON public.messages;
DROP POLICY IF EXISTS "insert_messages" ON public.messages;
DROP POLICY IF EXISTS "update_messages" ON public.messages;
DROP POLICY IF EXISTS "allow_all_messages" ON public.messages;

-- Simple policies: Just check if user is authenticated
CREATE POLICY "allow_all_conversations" ON public.conversations
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "allow_all_participants" ON public.conversation_participants
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "allow_all_messages" ON public.messages
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for Group Chats
DROP POLICY IF EXISTS "Users can view groups they're in" ON public.group_chats;
CREATE POLICY "Users can view groups they're in" ON public.group_chats
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM public.group_chat_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Any user can create groups" ON public.group_chats;
CREATE POLICY "Any user can create groups" ON public.group_chats
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Group admins can update groups" ON public.group_chats;
CREATE POLICY "Group admins can update groups" ON public.group_chats
  FOR UPDATE USING (
    id IN (
      SELECT group_id FROM public.group_chat_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for Group Chat Members
DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_chat_members;
CREATE POLICY "Users can view members of their groups" ON public.group_chat_members
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_chat_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group admins can add members" ON public.group_chat_members;
CREATE POLICY "Group admins can add members" ON public.group_chat_members
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_chat_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Group admins can remove members" ON public.group_chat_members;
CREATE POLICY "Group admins can remove members" ON public.group_chat_members
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM public.group_chat_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for Group Chat Messages
DROP POLICY IF EXISTS "Users can view messages in their groups" ON public.group_chat_messages;
CREATE POLICY "Users can view messages in their groups" ON public.group_chat_messages
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_chat_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Group members can send messages" ON public.group_chat_messages;
CREATE POLICY "Group members can send messages" ON public.group_chat_messages
  FOR INSERT WITH CHECK (
    group_id IN (
      SELECT group_id FROM public.group_chat_members
      WHERE user_id = auth.uid()
    ) AND sender_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own group messages" ON public.group_chat_messages;
CREATE POLICY "Users can update their own group messages" ON public.group_chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop triggers if they exist, then create them
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_chats_updated_at ON public.group_chats;
CREATE TRIGGER update_group_chats_updated_at BEFORE UPDATE ON public.group_chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_group_messages_updated_at ON public.group_chat_messages;
CREATE TRIGGER update_group_messages_updated_at BEFORE UPDATE ON public.group_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

