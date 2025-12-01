-- ============================================
-- ADD MISSING COLUMNS TO SMART_DAR_SNAPSHOTS
-- Captures EXACT dashboard state for historical viewing
-- ============================================

-- Add completed tasks details (for Task Analysis section)
ALTER TABLE public.smart_dar_snapshots 
ADD COLUMN IF NOT EXISTS completed_tasks_details JSONB DEFAULT '[]';

COMMENT ON COLUMN public.smart_dar_snapshots.completed_tasks_details IS 
  'Array of completed task objects with full details for Task Analysis section: [{id, task_description, client_name, task_type, task_priority, task_intent, task_categories, task_enjoyment, goal_duration_minutes, accumulated_seconds, started_at, ended_at}]';

-- Add productivity data (for 9 metrics bar chart)
ALTER TABLE public.smart_dar_snapshots 
ADD COLUMN IF NOT EXISTS productivity_data JSONB DEFAULT '[]';

COMMENT ON COLUMN public.smart_dar_snapshots.productivity_data IS 
  'Array of productivity metrics for bar chart: [{name, value, description}]';

-- Ensure behavior_insights column exists (for Behavior Insights section)
ALTER TABLE public.smart_dar_snapshots 
ADD COLUMN IF NOT EXISTS behavior_insights JSONB DEFAULT '[]';

COMMENT ON COLUMN public.smart_dar_snapshots.behavior_insights IS 
  'Array of behavior insight objects: [{title, description, icon, type, color}]';
