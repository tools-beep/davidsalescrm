-- ============================================
-- MIGRATE OLD EOD DATA TO NEW TABLE
-- ============================================

-- Step 1: Fix user_profiles RLS (for messages)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "view_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Allow all authenticated users to view profiles
CREATE POLICY "view_all_profiles" ON public.user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow users to update their own profile
CREATE POLICY "update_own_profile" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid());

-- Step 2: Check what data exists
SELECT 'Old eod_reports table:' as info;
SELECT COUNT(*) as count FROM public.eod_reports;

SELECT 'New eod_submissions table:' as info;
SELECT COUNT(*) as count FROM public.eod_submissions;

-- Step 3: Migrate data from old to new table
-- This will copy existing EOD reports to the new submissions table
INSERT INTO public.eod_submissions (
  user_id,
  report_id,
  clocked_in_at,
  clocked_out_at,
  total_hours,
  summary,
  submitted_at,
  created_at
)
SELECT 
  er.user_id,
  er.id as report_id,
  er.started_at as clocked_in_at,
  er.submitted_at as clocked_out_at,
  EXTRACT(EPOCH FROM (er.submitted_at - er.started_at)) / 3600 as total_hours,
  er.summary,
  er.submitted_at,
  er.created_at
FROM public.eod_reports er
WHERE NOT EXISTS (
  SELECT 1 FROM public.eod_submissions es 
  WHERE es.report_id = er.id
);

-- Step 4: Migrate time entries to submission_tasks
INSERT INTO public.eod_submission_tasks (
  submission_id,
  client_name,
  task_description,
  duration_minutes,
  comments,
  task_link,
  created_at
)
SELECT 
  es.id as submission_id,
  ete.client_name,
  ete.task_description,
  COALESCE(ete.duration_minutes, 0) as duration_minutes,
  ete.comments,
  ete.task_link,
  ete.created_at
FROM public.eod_time_entries ete
JOIN public.eod_submissions es ON es.report_id = ete.eod_id
WHERE ete.ended_at IS NOT NULL  -- Only completed tasks
AND NOT EXISTS (
  SELECT 1 FROM public.eod_submission_tasks est 
  WHERE est.submission_id = es.id 
  AND est.client_name = ete.client_name
  AND est.task_description = ete.task_description
  AND est.created_at = ete.created_at
);

-- Step 5: Migrate images
INSERT INTO public.eod_submission_images (
  submission_id,
  image_url,
  created_at
)
SELECT 
  es.id as submission_id,
  eri.public_url as image_url,
  eri.created_at
FROM public.eod_report_images eri
JOIN public.eod_submissions es ON es.report_id = eri.eod_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.eod_submission_images esi 
  WHERE esi.submission_id = es.id 
  AND esi.image_url = eri.public_url
);

-- Step 6: Set admin roles
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'lukejason05@gmail.com';

UPDATE public.user_profiles 
SET role = 'user' 
WHERE email = 'pintermax0710@gmail.com';

-- Step 7: Verify migration
SELECT 'Migration complete! New counts:' as info;
SELECT COUNT(*) as submissions FROM public.eod_submissions;
SELECT COUNT(*) as tasks FROM public.eod_submission_tasks;
SELECT COUNT(*) as images FROM public.eod_submission_images;

SELECT 'Admin roles:' as info;
SELECT email, role FROM public.user_profiles 
WHERE email IN ('lukejason05@gmail.com', 'pintermax0710@gmail.com');

