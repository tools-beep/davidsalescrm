-- ============================================================================
-- SURVEY EVENTS TABLE - Track all mood and energy check-in events
-- ============================================================================
-- This table logs EVERY survey popup event, whether answered or missed.
-- Used for:
-- - Calculating engagement penalty for metrics
-- - Tracking survey response rates
-- - Points system (answered = +2, missed = 0)
-- - Behavior insights and notifications
-- ============================================================================

-- Create survey_events table
CREATE TABLE IF NOT EXISTS survey_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mood', 'energy')),
  value TEXT, -- The survey response value (null if missed)
  responded BOOLEAN NOT NULL DEFAULT false,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comments
COMMENT ON TABLE survey_events IS 'Logs all mood and energy check-in events (answered and missed)';
COMMENT ON COLUMN survey_events.type IS 'Type of survey: mood or energy';
COMMENT ON COLUMN survey_events.value IS 'The survey response value (null if survey was missed)';
COMMENT ON COLUMN survey_events.responded IS 'Whether the user responded to the survey (false = missed)';
COMMENT ON COLUMN survey_events.timestamp IS 'When the survey event occurred';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_survey_events_user_timestamp 
ON survey_events(user_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_survey_events_user_type 
ON survey_events(user_id, type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_survey_events_user_responded 
ON survey_events(user_id, responded, timestamp DESC);

-- Note: Removed partial index with CURRENT_DATE as it requires IMMUTABLE functions
-- The existing indexes on (user_id, timestamp DESC) are sufficient for daily queries

-- Enable Row Level Security
ALTER TABLE survey_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own survey events
CREATE POLICY "Users can view own survey events" ON survey_events
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own survey events
CREATE POLICY "Users can insert own survey events" ON survey_events
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all survey events
CREATE POLICY "Admins can view all survey events" ON survey_events
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================================================
-- HELPER FUNCTION: Get survey miss rate for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_survey_miss_rate(
  p_user_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT CURRENT_DATE,
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  total_surveys INTEGER,
  missed_surveys INTEGER,
  answered_surveys INTEGER,
  miss_rate NUMERIC,
  engagement_penalty BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_surveys,
    COUNT(*) FILTER (WHERE NOT responded)::INTEGER as missed_surveys,
    COUNT(*) FILTER (WHERE responded)::INTEGER as answered_surveys,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(COUNT(*) FILTER (WHERE NOT responded)::NUMERIC / COUNT(*)::NUMERIC, 2)
      ELSE 0
    END as miss_rate,
    CASE 
      WHEN COUNT(*) > 0 AND 
           COUNT(*) FILTER (WHERE NOT responded)::NUMERIC / COUNT(*)::NUMERIC >= 0.5 
      THEN true
      ELSE false
    END as engagement_penalty
  FROM survey_events
  WHERE user_id = p_user_id
    AND timestamp >= p_start_date
    AND timestamp <= p_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get daily survey stats for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION get_daily_survey_stats(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  mood_answered INTEGER,
  mood_missed INTEGER,
  energy_answered INTEGER,
  energy_missed INTEGER,
  total_points_earned INTEGER
) AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_start_time := p_date::TIMESTAMPTZ;
  v_end_time := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE type = 'mood' AND responded)::INTEGER as mood_answered,
    COUNT(*) FILTER (WHERE type = 'mood' AND NOT responded)::INTEGER as mood_missed,
    COUNT(*) FILTER (WHERE type = 'energy' AND responded)::INTEGER as energy_answered,
    COUNT(*) FILTER (WHERE type = 'energy' AND NOT responded)::INTEGER as energy_missed,
    (COUNT(*) FILTER (WHERE responded) * 2)::INTEGER as total_points_earned
  FROM survey_events
  WHERE user_id = p_user_id
    AND timestamp >= v_start_time
    AND timestamp < v_end_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Add 'responded' column to existing mood_entries and energy_entries if needed
-- (for backward compatibility with existing data)
-- ============================================================================
-- Note: The existing mood_entries and energy_entries tables store ANSWERED surveys.
-- The new survey_events table tracks BOTH answered and missed surveys.
-- This allows us to calculate miss rates and apply penalties.

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_survey_miss_rate TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_survey_stats TO authenticated;

