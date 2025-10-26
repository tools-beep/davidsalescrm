-- Add status column to eod_time_entries table
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';

-- Add comment to explain the column
COMMENT ON COLUMN eod_time_entries.status IS 'Task status: in_progress, completed, blocked, on_hold';

