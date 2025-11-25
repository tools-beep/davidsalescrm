-- 🔍 SIMPLE POINTS SYSTEM CHECK
-- Run this to verify if points system is working

-- 1. Check if points_history table exists
SELECT 
  '1. points_history table' AS check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'points_history')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- 2. Check if user_profiles has points columns
SELECT 
  '2. user_profiles points columns' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'total_points'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- 3. Check if eod_time_entries has points_awarded
SELECT 
  '3. eod_time_entries.points_awarded' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'eod_time_entries' AND column_name = 'points_awarded'
    )
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- 4. Check if award_points function exists
SELECT 
  '4. award_points() function' AS check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'award_points')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- 5. Check if trigger exists
SELECT 
  '5. Points trigger' AS check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_award_task_points')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- 6. Check if any points have been awarded
SELECT 
  '6. Points awarded to users' AS check_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE total_points > 0)
    THEN '✅ YES - ' || (SELECT COUNT(*)::TEXT FROM user_profiles WHERE total_points > 0) || ' users'
    ELSE '⚠️ NO POINTS YET'
  END AS status;

-- 7. Show sample data if available
SELECT 
  '📊 SAMPLE: Recent Points History' AS report,
  ph.timestamp,
  up.full_name,
  ph.points,
  ph.reason
FROM points_history ph
JOIN user_profiles up ON up.user_id = ph.user_id
ORDER BY ph.timestamp DESC
LIMIT 5;

