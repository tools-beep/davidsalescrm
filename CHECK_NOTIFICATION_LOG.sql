-- 🔍 CHECK: Why is notification log empty?

-- ============================================================================
-- STEP 1: Check if notification_log table exists
-- ============================================================================

SELECT 
    'Notification Log Table Check' AS check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log')
        THEN '✅ Table EXISTS'
        ELSE '❌ Table MISSING'
    END AS table_status;

-- ============================================================================
-- STEP 2: Check if there are ANY notifications in the log
-- ============================================================================

SELECT 
    'Total Notifications' AS check_type,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS today_count,
    COUNT(CASE WHEN is_read = FALSE THEN 1 END) AS unread_count
FROM notification_log;

-- ============================================================================
-- STEP 3: Show recent notifications (last 10)
-- ============================================================================

SELECT 
    'Recent Notifications' AS check_type,
    id,
    user_id,
    message,
    type,
    category,
    is_read,
    created_at
FROM notification_log
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 4: Check if mood/energy entries were saved
-- ============================================================================

SELECT 
    'Mood Entries Today' AS check_type,
    COUNT(*) AS count,
    ARRAY_AGG(mood_level) AS moods,
    MAX(timestamp) AS last_entry
FROM mood_entries
WHERE DATE(timestamp) = CURRENT_DATE;

SELECT 
    'Energy Entries Today' AS check_type,
    COUNT(*) AS count,
    ARRAY_AGG(energy_level) AS energy_levels,
    MAX(timestamp) AS last_entry
FROM energy_entries
WHERE DATE(timestamp) = CURRENT_DATE;

-- ============================================================================
-- STEP 5: Check RLS policies on notification_log
-- ============================================================================

SELECT 
    'RLS Policies' AS check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'notification_log';

