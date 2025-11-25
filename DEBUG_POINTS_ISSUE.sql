-- 🔍 DEBUG POINTS CALCULATION ISSUE
-- User reports: Should be 17 points, but showing 10

-- 1. Check actual points in user_profiles
SELECT 
  '1. USER TOTAL POINTS' AS check_type,
  full_name,
  total_points,
  weekly_points,
  monthly_points
FROM user_profiles
WHERE user_id = auth.uid();

-- 2. Check all points history entries
SELECT 
  '2. POINTS HISTORY (ALL)' AS check_type,
  timestamp,
  points,
  reason
FROM points_history
WHERE user_id = auth.uid()
ORDER BY timestamp DESC;

-- 3. Sum up points from history
SELECT 
  '3. TOTAL FROM HISTORY' AS check_type,
  SUM(points) AS total_points_from_history,
  COUNT(*) AS number_of_transactions
FROM points_history
WHERE user_id = auth.uid();

-- 4. Check tasks with points
SELECT 
  '4. TASKS WITH POINTS' AS check_type,
  task_description,
  task_type,
  task_priority,
  points_awarded,
  task_enjoyment,
  ended_at
FROM eod_time_entries
WHERE user_id = auth.uid() 
  AND points_awarded > 0
ORDER BY ended_at DESC;

-- 5. Check if there are multiple point transactions per task
SELECT 
  '5. POINTS PER TASK' AS check_type,
  te.task_description,
  te.points_awarded AS points_on_task,
  COUNT(ph.id) AS history_entries,
  SUM(ph.points) AS total_from_history
FROM eod_time_entries te
LEFT JOIN points_history ph ON ph.task_id = te.id
WHERE te.user_id = auth.uid() 
  AND te.points_awarded > 0
GROUP BY te.id, te.task_description, te.points_awarded
ORDER BY te.ended_at DESC;

-- 6. Expected breakdown for "TEST TASK":
-- Base: Quick Task = 3 pts
-- Priority: Immediate Impact = +5 pts
-- Enjoyment: 5/5 rating = +2 pts
-- TOTAL: 10 pts (matches notification!)

-- User saw these notifications:
-- "+10 Points: Quick • Immediate Impact Task"
-- "+5 priority bonus" (High-Priority Task Completed)
-- "+2 pts" (High Enjoyment)

-- Question: Are the +5 and +2 SEPARATE transactions or included in the +10?

