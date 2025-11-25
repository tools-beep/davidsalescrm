-- 🔍 CHECK IF POINTS ARE ACTUALLY IN DATABASE
-- Run this to see if points are being saved

-- 1. Check user_profiles for total_points
SELECT 
  '1. USER PROFILE POINTS' AS check_type,
  user_id,
  full_name,
  total_points,
  weekly_points,
  monthly_points
FROM user_profiles
WHERE user_id = auth.uid();

-- 2. Check points_history table
SELECT 
  '2. POINTS HISTORY' AS check_type,
  id,
  timestamp,
  points,
  reason,
  task_id
FROM points_history
WHERE user_id = auth.uid()
ORDER BY timestamp DESC
LIMIT 10;

-- 3. Check if points_history table exists
SELECT 
  '3. POINTS_HISTORY TABLE CHECK' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'points_history'
    ) THEN '✅ Table EXISTS'
    ELSE '❌ Table MISSING'
  END AS status;

-- 4. Check tasks with points_awarded
SELECT 
  '4. TASKS WITH POINTS' AS check_type,
  id,
  task_description,
  points_awarded,
  ended_at
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND ended_at IS NOT NULL
ORDER BY ended_at DESC
LIMIT 5;

-- 5. Check if award_points function exists
SELECT 
  '5. AWARD_POINTS FUNCTION CHECK' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'award_points'
    ) THEN '✅ Function EXISTS'
    ELSE '❌ Function MISSING'
  END AS status;

-- 6. Sum up total points from history
SELECT 
  '6. TOTAL FROM HISTORY' AS check_type,
  COALESCE(SUM(points), 0) AS total_points_in_history,
  COUNT(*) AS number_of_transactions
FROM points_history
WHERE user_id = auth.uid();

