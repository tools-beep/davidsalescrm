-- 🔍 CHECK USER POINTS - Verify points are being awarded correctly
-- Run this in Supabase SQL Editor

-- 1. Check user's total points
SELECT 
  '1. USER POINTS SUMMARY' AS check_type,
  full_name,
  total_points,
  weekly_points,
  monthly_points
FROM user_profiles
WHERE total_points > 0 OR user_id = auth.uid()
ORDER BY total_points DESC;

-- 2. Check recent points history
SELECT 
  '2. RECENT POINTS HISTORY' AS check_type,
  timestamp,
  points,
  reason
FROM points_history
WHERE user_id = auth.uid()
ORDER BY timestamp DESC
LIMIT 10;

-- 3. Check tasks with points awarded
SELECT 
  '3. TASKS WITH POINTS' AS check_type,
  task_description,
  task_type,
  task_priority,
  points_awarded,
  ended_at,
  duration_minutes
FROM eod_time_entries
WHERE user_id = auth.uid() 
  AND points_awarded > 0
ORDER BY ended_at DESC
LIMIT 10;

-- 4. Calculate expected points from notifications
-- Based on your screenshots:
-- +10 Points: Quick • Immediate Impact Task
-- +2 Enjoyment Bonus
-- +5 Priority Bonus (already included in the +10)
-- Expected total: ~10-12 points

SELECT 
  '4. POINTS CALCULATION CHECK' AS check_type,
  SUM(points_awarded) AS total_from_tasks,
  COUNT(*) AS completed_tasks
FROM eod_time_entries
WHERE user_id = auth.uid() 
  AND points_awarded > 0;

-- 5. Check if there's a mismatch
SELECT 
  '5. MISMATCH CHECK' AS check_type,
  up.total_points AS points_in_profile,
  COALESCE(SUM(te.points_awarded), 0) AS points_from_tasks,
  COALESCE(SUM(ph.points), 0) AS points_from_history,
  CASE 
    WHEN up.total_points = COALESCE(SUM(te.points_awarded), 0) THEN '✅ MATCH'
    WHEN up.total_points = COALESCE(SUM(ph.points), 0) THEN '✅ MATCH (via history)'
    ELSE '⚠️ MISMATCH - Check data'
  END AS status
FROM user_profiles up
LEFT JOIN eod_time_entries te ON te.user_id = up.user_id AND te.points_awarded > 0
LEFT JOIN points_history ph ON ph.user_id = up.user_id
WHERE up.user_id = auth.uid()
GROUP BY up.user_id, up.total_points;

