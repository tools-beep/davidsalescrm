-- Add image_url column to messages table for direct message image attachments
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_url column to group_chat_messages table for group chat image attachments
ALTER TABLE group_chat_messages
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN messages.image_url IS 'URL to uploaded image attachment (stored in Supabase Storage)';
COMMENT ON COLUMN group_chat_messages.image_url IS 'URL to uploaded image attachment (stored in Supabase Storage)';

