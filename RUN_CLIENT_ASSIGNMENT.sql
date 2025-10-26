-- =====================================================
-- CLIENT ASSIGNMENT FEATURE
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create table for user-client assignments
CREATE TABLE IF NOT EXISTS user_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(user_id, client_name)
);

-- Enable RLS
ALTER TABLE user_client_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admins can view all client assignments" ON user_client_assignments;
DROP POLICY IF EXISTS "Admins can insert client assignments" ON user_client_assignments;
DROP POLICY IF EXISTS "Admins can update client assignments" ON user_client_assignments;
DROP POLICY IF EXISTS "Admins can delete client assignments" ON user_client_assignments;
DROP POLICY IF EXISTS "Users can view their own client assignments" ON user_client_assignments;

-- Admin can view all assignments
CREATE POLICY "Admins can view all client assignments"
ON user_client_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Admin can insert assignments
CREATE POLICY "Admins can insert client assignments"
ON user_client_assignments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Admin can update assignments
CREATE POLICY "Admins can update client assignments"
ON user_client_assignments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Admin can delete assignments
CREATE POLICY "Admins can delete client assignments"
ON user_client_assignments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Users can view their own assignments
CREATE POLICY "Users can view their own client assignments"
ON user_client_assignments FOR SELECT
USING (user_id = auth.uid());

-- Create indexes for faster queries
DROP INDEX IF EXISTS idx_user_client_assignments_user_id;
DROP INDEX IF EXISTS idx_user_client_assignments_client_name;

CREATE INDEX idx_user_client_assignments_user_id ON user_client_assignments(user_id);
CREATE INDEX idx_user_client_assignments_client_name ON user_client_assignments(client_name);

-- =====================================================
-- DONE! 
-- =====================================================

