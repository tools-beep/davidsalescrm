-- 🚨 EMERGENCY: Check if tasks are in database
-- Run this to see if your tasks are actually in the database

-- 1. Check if you have any EOD reports today
SELECT 
  'EOD Reports Today' AS check_type,
  id,
  report_date,
  started_at,
  submitted,
  submitted_at
FROM eod_reports
WHERE user_id = auth.uid()
AND report_date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY started_at DESC;

-- 2. Check if you have any time entries (tasks) today
SELECT 
  'Time Entries Today' AS check_type,
  id,
  eod_id,
  client_name,
  task_description,
  started_at,
  ended_at,
  paused_at,
  accumulated_seconds,
  duration_minutes,
  CASE 
    WHEN ended_at IS NOT NULL THEN 'COMPLETED'
    WHEN paused_at IS NOT NULL THEN 'PAUSED'
    ELSE 'ACTIVE'
  END AS status
FROM eod_time_entries
WHERE user_id = auth.uid()
AND started_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY started_at DESC;

-- 3. Check your clock-in records today
SELECT 
  'Clock-Ins Today' AS check_type,
  id,
  date,
  clocked_in_at,
  clocked_out_at,
  planned_shift_minutes,
  daily_task_goal,
  client_name
FROM eod_clock_ins
WHERE user_id = auth.uid()
AND date >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY clocked_in_at DESC;

-- 4. Check if report_date format matches
SELECT 
  'Date Format Check' AS check_type,
  CURRENT_DATE AS postgres_current_date,
  TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') AS formatted_date,
  report_date,
  started_at
FROM eod_reports
WHERE user_id = auth.uid()
ORDER BY started_at DESC
LIMIT 5;

