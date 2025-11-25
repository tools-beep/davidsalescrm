-- 🔍 CHECK POINTS BREAKDOWN
-- You went from 17 → 32 points (+15 points)
-- Let's see where those 15 points came from

-- 1. Check all points history (most recent first)
SELECT 
  '1. ALL POINTS HISTORY' AS check,
  timestamp,
  points,
  reason,
  task_id
FROM points_history
WHERE user_id = auth.uid()
ORDER BY timestamp DESC;

-- 2. Check the most recent task with points
SELECT 
  '2. MOST RECENT TASK' AS check,
  task_description,
  task_type,
  task_priority,
  points_awarded,
  task_enjoyment,
  goal_duration_minutes,
  accumulated_seconds / 60 AS actual_minutes,
  ended_at
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND points_awarded > 0
ORDER BY ended_at DESC
LIMIT 1;

-- 3. Sum up total points
SELECT 
  '3. TOTAL POINTS CALCULATION' AS check,
  SUM(points) AS total_from_history,
  COUNT(*) AS number_of_transactions
FROM points_history
WHERE user_id = auth.uid();

-- 4. Check current user profile points
SELECT 
  '4. USER PROFILE POINTS' AS check,
  total_points,
  weekly_points,
  monthly_points
FROM user_profiles
WHERE user_id = auth.uid();

-- 5. Points breakdown for last task
-- Expected breakdown:
-- Base points (task type)
-- + Priority bonus
-- + Accuracy bonus (if within ±20% of goal)
-- + Enjoyment bonus (if rated 4-5/5)
-- + Survey bonus (if answered mood/energy)
-- = Total

SELECT 
  '5. LAST TASK POINTS BREAKDOWN' AS check,
  task_description,
  task_type,
  CASE 
    WHEN task_type = 'Quick Task' THEN 3
    WHEN task_type = 'Standard Task' THEN 5
    WHEN task_type = 'Deep Work Task' THEN 8
    WHEN task_type = 'Long Task' THEN 10
    WHEN task_type = 'Very Long Task' THEN 12
    ELSE 5
  END AS base_points,
  CASE 
    WHEN task_priority = 'Immediate Impact Task' THEN 5
    WHEN task_priority = 'High Impact Task' THEN 3
    WHEN task_priority = 'Daily Task' THEN 0
    ELSE 0
  END AS priority_bonus,
  CASE 
    WHEN task_enjoyment >= 4 THEN 2
    ELSE 0
  END AS enjoyment_bonus,
  points_awarded AS total_awarded
FROM eod_time_entries
WHERE user_id = auth.uid()
  AND points_awarded > 0
ORDER BY ended_at DESC
LIMIT 1;

