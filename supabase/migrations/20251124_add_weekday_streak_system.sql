-- Migration: Add Weekday-Only Streak System
-- Date: 2025-11-24
-- Purpose: Implement new fair streak system that tracks Mon-Fri only

-- ✅ Add streak fields to user_profiles (or create streak tracking table)
-- Option 1: Add to existing user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS weekday_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_weekday_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weekend_bonus_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_date DATE,
ADD COLUMN IF NOT EXISTS streak_last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add comments
COMMENT ON COLUMN user_profiles.weekday_streak IS 
'Current consecutive weekday (Mon-Fri) streak. Weekends do not break streaks.';

COMMENT ON COLUMN user_profiles.longest_weekday_streak IS 
'Longest weekday streak ever achieved by this user.';

COMMENT ON COLUMN user_profiles.weekend_bonus_streak IS 
'Count of weekend days worked recently (bonus streak, separate from main streak).';

COMMENT ON COLUMN user_profiles.last_submission_date IS 
'Date of last DAR submission (used for streak calculation).';

-- ✅ Create streak history table
CREATE TABLE IF NOT EXISTS streak_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  streak_value INTEGER NOT NULL DEFAULT 0,
  is_weekday BOOLEAN NOT NULL,
  was_submitted BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_streak_history_user_date 
ON streak_history(user_id, date DESC);

-- Add comments
COMMENT ON TABLE streak_history IS 
'Historical record of daily streak values for each user. Used for analytics and insights.';

COMMENT ON COLUMN streak_history.streak_value IS 
'The weekday streak value on this date.';

COMMENT ON COLUMN streak_history.is_weekday IS 
'Whether this date was a weekday (Mon-Fri).';

COMMENT ON COLUMN streak_history.was_submitted IS 
'Whether the user submitted a DAR on this date.';

-- ✅ Add streak fields to weekly_summary (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_summary') THEN
    ALTER TABLE weekly_summary 
    ADD COLUMN IF NOT EXISTS weekday_streak_start INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weekday_streak_end INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weekend_bonus_earned INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS streak_resets INTEGER DEFAULT 0;
    
    COMMENT ON COLUMN weekly_summary.weekday_streak_start IS 
    'Weekday streak value at the start of this week.';
    
    COMMENT ON COLUMN weekly_summary.weekday_streak_end IS 
    'Weekday streak value at the end of this week.';
    
    COMMENT ON COLUMN weekly_summary.weekend_bonus_earned IS 
    'Number of weekend days worked this week.';
    
    COMMENT ON COLUMN weekly_summary.streak_resets IS 
    'Number of times streak reset to 0 during this week.';
  END IF;
END $$;

-- ✅ Add streak fields to monthly_summary (if table exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'monthly_summary') THEN
    ALTER TABLE monthly_summary 
    ADD COLUMN IF NOT EXISTS weekday_streak_start INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS weekday_streak_end INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS longest_streak_this_month INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_weekend_bonus INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_streak_resets INTEGER DEFAULT 0;
    
    COMMENT ON COLUMN monthly_summary.weekday_streak_start IS 
    'Weekday streak value at the start of this month.';
    
    COMMENT ON COLUMN monthly_summary.weekday_streak_end IS 
    'Weekday streak value at the end of this month.';
    
    COMMENT ON COLUMN monthly_summary.longest_streak_this_month IS 
    'Longest weekday streak achieved during this month.';
    
    COMMENT ON COLUMN monthly_summary.total_weekend_bonus IS 
    'Total weekend days worked this month.';
    
    COMMENT ON COLUMN monthly_summary.total_streak_resets IS 
    'Number of times streak reset to 0 during this month.';
  END IF;
END $$;

-- ✅ RLS Policies for streak_history
ALTER TABLE streak_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own streak history
CREATE POLICY "Users can view own streak history" 
ON streak_history FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own streak history
CREATE POLICY "Users can insert own streak history" 
ON streak_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view all streak history
CREATE POLICY "Admins can view all streak history" 
ON streak_history FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
    AND user_profiles.role = 'admin'
  )
);

-- ✅ Function to update streak on DAR submission
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
DECLARE
  submission_date DATE;
  is_weekday_submission BOOLEAN;
  previous_streak INTEGER;
  new_streak INTEGER;
BEGIN
  -- Get submission date
  submission_date := DATE(NEW.submitted_at);
  
  -- Check if it's a weekday (1=Mon, 5=Fri)
  is_weekday_submission := EXTRACT(DOW FROM submission_date) BETWEEN 1 AND 5;
  
  -- Get current streak
  SELECT weekday_streak INTO previous_streak
  FROM user_profiles
  WHERE id = NEW.user_id;
  
  IF is_weekday_submission THEN
    -- Update weekday streak
    -- (Full logic would be implemented in application code for accuracy)
    -- This is a simple increment for now
    new_streak := COALESCE(previous_streak, 0) + 1;
    
    UPDATE user_profiles
    SET 
      weekday_streak = new_streak,
      longest_weekday_streak = GREATEST(COALESCE(longest_weekday_streak, 0), new_streak),
      last_submission_date = submission_date,
      streak_last_updated_at = NOW()
    WHERE id = NEW.user_id;
  ELSE
    -- Weekend submission - update bonus streak
    UPDATE user_profiles
    SET 
      weekend_bonus_streak = COALESCE(weekend_bonus_streak, 0) + 1,
      last_submission_date = submission_date,
      streak_last_updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  -- Insert into streak history
  INSERT INTO streak_history (user_id, date, streak_value, is_weekday, was_submitted)
  VALUES (NEW.user_id, submission_date, new_streak, is_weekday_submission, TRUE)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET 
    streak_value = EXCLUDED.streak_value,
    was_submitted = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Trigger on eod_submissions table
DROP TRIGGER IF EXISTS trigger_update_streak ON eod_submissions;

CREATE TRIGGER trigger_update_streak
AFTER INSERT ON eod_submissions
FOR EACH ROW
EXECUTE FUNCTION update_user_streak();

-- Note: The trigger provides basic streak tracking, but the main streak calculation
-- logic should be implemented in the application code (src/utils/streakCalculation.ts)
-- for more accurate handling of edge cases, weekends, and historical data.

