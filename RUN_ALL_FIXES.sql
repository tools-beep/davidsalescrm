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
-- 3. ADD ACCUMULATED TIME FOR PAUSE/RESUME
-- ============================================

-- Add accumulated_seconds column to track time when pausing/resuming
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS accumulated_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN eod_time_entries.accumulated_seconds IS 'Accumulated time in seconds (used for pause/resume functionality)';

-- ============================================
-- 4. ADD SCREENSHOTS TO TASKS
-- ============================================

-- Add comment_images column to eod_submission_tasks to store screenshots per task
ALTER TABLE eod_submission_tasks 
ADD COLUMN IF NOT EXISTS comment_images TEXT[];

COMMENT ON COLUMN eod_submission_tasks.comment_images IS 'Array of image URLs (screenshots) attached to this task';

-- Also add status column if it doesn't exist
ALTER TABLE eod_submission_tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

COMMENT ON COLUMN eod_submission_tasks.status IS 'Task status: in_progress, completed, blocked, on_hold';

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

-- Verify accumulated_seconds column:
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'eod_time_entries' 
AND column_name = 'accumulated_seconds';

-- Verify eod_submission_tasks columns:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'eod_submission_tasks' 
AND column_name IN ('comment_images', 'status');

-- ============================================
-- 5. FIX CLIENT SUCCESS PIPELINE ASSIGNMENTS
-- ============================================

-- Assign deals with Client Success stages to the correct pipeline
UPDATE deals
SET pipeline_id = '00000000-0000-0000-0000-000000000002'
WHERE stage IN (
  'onboarding call booked',
  'onboarding call attended',
  'active client (operator)',
  'active client - project in progress',
  'paused client',
  'candidate replacement',
  'project rescope / expansion',
  'active client - project maintenance',
  'cancelled / completed'
)
AND (pipeline_id IS NULL OR pipeline_id != '00000000-0000-0000-0000-000000000002');

-- Fix deals that are in Client Success Pipeline but have wrong stage
-- (e.g., deals with "uncontacted" stage but in Client Success pipeline)
UPDATE deals
SET stage = 'onboarding call booked'
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
AND stage NOT IN (
  'onboarding call booked',
  'onboarding call attended',
  'active client (operator)',
  'active client - project in progress',
  'paused client',
  'candidate replacement',
  'project rescope / expansion',
  'active client - project maintenance',
  'cancelled / completed'
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
-- If no errors appeared above, all fixes have been applied successfully!
-- 
-- What's Fixed:
-- 1. ✅ Client assignment error (assigned_by column)
-- 2. ✅ Client timezone feature
-- 3. ✅ Missing deal stages (candidate interview booked/attended, deal won)
-- 4. ✅ Pause timer - duration stops when paused (accumulated_seconds)
-- 5. ✅ Screenshots in email reports per task (comment_images)
-- 6. ✅ Total time calculation uses clock-in/clock-out (not task sum)
-- 7. ✅ Client Success Pipeline - assigns deals to correct pipeline
-- 
-- Next steps:
-- 1. Deploy Edge Function: cd supabase/functions/send-eod-email && supabase functions deploy send-eod-email
-- 2. Deploy your frontend: npm run build
-- 3. Test all features!
-- ============================================

