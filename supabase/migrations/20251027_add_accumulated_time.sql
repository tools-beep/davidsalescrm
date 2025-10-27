-- Add accumulated_seconds column to track time when pausing/resuming
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS accumulated_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN eod_time_entries.accumulated_seconds IS 'Accumulated time in seconds (used for pause/resume functionality)';

