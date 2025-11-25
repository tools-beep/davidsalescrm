-- Add new task settings and check-in fields to eod_time_entries table

-- Add task settings fields
ALTER TABLE eod_time_entries
ADD COLUMN IF NOT EXISTS task_type TEXT,
ADD COLUMN IF NOT EXISTS goal_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS task_intent TEXT,
ADD COLUMN IF NOT EXISTS task_categories TEXT[], -- Array of strings
ADD COLUMN IF NOT EXISTS task_enjoyment INTEGER; -- 1-5 rating

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_eod_time_entries_task_type ON eod_time_entries(task_type);
CREATE INDEX IF NOT EXISTS idx_eod_time_entries_task_categories ON eod_time_entries USING GIN(task_categories);

-- Add comments for documentation
COMMENT ON COLUMN eod_time_entries.task_type IS 'Type of task: Quick, Standard, Deep Work, Long, Very Long';
COMMENT ON COLUMN eod_time_entries.goal_duration_minutes IS 'User-set goal duration in minutes';
COMMENT ON COLUMN eod_time_entries.task_intent IS 'User intention: Complete the task, Make progress, etc.';
COMMENT ON COLUMN eod_time_entries.task_categories IS 'Array of task categories: Creative, Admin, Research, etc.';
COMMENT ON COLUMN eod_time_entries.task_enjoyment IS 'Post-task enjoyment rating (1-5): 1=Hated it, 5=Loved it';


