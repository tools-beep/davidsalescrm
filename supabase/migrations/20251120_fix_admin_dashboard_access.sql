-- 🐛 FIX: Add admin bypass policies for dashboard access
-- This allows admins to view all users' data in the Smart DAR Dashboard

-- Add admin SELECT policy for eod_time_entries
DROP POLICY IF EXISTS "Admins can view all time entries" ON public.eod_time_entries;
CREATE POLICY "Admins can view all time entries" ON public.eod_time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add admin SELECT policy for mood_entries
DROP POLICY IF EXISTS "Admins can view all mood entries" ON public.mood_entries;
CREATE POLICY "Admins can view all mood entries" ON public.mood_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add admin SELECT policy for energy_entries
DROP POLICY IF EXISTS "Admins can view all energy entries" ON public.energy_entries
;
CREATE POLICY "Admins can view all energy entries" ON public.energy_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add admin SELECT policy for eod_clock_ins
DROP POLICY IF EXISTS "Admins can view all clock-ins" ON public.eod_clock_ins;
CREATE POLICY "Admins can view all clock-ins" ON public.eod_clock_ins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add admin SELECT policy for eod_submissions
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.eod_submissions;
CREATE POLICY "Admins can view all submissions" ON public.eod_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add admin SELECT policy for eod_submission_tasks
DROP POLICY IF EXISTS "Admins can view all submission tasks" ON public.eod_submission_tasks;
CREATE POLICY "Admins can view all submission tasks" ON public.eod_submission_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Add admin SELECT policy for eod_queue_tasks
DROP POLICY IF EXISTS "Admins can view all queue tasks" ON public.eod_queue_tasks;
CREATE POLICY "Admins can view all queue tasks" ON public.eod_queue_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON POLICY "Admins can view all time entries" ON public.eod_time_entries IS 
  'Allows admin users to view all time entries for dashboard analytics';

COMMENT ON POLICY "Admins can view all mood entries" ON public.mood_entries IS 
  'Allows admin users to view all mood check-ins for team analytics';

COMMENT ON POLICY "Admins can view all energy entries" ON public.energy_entries IS 
  'Allows admin users to view all energy check-ins for team analytics';

COMMENT ON POLICY "Admins can view all clock-ins" ON public.eod_clock_ins IS 
  'Allows admin users to view all clock-in records for team management';

COMMENT ON POLICY "Admins can view all submissions" ON public.eod_submissions IS 
  'Allows admin users to view all EOD submissions for team oversight';

COMMENT ON POLICY "Admins can view all submission tasks" ON public.eod_submission_tasks IS 
  'Allows admin users to view all submitted tasks for team analytics';

COMMENT ON POLICY "Admins can view all queue tasks" ON public.eod_queue_tasks IS 
  'Allows admin users to view all queued tasks for team planning';


