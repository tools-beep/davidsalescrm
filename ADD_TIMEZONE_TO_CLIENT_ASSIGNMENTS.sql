-- ============================================
-- ADD TIMEZONE TO CLIENT ASSIGNMENTS
-- ============================================
-- Run this in Supabase SQL Editor
-- This adds timezone support to client assignments
-- ============================================

-- Add timezone column to user_client_assignments table
ALTER TABLE user_client_assignments 
ADD COLUMN IF NOT EXISTS client_timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add comment for documentation
COMMENT ON COLUMN user_client_assignments.client_timezone IS 'Timezone for the client (e.g., America/Los_Angeles, America/New_York)';

-- Update existing records to have default timezone if null
UPDATE user_client_assignments
SET client_timezone = 'America/Los_Angeles'
WHERE client_timezone IS NULL;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify the column was added:
-- SELECT * FROM user_client_assignments LIMIT 5;

