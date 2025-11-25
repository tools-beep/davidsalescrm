-- 🐛 DEBUG: Daily Goal Count Bug (FIXED VERSION)
-- ERROR: column "date" does not exist
-- FIX: Use started_at or ended_at instead

-- 1. Check completed tasks TODAY (using ended_at for date)
SELECT 
  '1. COMPLETED TASKS TODAY' AS check,
  id,
  task_description,
  started_at,
  ended_at,
  DATE(ended_at AT TIME ZONE 'America/New_York') AS completion_date_est
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND ended_at IS NOT NULL
  AND DATE(ended_at AT TIME ZONE 'America/New_York') = CURRENT_DATE
ORDER BY ended_at DESC;

-- 2. Count completed tasks by completion date (EST)
SELECT 
  '2. COUNT BY COMPLETION DATE' AS check,
  DATE(ended_at AT TIME ZONE 'America/New_York') AS completion_date,
  COUNT(*) AS completed_count
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND ended_at IS NOT NULL
GROUP BY DATE(ended_at AT TIME ZONE 'America/New_York')
ORDER BY completion_date DESC
LIMIT 3;

-- 3. Check clock-in daily_task_goal
SELECT 
  '3. DAILY TASK GOAL FROM CLOCK-IN' AS check,
  daily_task_goal,
  clocked_in_at,
  DATE(clocked_in_at AT TIME ZONE 'America/New_York') AS clock_in_date
FROM eod_clock_ins
WHERE user_id = auth.uid()
  AND DATE(clocked_in_at AT TIME ZONE 'America/New_York') = CURRENT_DATE
ORDER BY clocked_in_at DESC
LIMIT 1;

-- 4. Check all notifications about daily progress
SELECT 
  '4. DAILY PROGRESS NOTIFICATIONS' AS check,
  message,
  created_at,
  is_read
FROM notification_log
WHERE user_id = auth.uid()
  AND (
    message ILIKE '%Daily Progress%'
    OR message ILIKE '%tasks completed%'
  )
ORDER BY created_at DESC
LIMIT 5;

-- 5. What is TODAY in EST?
SELECT 
  '5. CURRENT EST DATE' AS check,
  NOW() AT TIME ZONE 'America/New_York' AS current_est_time,
  CURRENT_DATE AS today_date;

-- 6. Check all completed tasks (last 3 days)
SELECT 
  '6. RECENT COMPLETED TASKS' AS check,
  DATE(ended_at AT TIME ZONE 'America/New_York') AS completion_date,
  COUNT(*) AS count
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND ended_at IS NOT NULL
GROUP BY DATE(ended_at AT TIME ZONE 'America/New_York')
ORDER BY completion_date DESC
LIMIT 3;

