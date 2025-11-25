-- ============================================================================
-- CREATE MISSING DATABASE ITEMS FOR SMART DAR
-- Run this AFTER running SUPABASE_VERIFICATION_AND_FIX.sql to see what's missing
-- Copy and run ONLY the sections for items that are missing
-- ============================================================================

-- ============================================================================
-- SECTION 1: MOOD_ENTRIES TABLE (if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  mood_level TEXT NOT NULL CHECK (mood_level IN ('😊', '😐', '😣', '🔥', '🥱')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add foreign key if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    ALTER TABLE mood_entries 
    ADD CONSTRAINT mood_entries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mood_entries_user_timestamp ON mood_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_date ON mood_entries(user_id, DATE(timestamp));

ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- SECTION 2: ENERGY_ENTRIES TABLE (if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS energy_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  energy_level TEXT NOT NULL CHECK (energy_level IN ('High', 'Medium', 'Low', 'Drained', 'Recharging')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add foreign key if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    ALTER TABLE energy_entries 
    ADD CONSTRAINT energy_entries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_energy_entries_user_timestamp ON energy_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_energy_entries_date ON energy_entries(user_id, DATE(timestamp));

ALTER TABLE energy_entries ENABLE ROW LEVEL SECURITY;

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
-- SECTION 3: POINTS_HISTORY TABLE (if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  task_id UUID,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add foreign keys if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    ALTER TABLE points_history 
    ADD CONSTRAINT points_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eod_time_entries') THEN
    ALTER TABLE points_history 
    ADD CONSTRAINT points_history_task_id_fkey 
    FOREIGN KEY (task_id) REFERENCES eod_time_entries(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_points_history_user_timestamp ON points_history(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_points_history_task ON points_history(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_points_history_recent ON points_history(user_id, timestamp DESC) 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days';

ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- SECTION 4: STREAK_HISTORY TABLE (if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS streak_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  weekday_streak INTEGER DEFAULT 0 NOT NULL,
  weekend_bonus_streak INTEGER DEFAULT 0 NOT NULL,
  is_weekday BOOLEAN NOT NULL,
  dar_submitted BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, date)
);

-- Add foreign key if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    ALTER TABLE streak_history 
    ADD CONSTRAINT streak_history_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_streak_history_user_date ON streak_history(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_streak_history_weekday ON streak_history(user_id, is_weekday, date DESC);

ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

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

-- ============================================================================
-- SECTION 5: RECURRING_TASK_TEMPLATES TABLE (if missing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS recurring_task_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT NOT NULL,
  default_client TEXT,
  default_task_type TEXT,
  default_categories TEXT[],
  default_priority TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add foreign key if user_profiles exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    ALTER TABLE recurring_task_templates 
    ADD CONSTRAINT recurring_task_templates_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_templates_user ON recurring_task_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_priority ON recurring_task_templates(user_id, default_priority);

ALTER TABLE recurring_task_templates ENABLE ROW LEVEL SECURITY;

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
-- SECTION 6: ADD COLUMNS TO EOD_TIME_ENTRIES (if missing)
-- ============================================================================

ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS task_type TEXT,
ADD COLUMN IF NOT EXISTS goal_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS task_intent TEXT,
ADD COLUMN IF NOT EXISTS task_categories TEXT[],
ADD COLUMN IF NOT EXISTS task_enjoyment INTEGER CHECK (task_enjoyment BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS task_priority TEXT,
ADD COLUMN IF NOT EXISTS pause_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_time_entries_task_type ON eod_time_entries(user_id, task_type) WHERE task_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_priority ON eod_time_entries(user_id, task_priority) WHERE task_priority IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_time_entries_points ON eod_time_entries(user_id, points_awarded) WHERE points_awarded > 0;

-- ============================================================================
-- SECTION 7: ADD COLUMNS TO USER_PROFILES (if missing)
-- ============================================================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS weekly_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS monthly_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_weekly_reset DATE,
ADD COLUMN IF NOT EXISTS last_monthly_reset DATE,
ADD COLUMN IF NOT EXISTS weekday_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS longest_weekday_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS weekend_bonus_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_submission_date DATE,
ADD COLUMN IF NOT EXISTS streak_last_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_profiles_points ON user_profiles(user_id, total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_streak ON user_profiles(user_id, weekday_streak DESC);

-- ============================================================================
-- SECTION 8: ADD COLUMNS TO EOD_CLOCK_INS (if missing)
-- ============================================================================

ALTER TABLE eod_clock_ins 
ADD COLUMN IF NOT EXISTS planned_shift_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS planned_tasks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- ============================================================================
-- SECTION 9: ADD COLUMNS TO EOD_REPORTS (if missing)
-- ============================================================================

ALTER TABLE eod_reports 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- ============================================================================
-- SECTION 10: ADD COLUMNS TO EOD_SUBMISSIONS (if missing)
-- ============================================================================

ALTER TABLE eod_submissions 
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS rounded_hours INTEGER;

-- ============================================================================
-- SECTION 11: AWARD_POINTS FUNCTION (if missing)
-- ============================================================================

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
  v_current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  SELECT last_weekly_reset, last_monthly_reset 
  INTO v_last_weekly_reset, v_last_monthly_reset
  FROM user_profiles
  WHERE user_id = p_user_id;
  
  IF v_last_weekly_reset IS NULL OR v_last_weekly_reset < v_current_week_start THEN
    UPDATE user_profiles
    SET weekly_points = 0, last_weekly_reset = v_current_week_start
    WHERE user_id = p_user_id;
  END IF;
  
  IF v_last_monthly_reset IS NULL OR v_last_monthly_reset < v_current_month_start THEN
    UPDATE user_profiles
    SET monthly_points = 0, last_monthly_reset = v_current_month_start
    WHERE user_id = p_user_id;
  END IF;
  
  UPDATE user_profiles
  SET 
    total_points = total_points + p_points,
    weekly_points = weekly_points + p_points,
    monthly_points = monthly_points + p_points
  WHERE user_id = p_user_id;
  
  INSERT INTO points_history (user_id, points, reason, task_id)
  VALUES (p_user_id, p_points, p_reason, p_task_id);
  
  DELETE FROM points_history
  WHERE id IN (
    SELECT id FROM points_history
    WHERE user_id = p_user_id
    ORDER BY timestamp DESC
    OFFSET 50
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION award_points TO authenticated;

-- ============================================================================
-- SECTION 12: CALCULATE_TASK_POINTS FUNCTION (if missing)
-- ============================================================================

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
  CASE p_task_type
    WHEN 'Quick Task' THEN v_points := v_points + 3;
    WHEN 'Standard Task' THEN v_points := v_points + 5;
    WHEN 'Deep Work Task' THEN v_points := v_points + 10;
    WHEN 'Long Task' THEN v_points := v_points + 12;
    WHEN 'Very Long Task' THEN v_points := v_points + 15;
    ELSE v_points := v_points + 3;
  END CASE;
  
  CASE p_task_priority
    WHEN 'Immediate Impact Task' THEN v_points := v_points + 5;
    WHEN 'Daily Task' THEN v_points := v_points + 3;
    WHEN 'Weekly Task' THEN v_points := v_points + 2;
    WHEN 'Monthly Task' THEN v_points := v_points + 1;
    WHEN 'Evergreen Task' THEN v_points := v_points + 1;
    WHEN 'Trigger Task' THEN v_points := v_points + 3;
  END CASE;
  
  IF p_focus_score >= 90 THEN
    v_points := v_points + 5;
  ELSIF p_focus_score >= 75 THEN
    v_points := v_points + 3;
  END IF;
  
  IF p_goal_duration_minutes > 0 AND p_actual_duration_minutes > 0 THEN
    v_duration_diff := ABS(p_actual_duration_minutes - p_goal_duration_minutes);
    v_accuracy_percent := (v_duration_diff / p_goal_duration_minutes) * 100;
    IF v_accuracy_percent <= 20 THEN
      v_points := v_points + 3;
    END IF;
  END IF;
  
  IF p_mood_answered THEN v_points := v_points + 2; END IF;
  IF p_energy_answered THEN v_points := v_points + 2; END IF;
  IF p_enjoyment_answered THEN v_points := v_points + 1; END IF;
  IF p_task_enjoyment >= 4 THEN v_points := v_points + 2; END IF;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

GRANT EXECUTE ON FUNCTION calculate_task_points TO authenticated;

-- ============================================================================
-- SECTION 13: GET_USER_POINTS_SUMMARY FUNCTION (if missing)
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION get_user_points_summary TO authenticated;

-- ============================================================================
-- SECTION 14: CALCULATE_SHIFT_HOURS FUNCTION & TRIGGER (if missing)
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_shift_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_total_seconds INTEGER;
  v_actual_hours NUMERIC;
  v_rounded_hours INTEGER;
BEGIN
  IF NEW.clocked_out_at IS NOT NULL AND (OLD.clocked_out_at IS NULL OR OLD.clocked_out_at IS DISTINCT FROM NEW.clocked_out_at) THEN
    v_total_seconds := EXTRACT(EPOCH FROM (NEW.clocked_out_at - NEW.clocked_in_at))::INTEGER;
    v_actual_hours := v_total_seconds / 3600.0;
    v_rounded_hours := ROUND(v_actual_hours);
    
    NEW.actual_hours := v_actual_hours;
    NEW.rounded_hours := v_rounded_hours;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_shift_hours ON eod_clock_ins;
CREATE TRIGGER trg_calculate_shift_hours
BEFORE UPDATE ON eod_clock_ins
FOR EACH ROW
EXECUTE FUNCTION calculate_shift_hours();

-- ============================================================================
-- SECTION 15: UPDATE_EOD_REPORT_HOURS FUNCTION & TRIGGER (if missing)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_eod_report_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_clock_in_data RECORD;
BEGIN
  SELECT actual_hours, rounded_hours
  INTO v_clock_in_data
  FROM eod_clock_ins
  WHERE user_id = NEW.user_id
  AND DATE(clocked_in_at) = DATE(NEW.created_at)
  ORDER BY clocked_in_at DESC
  LIMIT 1;
  
  IF v_clock_in_data IS NOT NULL THEN
    NEW.actual_hours := v_clock_in_data.actual_hours;
    NEW.rounded_hours := v_clock_in_data.rounded_hours;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_eod_report_hours ON eod_submissions;
CREATE TRIGGER trg_update_eod_report_hours
BEFORE INSERT ON eod_submissions
FOR EACH ROW
EXECUTE FUNCTION update_eod_report_hours();

-- ============================================================================
-- VERIFICATION: Check if everything was created
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ MISSING ITEMS CREATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Run SUPABASE_VERIFICATION_AND_FIX.sql again to verify all items exist';
  RAISE NOTICE '';
END $$;

