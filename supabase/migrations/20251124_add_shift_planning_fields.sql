-- Migration: Add Shift Planning Fields to eod_clock_ins
-- Date: 2025-11-24
-- Purpose: Support new shift-based Utilization metric

-- Add planned_shift_minutes column (required for new Utilization calculation)
ALTER TABLE eod_clock_ins 
ADD COLUMN IF NOT EXISTS planned_shift_minutes INTEGER;

-- Add planned_tasks column (optional, used by Momentum metric)
ALTER TABLE eod_clock_ins 
ADD COLUMN IF NOT EXISTS planned_tasks INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN eod_clock_ins.planned_shift_minutes IS 
'User estimate of shift length at clock-in in minutes (e.g., 240 for 4 hours, 480 for 8 hours). Required for shift-based Utilization calculation.';

COMMENT ON COLUMN eod_clock_ins.planned_tasks IS 
'Optional: User estimate of number of tasks they plan to complete during this shift. Used by Momentum metric for daily goal bonus.';

-- Create index for performance (queries often filter by user_id and look up planned shift)
CREATE INDEX IF NOT EXISTS idx_clock_ins_user_planned_shift 
ON eod_clock_ins(user_id, planned_shift_minutes) 
WHERE planned_shift_minutes IS NOT NULL;

-- Add check constraint to ensure reasonable shift lengths (1-16 hours)
ALTER TABLE eod_clock_ins 
ADD CONSTRAINT check_planned_shift_reasonable 
CHECK (planned_shift_minutes IS NULL OR (planned_shift_minutes >= 60 AND planned_shift_minutes <= 960));

-- Add check constraint to ensure reasonable task counts (1-50 tasks)
ALTER TABLE eod_clock_ins 
ADD CONSTRAINT check_planned_tasks_reasonable 
CHECK (planned_tasks IS NULL OR (planned_tasks >= 1 AND planned_tasks <= 50));

-- Note: These columns are optional (nullable) to maintain backward compatibility
-- New clock-ins should require planned_shift_minutes, but old records can remain NULL

