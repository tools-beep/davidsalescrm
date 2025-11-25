-- Migration: Smart DAR Points System
-- Date: 2025-11-24
-- Purpose: Implement complete points tracking, history, and user totals

-- ✅ 1. Add points_awarded to eod_time_entries
ALTER TABLE eod_time_entries 
ADD COLUMN IF NOT EXISTS points_awarded INTEGER DEFAULT 0;

COMMENT ON COLUMN eod_time_entries.points_awarded IS 
'Points awarded for completing this task. Calculated from task type, priority, focus, accuracy, and bonuses.';

-- ✅ 2. Add points fields to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS weekly_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS monthly_points INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_weekly_reset DATE,
ADD COLUMN IF NOT EXISTS last_monthly_reset DATE;

COMMENT ON COLUMN user_profiles.total_points IS 'Lifetime total points earned';
COMMENT ON COLUMN user_profiles.weekly_points IS 'Points earned this week (resets Monday)';
COMMENT ON COLUMN user_profiles.monthly_points IS 'Points earned this month (resets 1st)';
COMMENT ON COLUMN user_profiles.last_weekly_reset IS 'Last date weekly points were reset';
COMMENT ON COLUMN user_profiles.last_monthly_reset IS 'Last date monthly points were reset';

-- ✅ 3. Create points_history table
CREATE TABLE IF NOT EXISTS points_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(user_id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  task_id UUID REFERENCES eod_time_entries(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_points_history_user_timestamp 
ON points_history(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_points_history_task 
ON points_history(task_id) WHERE task_id IS NOT NULL;

-- Add index for eod_time_entries points
CREATE INDEX IF NOT EXISTS idx_time_entries_points 
ON eod_time_entries(user_id, points_awarded) WHERE points_awarded > 0;

-- ✅ 4. Enable RLS on points_history
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own points history
CREATE POLICY "Users can view own points history" ON points_history
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own points history (via triggers/functions)
CREATE POLICY "Users can insert own points history" ON points_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all points history
CREATE POLICY "Admins can view all points history" ON points_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ✅ 5. Create function to award points
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

-- ✅ 6. Create function to calculate task points
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
    ELSE v_points := v_points + 3; -- Default
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

-- ✅ 7. Create trigger to auto-award points on task completion
CREATE OR REPLACE FUNCTION trigger_award_task_points()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_focus_score INTEGER := 80; -- Default, will be calculated properly in app
  v_actual_minutes INTEGER;
  v_mood_answered BOOLEAN := FALSE;
  v_energy_answered BOOLEAN := FALSE;
  v_enjoyment_answered BOOLEAN := FALSE;
BEGIN
  -- Only award points when task is completed (ended_at is set)
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at IS DISTINCT FROM NEW.ended_at) THEN
    
    -- Calculate actual duration in minutes
    v_actual_minutes := COALESCE(NEW.accumulated_seconds, 0) / 60;
    
    -- Check if surveys were answered (simplified - will be enhanced in app)
    v_enjoyment_answered := (NEW.task_enjoyment IS NOT NULL);
    
    -- Calculate points
    v_points := calculate_task_points(
      COALESCE(NEW.task_type, 'Standard Task'),
      COALESCE(NEW.task_priority, 'Daily Task'),
      v_focus_score,
      COALESCE(NEW.goal_duration_minutes, 0),
      v_actual_minutes,
      COALESCE(NEW.task_enjoyment, 3),
      v_mood_answered,
      v_energy_answered,
      v_enjoyment_answered
    );
    
    -- Update task with points
    NEW.points_awarded := v_points;
    
    -- Award points to user
    PERFORM award_points(
      NEW.user_id,
      v_points,
      'Task Completed: ' || LEFT(NEW.task_description, 50),
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_award_task_points ON eod_time_entries;

-- Create trigger
CREATE TRIGGER trg_award_task_points
BEFORE UPDATE ON eod_time_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_award_task_points();

-- ✅ 8. Create function to get user points summary
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

-- ✅ 9. Grant permissions
GRANT EXECUTE ON FUNCTION award_points TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_task_points TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_points_summary TO authenticated;

-- ✅ 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_points 
ON user_profiles(user_id, total_points DESC);

CREATE INDEX IF NOT EXISTS idx_points_history_recent 
ON points_history(user_id, timestamp DESC) 
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days';

-- ✅ 11. Add comments for documentation
COMMENT ON TABLE points_history IS 
'Stores the last 50 point events per user for the Smart DAR Points System. Automatically cleaned up by award_points function.';

COMMENT ON FUNCTION award_points IS 
'Awards points to a user, updates totals (lifetime, weekly, monthly), and records in history. Automatically resets weekly/monthly points.';

COMMENT ON FUNCTION calculate_task_points IS 
'Calculates points for a completed task based on type, priority, focus, accuracy, surveys, and enjoyment.';

COMMENT ON FUNCTION get_user_points_summary IS 
'Returns comprehensive points summary for a user including totals, today, and recent history.';

