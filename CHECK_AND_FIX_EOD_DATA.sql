-- ============================================
-- CHECK AND FIX EOD DATA - STEP BY STEP
-- ============================================

-- STEP 1: Check what data exists
SELECT '=== CHECKING OLD TABLES ===' as step;

SELECT 'eod_reports count:' as info, COUNT(*) as count 
FROM public.eod_reports;

SELECT 'eod_reports with submitted_at:' as info, COUNT(*) as count 
FROM public.eod_reports 
WHERE submitted_at IS NOT NULL;

SELECT 'Sample eod_report:' as info;
SELECT id, user_id, started_at, submitted_at, summary
FROM public.eod_reports 
WHERE submitted_at IS NOT NULL
LIMIT 1;

-- STEP 2: Check new tables
SELECT '=== CHECKING NEW TABLES ===' as step;

SELECT 'eod_submissions count:' as info, COUNT(*) as count 
FROM public.eod_submissions;

SELECT 'eod_submission_tasks count:' as info, COUNT(*) as count 
FROM public.eod_submission_tasks;

-- STEP 3: If old table has data but new table is empty, migrate it
-- First, clear any partial migrations
DELETE FROM public.eod_submission_images;
DELETE FROM public.eod_submission_tasks;
DELETE FROM public.eod_submissions;

SELECT '=== MIGRATING DATA ===' as step;

-- Migrate submissions
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
  EXTRACT(EPOCH FROM (COALESCE(er.submitted_at, NOW()) - er.started_at)) / 3600 as total_hours,
  er.summary,
  er.submitted_at,
  er.created_at
FROM public.eod_reports er
WHERE er.submitted_at IS NOT NULL;

SELECT 'Migrated submissions:' as info, COUNT(*) as count 
FROM public.eod_submissions;

-- Migrate tasks
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
  COALESCE(ete.client_name, 'Unknown Client') as client_name,
  COALESCE(ete.task_description, 'No description') as task_description,
  COALESCE(ete.duration_minutes, 0) as duration_minutes,
  ete.comments,
  ete.task_link,
  ete.created_at
FROM public.eod_time_entries ete
JOIN public.eod_submissions es ON es.report_id = ete.eod_id
WHERE ete.ended_at IS NOT NULL;

SELECT 'Migrated tasks:' as info, COUNT(*) as count 
FROM public.eod_submission_tasks;

-- Migrate images
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
JOIN public.eod_submissions es ON es.report_id = eri.eod_id;

SELECT 'Migrated images:' as info, COUNT(*) as count 
FROM public.eod_submission_images;

-- STEP 4: Verify final state
SELECT '=== FINAL VERIFICATION ===' as step;

SELECT 'Total submissions:' as info, COUNT(*) as count 
FROM public.eod_submissions;

SELECT 'Total tasks:' as info, COUNT(*) as count 
FROM public.eod_submission_tasks;

SELECT 'Total images:' as info, COUNT(*) as count 
FROM public.eod_submission_images;

-- Show sample data
SELECT 'Sample submission:' as info;
SELECT 
  es.id,
  es.user_id,
  es.clocked_in_at,
  es.submitted_at,
  es.total_hours,
  es.summary,
  (SELECT COUNT(*) FROM eod_submission_tasks WHERE submission_id = es.id) as task_count
FROM public.eod_submissions es
LIMIT 1;

-- STEP 5: Set user roles
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'lukejason05@gmail.com';

UPDATE public.user_profiles 
SET role = 'user' 
WHERE email = 'pintermax0710@gmail.com';

SELECT 'User roles:' as info;
SELECT email, role, first_name, last_name
FROM public.user_profiles 
WHERE email IN ('lukejason05@gmail.com', 'pintermax0710@gmail.com');

SELECT '✅ MIGRATION COMPLETE!' as result;
SELECT 'Now refresh your admin dashboard at /admin' as next_step;

