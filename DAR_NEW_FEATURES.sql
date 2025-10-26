-- Add new columns to eod_time_entries table for DAR portal enhancements
-- Run this in Supabase SQL Editor

-- 1. Add status column (if not already added)
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress';

-- 2. Add client_timezone column
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS client_timezone TEXT DEFAULT 'America/Los_Angeles';

-- 3. Add paused_at column for pause/resume functionality
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add comments to explain the columns
COMMENT ON COLUMN eod_time_entries.status IS 'Task status: in_progress, completed, blocked, on_hold';
COMMENT ON COLUMN eod_time_entries.client_timezone IS 'Client timezone for time tracking adjustments';
COMMENT ON COLUMN eod_time_entries.paused_at IS 'Timestamp when task was paused (NULL if not paused)';

-- Create index for paused tasks queries
CREATE INDEX IF NOT EXISTS idx_eod_time_entries_paused 
ON eod_time_entries(user_id, paused_at) 
WHERE paused_at IS NOT NULL;

-- Create index for active tasks queries
CREATE INDEX IF NOT EXISTS idx_eod_time_entries_active 
ON eod_time_entries(user_id, ended_at) 
WHERE ended_at IS NULL;

