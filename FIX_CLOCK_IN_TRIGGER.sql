-- 🚨 CRITICAL FIX: Clock-In Trigger Causing NULL Message Error
-- 
-- ROOT CAUSE:
-- The notify_clock_in() trigger was using NEW.client_name, but the new
-- clock-in system doesn't use client_name anymore (it's a global clock-in).
-- This caused the message to be NULL, violating the not-null constraint.
--
-- THE FIX:
-- Update the trigger to work without client_name and handle NULL cases.

CREATE OR REPLACE FUNCTION notify_clock_in()
RETURNS TRIGGER AS $$
DECLARE
    v_user_name TEXT;
    v_message TEXT;
BEGIN
    -- Only notify on new clock-ins (not updates)
    IF NEW.clocked_in_at IS NOT NULL AND (OLD IS NULL OR OLD.clocked_in_at IS NULL) THEN
        -- Get user name
        SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
        FROM user_profiles
        WHERE user_id = NEW.user_id;
        
        -- Handle NULL user_name
        IF v_user_name IS NULL OR v_user_name = '' THEN
            v_user_name := 'A user';
        END IF;
        
        -- Build message without client_name (since it's no longer used)
        v_message := v_user_name || ' clocked in';
        
        -- Add shift plan info if available
        IF NEW.planned_shift_minutes IS NOT NULL AND NEW.planned_shift_minutes > 0 THEN
            v_message := v_message || ' for a ' || 
                        FLOOR(NEW.planned_shift_minutes / 60) || 'h ' || 
                        (NEW.planned_shift_minutes % 60) || 'm shift';
        END IF;
        
        -- Add task goal if available
        IF NEW.daily_task_goal IS NOT NULL AND NEW.daily_task_goal > 0 THEN
            v_message := v_message || ' (Goal: ' || NEW.daily_task_goal || ' tasks)';
        END IF;
        
        -- Create notification with guaranteed non-null message
        PERFORM create_admin_notification(
            'clock_in',
            'User Clocked In',
            v_message,
            NEW.user_id,
            v_user_name,
            NEW.id,
            '/admin?tab=live'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_notify_clock_in'
  AND event_object_table = 'eod_clock_ins';

