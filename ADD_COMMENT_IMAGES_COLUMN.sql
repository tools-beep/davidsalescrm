-- Add comment_images column to eod_time_entries table

ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS comment_images TEXT[];

-- Add comment to explain the column
COMMENT ON COLUMN eod_time_entries.comment_images IS 'Array of image URLs uploaded during task execution (screenshots)';

-- Create index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_eod_time_entries_has_images 
ON eod_time_entries((comment_images IS NOT NULL AND array_length(comment_images, 1) > 0));

