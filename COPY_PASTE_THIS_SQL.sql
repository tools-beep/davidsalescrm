-- ============================================
-- NOTIFICATION SYSTEM - COMPLETE SETUP
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================

-- Step 1: Create the admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL, -- 'task_started', 'clock_in', 'feedback'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    redirect_url TEXT,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable Row Level Security
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS Policies for Admins
DROP POLICY IF EXISTS "Admins can view all notifications." ON admin_notifications;
CREATE POLICY "Admins can view all notifications." ON admin_notifications
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can update their notifications." ON admin_notifications;
CREATE POLICY "Admins can update their notifications." ON admin_notifications
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Admins can delete notifications." ON admin_notifications;
CREATE POLICY "Admins can delete notifications." ON admin_notifications
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    )
);

-- Step 4: Create helper function to create notifications
CREATE OR REPLACE FUNCTION create_admin_notification(
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_user_id UUID,
    p_redirect_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.admin_notifications (type, title, message, user_id, redirect_url)
    VALUES (p_type, p_title, p_message, p_user_id, p_redirect_url);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger function for new tasks
CREATE OR REPLACE FUNCTION notify_new_task_started()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_client_name TEXT;
BEGIN
    -- Get user's full name
    SELECT COALESCE(first_name || ' ' || last_name, email) 
    INTO v_user_name 
    FROM public.user_profiles 
    WHERE user_id = NEW.user_id;
    
    -- Get client name from the new entry
    v_client_name := NEW.client_name;

    -- Create notification
    PERFORM create_admin_notification(
        'task_started',
        'New Task Started by ' || COALESCE(v_user_name, 'Unknown User'),
        COALESCE(v_user_name, 'Unknown User') || ' started a new task for ' || COALESCE(v_client_name, 'Unknown Client') || ': ' || COALESCE(NEW.task_description, 'No description'),
        NEW.user_id,
        '/admin?tab=live'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create trigger for task started
DROP TRIGGER IF EXISTS trigger_notify_task_started ON public.eod_time_entries;
CREATE TRIGGER trigger_notify_task_started
AFTER INSERT ON public.eod_time_entries
FOR EACH ROW
EXECUTE FUNCTION notify_new_task_started();

-- Step 7: Create trigger function for clock-in
CREATE OR REPLACE FUNCTION notify_user_clocked_in()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_client_name TEXT;
BEGIN
    -- Get user's full name
    SELECT COALESCE(first_name || ' ' || last_name, email) 
    INTO v_user_name 
    FROM public.user_profiles 
    WHERE user_id = NEW.user_id;
    
    -- Get client name from the new entry
    v_client_name := NEW.client_name;

    -- Create notification
    PERFORM create_admin_notification(
        'clock_in',
        COALESCE(v_user_name, 'Unknown User') || ' Clocked In',
        COALESCE(v_user_name, 'Unknown User') || ' clocked in for ' || COALESCE(v_client_name, 'a client') || ' at ' || TO_CHAR(NEW.clocked_in_at, 'HH12:MI AM'),
        NEW.user_id,
        '/admin?tab=live'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger for clock-in
DROP TRIGGER IF EXISTS trigger_notify_clock_in ON public.eod_clock_ins;
CREATE TRIGGER trigger_notify_clock_in
AFTER INSERT ON public.eod_clock_ins
FOR EACH ROW
EXECUTE FUNCTION notify_user_clocked_in();

-- Step 9: Create trigger function for feedback
CREATE OR REPLACE FUNCTION notify_new_feedback()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
BEGIN
    -- Get user's full name
    SELECT COALESCE(first_name || ' ' || last_name, email) 
    INTO v_user_name 
    FROM public.user_profiles 
    WHERE user_id = NEW.user_id;

    -- Create notification
    PERFORM create_admin_notification(
        'feedback',
        'New Feedback from ' || COALESCE(v_user_name, 'Unknown User'),
        'Subject: ' || NEW.subject || '. Message: ' || LEFT(NEW.message, 100) || '...',
        NEW.user_id,
        '/admin?tab=feedback'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Create trigger for feedback
DROP TRIGGER IF EXISTS trigger_notify_new_feedback ON public.user_feedback;
CREATE TRIGGER trigger_notify_new_feedback
AFTER INSERT ON public.user_feedback
FOR EACH ROW
EXECUTE FUNCTION notify_new_feedback();

-- Step 11: Enable Realtime for admin_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE admin_notifications;

-- ============================================
-- VERIFICATION QUERIES
-- Run these after the above to verify setup
-- ============================================

-- Check if table exists
SELECT 'Table exists: ' || EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'admin_notifications'
)::text as status;

-- Check triggers
SELECT 'Triggers installed: ' || COUNT(*)::text || '/3' as status
FROM information_schema.triggers
WHERE trigger_name IN (
    'trigger_notify_task_started',
    'trigger_notify_clock_in',
    'trigger_notify_new_feedback'
);

-- Check RLS
SELECT 'RLS enabled: ' || relrowsecurity::text as status
FROM pg_class
WHERE relname = 'admin_notifications';

-- Check policies
SELECT 'Policies created: ' || COUNT(*)::text as status
FROM pg_policies
WHERE tablename = 'admin_notifications';

-- Create a test notification
SELECT create_admin_notification(
    'task_started',
    'Test Notification - Setup Complete!',
    'If you see this in your admin portal, the notification system is working perfectly!',
    auth.uid(),
    '/admin?tab=live'
);

-- Check if test notification was created
SELECT 'Test notification created: ' || EXISTS (
    SELECT FROM admin_notifications 
    WHERE title LIKE '%Test Notification%'
)::text as status;

-- Show the test notification
SELECT id, type, title, message, created_at, is_read
FROM admin_notifications
WHERE title LIKE '%Test Notification%'
ORDER BY created_at DESC
LIMIT 1;

