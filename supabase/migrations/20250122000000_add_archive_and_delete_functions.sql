-- Add archived column to conversations
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add archived_at timestamp
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add archived_by to track who archived it
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Add deleted_at for soft delete on group chats
ALTER TABLE public.group_chats
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_by to track who deleted it
ALTER TABLE public.group_chats
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create index for archived conversations
CREATE INDEX IF NOT EXISTS idx_conversations_archived ON public.conversations(archived) WHERE archived = FALSE;

-- Create index for deleted group chats
CREATE INDEX IF NOT EXISTS idx_group_chats_deleted ON public.group_chats(deleted_at) WHERE deleted_at IS NULL;

-- Add unread_count column to conversation_participants for tracking unread messages
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Add last_read_at to track when user last read messages
ALTER TABLE public.conversation_participants
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- Function to mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(conversation_uuid UUID, user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.conversation_participants
  SET unread_count = 0,
      last_read_at = NOW()
  WHERE conversation_id = conversation_uuid
    AND user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment unread count
CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all participants except the sender
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment unread count on new message
DROP TRIGGER IF EXISTS trigger_increment_unread ON public.messages;
CREATE TRIGGER trigger_increment_unread
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_unread_count();

-- Add similar for group chats
ALTER TABLE public.group_chat_members
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

ALTER TABLE public.group_chat_members
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ DEFAULT NOW();

-- Function to mark group chat as read
CREATE OR REPLACE FUNCTION mark_group_chat_read(group_uuid UUID, user_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.group_chat_members
  SET unread_count = 0,
      last_read_at = NOW()
  WHERE group_id = group_uuid
    AND user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment group chat unread count
CREATE OR REPLACE FUNCTION increment_group_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment unread count for all members except the sender
  UPDATE public.group_chat_members
  SET unread_count = unread_count + 1
  WHERE group_id = NEW.group_id
    AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to increment group unread count on new message
DROP TRIGGER IF EXISTS trigger_increment_group_unread ON public.group_chat_messages;
CREATE TRIGGER trigger_increment_group_unread
  AFTER INSERT ON public.group_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION increment_group_unread_count();

