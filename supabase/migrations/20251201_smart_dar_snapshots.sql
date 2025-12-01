-- ============================================
-- SMART DAR METRICS SNAPSHOTS
-- Store dashboard metrics when DAR is submitted
-- ============================================

-- Create the snapshots table
CREATE TABLE IF NOT EXISTS public.smart_dar_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.eod_submissions(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- Core Metrics (9 metrics)
  efficiency_score INTEGER DEFAULT 0,
  completion_rate INTEGER DEFAULT 0,
  priority_completion INTEGER DEFAULT 0,
  estimation_accuracy INTEGER DEFAULT 0,
  focus_index INTEGER DEFAULT 0,
  task_velocity INTEGER DEFAULT 0,
  work_rhythm INTEGER DEFAULT 0,
  energy_level INTEGER DEFAULT 0,
  time_utilization INTEGER DEFAULT 0,
  productivity_momentum INTEGER DEFAULT 0,
  consistency_score INTEGER DEFAULT 0,
  
  -- Task Statistics
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  active_tasks INTEGER DEFAULT 0,
  paused_tasks INTEGER DEFAULT 0,
  delayed_tasks INTEGER DEFAULT 0,
  
  -- Time Statistics (in seconds)
  total_active_time INTEGER DEFAULT 0,
  total_paused_time INTEGER DEFAULT 0,
  avg_time_per_task INTEGER DEFAULT 0,
  
  -- Peak Performance
  peak_hour INTEGER,
  
  -- Points earned that day
  points_earned INTEGER DEFAULT 0,
  
  -- Mood/Energy summary
  mood_entries_count INTEGER DEFAULT 0,
  energy_entries_count INTEGER DEFAULT 0,
  avg_mood TEXT,
  avg_energy TEXT,
  
  -- Behavior insights (JSON for flexibility)
  behavior_insights JSONB,
  
  -- Expert insight generated
  expert_insight TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one snapshot per user per day
  CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.smart_dar_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own snapshots
CREATE POLICY "Users can view own snapshots"
  ON public.smart_dar_snapshots FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own snapshots
CREATE POLICY "Users can insert own snapshots"
  ON public.smart_dar_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own snapshots
CREATE POLICY "Users can update own snapshots"
  ON public.smart_dar_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all snapshots
CREATE POLICY "Admins can view all snapshots"
  ON public.smart_dar_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_smart_dar_snapshots_user_date 
  ON public.smart_dar_snapshots(user_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_smart_dar_snapshots_submission 
  ON public.smart_dar_snapshots(submission_id);

-- Add comment
COMMENT ON TABLE public.smart_dar_snapshots IS 
  'Stores Smart DAR dashboard metrics snapshot when user submits their DAR. This allows viewing historical dashboard data exactly as it appeared at end of day.';

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_smart_dar_snapshot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_smart_dar_snapshots_updated
  BEFORE UPDATE ON public.smart_dar_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_smart_dar_snapshot_timestamp();

