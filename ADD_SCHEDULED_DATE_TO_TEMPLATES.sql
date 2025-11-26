-- Add scheduled_date column to recurring_task_templates
-- This allows users to schedule when a template should auto-add to their queue

ALTER TABLE recurring_task_templates 
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

-- Add index for faster queries on scheduled_date
CREATE INDEX IF NOT EXISTS idx_recurring_task_templates_scheduled_date 
ON recurring_task_templates(scheduled_date);

-- Verify the column was added
SELECT 
  'scheduled_date column added successfully' AS status,
  COUNT(*) AS total_templates,
  COUNT(scheduled_date) AS templates_with_scheduled_date
FROM recurring_task_templates;

