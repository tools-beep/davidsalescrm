-- ============================================================================
-- ADD DAILY_TASK_GOAL COLUMN TO EOD_CLOCK_INS
-- ============================================================================
-- This column is REQUIRED for the Clock-In modal to work properly
-- It stores the user's daily task goal for metrics calculations
-- ============================================================================

-- Add daily_task_goal column
ALTER TABLE eod_clock_ins 
ADD COLUMN IF NOT EXISTS daily_task_goal INTEGER;

-- Add comment
COMMENT ON COLUMN eod_clock_ins.daily_task_goal IS 
'User-estimated number of tasks they plan to complete during this shift (for Daily Goal metric and Momentum)';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_clock_ins_daily_goal 
ON eod_clock_ins(user_id, daily_task_goal) 
WHERE daily_task_goal IS NOT NULL;

-- Add constraint (1-50 tasks is realistic)
ALTER TABLE eod_clock_ins 
DROP CONSTRAINT IF EXISTS check_daily_task_goal_range;

ALTER TABLE eod_clock_ins 
ADD CONSTRAINT check_daily_task_goal_range 
CHECK (daily_task_goal IS NULL OR (daily_task_goal >= 1 AND daily_task_goal <= 50));

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
-- Run this to verify the column was added:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'eod_clock_ins' AND column_name = 'daily_task_goal';
-- ============================================================================

