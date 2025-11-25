-- 🚨 COMPREHENSIVE SMART DAR DIAGNOSTIC & FIX
-- Run this to check ALL systems and fix stale clock-ins

-- ============================================================================
-- STEP 1: FIX STALE CLOCK-INS (BLOCKING ISSUE)
-- ============================================================================

UPDATE eod_clock_ins
SET clocked_out_at = NOW()
WHERE clocked_out_at IS NULL
  AND date = CURRENT_DATE;

SELECT 'Stale clock-ins fixed!' AS status;

-- ============================================================================
-- STEP 2: CHECK SURVEY DATA (Energy Metric Dependency)
-- ============================================================================

-- Check mood entries for today
SELECT 
    'Mood Entries Today' AS check_type,
    COUNT(*) AS count,
    MIN(timestamp) AS first_entry,
    MAX(timestamp) AS last_entry
FROM mood_entries
WHERE DATE(timestamp) = CURRENT_DATE;

-- Check energy entries for today
SELECT 
    'Energy Entries Today' AS check_type,
    COUNT(*) AS count,
    MIN(timestamp) AS first_entry,
    MAX(timestamp) AS last_entry
FROM energy_entries
WHERE DATE(timestamp) = CURRENT_DATE;

-- Check if tables exist and have correct schema
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('mood_entries', 'energy_entries')
ORDER BY table_name, ordinal_position;

-- ============================================================================
-- STEP 3: CHECK TIME ENTRIES (All Metrics Dependency)
-- ============================================================================

SELECT 
    'Time Entries Today' AS check_type,
    COUNT(*) AS total_tasks,
    COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN paused_at IS NOT NULL AND ended_at IS NULL THEN 1 END) AS paused_tasks,
    COUNT(CASE WHEN ended_at IS NULL AND paused_at IS NULL THEN 1 END) AS active_tasks
FROM eod_time_entries
WHERE DATE(started_at) = CURRENT_DATE;

-- Check if task metadata columns exist
SELECT 
    'Task Metadata Columns' AS check_type,
    COUNT(*) FILTER (WHERE column_name = 'task_type') AS has_task_type,
    COUNT(*) FILTER (WHERE column_name = 'task_priority') AS has_task_priority,
    COUNT(*) FILTER (WHERE column_name = 'task_categories') AS has_task_categories,
    COUNT(*) FILTER (WHERE column_name = 'goal_duration_minutes') AS has_goal_duration,
    COUNT(*) FILTER (WHERE column_name = 'task_enjoyment') AS has_task_enjoyment,
    COUNT(*) FILTER (WHERE column_name = 'task_intent') AS has_task_intent
FROM information_schema.columns
WHERE table_name = 'eod_time_entries';

-- ============================================================================
-- STEP 4: CHECK CLOCK-IN DATA (Utilization & Consistency Dependency)
-- ============================================================================

SELECT 
    'Clock-In Data Today' AS check_type,
    COUNT(*) AS total_clock_ins,
    COUNT(CASE WHEN clocked_out_at IS NOT NULL THEN 1 END) AS completed_shifts,
    COUNT(CASE WHEN clocked_out_at IS NULL THEN 1 END) AS active_shifts,
    COUNT(CASE WHEN planned_shift_minutes IS NOT NULL THEN 1 END) AS has_shift_plan,
    COUNT(CASE WHEN daily_task_goal IS NOT NULL THEN 1 END) AS has_task_goal
FROM eod_clock_ins
WHERE date = CURRENT_DATE;

-- ============================================================================
-- STEP 5: CHECK NOTIFICATION LOG TABLE
-- ============================================================================

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_log')
        THEN 'notification_log table EXISTS'
        ELSE '❌ notification_log table MISSING'
    END AS status;

-- ============================================================================
-- STEP 6: SUMMARY REPORT
-- ============================================================================

SELECT 
    '=== SMART DAR SYSTEM STATUS ===' AS report_section,
    (SELECT COUNT(*) FROM mood_entries WHERE DATE(timestamp) = CURRENT_DATE) AS mood_entries_today,
    (SELECT COUNT(*) FROM energy_entries WHERE DATE(timestamp) = CURRENT_DATE) AS energy_entries_today,
    (SELECT COUNT(*) FROM eod_time_entries WHERE DATE(started_at) = CURRENT_DATE) AS tasks_today,
    (SELECT COUNT(*) FROM eod_clock_ins WHERE date = CURRENT_DATE) AS clock_ins_today,
    (SELECT COUNT(*) FROM eod_clock_ins WHERE date = CURRENT_DATE AND clocked_out_at IS NULL) AS active_clock_ins;

