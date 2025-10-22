-- ============================================
-- FIX EOD ADMIN DASHBOARD + GROUP CHATS
-- ============================================

-- Part 1: Fix group_chat_members table structure
-- Check if column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'group_chat_members' 
        AND column_name = 'group_chat_id'
    ) THEN
        ALTER TABLE public.group_chat_members 
        ADD COLUMN group_chat_id uuid REFERENCES public.group_chats(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Part 2: Migrate OLD EOD data to NEW tables
-- This moves data from eod_reports → eod_submissions

-- Check what data exists
SELECT 'Old eod_reports table:' as info, COUNT(*) as count FROM public.eod_reports;
SELECT 'New eod_submissions table:' as info, COUNT(*) as count FROM public.eod_submissions;

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
  EXTRACT(EPOCH FROM (er.submitted_at - er.started_at)) / 3600 as total_hours,
  er.summary,
  er.submitted_at,
  er.created_at
FROM public.eod_reports er
WHERE er.submitted_at IS NOT NULL  -- Only submitted reports
AND NOT EXISTS (
  SELECT 1 FROM public.eod_submissions es 
  WHERE es.report_id = er.id
);

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
  ete.client_name,
  ete.task_description,
  COALESCE(ete.duration_minutes, 0) as duration_minutes,
  ete.comments,
  ete.task_link,
  ete.created_at
FROM public.eod_time_entries ete
JOIN public.eod_submissions es ON es.report_id = ete.eod_id
WHERE ete.ended_at IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.eod_submission_tasks est 
  WHERE est.submission_id = es.id 
  AND est.client_name = ete.client_name
  AND est.task_description = ete.task_description
  AND est.created_at = ete.created_at
);

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
JOIN public.eod_submissions es ON es.report_id = eri.eod_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.eod_submission_images esi 
  WHERE esi.submission_id = es.id 
  AND esi.image_url = eri.public_url
);

-- Part 3: Set correct user roles
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'lukejason05@gmail.com';

UPDATE public.user_profiles 
SET role = 'user' 
WHERE email = 'pintermax0710@gmail.com';

-- Part 4: Verify migration
SELECT 'Migration Results:' as info;
SELECT 
  'Submissions' as table_name,
  COUNT(*) as count 
FROM public.eod_submissions;

SELECT 
  'Tasks' as table_name,
  COUNT(*) as count 
FROM public.eod_submission_tasks;

SELECT 
  'Images' as table_name,
  COUNT(*) as count 
FROM public.eod_submission_images;

-- Show user roles
SELECT 
  'User Roles' as info,
  email, 
  role,
  first_name,
  last_name
FROM public.user_profiles 
WHERE email IN ('lukejason05@gmail.com', 'pintermax0710@gmail.com');

-- Done!
SELECT '✅ Migration complete! Refresh your admin dashboard.' as result;

