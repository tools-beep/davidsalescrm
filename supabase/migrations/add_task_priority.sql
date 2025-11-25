-- Add task_priority field to eod_time_entries table
-- This field tracks the urgency/priority level of each task

ALTER TABLE public.eod_time_entries 
ADD COLUMN IF NOT EXISTS task_priority TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.eod_time_entries.task_priority IS 'Task priority level: Immediate Impact Task, Daily Task, Weekly Task, Monthly Task, Evergreen Task, or Trigger Task';

-- Create index for better query performance on priority
CREATE INDEX IF NOT EXISTS idx_eod_time_entries_task_priority ON public.eod_time_entries(task_priority);

-- Note: This field is intentionally nullable to maintain backward compatibility
-- Existing tasks without priority will show as null
-- New tasks should have priority selected before completion


