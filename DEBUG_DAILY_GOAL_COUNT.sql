-- 🐛 DEBUG: Daily Goal Count Bug
-- You have 5 completed tasks but notification says "1/7"

-- 1. Check completed tasks TODAY (EST date)
SELECT 
  '1. COMPLETED TASKS TODAY' AS check,
  id,
  task_description,
  date,
  started_at,
  ended_at,
  created_at
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND ended_at IS NOT NULL
  AND date = (
    SELECT date_trunc('day', NOW() AT TIME ZONE 'America/New_York')::date
  )
ORDER BY ended_at DESC;

-- 2. Count by date field
SELECT 
  '2. COUNT BY DATE FIELD' AS check,
  date,
  COUNT(*) AS completed_count
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND ended_at IS NOT NULL
GROUP BY date
ORDER BY date DESC
LIMIT 3;

-- 3. Check clock-in daily_task_goal
SELECT 
  '3. DAILY TASK GOAL FROM CLOCK-IN' AS check,
  daily_task_goal,
  clocked_in_at,
  date
FROM eod_clock_ins
WHERE user_id = auth.uid()
  AND date = (
    SELECT date_trunc('day', NOW() AT TIME ZONE 'America/New_York')::date
  )
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

-- 5. Debug: What is TODAY's date in EST?
SELECT 
  '5. CURRENT EST DATE' AS check,
  NOW() AT TIME ZONE 'America/New_York' AS current_est_time,
  date_trunc('day', NOW() AT TIME ZONE 'America/New_York')::date AS today_est_date;

-- 6. Check if date field format matches
SELECT 
  '6. DATE FIELD VALUES' AS check,
  date,
  COUNT(*) AS count,
  MAX(ended_at) AS last_completed
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND ended_at IS NOT NULL
GROUP BY date
ORDER BY date DESC
LIMIT 3;

