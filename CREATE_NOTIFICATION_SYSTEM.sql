-- 🔔 CREATE COMPREHENSIVE NOTIFICATION SYSTEM
-- This creates the notification_log table and survey tracking

-- ============================================================================
-- STEP 1: CREATE NOTIFICATION_LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'survey_completed', 'survey_missed', 'task_progress', 'goal_alert', 'points_earned', 'streak_milestone', 'idle_reminder', 'deep_work_alert'
    category TEXT, -- 'mood', 'energy', 'task_enjoyment', 'task', 'goal', 'points', 'streak', 'alert'
    related_id UUID, -- Reference to related entity (task_id, clock_in_id, etc.)
    metadata JSONB, -- Additional data (points earned, streak count, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_log_user_id ON notification_log(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_user_unread ON notification_log(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_type ON notification_log(type);

-- Add RLS policies
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notification_log;
CREATE POLICY "Users can view own notifications" ON notification_log
    FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notifications" ON notification_log;
CREATE POLICY "Users can insert own notifications" ON notification_log
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notification_log;
CREATE POLICY "Users can update own notifications" ON notification_log
    FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all notifications" ON notification_log;
CREATE POLICY "Admins can view all notifications" ON notification_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- ============================================================================
-- STEP 2: ADD SURVEY TRACKING COLUMNS TO USER_PROFILES
-- ============================================================================

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS survey_answered_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS survey_missed_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_survey_reset_date DATE DEFAULT CURRENT_DATE;

COMMENT ON COLUMN user_profiles.survey_answered_count IS 'Total surveys answered today (resets daily)';
COMMENT ON COLUMN user_profiles.survey_missed_count IS 'Total surveys missed today (resets daily)';
COMMENT ON COLUMN user_profiles.last_survey_reset_date IS 'Last date survey counts were reset';

-- ============================================================================
-- STEP 3: CREATE FUNCTION TO LOG NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_notification(
    p_user_id UUID,
    p_message TEXT,
    p_type TEXT,
    p_category TEXT DEFAULT NULL,
    p_related_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notification_log (
        user_id,
        message,
        type,
        category,
        related_id,
        metadata
    ) VALUES (
        p_user_id,
        p_message,
        p_type,
        p_category,
        p_related_id,
        p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: CREATE FUNCTION TO UPDATE SURVEY COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_survey_count(
    p_user_id UUID,
    p_answered BOOLEAN -- TRUE if answered, FALSE if missed
)
RETURNS VOID AS $$
BEGIN
    -- Reset counts if it's a new day
    UPDATE user_profiles
    SET 
        survey_answered_count = 0,
        survey_missed_count = 0,
        last_survey_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id
      AND last_survey_reset_date < CURRENT_DATE;
    
    -- Update the appropriate count
    IF p_answered THEN
        UPDATE user_profiles
        SET survey_answered_count = survey_answered_count + 1
        WHERE user_id = p_user_id;
    ELSE
        UPDATE user_profiles
        SET survey_missed_count = survey_missed_count + 1
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: CREATE FUNCTION TO GET UNREAD NOTIFICATION COUNT
-- ============================================================================

CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM notification_log
    WHERE user_id = p_user_id
      AND is_read = FALSE
      AND created_at >= CURRENT_DATE; -- Only today's notifications
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: VERIFY INSTALLATION
-- ============================================================================

SELECT 
    'Notification System Installed!' AS status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'notification_log') AS table_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'survey_answered_count') AS survey_columns_exist,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'log_notification') AS log_function_exists,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'update_survey_count') AS survey_function_exists;

