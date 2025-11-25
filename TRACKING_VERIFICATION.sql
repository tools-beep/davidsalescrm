-- ============================================
-- SMART DAR DASHBOARD TRACKING VERIFICATION
-- ============================================
-- Run these queries in Supabase SQL Editor to verify tracking is working

-- ============================================
-- 1. CHECK IF COLUMNS EXIST (Should return 8 rows)
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'eod_time_entries'
  AND column_name IN (
    'task_categories',
    'task_priority',
    'task_type',
    'goal_duration_minutes',
    'task_intent',
    'task_enjoyment',
    'started_at',
    'accumulated_seconds'
)
ORDER BY column_name;

-- ============================================
-- 2. CHECK CURRENT DATA - Task Modal Fields
-- ============================================
-- This shows how many tasks have Task Modal data filled in
SELECT 
    COUNT(*) as total_tasks,
    COUNT(task_type) as tasks_with_type,
    COUNT(goal_duration_minutes) as tasks_with_goal,
    COUNT(task_intent) as tasks_with_intent,
    COUNT(task_categories) as tasks_with_categories,
    COUNT(task_enjoyment) as tasks_with_enjoyment,
    COUNT(task_priority) as tasks_with_priority,
    ROUND(COUNT(task_type)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as type_fill_rate,
    ROUND(COUNT(task_categories)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as category_fill_rate,
    ROUND(COUNT(task_priority)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) as priority_fill_rate
FROM public.eod_time_entries
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================
-- 3. TASK CATEGORY DISTRIBUTION DATA
-- ============================================
-- Shows what categories are being tracked (for the pie chart)
SELECT 
    unnest(task_categories) as category,
    COUNT(*) as task_count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM public.eod_time_entries WHERE task_categories IS NOT NULL) * 100, 1) as percentage
FROM public.eod_time_entries
WHERE task_categories IS NOT NULL
  AND array_length(task_categories, 1) > 0
GROUP BY category
ORDER BY task_count DESC;

-- ============================================
-- 4. TASK PRIORITY DISTRIBUTION DATA
-- ============================================
-- Shows what priorities are being tracked (for the pie chart)
SELECT 
    task_priority,
    COUNT(*) as task_count,
    ROUND(COUNT(*)::NUMERIC / (SELECT COUNT(*) FROM public.eod_time_entries WHERE task_priority IS NOT NULL) * 100, 1) as percentage
FROM public.eod_time_entries
WHERE task_priority IS NOT NULL
GROUP BY task_priority
ORDER BY task_count DESC;

-- ============================================
-- 5. TASK TYPE DISTRIBUTION
-- ============================================
-- Shows task types for productivity metrics
SELECT 
    task_type,
    COUNT(*) as task_count,
    AVG(goal_duration_minutes) as avg_goal_minutes,
    AVG(duration_minutes) as avg_actual_minutes,
    ROUND(AVG(task_enjoyment), 2) as avg_enjoyment
FROM public.eod_time_entries
WHERE task_type IS NOT NULL
GROUP BY task_type
ORDER BY task_count DESC;

-- ============================================
-- 6. RECENT TASKS WITH FULL TRACKING DATA
-- ============================================
-- Shows the last 10 tasks with all tracking fields
SELECT 
    id,
    user_id,
    client_name,
    LEFT(task_description, 50) as task_desc,
    task_type,
    task_priority,
    task_categories,
    goal_duration_minutes,
    duration_minutes,
    task_enjoyment,
    status,
    created_at
FROM public.eod_time_entries
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- 7. USER-SPECIFIC TRACKING VERIFICATION
-- ============================================
-- Replace 'YOUR_USER_ID' with actual user_id to check specific user
-- SELECT 
--     user_id,
--     COUNT(*) as total_tasks,
--     COUNT(task_type) as with_type,
--     COUNT(task_categories) as with_categories,
--     COUNT(task_priority) as with_priority,
--     COUNT(task_enjoyment) as with_enjoyment
-- FROM public.eod_time_entries
-- WHERE user_id = 'YOUR_USER_ID'
-- GROUP BY user_id;

