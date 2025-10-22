-- ============================================
-- CREATE EOD TABLES AND MIGRATE DATA
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- PART 1: CREATE ALL TABLES
-- ============================================

-- 1. Create EOD submissions table (stores history)
CREATE TABLE IF NOT EXISTS public.eod_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.eod_reports(id) ON DELETE SET NULL,
  clocked_in_at TIMESTAMPTZ,
  clocked_out_at TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  summary TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create EOD submission tasks table (stores task snapshots)
CREATE TABLE IF NOT EXISTS public.eod_submission_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.eod_submissions(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  task_description TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  comments TEXT,
  task_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create EOD submission images table (stores screenshot snapshots)
CREATE TABLE IF NOT EXISTS public.eod_submission_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.eod_submissions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create EOD clock-ins table
CREATE TABLE IF NOT EXISTS public.eod_clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clocked_in_at TIMESTAMPTZ NOT NULL,
  clocked_out_at TIMESTAMPTZ,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PART 2: ENABLE RLS
-- ============================================

ALTER TABLE public.eod_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_submission_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_submission_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_clock_ins ENABLE ROW LEVEL SECURITY;

-- PART 3: CREATE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own submissions" ON public.eod_submissions;
DROP POLICY IF EXISTS "Users can insert own submissions" ON public.eod_submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.eod_submissions;
DROP POLICY IF EXISTS "Users can view own submission tasks" ON public.eod_submission_tasks;
DROP POLICY IF EXISTS "Users can insert own submission tasks" ON public.eod_submission_tasks;
DROP POLICY IF EXISTS "Admins can view all submission tasks" ON public.eod_submission_tasks;
DROP POLICY IF EXISTS "Users can view own submission images" ON public.eod_submission_images;
DROP POLICY IF EXISTS "Users can insert own submission images" ON public.eod_submission_images;
DROP POLICY IF EXISTS "Admins can view all submission images" ON public.eod_submission_images;

-- Submissions policies
CREATE POLICY "Users can view own submissions"
  ON public.eod_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON public.eod_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
  ON public.eod_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Submission tasks policies
CREATE POLICY "Users can view own submission tasks"
  ON public.eod_submission_tasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eod_submissions 
    WHERE eod_submissions.id = eod_submission_tasks.submission_id 
    AND eod_submissions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own submission tasks"
  ON public.eod_submission_tasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.eod_submissions 
    WHERE eod_submissions.id = eod_submission_tasks.submission_id 
    AND eod_submissions.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all submission tasks"
  ON public.eod_submission_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Submission images policies
CREATE POLICY "Users can view own submission images"
  ON public.eod_submission_images FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.eod_submissions 
    WHERE eod_submissions.id = eod_submission_images.submission_id 
    AND eod_submissions.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own submission images"
  ON public.eod_submission_images FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.eod_submissions 
    WHERE eod_submissions.id = eod_submission_images.submission_id 
    AND eod_submissions.user_id = auth.uid()
  ));

CREATE POLICY "Admins can view all submission images"
  ON public.eod_submission_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- PART 4: MIGRATE DATA FROM OLD TABLES
-- ============================================

-- Clear any existing data first
DELETE FROM public.eod_submission_images;
DELETE FROM public.eod_submission_tasks;
DELETE FROM public.eod_submissions;

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

-- PART 5: SET USER ROLES
-- ============================================

UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'lukejason05@gmail.com';

UPDATE public.user_profiles 
SET role = 'user' 
WHERE email = 'pintermax0710@gmail.com';

-- PART 6: VERIFICATION
-- ============================================

SELECT '✅ TABLES CREATED!' as status;

SELECT 'Total submissions:' as info, COUNT(*) as count 
FROM public.eod_submissions;

SELECT 'Total tasks:' as info, COUNT(*) as count 
FROM public.eod_submission_tasks;

SELECT 'Total images:' as info, COUNT(*) as count 
FROM public.eod_submission_images;

SELECT 'User roles:' as info;
SELECT email, role, first_name, last_name
FROM public.user_profiles 
WHERE email IN ('lukejason05@gmail.com', 'pintermax0710@gmail.com');

SELECT '✅ MIGRATION COMPLETE! Refresh your admin dashboard.' as final_message;

