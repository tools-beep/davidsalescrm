-- Comprehensive fix for eod_submissions table
-- Add ALL missing columns needed for the new EOD History feature

-- 1. Add total_active_seconds (for task hours calculation)
ALTER TABLE eod_submissions
ADD COLUMN IF NOT EXISTS total_active_seconds INTEGER DEFAULT 0;

-- 2. Add planned_shift_minutes (from clock-in modal)
ALTER TABLE eod_submissions
ADD COLUMN IF NOT EXISTS planned_shift_minutes INTEGER;

-- 3. Add daily_task_goal (from clock-in modal)
ALTER TABLE eod_submissions
ADD COLUMN IF NOT EXISTS daily_task_goal INTEGER;

-- 4. Add actual_hours (calculated shift duration)
ALTER TABLE eod_submissions
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC;

-- 5. Add rounded_hours (rounded shift duration)
ALTER TABLE eod_submissions
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN eod_submissions.total_active_seconds IS 'Total seconds spent on active tasks (sum of accumulated_seconds from completed tasks)';
COMMENT ON COLUMN eod_submissions.planned_shift_minutes IS 'Planned shift length in minutes (from clock-in modal)';
COMMENT ON COLUMN eod_submissions.daily_task_goal IS 'Planned number of tasks to complete (from clock-in modal)';
COMMENT ON COLUMN eod_submissions.actual_hours IS 'Actual shift duration in hours (clock-out - clock-in)';
COMMENT ON COLUMN eod_submissions.rounded_hours IS 'Rounded shift duration in hours';

-- Verify ALL columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'eod_submissions'
AND column_name IN (
  'total_active_seconds',
  'planned_shift_minutes',
  'daily_task_goal',
  'actual_hours',
  'rounded_hours'
)
ORDER BY column_name;

-- Show success message
SELECT 'SUCCESS: All EOD submission columns added!' AS status;

