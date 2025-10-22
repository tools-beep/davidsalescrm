-- EOD Portal Improvements V2
-- 1. Add email field to time entries
-- 2. Add image attachments to comments
-- 3. Add shareable EOD reports

-- Add email field to eod_time_entries (for active tracking)
ALTER TABLE eod_time_entries
ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Add email field to eod_submission_tasks (for submitted reports)
ALTER TABLE eod_submission_tasks
ADD COLUMN IF NOT EXISTS client_email TEXT;

-- Create table for comment images
CREATE TABLE IF NOT EXISTS eod_task_comment_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES eod_submission_tasks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table for shareable EOD reports
CREATE TABLE IF NOT EXISTS eod_shareable_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES eod_submissions(id) ON DELETE CASCADE,
  share_token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0
);

-- Create table for EOD report shares (tracking who it was shared with)
CREATE TABLE IF NOT EXISTS eod_report_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shareable_report_id UUID REFERENCES eod_shareable_reports(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  group_id UUID REFERENCES group_chats(id),
  shared_at TIMESTAMPTZ DEFAULT NOW(),
  shared_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_comment_images_task ON eod_task_comment_images(task_id);
CREATE INDEX IF NOT EXISTS idx_shareable_reports_token ON eod_shareable_reports(share_token);
CREATE INDEX IF NOT EXISTS idx_shareable_reports_submission ON eod_shareable_reports(submission_id);
CREATE INDEX IF NOT EXISTS idx_report_shares_shareable ON eod_report_shares(shareable_report_id);

-- RLS Policies for comment images
ALTER TABLE eod_task_comment_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own comment images" ON eod_task_comment_images;
CREATE POLICY "Users can view their own comment images"
ON eod_task_comment_images FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM eod_submission_tasks t
    JOIN eod_submissions s ON t.submission_id = s.id
    WHERE t.id = eod_task_comment_images.task_id
    AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own comment images" ON eod_task_comment_images;
CREATE POLICY "Users can insert their own comment images"
ON eod_task_comment_images FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM eod_submission_tasks t
    JOIN eod_submissions s ON t.submission_id = s.id
    WHERE t.id = task_id
    AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own comment images" ON eod_task_comment_images;
CREATE POLICY "Users can delete their own comment images"
ON eod_task_comment_images FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM eod_submission_tasks t
    JOIN eod_submissions s ON t.submission_id = s.id
    WHERE t.id = eod_task_comment_images.task_id
    AND s.user_id = auth.uid()
  )
);

-- RLS Policies for shareable reports
ALTER TABLE eod_shareable_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own shareable reports" ON eod_shareable_reports;
CREATE POLICY "Users can view their own shareable reports"
ON eod_shareable_reports FOR SELECT
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can create shareable reports" ON eod_shareable_reports;
CREATE POLICY "Users can create shareable reports"
ON eod_shareable_reports FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can view shareable reports by token" ON eod_shareable_reports;
CREATE POLICY "Anyone can view shareable reports by token"
ON eod_shareable_reports FOR SELECT
USING (true);

-- RLS Policies for report shares
ALTER TABLE eod_report_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own report shares" ON eod_report_shares;
CREATE POLICY "Users can view their own report shares"
ON eod_report_shares FOR SELECT
USING (shared_by = auth.uid());

DROP POLICY IF EXISTS "Users can create report shares" ON eod_report_shares;
CREATE POLICY "Users can create report shares"
ON eod_report_shares FOR INSERT
WITH CHECK (shared_by = auth.uid());

-- Function to generate unique share token
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 12-character token
    token := encode(gen_random_bytes(9), 'base64');
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
    token := substring(token, 1, 12);
    
    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM eod_shareable_reports WHERE share_token = token) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$ LANGUAGE plpgsql;