-- ============================================
-- 8. CHECK IF NEW TASKS ARE BEING TRACKED
-- ============================================
-- Shows tasks created in the last 24 hours with tracking data
SELECT 
    COUNT(*) as tasks_last_24h,
    COUNT(task_type) as with_type,
    COUNT(task_categories) as with_categories,
    COUNT(task_priority) as with_priority,
    COUNT(goal_duration_minutes) as with_goal
FROM public.eod_time_entries
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- ============================================
-- 9. SMART DAR DASHBOARD READINESS CHECK
-- ============================================
-- Comprehensive check for dashboard functionality
SELECT 
    'Task Category Distribution' as feature,
    CASE 
        WHEN COUNT(*) FILTER (WHERE task_categories IS NOT NULL) > 0 
        THEN '✅ TRACKING'
        ELSE '❌ NO DATA YET'
    END as status,
    COUNT(*) FILTER (WHERE task_categories IS NOT NULL) as data_points
FROM public.eod_time_entries

UNION ALL

SELECT 
    'Task Priority Distribution' as feature,
    CASE 
        WHEN COUNT(*) FILTER (WHERE task_priority IS NOT NULL) > 0 
        THEN '✅ TRACKING'
        ELSE '❌ NO DATA YET'
    END as status,
    COUNT(*) FILTER (WHERE task_priority IS NOT NULL) as data_points
FROM public.eod_time_entries

UNION ALL

SELECT 
    'Task Type (Efficiency Metric)' as feature,
    CASE 
        WHEN COUNT(*) FILTER (WHERE task_type IS NOT NULL) > 0 
        THEN '✅ TRACKING'
        ELSE '❌ NO DATA YET'
    END as status,
    COUNT(*) FILTER (WHERE task_type IS NOT NULL) as data_points
FROM public.eod_time_entries

UNION ALL

SELECT 
    'Goal Duration (Efficiency Metric)' as feature,
    CASE 
        WHEN COUNT(*) FILTER (WHERE goal_duration_minutes IS NOT NULL) > 0 
        THEN '✅ TRACKING'
        ELSE '❌ NO DATA YET'
    END as status,
    COUNT(*) FILTER (WHERE goal_duration_minutes IS NOT NULL) as data_points
FROM public.eod_time_entries

UNION ALL

SELECT 
    'Task Enjoyment (Focus Metric)' as feature,
    CASE 
        WHEN COUNT(*) FILTER (WHERE task_enjoyment IS NOT NULL) > 0 
        THEN '✅ TRACKING'
        ELSE '❌ NO DATA YET'
    END as status,
    COUNT(*) FILTER (WHERE task_enjoyment IS NOT NULL) as data_points
FROM public.eod_time_entries;

-- ============================================
-- 10. EXPECTED RESULT INTERPRETATION
-- ============================================
/*
WHAT TO EXPECT:

Query 1 (Columns Check):
- Should return 8 rows showing all tracking columns exist
- ✅ If you see 8 rows = Columns are created

Query 2 (Current Data):
- Shows fill rates for each tracking field
- ❌ If all counts are 0 = No tasks created yet with new modal
- ✅ If counts > 0 = Tracking is working!

Query 3-5 (Distribution Data):
- Shows actual data for the pie charts
- ❌ If no rows returned = No data yet (need to create tasks)
- ✅ If rows returned = Charts will display this data

Query 6 (Recent Tasks):
- Shows last 10 tasks with all fields
- Check if task_type, task_categories, task_priority have values
- ❌ If all NULL = Old tasks (before tracking was added)
- ✅ If values present = New tasks are being tracked

Query 8 (Last 24 Hours):
- Most important for verification
- ❌ If tasks_last_24h = 0 = No tasks created recently
- ✅ If with_type > 0 = Task Modal is working!
- ✅ If with_categories > 0 = Categories are being saved!
- ✅ If with_priority > 0 = Priority is being saved!

Query 9 (Dashboard Readiness):
- Shows which features are ready
- ✅ TRACKING = Feature has data and will display
- ❌ NO DATA YET = Need to create tasks with modal

ACTION REQUIRED IF NO DATA:
1. Clock in to a client
2. Click "Start Task" button
3. Fill out the Task Settings Modal (select type, duration, categories)
4. Complete the task
5. Re-run these queries to see data populate
*/

