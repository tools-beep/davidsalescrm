-- ============================================================================
-- SMART DAR COMPLETE SYSTEM DATABASE MIGRATION
-- Date: November 24, 2025
-- Purpose: Complete database schema for Smart DAR Dashboard with all features
-- ============================================================================

-- This migration includes:
-- 1. All metric tracking fields
-- 2. Points system
-- 3. Streak system (weekday-only)
-- 4. Shift planning & goals
-- 5. Actual/Rounded hours
-- 6. Recurring task templates
-- 7. Survey tracking
-- 8. All RLS policies

-- ============================================================================
-- SECTION 1: EOD TIME ENTRIES - Task Tracking
-- ============================================================================

-- Add all task metadata fields if they don't exist
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS task_type TEXT,
ADD COLUMN IF NOT EXISTS goal_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS task_intent TEXT,
ADD COLUMN IF NOT EXISTS task_categories TEXT[],
ADD COLUMN IF NOT EXISTS task_enjoyment INTEGER CHECK (task_enjoyment BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS task_priority TEXT,
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN eod_time_entries.task_type IS 'Quick Task, Standard Task, Deep Work Task, Long Task, Very Long Task';
COMMENT ON COLUMN eod_time_entries.goal_duration_minutes IS 'Estimated duration for the task';
COMMENT ON COLUMN eod_time_entries.task_intent IS 'User-defined intent for the task';
COMMENT ON COLUMN eod_time_entries.task_categories IS 'Array of categories (Admin, Creative, Communication, etc.)';
COMMENT ON COLUMN eod_time_entries.task_enjoyment IS 'Rating 1-5 stars for task enjoyment';
COMMENT ON COLUMN eod_time_entries.task_priority IS 'Immediate Impact, Daily, Weekly, Monthly, Evergreen, Trigger';
COMMENT ON COLUMN eod_time_entries.pause_count IS 'Number of times task was paused';
COMMENT ON COLUMN eod_time_entries.points_awarded IS 'Points earned for completing this task';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_time_entries_task_type ON eod_time_entries(user_id, task_type) WHERE task_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_priority ON eod_time_entries(user_id, task_priority) WHERE task_priority IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_points ON eod_time_entries(user_id, points_awarded) WHERE points_awarded > 0;
CREATE INDEX IF NOT EXISTS idx_time_entries_completed ON eod_time_entries(user_id, ended_at) WHERE ended_at IS NOT NULL;

-- ============================================================================
-- SECTION 2: MOOD & ENERGY TRACKING
-- ============================================================================

-- Ensure mood_entries table exists
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  mood_level TEXT NOT NULL CHECK (mood_level IN ('😊', '😐', '😣', '🔥', '🥱')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Ensure energy_entries table exists
CREATE TABLE IF NOT EXISTS energy_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('High', 'Medium', 'Recharging', 'Low', 'Drained')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_timestamp ON mood_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_energy_entries_user_timestamp ON energy_entries(user_id, timestamp DESC);

-- Enable RLS
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mood_entries
DROP POLICY IF EXISTS "Users can view own mood entries" ON mood_entries;
CREATE POLICY "Users can view own mood entries" ON mood_entries
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mood entries" ON mood_entries;
CREATE POLICY "Users can insert own mood entries" ON mood_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all mood entries" ON mood_entries;
CREATE POLICY "Admins can view all mood entries" ON mood_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for energy_entries
DROP POLICY IF EXISTS "Users can view own energy entries" ON energy_entries;
CREATE POLICY "Users can view own energy entries" ON energy_entries
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own energy entries" ON energy_entries;
CREATE POLICY "Users can insert own energy entries" ON energy_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all energy entries" ON energy_entries;
CREATE POLICY "Admins can view all energy entries" ON energy_entries
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- SECTION 3: CLOCK-IN SYSTEM - Shift Planning & Goals
-- ============================================================================

-- Add shift planning fields to eod_clock_ins
ALTER TABLE eod_clock_ins 
ADD COLUMN IF NOT EXISTS planned_shift_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

COMMENT ON COLUMN eod_clock_ins.planned_shift_minutes IS 'User-estimated shift length at clock-in (for Utilization metric)';
COMMENT ON COLUMN eod_clock_ins.planned_tasks IS 'User-estimated task goal at clock-in';
COMMENT ON COLUMN eod_clock_ins.actual_hours IS 'Precise hours worked (total_shift_seconds / 3600)';
COMMENT ON COLUMN eod_clock_ins.rounded_hours IS 'Rounded hours (standard math rounding)';

-- Add RLS policy for updating planned fields
DROP POLICY IF EXISTS "Users can update own clock-in planning" ON eod_clock_ins;
CREATE POLICY "Users can update own clock-in planning" ON eod_clock_ins
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SECTION 4: EOD REPORTS & SUBMISSIONS - Hours Tracking
-- ============================================================================

-- Add hours fields to eod_reports
ALTER TABLE eod_reports 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- Add hours fields to eod_submissions
ALTER TABLE eod_submissions 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- ============================================================================
-- SECTION 5: USER PROFILES - Points & Streaks
-- ============================================================================

-- Add points fields
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS weekly_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS monthly_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_weekly_reset DATE,
ADD COLUMN IF NOT EXISTS last_monthly_reset DATE;

-- Add weekday streak fields
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS weekday_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS longest_weekday_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS weekend_bonus_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_submission_date DATE,
ADD COLUMN IF NOT EXISTS streak_last_updated_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN user_profiles.total_points IS 'Lifetime total points earned';
COMMENT ON COLUMN user_profiles.weekly_points IS 'Points earned this week (resets Monday)';
COMMENT ON COLUMN user_profiles.monthly_points IS 'Points earned this month (resets 1st)';
COMMENT ON COLUMN user_profiles.weekday_streak IS 'Current weekday streak (Mon-Fri only)';
COMMENT ON COLUMN user_profiles.longest_weekday_streak IS 'Longest weekday streak achieved';
COMMENT ON COLUMN user_profiles.weekend_bonus_streak IS 'Bonus streak for weekend work';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_points ON user_profiles(user_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_streak ON user_profiles(user_id, weekday_streak DESC);

-- ============================================================================
-- SECTION 6: POINTS HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  task_id UUID REFERENCES eod_time_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_points_history_user_timestamp ON points_history(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_points_history_task ON points_history(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_points_history_recent ON points_history(user_id, timestamp DESC) 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days';

-- Enable RLS
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own points history" ON points_history;
CREATE POLICY "Users can view own points history" ON points_history
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own points history" ON points_history;
CREATE POLICY "Users can insert own points history" ON points_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all points history" ON points_history;
CREATE POLICY "Admins can view all points history" ON points_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

COMMENT ON TABLE points_history IS 
'Stores the last 50 point events per user for the Smart DAR Points System. Automatically cleaned up by award_points function.';

-- ============================================================================
-- SECTION 7: STREAK HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS streak_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  weekday_streak INTEGER DEFAULT 0 NOT NULL,
  weekend_bonus_streak INTEGER DEFAULT 0 NOT NULL,
  is_weekday BOOLEAN NOT NULL,
  dar_submitted BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON streak_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_streak_history_weekday ON streak_history(user_id, is_weekday, date DESC);

-- Enable RLS
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own streak history" ON streak_history;
CREATE POLICY "Users can view own streak history" ON streak_history
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own streak history" ON streak_history;
CREATE POLICY "Users can insert own streak history" ON streak_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all streak history" ON streak_history;
CREATE POLICY "Admins can view all streak history" ON streak_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

COMMENT ON TABLE streak_history IS 
'Stores daily streak data for weekday-only streak system. Weekends are bonus, not required.';

-- ============================================================================
-- SECTION 8: RECURRING TASK TEMPLATES
-- ============================================================================

-- Ensure recurring_task_templates table exists
CREATE TABLE IF NOT EXISTS recurring_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT NOT NULL,
  default_client TEXT,
  default_task_type TEXT,
  default_categories TEXT[],
  default_priority TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_templates_user ON recurring_task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_priority ON recurring_task_templates(user_id, default_priority);

-- Enable RLS
ALTER TABLE recurring_task_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view own templates" ON recurring_task_templates;
CREATE POLICY "Users can view own templates" ON recurring_task_templates
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own templates" ON recurring_task_templates;
CREATE POLICY "Users can insert own templates" ON recurring_task_templates
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own templates" ON recurring_task_templates;
CREATE POLICY "Users can update own templates" ON recurring_task_templates
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own templates" ON recurring_task_templates;
CREATE POLICY "Users can delete own templates" ON recurring_task_templates
FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all templates" ON recurring_task_templates;
CREATE POLICY "Admins can view all templates" ON recurring_task_templates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- SECTION 9: POINTS SYSTEM FUNCTIONS
-- ============================================================================

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_task_id UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_current_week_start DATE;
  v_current_month_start DATE;
  v_last_weekly_reset DATE;
  v_last_monthly_reset DATE;
BEGIN
  -- Calculate current week start (Monday)
  v_current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Calculate current month start
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  -- Get last reset dates
  SELECT last_weekly_reset, last_monthly_reset 
  INTO v_last_weekly_reset, v_last_monthly_reset
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  -- Reset weekly points if new week
  IF v_last_weekly_reset IS NULL OR v_last_weekly_reset < v_current_week_start THEN
    UPDATE user_profiles
    SET 
      weekly_points = 0,
      last_weekly_reset = v_current_week_start
    WHERE user_id = p_user_id;
  END IF;
  
  -- Reset monthly points if new month
  IF v_last_monthly_reset IS NULL OR v_last_monthly_reset < v_current_month_start THEN
    UPDATE user_profiles
    SET 
      monthly_points = 0,
      last_monthly_reset = v_current_month_start
    WHERE user_id = p_user_id;
  END IF;
  
  -- Award points
  UPDATE user_profiles
  SET 
    total_points = total_points + p_points,
    weekly_points = weekly_points + p_points,
    monthly_points = monthly_points + p_points
  WHERE user_id = p_user_id;
  
  -- Record in history (keep last 50 entries per user)
  INSERT INTO points_history (user_id, points, reason, task_id)
  VALUES (p_user_id, p_points, p_reason, p_task_id);
  
  -- Clean up old history (keep only last 50 entries per user)
  DELETE FROM points_history
  WHERE id IN (
    SELECT id FROM points_history
    WHERE user_id = p_user_id
    ORDER BY timestamp DESC
    OFFSET 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate task points
CREATE OR REPLACE FUNCTION calculate_task_points(
  p_task_type TEXT,
  p_task_priority TEXT,
  p_focus_score INTEGER,
  p_goal_duration_minutes INTEGER,
  p_actual_duration_minutes INTEGER,
  p_task_enjoyment INTEGER,
  p_mood_answered BOOLEAN,
  p_energy_answered BOOLEAN,
  p_enjoyment_answered BOOLEAN
)
RETURNS INTEGER AS $$
DECLARE
  v_points INTEGER := 0;
  v_duration_diff NUMERIC;
  v_accuracy_percent NUMERIC;
BEGIN
  -- A. Base Points (Task Type)
  CASE p_task_type
    WHEN 'Quick Task' THEN v_points := v_points + 3;
    WHEN 'Standard Task' THEN v_points := v_points + 5;
    WHEN 'Deep Work Task' THEN v_points := v_points + 10;
    WHEN 'Long Task' THEN v_points := v_points + 12;
    WHEN 'Very Long Task' THEN v_points := v_points + 15;
    ELSE v_points := v_points + 3;
  END CASE;
  
  -- B. Priority Bonus
  CASE p_task_priority
    WHEN 'Immediate Impact Task' THEN v_points := v_points + 5;
    WHEN 'Daily Task' THEN v_points := v_points + 3;
    WHEN 'Weekly Task' THEN v_points := v_points + 2;
    WHEN 'Monthly Task' THEN v_points := v_points + 1;
    WHEN 'Evergreen Task' THEN v_points := v_points + 1;
    WHEN 'Trigger Task' THEN v_points := v_points + 3;
  END CASE;
  
  -- C. Focus Score Bonus
  IF p_focus_score >= 90 THEN
    v_points := v_points + 5;
  ELSIF p_focus_score >= 75 THEN
    v_points := v_points + 3;
  END IF;
  
  -- D. Estimation Accuracy Bonus (within ±20%)
  IF p_goal_duration_minutes > 0 AND p_actual_duration_minutes > 0 THEN
    v_duration_diff := ABS(p_actual_duration_minutes - p_goal_duration_minutes);
    v_accuracy_percent := (v_duration_diff / p_goal_duration_minutes) * 100;
    
    IF v_accuracy_percent <= 20 THEN
      v_points := v_points + 3;
    END IF;
  END IF;
  
  -- E. Survey Engagement Bonus
  IF p_mood_answered THEN
    v_points := v_points + 2;
  END IF;
  
  IF p_energy_answered THEN
    v_points := v_points + 2;
  END IF;
  
  IF p_enjoyment_answered THEN
    v_points := v_points + 1;
  END IF;
  
  -- F. Enjoyment Bonus (if enjoyment >= 4)
  IF p_task_enjoyment >= 4 THEN
    v_points := v_points + 2;
  END IF;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to get user points summary
CREATE OR REPLACE FUNCTION get_user_points_summary(p_user_id UUID)
RETURNS TABLE(
  total_points INTEGER,
  weekly_points INTEGER,
  monthly_points INTEGER,
  points_today INTEGER,
  recent_history JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.total_points,
    up.weekly_points,
    up.monthly_points,
    COALESCE(
      (SELECT SUM(points) 
       FROM points_history 
       WHERE user_id = p_user_id 
       AND DATE(timestamp) = CURRENT_DATE),
      0
    )::INTEGER AS points_today,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', id,
          'timestamp', timestamp,
          'points', points,
          'reason', reason,
          'task_id', task_id
        ) ORDER BY timestamp DESC
      )
      FROM (
        SELECT * FROM points_history
        WHERE user_id = p_user_id
        ORDER BY timestamp DESC
        LIMIT 10
      ) recent),
      '[]'::jsonb
    ) AS recent_history
  FROM user_profiles up
  WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION award_points TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_task_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_points_summary TO authenticated;

-- ============================================================================
-- SECTION 10: HOURS CALCULATION TRIGGERS
-- ============================================================================

-- Function to calculate shift hours on clock-out
CREATE OR REPLACE FUNCTION calculate_shift_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_total_seconds INTEGER;
  v_actual_hours NUMERIC;
  v_rounded_hours INTEGER;
BEGIN
  -- Only calculate when clocking out
  IF NEW.clocked_out_at IS NOT NULL AND (OLD.clocked_out_at IS NULL OR OLD.clocked_out_at IS DISTINCT FROM NEW.clocked_out_at) THEN
    -- Calculate total shift seconds
    v_total_seconds := EXTRACT(EPOCH FROM (NEW.clocked_out_at - NEW.clocked_in_at))::INTEGER;
    
    -- Calculate actual hours (precise)
    v_actual_hours := v_total_seconds / 3600.0;
    
    -- Calculate rounded hours (standard math rounding)
    v_rounded_hours := ROUND(v_actual_hours);
    
    -- Update the record
    NEW.actual_hours := v_actual_hours;
    NEW.rounded_hours := v_rounded_hours;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_calculate_shift_hours ON eod_clock_ins;

-- Create trigger
CREATE TRIGGER trg_calculate_shift_hours
BEFORE UPDATE ON eod_clock_ins
FOR EACH ROW
EXECUTE FUNCTION calculate_shift_hours();

-- Function to update EOD report hours
CREATE OR REPLACE FUNCTION update_eod_report_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_clock_in_data RECORD;
BEGIN
  -- Get clock-in data
  SELECT actual_hours, rounded_hours
  INTO v_clock_in_data
  FROM eod_clock_ins
  WHERE user_id = NEW.user_id
  AND DATE(clocked_in_at) = DATE(NEW.created_at)
  ORDER BY clocked_in_at DESC
  LIMIT 1;
  
  -- Update submission with hours
  IF v_clock_in_data IS NOT NULL THEN
    NEW.actual_hours := v_clock_in_data.actual_hours;
    NEW.rounded_hours := v_clock_in_data.rounded_hours;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_update_eod_report_hours ON eod_submissions;

-- Create trigger
CREATE TRIGGER trg_update_eod_report_hours
BEFORE INSERT ON eod_submissions
FOR EACH ROW
EXECUTE FUNCTION update_eod_report_hours();

-- ============================================================================
-- SECTION 11: PERFORMANCE INDEXES
-- ============================================================================

-- Add performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_time_entries_user_date ON eod_time_entries(user_id, DATE(started_at));
CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(user_id, DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_energy_entries_date ON energy_entries(user_id, DATE(timestamp));
CREATE INDEX IF NOT EXISTS idx_clock_ins_user_date ON eod_clock_ins(user_id, DATE(clocked_in_at));

-- ============================================================================
-- SECTION 12: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION award_points IS 
'Awards points to a user, updates totals (lifetime, weekly, monthly), and records in history. Automatically resets weekly/monthly points.';

COMMENT ON FUNCTION calculate_task_points IS 
'Calculates points for a completed task based on type, priority, focus, accuracy, surveys, and enjoyment.';

COMMENT ON FUNCTION get_user_points_summary IS 
'Returns comprehensive points summary for a user including totals, today, and recent history.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify key tables exist
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'eod_time_entries') > 0, 
    'eod_time_entries table must exist';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_profiles') > 0, 
    'user_profiles table must exist';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'points_history') > 0, 
    'points_history table must exist';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'streak_history') > 0, 
    'streak_history table must exist';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'mood_entries') > 0, 
    'mood_entries table must exist';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'energy_entries') > 0, 
    'energy_entries table must exist';
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'recurring_task_templates') > 0, 
    'recurring_task_templates table must exist';
    
  RAISE NOTICE '✅ Smart DAR Complete System Migration Successful!';
  RAISE NOTICE '📊 All tables, functions, triggers, and RLS policies are in place.';
  RAISE NOTICE '🎯 Ready for: Metrics, Points, Streaks, Shift Planning, Hours Tracking, Templates';
END $$;

