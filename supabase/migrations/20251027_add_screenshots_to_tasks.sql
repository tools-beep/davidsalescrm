-- Add comment_images column to eod_submission_tasks to store screenshots per task
ALTER TABLE eod_submission_tasks 
ADD COLUMN IF NOT EXISTS comment_images TEXT[];

COMMENT ON COLUMN eod_submission_tasks.comment_images IS 'Array of image URLs (screenshots) attached to this task';

-- Also add status column if it doesn't exist
ALTER TABLE eod_submission_tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed';

COMMENT ON COLUMN eod_submission_tasks.status IS 'Task status: in_progress, completed, blocked, on_hold';

