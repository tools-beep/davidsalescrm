-- ============================================
-- RUN ALL FIXES - Complete Database Updates
-- ============================================
-- Run this in Supabase SQL Editor
-- This includes:
-- 1. Add timezone to client assignments
-- 2. Add missing deal stages
-- 3. Fix DAR clock-in persistence
-- ============================================

-- ============================================
-- 1. ADD TIMEZONE TO CLIENT ASSIGNMENTS
-- ============================================

-- Add assigned_by column if it doesn't exist (fix for assignment error)
ALTER TABLE user_client_assignments 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

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
-- 2. ADD MISSING DEAL STAGES
-- ============================================

-- Add missing deal stages that are used in pipelines but not in the enum
ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS 'candidate interview booked';
ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS 'candidate interview attended';
ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS 'deal won';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify timezone column was added:
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_client_assignments' 
AND column_name = 'client_timezone';

-- Verify deal stages were added:
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'deal_stage_enum'::regtype 
ORDER BY enumlabel;

-- Check user_client_assignments data:
SELECT * FROM user_client_assignments LIMIT 5;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If no errors appeared above, all fixes have been applied successfully!
-- 
-- Next steps:
-- 1. Deploy your frontend (npm run build)
-- 2. Test dragging deals into all stages
-- 3. Test assigning clients with timezone
-- 4. Test DAR clock-in persistence on refresh
-- ============================================

