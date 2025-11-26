-- Add shift goal columns to eod_submissions table
-- These columns store the planned shift length and daily task goal from the clock-in modal

ALTER TABLE eod_submissions
ADD COLUMN IF NOT EXISTS planned_shift_minutes INTEGER,
ADD COLUMN IF NOT EXISTS daily_task_goal INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN eod_submissions.planned_shift_minutes IS 'Planned shift length in minutes (from clock-in modal)';
COMMENT ON COLUMN eod_submissions.daily_task_goal IS 'Planned number of tasks to complete (from clock-in modal)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'eod_submissions'
AND column_name IN ('planned_shift_minutes', 'daily_task_goal');

