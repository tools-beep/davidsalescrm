-- Create feedback table
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  images TEXT[], -- Array of image URLs
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  admin_response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Enable RLS
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view own feedback"
  ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own feedback
CREATE POLICY "Users can create feedback"
  ON user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
  ON user_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Policy: Admins can update feedback
CREATE POLICY "Admins can update feedback"
  ON user_feedback
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON TABLE user_feedback IS 'User feedback and bug reports with image attachments';
COMMENT ON COLUMN user_feedback.images IS 'Array of image URLs uploaded to Supabase storage';
COMMENT ON COLUMN user_feedback.status IS 'Feedback status: new, in_progress, resolved, closed';

