-- 🔍 COMPREHENSIVE POINTS SYSTEM STATUS CHECK
-- Run this in Supabase SQL Editor to verify if points system is installed

-- ============================================================================
-- 1. CHECK IF POINTS TABLES/COLUMNS EXIST
-- ============================================================================

-- Check if points_history table exists
SELECT 
  '1. points_history TABLE' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'points_history'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - RUN MIGRATION!' 
  END AS status;

-- Check if user_profiles has points columns
SELECT 
  '2. user_profiles POINTS COLUMNS' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name = 'total_points'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - RUN MIGRATION!' 
  END AS status;

-- Check if eod_time_entries has points_awarded column
SELECT 
  '3. eod_time_entries.points_awarded' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'eod_time_entries' AND column_name = 'points_awarded'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - RUN MIGRATION!' 
  END AS status;

-- ============================================================================
-- 2. CHECK IF POINTS FUNCTIONS EXIST
-- ============================================================================

-- Check if award_points function exists
SELECT 
  '4. award_points() FUNCTION' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'award_points'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - RUN MIGRATION!' 
  END AS status;

-- Check if calculate_task_points function exists
SELECT 
  '5. calculate_task_points() FUNCTION' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'calculate_task_points'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - RUN MIGRATION!' 
  END AS status;

-- Check if trigger_award_task_points function exists
SELECT 
  '6. trigger_award_task_points() FUNCTION' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'trigger_award_task_points'
    ) 
    THEN '✅ EXISTS' 
    ELSE '❌ MISSING - RUN MIGRATION!' 
  END AS status;

-- ============================================================================
-- 3. CHECK IF TRIGGER IS ACTIVE
-- ============================================================================

-- Check if points trigger is installed on eod_time_entries
SELECT 
  '7. POINTS TRIGGER ON eod_time_entries' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trg_award_task_points'
    ) 
    THEN '✅ ACTIVE' 
    ELSE '❌ MISSING - RUN MIGRATION!' 
  END AS status;

-- ============================================================================
-- 4. CHECK ACTUAL DATA
-- ============================================================================

-- Check if any points have been awarded
SELECT 
  '8. POINTS AWARDED TO USERS' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM user_profiles WHERE total_points > 0)
    THEN '✅ YES - ' || (SELECT COUNT(*) FROM user_profiles WHERE total_points > 0)::TEXT || ' users have points'
    ELSE '⚠️ NO POINTS YET - System ready but no tasks completed'
  END AS status;

-- Check if any points history exists
SELECT 
  '9. POINTS HISTORY RECORDS' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM points_history)
    THEN '✅ YES - ' || (SELECT COUNT(*)::TEXT FROM points_history) || ' records'
    ELSE '⚠️ NO HISTORY YET - System ready but no tasks completed'
  END AS status;

-- Check if any tasks have points_awarded
SELECT 
  '10. TASKS WITH POINTS' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM eod_time_entries WHERE points_awarded > 0)
    THEN '✅ YES - ' || (SELECT COUNT(*)::TEXT FROM eod_time_entries WHERE points_awarded > 0) || ' tasks'
    ELSE '⚠️ NO TASKS WITH POINTS YET - Complete a task to test'
  END AS status;

-- ============================================================================
-- 5. SAMPLE DATA (if exists)
-- ============================================================================

-- Show top 5 users by points
SELECT 
  '📊 TOP 5 USERS BY POINTS' AS report_type,
  up.full_name,
  up.total_points,
  up.weekly_points,
  up.monthly_points
FROM user_profiles up
WHERE up.total_points > 0
ORDER BY up.total_points DESC
LIMIT 5;

-- Show recent points history
SELECT 
  '📊 RECENT POINTS HISTORY' AS report_type,
  ph.timestamp,
  up.full_name,
  ph.points,
  ph.reason
FROM points_history ph
JOIN user_profiles up ON up.user_id = ph.user_id
ORDER BY ph.timestamp DESC
LIMIT 10;

-- Show tasks with points
SELECT 
  '📊 RECENT TASKS WITH POINTS' AS report_type,
  te.task_description,
  te.task_type,
  te.task_priority,
  te.points_awarded,
  te.ended_at
FROM eod_time_entries te
WHERE te.points_awarded > 0
ORDER BY te.ended_at DESC
LIMIT 10;

-- ============================================================================
-- 6. FINAL SUMMARY
-- ============================================================================

SELECT 
  '=' AS divider,
  '🎯 POINTS SYSTEM STATUS SUMMARY' AS summary,
  '=' AS divider2;

SELECT 
  CASE 
    WHEN (
      SELECT COUNT(*) FROM information_schema.tables 
      WHERE table_name IN ('points_history')
    ) = 1
    AND (
      SELECT COUNT(*) FROM information_schema.columns 
      WHERE table_name = 'user_profiles' AND column_name IN ('total_points', 'weekly_points', 'monthly_points')
    ) = 3
    AND (
      SELECT COUNT(*) FROM pg_proc 
      WHERE proname IN ('award_points', 'calculate_task_points', 'trigger_award_task_points')
    ) = 3
    AND (
      SELECT COUNT(*) FROM pg_trigger 
      WHERE tgname = 'trg_award_task_points'
    ) = 1
    THEN '✅ POINTS SYSTEM FULLY INSTALLED'
    ELSE '❌ POINTS SYSTEM INCOMPLETE - RUN MIGRATION!'
  END AS final_status;

