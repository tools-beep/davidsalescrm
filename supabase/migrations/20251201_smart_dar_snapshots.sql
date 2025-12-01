-- ============================================
-- SMART DAR METRICS SNAPSHOTS (COMPREHENSIVE)
-- Store COMPLETE dashboard state when DAR is submitted
-- Supports historical viewing AND weekly/monthly aggregations
-- ============================================

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS public.smart_dar_snapshots CASCADE;

-- Create the comprehensive snapshots table
CREATE TABLE IF NOT EXISTS public.smart_dar_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES public.eod_submissions(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  
  -- ═══════════════════════════════════════════════════════════════
  -- CORE 9 METRICS (exact same as Smart DAR Dashboard)
  -- ═══════════════════════════════════════════════════════════════
  efficiency_score INTEGER DEFAULT 0,        -- Time utilization & estimation
  completion_rate INTEGER DEFAULT 0,         -- Priority + accuracy weighted
  priority_completion INTEGER DEFAULT 0,     -- Priority-based completion
  estimation_accuracy INTEGER DEFAULT 0,     -- Goal vs actual time accuracy
  focus_index INTEGER DEFAULT 0,             -- Energy & enjoyment aware
  task_velocity INTEGER DEFAULT 0,           -- Complexity & priority weighted output
  work_rhythm INTEGER DEFAULT 0,             -- Time-of-day patterns
  energy_level INTEGER DEFAULT 0,            -- Recovery & flow aware
  time_utilization INTEGER DEFAULT 0,        -- Context-interpreted utilization
  productivity_momentum INTEGER DEFAULT 0,   -- Flow state detection
  consistency_score INTEGER DEFAULT 0,       -- Mood/energy stability
  
  -- ═══════════════════════════════════════════════════════════════
  -- TASK STATISTICS
  -- ═══════════════════════════════════════════════════════════════
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  active_tasks INTEGER DEFAULT 0,
  paused_tasks INTEGER DEFAULT 0,
  delayed_tasks INTEGER DEFAULT 0,
  
  -- ═══════════════════════════════════════════════════════════════
  -- TIME STATISTICS (in seconds unless noted)
  -- ═══════════════════════════════════════════════════════════════
  total_active_time INTEGER DEFAULT 0,       -- Total task working time (seconds)
  total_paused_time INTEGER DEFAULT 0,       -- Total pause time (seconds)
  avg_time_per_task INTEGER DEFAULT 0,       -- Average seconds per task
  total_shift_hours NUMERIC(5,2) DEFAULT 0,  -- Clock-in to clock-out hours
  
  -- ═══════════════════════════════════════════════════════════════
  -- CLOCK-IN/OUT DATA (for shift calculations)
  -- ═══════════════════════════════════════════════════════════════
  clocked_in_at TIMESTAMPTZ,                 -- Earliest clock-in time
  clocked_out_at TIMESTAMPTZ,                -- Latest clock-out time
  planned_shift_minutes INTEGER,             -- Planned shift from clock-in modal
  daily_task_goal INTEGER,                   -- Daily task goal from clock-in modal
  
  -- ═══════════════════════════════════════════════════════════════
  -- PEAK PERFORMANCE
  -- ═══════════════════════════════════════════════════════════════
  peak_hour INTEGER,                         -- Hour with most productivity (0-23)
  
  -- ═══════════════════════════════════════════════════════════════
  -- POINTS & STREAKS
  -- ═══════════════════════════════════════════════════════════════
  points_earned INTEGER DEFAULT 0,           -- Points earned that day
  weekday_streak INTEGER DEFAULT 0,          -- Weekday streak at end of day
  weekend_bonus_streak INTEGER DEFAULT 0,    -- Weekend bonus streak
  
  -- ═══════════════════════════════════════════════════════════════
  -- TASK TYPE BREAKDOWN (for weekly/monthly analysis)
  -- ═══════════════════════════════════════════════════════════════
  tasks_by_type JSONB DEFAULT '{}',          -- {"Quick Task": 3, "Standard Task": 5, ...}
  tasks_by_priority JSONB DEFAULT '{}',      -- {"Immediate Impact": 2, "Daily": 4, ...}
  tasks_by_category JSONB DEFAULT '{}',      -- {"Development": 3, "Meetings": 2, ...}
  
  -- ═══════════════════════════════════════════════════════════════
  -- DEEP WORK METRICS
  -- ═══════════════════════════════════════════════════════════════
  deep_work_blocks INTEGER DEFAULT 0,        -- Number of 20+ min focused blocks
  deep_work_minutes INTEGER DEFAULT 0,       -- Total deep work time
  quick_task_count INTEGER DEFAULT 0,        -- Number of quick tasks (<15 min)
  
  -- ═══════════════════════════════════════════════════════════════
  -- MOOD & ENERGY SUMMARY
  -- ═══════════════════════════════════════════════════════════════
  mood_entries_count INTEGER DEFAULT 0,
  energy_entries_count INTEGER DEFAULT 0,
  avg_mood TEXT,                             -- Most common mood emoji
  avg_energy TEXT,                           -- Most common energy level
  mood_distribution JSONB DEFAULT '{}',      -- {"😊": 3, "😐": 1, ...}
  energy_distribution JSONB DEFAULT '{}',    -- {"High": 2, "Medium": 3, ...}
  
  -- ═══════════════════════════════════════════════════════════════
  -- BEHAVIOR INSIGHTS (JSON for flexibility)
  -- ═══════════════════════════════════════════════════════════════
  behavior_insights JSONB DEFAULT '[]',      -- Array of insight objects
  
  -- ═══════════════════════════════════════════════════════════════
  -- EXPERT INSIGHT
  -- ═══════════════════════════════════════════════════════════════
  expert_insight TEXT,                       -- Generated expert insight text
  
  -- ═══════════════════════════════════════════════════════════════
  -- GOAL TRACKING
  -- ═══════════════════════════════════════════════════════════════
  daily_goal_met BOOLEAN DEFAULT FALSE,      -- Did user meet task goal?
  shift_plan_met BOOLEAN DEFAULT FALSE,      -- Did user meet shift plan?
  
  -- ═══════════════════════════════════════════════════════════════
  -- TIMESTAMPS
  -- ═══════════════════════════════════════════════════════════════
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one snapshot per user per day
  CONSTRAINT unique_user_snapshot_date UNIQUE (user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.smart_dar_snapshots ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Primary lookup: user + date (for historical viewing)
CREATE INDEX IF NOT EXISTS idx_smart_dar_snapshots_user_date 
  ON public.smart_dar_snapshots(user_id, snapshot_date DESC);

-- Submission lookup
CREATE INDEX IF NOT EXISTS idx_smart_dar_snapshots_submission 
  ON public.smart_dar_snapshots(submission_id);

-- Weekly/Monthly aggregations (date range queries)
CREATE INDEX IF NOT EXISTS idx_smart_dar_snapshots_date_range
  ON public.smart_dar_snapshots(snapshot_date, user_id);

-- Points leaderboard queries
CREATE INDEX IF NOT EXISTS idx_smart_dar_snapshots_points
  ON public.smart_dar_snapshots(user_id, points_earned DESC);

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS FOR WEEKLY/MONTHLY AGGREGATIONS
-- ═══════════════════════════════════════════════════════════════

-- Function to get weekly summary for a user
CREATE OR REPLACE FUNCTION get_weekly_summary(
  p_user_id UUID,
  p_week_start DATE
)
RETURNS TABLE (
  total_tasks INTEGER,
  completed_tasks INTEGER,
  total_active_hours NUMERIC,
  total_shift_hours NUMERIC,
  avg_efficiency INTEGER,
  avg_completion INTEGER,
  avg_focus INTEGER,
  avg_velocity INTEGER,
  avg_rhythm INTEGER,
  avg_energy INTEGER,
  avg_utilization INTEGER,
  avg_momentum INTEGER,
  avg_consistency INTEGER,
  total_points INTEGER,
  days_worked INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total_tasks), 0)::INTEGER as total_tasks,
    COALESCE(SUM(s.completed_tasks), 0)::INTEGER as completed_tasks,
    COALESCE(SUM(s.total_active_time) / 3600.0, 0)::NUMERIC as total_active_hours,
    COALESCE(SUM(s.total_shift_hours), 0)::NUMERIC as total_shift_hours,
    COALESCE(AVG(s.efficiency_score), 0)::INTEGER as avg_efficiency,
    COALESCE(AVG(s.completion_rate), 0)::INTEGER as avg_completion,
    COALESCE(AVG(s.focus_index), 0)::INTEGER as avg_focus,
    COALESCE(AVG(s.task_velocity), 0)::INTEGER as avg_velocity,
    COALESCE(AVG(s.work_rhythm), 0)::INTEGER as avg_rhythm,
    COALESCE(AVG(s.energy_level), 0)::INTEGER as avg_energy,
    COALESCE(AVG(s.time_utilization), 0)::INTEGER as avg_utilization,
    COALESCE(AVG(s.productivity_momentum), 0)::INTEGER as avg_momentum,
    COALESCE(AVG(s.consistency_score), 0)::INTEGER as avg_consistency,
    COALESCE(SUM(s.points_earned), 0)::INTEGER as total_points,
    COUNT(*)::INTEGER as days_worked
  FROM public.smart_dar_snapshots s
  WHERE s.user_id = p_user_id
    AND s.snapshot_date >= p_week_start
    AND s.snapshot_date < p_week_start + INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get monthly summary for a user
CREATE OR REPLACE FUNCTION get_monthly_summary(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  total_tasks INTEGER,
  completed_tasks INTEGER,
  total_active_hours NUMERIC,
  total_shift_hours NUMERIC,
  avg_efficiency INTEGER,
  avg_completion INTEGER,
  avg_focus INTEGER,
  avg_velocity INTEGER,
  avg_rhythm INTEGER,
  avg_energy INTEGER,
  avg_utilization INTEGER,
  avg_momentum INTEGER,
  avg_consistency INTEGER,
  total_points INTEGER,
  days_worked INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total_tasks), 0)::INTEGER as total_tasks,
    COALESCE(SUM(s.completed_tasks), 0)::INTEGER as completed_tasks,
    COALESCE(SUM(s.total_active_time) / 3600.0, 0)::NUMERIC as total_active_hours,
    COALESCE(SUM(s.total_shift_hours), 0)::NUMERIC as total_shift_hours,
    COALESCE(AVG(s.efficiency_score), 0)::INTEGER as avg_efficiency,
    COALESCE(AVG(s.completion_rate), 0)::INTEGER as avg_completion,
    COALESCE(AVG(s.focus_index), 0)::INTEGER as avg_focus,
    COALESCE(AVG(s.task_velocity), 0)::INTEGER as avg_velocity,
    COALESCE(AVG(s.work_rhythm), 0)::INTEGER as avg_rhythm,
    COALESCE(AVG(s.energy_level), 0)::INTEGER as avg_energy,
    COALESCE(AVG(s.time_utilization), 0)::INTEGER as avg_utilization,
    COALESCE(AVG(s.productivity_momentum), 0)::INTEGER as avg_momentum,
    COALESCE(AVG(s.consistency_score), 0)::INTEGER as avg_consistency,
    COALESCE(SUM(s.points_earned), 0)::INTEGER as total_points,
    COUNT(*)::INTEGER as days_worked
  FROM public.smart_dar_snapshots s
  WHERE s.user_id = p_user_id
    AND EXTRACT(YEAR FROM s.snapshot_date) = p_year
    AND EXTRACT(MONTH FROM s.snapshot_date) = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE public.smart_dar_snapshots IS 
  'Comprehensive Smart DAR dashboard metrics snapshot. Captures ALL dashboard data when user submits DAR. Supports historical viewing and weekly/monthly aggregations for accurate reporting.';

COMMENT ON COLUMN public.smart_dar_snapshots.tasks_by_type IS 
  'JSON breakdown of tasks by type: {"Quick Task": 3, "Standard Task": 5, "Deep Work Task": 2}';

COMMENT ON COLUMN public.smart_dar_snapshots.tasks_by_priority IS 
  'JSON breakdown of tasks by priority: {"Immediate Impact": 2, "Daily": 4, "Weekly": 1}';

COMMENT ON COLUMN public.smart_dar_snapshots.behavior_insights IS 
  'Array of behavior insight objects generated for that day';

-- ═══════════════════════════════════════════════════════════════
-- TRIGGER FOR UPDATED_AT
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_smart_dar_snapshot_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_smart_dar_snapshots_updated ON public.smart_dar_snapshots;
CREATE TRIGGER trg_smart_dar_snapshots_updated
  BEFORE UPDATE ON public.smart_dar_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_smart_dar_snapshot_timestamp();
