-- Add RLS policy to allow admins to view all recurring task templates
-- This allows admins to monitor what templates users are creating

-- Drop existing view policy if it exists
DROP POLICY IF EXISTS "Users can view their own templates" ON public.recurring_task_templates;

-- Recreate the view policy to include admin access
CREATE POLICY "Users can view their own templates"
  ON public.recurring_task_templates
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add comment for documentation
COMMENT ON POLICY "Users can view their own templates" ON public.recurring_task_templates IS 
'Users can view their own templates. Admins can view all templates to monitor team activity.';

