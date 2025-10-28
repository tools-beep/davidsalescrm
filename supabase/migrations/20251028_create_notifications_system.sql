-- Create notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'task_started', 'clock_in', 'feedback', 'clock_out'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- User who triggered the notification
    user_name TEXT, -- Cached user name for display
    related_id UUID, -- ID of related record (task, feedback, etc)
    redirect_url TEXT, -- Where to navigate when clicked
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for admins to view all notifications
CREATE POLICY "Admins can view all notifications." ON admin_notifications
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Policy for admins to update notifications (mark as read)
CREATE POLICY "Admins can update notifications." ON admin_notifications
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Policy for admins to delete notifications
CREATE POLICY "Admins can delete notifications." ON admin_notifications
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Policy for system to insert notifications
CREATE POLICY "System can insert notifications." ON admin_notifications
FOR INSERT WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread 
ON admin_notifications(is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_type 
ON admin_notifications(type, created_at DESC);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_user_id UUID,
    p_user_name TEXT,
    p_related_id UUID DEFAULT NULL,
    p_redirect_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO admin_notifications (
        type, title, message, user_id, user_name, related_id, redirect_url
    ) VALUES (
        p_type, p_title, p_message, p_user_id, p_user_name, p_related_id, p_redirect_url
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for task started notifications
CREATE OR REPLACE FUNCTION notify_task_started()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_client_name TEXT;
BEGIN
    -- Only notify when a task is started (started_at is set and ended_at is null)
    IF NEW.started_at IS NOT NULL AND NEW.ended_at IS NULL AND (OLD.started_at IS NULL OR OLD IS NULL) THEN
        -- Get user name
        SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
        FROM user_profiles
        WHERE user_id = NEW.user_id;
        
        -- Get client name from the entry
        v_client_name := NEW.client_name;
        
        -- Create notification
        PERFORM create_admin_notification(
            'task_started',
            'New Task Started',
            v_user_name || ' started working on: ' || COALESCE(NEW.task_description, 'a task') || ' for ' || v_client_name,
            NEW.user_id,
            v_user_name,
            NEW.id,
            '/admin?tab=live'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for clock in notifications
CREATE OR REPLACE FUNCTION notify_clock_in()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Only notify on new clock-ins (not updates)
    IF NEW.clocked_in_at IS NOT NULL AND (OLD IS NULL OR OLD.clocked_in_at IS NULL) THEN
        -- Get user name
        SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
        FROM user_profiles
        WHERE user_id = NEW.user_id;
        
        -- Create notification
        PERFORM create_admin_notification(
            'clock_in',
            'User Clocked In',
            v_user_name || ' clocked in for ' || NEW.client_name,
            NEW.user_id,
            v_user_name,
            NEW.id,
            '/admin?tab=live'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for feedback notifications
CREATE OR REPLACE FUNCTION notify_new_feedback()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Only notify on new feedback
    IF OLD IS NULL THEN
        -- Get user name
        SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
        FROM user_profiles
        WHERE user_id = NEW.user_id;
        
        -- Create notification
        PERFORM create_admin_notification(
            'feedback',
            'New Feedback Received',
            v_user_name || ' submitted feedback: ' || NEW.subject,
            NEW.user_id,
            v_user_name,
            NEW.id,
            '/admin?tab=feedback'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_task_started ON eod_time_entries;
CREATE TRIGGER trigger_notify_task_started
    AFTER INSERT OR UPDATE ON eod_time_entries
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_started();

DROP TRIGGER IF EXISTS trigger_notify_clock_in ON eod_clock_ins;
CREATE TRIGGER trigger_notify_clock_in
    AFTER INSERT OR UPDATE ON eod_clock_ins
    FOR EACH ROW
    EXECUTE FUNCTION notify_clock_in();

DROP TRIGGER IF EXISTS trigger_notify_new_feedback ON user_feedback;
CREATE TRIGGER trigger_notify_new_feedback
    AFTER INSERT ON user_feedback
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_feedback();

-- Comments
COMMENT ON TABLE admin_notifications IS 'Stores notifications for admin users';
COMMENT ON COLUMN admin_notifications.type IS 'Type of notification: task_started, clock_in, feedback, clock_out';
COMMENT ON COLUMN admin_notifications.redirect_url IS 'URL to navigate to when notification is clicked';
COMMENT ON COLUMN admin_notifications.is_read IS 'Whether the notification has been read';

