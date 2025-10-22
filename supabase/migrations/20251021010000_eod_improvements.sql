-- EOD Portal Improvements Migration

-- 1. Add comments column to time entries
ALTER TABLE public.eod_time_entries 
ADD COLUMN IF NOT EXISTS comments TEXT;

-- 2. Create clock-ins table
CREATE TABLE IF NOT EXISTS public.eod_clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clocked_in_at TIMESTAMPTZ NOT NULL,
  clocked_out_at TIMESTAMPTZ,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create EOD submissions table (stores history)
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

-- 4. Create EOD submission tasks table (stores task snapshots)
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

-- 5. Create EOD submission images table (stores screenshot snapshots)
CREATE TABLE IF NOT EXISTS public.eod_submission_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.eod_submissions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on new tables
ALTER TABLE public.eod_clock_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_submission_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eod_submission_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eod_clock_ins
CREATE POLICY "Users can view own clock-ins"
  ON public.eod_clock_ins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clock-ins"
  ON public.eod_clock_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clock-ins"
  ON public.eod_clock_ins FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for eod_submissions
CREATE POLICY "Users can view own submissions"
  ON public.eod_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own submissions"
  ON public.eod_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for eod_submission_tasks
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

-- RLS Policies for eod_submission_images
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_eod_clock_ins_user_date ON public.eod_clock_ins(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_eod_submissions_user_submitted ON public.eod_submissions(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_eod_submission_tasks_submission ON public.eod_submission_tasks(submission_id);
CREATE INDEX IF NOT EXISTS idx_eod_submission_images_submission ON public.eod_submission_images(submission_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_eod_clock_ins_updated_at
  BEFORE UPDATE ON public.eod_clock_ins
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eod_submissions_updated_at
  BEFORE UPDATE ON public.eod_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

