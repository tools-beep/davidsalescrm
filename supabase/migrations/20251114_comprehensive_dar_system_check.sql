-- Comprehensive DAR System Check and Fix
-- This checks clock-ins, submissions, and reports to ensure everything is working

-- ============================================
-- PART 1: DIAGNOSTIC CHECKS
-- ============================================

-- Check 1: eod_reports with NULL critical fields
SELECT 
  '1. EOD Reports with NULL fields' as check_name,
  COUNT(*) as total_reports,
  COUNT(*) FILTER (WHERE clocked_in_at IS NULL) as missing_clocked_in,
  COUNT(*) FILTER (WHERE clocked_out_at IS NULL) as missing_clocked_out,
  COUNT(*) FILTER (WHERE submitted_at IS NULL) as missing_submitted_at
FROM eod_reports;

-- Check 2: eod_submissions with NULL report_id
SELECT 
  '2. Submissions Missing report_id' as check_name,
  COUNT(*) as total_submissions,
  COUNT(report_id) as with_report_id,
  COUNT(*) FILTER (WHERE report_id IS NULL) as missing_report_id
FROM eod_submissions;

-- Check 3: eod_clock_ins without matching submissions
SELECT 
  '3. Clock-ins Status' as check_name,
  COUNT(*) as total_clock_ins,
  COUNT(*) FILTER (WHERE clocked_out_at IS NULL) as still_active,
  COUNT(*) FILTER (WHERE clocked_out_at IS NOT NULL) as completed
FROM eod_clock_ins;

-- Check 4: Users with clock-ins but no submissions
SELECT 
  '4. Users with Clock-ins but No Submissions' as check_name,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  COUNT(DISTINCT ec.id) as clock_ins,
  COUNT(DISTINCT es.id) as submissions
FROM eod_clock_ins ec
LEFT JOIN user_profiles up ON ec.user_id = up.user_id
LEFT JOIN eod_submissions es ON ec.user_id = es.user_id AND DATE(ec.clocked_in_at) = DATE(es.submitted_at)
GROUP BY up.email, up.first_name, up.last_name
HAVING COUNT(DISTINCT ec.id) > 0 AND COUNT(DISTINCT es.id) = 0
ORDER BY COUNT(DISTINCT ec.id) DESC
LIMIT 10;

-- Check 5: Recent clock-ins (last 7 days)
SELECT 
  '5. Recent Clock-ins (Last 7 Days)' as check_name,
  DATE(ec.clocked_in_at) as date,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  ec.client_name,
  ec.clocked_in_at,
  ec.clocked_out_at,
  CASE 
    WHEN ec.clocked_out_at IS NULL THEN 'STILL ACTIVE'
    ELSE 'COMPLETED'
  END as status
FROM eod_clock_ins ec
LEFT JOIN user_profiles up ON ec.user_id = up.user_id
WHERE ec.clocked_in_at >= NOW() - INTERVAL '7 days'
ORDER BY ec.clocked_in_at DESC
LIMIT 20;

-- Check 6: Orphaned eod_reports (no corresponding submission)
SELECT 
  '6. Orphaned EOD Reports (No Submission)' as check_name,
  er.id as report_id,
  er.report_date,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  er.created_at
FROM eod_reports er
LEFT JOIN eod_submissions es ON er.id = es.report_id
LEFT JOIN user_profiles up ON er.user_id = up.user_id
WHERE es.id IS NULL
  AND er.created_at >= NOW() - INTERVAL '30 days'
ORDER BY er.created_at DESC
LIMIT 10;

-- ============================================
-- PART 2: FIX ALL SUBMISSIONS WITH NULL report_id
-- ============================================

DO $$
DECLARE
  submission_record RECORD;
  report_id_var UUID;
  report_date_var DATE;
  total_processed INTEGER := 0;
  total_created INTEGER := 0;
  total_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== FIXING SUBMISSIONS WITH NULL report_id ===';
  RAISE NOTICE '';
  
  FOR submission_record IN 
    SELECT 
      s.id as submission_id,
      s.user_id,
      s.clocked_in_at,
      s.clocked_out_at,
      s.total_hours,
      s.submitted_at,
      s.summary,
      COALESCE(up.email, 'unknown@email.com') as email,
      COALESCE(up.first_name, 'Unknown') as first_name,
      COALESCE(up.last_name, 'User') as last_name
    FROM eod_submissions s
    LEFT JOIN user_profiles up ON s.user_id = up.user_id
    WHERE s.report_id IS NULL
    ORDER BY s.submitted_at DESC
  LOOP
    total_processed := total_processed + 1;
    
    report_date_var := COALESCE(
      DATE(submission_record.submitted_at),
      DATE(submission_record.clocked_in_at),
      CURRENT_DATE
    );
    
    -- Try to find existing report
    SELECT id INTO report_id_var
    FROM eod_reports
    WHERE user_id = submission_record.user_id
      AND report_date = report_date_var
    LIMIT 1;
    
    -- Create report if doesn't exist
    IF report_id_var IS NULL THEN
      INSERT INTO eod_reports (
        user_id,
        report_date,
        summary,
        created_at,
        updated_at
      ) VALUES (
        submission_record.user_id,
        report_date_var,
        submission_record.summary,
        COALESCE(submission_record.submitted_at, NOW()),
        COALESCE(submission_record.submitted_at, NOW())
      )
      RETURNING id INTO report_id_var;
      
      total_created := total_created + 1;
    END IF;
    
    -- Link submission to report
    UPDATE eod_submissions
    SET report_id = report_id_var
    WHERE id = submission_record.submission_id;
    
    total_linked := total_linked + 1;
    
  END LOOP;
  
  RAISE NOTICE '✅ Processed: % submissions', total_processed;
  RAISE NOTICE '✅ Created: % new reports', total_created;
  RAISE NOTICE '✅ Linked: % submissions to reports', total_linked;
  RAISE NOTICE '';
  
END $$;

-- ============================================
-- PART 3: FINAL VERIFICATION
-- ============================================

-- Verify all submissions now have report_id
SELECT 
  'FINAL: Submissions Status' as status,
  COUNT(*) as total_submissions,
  COUNT(report_id) as with_report_id,
  COUNT(*) FILTER (WHERE report_id IS NULL) as still_missing,
  ROUND(100.0 * COUNT(report_id) / NULLIF(COUNT(*), 0), 2) as percent_complete
FROM eod_submissions;

-- Show any remaining issues
SELECT 
  'FINAL: Remaining Issues' as status,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  COUNT(*) as submissions_still_missing_report_id
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.report_id IS NULL
GROUP BY up.email, up.first_name, up.last_name;

-- Show recent successful submissions
SELECT 
  'FINAL: Recent Successful Submissions' as status,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  DATE(s.submitted_at) as date,
  s.total_hours,
  CASE WHEN s.report_id IS NOT NULL THEN '✅ LINKED' ELSE '❌ MISSING' END as report_status
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.submitted_at >= NOW() - INTERVAL '7 days'
ORDER BY s.submitted_at DESC
LIMIT 10;

