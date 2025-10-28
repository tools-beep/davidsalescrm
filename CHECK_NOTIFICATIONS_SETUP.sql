-- Check if notifications table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'admin_notifications'
) as table_exists;

-- Check if triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notify_task_started',
  'trigger_notify_clock_in',
  'trigger_notify_new_feedback'
);

-- Check if there are any notifications in the table (if it exists)
SELECT COUNT(*) as notification_count 
FROM admin_notifications;

-- Check recent notifications (if any)
SELECT type, title, message, created_at, is_read
FROM admin_notifications
ORDER BY created_at DESC
LIMIT 10;

