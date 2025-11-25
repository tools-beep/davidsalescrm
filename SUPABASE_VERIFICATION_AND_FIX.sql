-- ============================================================================
-- SUPABASE DATABASE VERIFICATION & FIX SCRIPT
-- Run this in Supabase SQL Editor to check what exists and create missing items
-- ============================================================================

-- SECTION 1: CHECK WHAT EXISTS
-- ============================================================================

DO $$
DECLARE
  v_result TEXT := '';
  v_missing TEXT := '';
  v_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SMART DAR DATABASE VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Check Tables
  RAISE NOTICE '📊 CHECKING TABLES...';
  RAISE NOTICE '';
  
  -- eod_time_entries
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'eod_time_entries';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ eod_time_entries exists';
  ELSE
    RAISE NOTICE '❌ eod_time_entries MISSING';
    v_missing := v_missing || 'eod_time_entries, ';
  END IF;
  
  -- mood_entries
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'mood_entries';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ mood_entries exists';
  ELSE
    RAISE NOTICE '❌ mood_entries MISSING';
    v_missing := v_missing || 'mood_entries, ';
  END IF;
  
  -- energy_entries
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'energy_entries';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ energy_entries exists';
  ELSE
    RAISE NOTICE '❌ energy_entries MISSING';
    v_missing := v_missing || 'energy_entries, ';
  END IF;
  
  -- eod_clock_ins
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'eod_clock_ins';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ eod_clock_ins exists';
  ELSE
    RAISE NOTICE '❌ eod_clock_ins MISSING';
    v_missing := v_missing || 'eod_clock_ins, ';
  END IF;
  
  -- user_profiles
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'user_profiles';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ user_profiles exists';
  ELSE
    RAISE NOTICE '❌ user_profiles MISSING';
    v_missing := v_missing || 'user_profiles, ';
  END IF;
  
  -- points_history
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'points_history';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ points_history exists';
  ELSE
    RAISE NOTICE '❌ points_history MISSING';
    v_missing := v_missing || 'points_history, ';
  END IF;
  
  -- streak_history
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'streak_history';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ streak_history exists';
  ELSE
    RAISE NOTICE '❌ streak_history MISSING';
    v_missing := v_missing || 'streak_history, ';
  END IF;
  
  -- recurring_task_templates
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'recurring_task_templates';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ recurring_task_templates exists';
  ELSE
    RAISE NOTICE '❌ recurring_task_templates MISSING';
    v_missing := v_missing || 'recurring_task_templates, ';
  END IF;
  
  -- eod_reports
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'eod_reports';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ eod_reports exists';
  ELSE
    RAISE NOTICE '❌ eod_reports MISSING';
    v_missing := v_missing || 'eod_reports, ';
  END IF;
  
  -- eod_submissions
  SELECT COUNT(*) INTO v_count FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'eod_submissions';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ eod_submissions exists';
  ELSE
    RAISE NOTICE '❌ eod_submissions MISSING';
    v_missing := v_missing || 'eod_submissions, ';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '🔧 CHECKING FUNCTIONS...';
  RAISE NOTICE '';
  
  -- award_points
  SELECT COUNT(*) INTO v_count FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_name = 'award_points';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ award_points() exists';
  ELSE
    RAISE NOTICE '❌ award_points() MISSING';
  END IF;
  
  -- calculate_task_points
  SELECT COUNT(*) INTO v_count FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_name = 'calculate_task_points';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ calculate_task_points() exists';
  ELSE
    RAISE NOTICE '❌ calculate_task_points() MISSING';
  END IF;
  
  -- get_user_points_summary
  SELECT COUNT(*) INTO v_count FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_name = 'get_user_points_summary';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ get_user_points_summary() exists';
  ELSE
    RAISE NOTICE '❌ get_user_points_summary() MISSING';
  END IF;
  
  -- calculate_shift_hours
  SELECT COUNT(*) INTO v_count FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_name = 'calculate_shift_hours';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ calculate_shift_hours() exists';
  ELSE
    RAISE NOTICE '❌ calculate_shift_hours() MISSING';
  END IF;
  
  -- update_eod_report_hours
  SELECT COUNT(*) INTO v_count FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_name = 'update_eod_report_hours';
  IF v_count > 0 THEN
    RAISE NOTICE '✅ update_eod_report_hours() exists';
  ELSE
    RAISE NOTICE '❌ update_eod_report_hours() MISSING';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 CHECKING KEY COLUMNS...';
  RAISE NOTICE '';
  
  -- Check eod_time_entries columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eod_time_entries') THEN
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_name = 'eod_time_entries' AND column_name = 'task_type';
    IF v_count > 0 THEN
      RAISE NOTICE '✅ eod_time_entries.task_type exists';
    ELSE
      RAISE NOTICE '❌ eod_time_entries.task_type MISSING';
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_name = 'eod_time_entries' AND column_name = 'task_priority';
    IF v_count > 0 THEN
      RAISE NOTICE '✅ eod_time_entries.task_priority exists';
    ELSE
      RAISE NOTICE '❌ eod_time_entries.task_priority MISSING';
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_name = 'eod_time_entries' AND column_name = 'points_awarded';
    IF v_count > 0 THEN
      RAISE NOTICE '✅ eod_time_entries.points_awarded exists';
    ELSE
      RAISE NOTICE '❌ eod_time_entries.points_awarded MISSING';
    END IF;
  END IF;
  
  -- Check user_profiles columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'total_points';
    IF v_count > 0 THEN
      RAISE NOTICE '✅ user_profiles.total_points exists';
    ELSE
      RAISE NOTICE '❌ user_profiles.total_points MISSING';
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'weekday_streak';
    IF v_count > 0 THEN
      RAISE NOTICE '✅ user_profiles.weekday_streak exists';
    ELSE
      RAISE NOTICE '❌ user_profiles.weekday_streak MISSING';
    END IF;
  END IF;
  
  -- Check eod_clock_ins columns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'eod_clock_ins') THEN
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_name = 'eod_clock_ins' AND column_name = 'planned_shift_minutes';
    IF v_count > 0 THEN
      RAISE NOTICE '✅ eod_clock_ins.planned_shift_minutes exists';
    ELSE
      RAISE NOTICE '❌ eod_clock_ins.planned_shift_minutes MISSING';
    END IF;
    
    SELECT COUNT(*) INTO v_count FROM information_schema.columns 
    WHERE table_name = 'eod_clock_ins' AND column_name = 'actual_hours';
    IF v_count > 0 THEN
      RAISE NOTICE '✅ eod_clock_ins.actual_hours exists';
    ELSE
      RAISE NOTICE '❌ eod_clock_ins.actual_hours MISSING';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION COMPLETE';
  RAISE NOTICE '========================================';
  
  IF v_missing != '' THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  MISSING TABLES: %', v_missing;
    RAISE NOTICE '';
    RAISE NOTICE '👉 Run the SQL below to create missing items';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ ALL TABLES EXIST!';
    RAISE NOTICE '';
    RAISE NOTICE '👉 Check if columns and functions exist above';
  END IF;
END $$;

