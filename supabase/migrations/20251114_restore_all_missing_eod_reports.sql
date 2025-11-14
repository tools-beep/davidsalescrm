-- Migration to restore ALL missing eod_reports for ALL submissions
-- This fixes ALL submissions that have clock-in/out data but no report_id

DO $$
DECLARE
  submission_record RECORD;
  report_id_var UUID;
  report_date_var DATE;
  total_processed INTEGER := 0;
  total_created INTEGER := 0;
  total_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting COMPLETE EOD Reports Restoration ===';
  RAISE NOTICE 'This will fix ALL submissions with NULL report_id';
  RAISE NOTICE '';
  
  -- Loop through ALL submissions without a report_id (not just specific users)
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
    
    -- Extract the date from submitted_at or clocked_in_at
    report_date_var := COALESCE(
      DATE(submission_record.submitted_at),
      DATE(submission_record.clocked_in_at),
      CURRENT_DATE
    );
    
    IF total_processed <= 5 THEN
      RAISE NOTICE 'Processing submission % for user % (%) on date %',
        submission_record.submission_id,
        submission_record.email,
        submission_record.first_name || ' ' || submission_record.last_name,
        report_date_var;
    END IF;
    
    -- Try to find an existing eod_report for this user and date
    SELECT id INTO report_id_var
    FROM eod_reports
    WHERE user_id = submission_record.user_id
      AND report_date = report_date_var
    LIMIT 1;
    
    -- If no report exists, create one
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
      
      IF total_processed <= 5 THEN
        RAISE NOTICE '  ✅ Created new eod_report % for date %', report_id_var, report_date_var;
      END IF;
    ELSE
      IF total_processed <= 5 THEN
        RAISE NOTICE '  ✅ Found existing eod_report % for date %', report_id_var, report_date_var;
      END IF;
      
      -- Update the existing report with summary if it's empty
      UPDATE eod_reports
      SET 
        summary = COALESCE(summary, submission_record.summary),
        updated_at = NOW()
      WHERE id = report_id_var
        AND (summary IS NULL OR summary = '');
    END IF;
    
    -- Link the submission to the report
    UPDATE eod_submissions
    SET report_id = report_id_var
    WHERE id = submission_record.submission_id;
    
    total_linked := total_linked + 1;
    
    IF total_processed <= 5 THEN
      RAISE NOTICE '  ✅ Linked submission % to report %', submission_record.submission_id, report_id_var;
      RAISE NOTICE '';
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '=== EOD Reports Restoration Complete ===';
  RAISE NOTICE '';
  RAISE NOTICE '📊 OVERALL SUMMARY:';
  RAISE NOTICE '  Total Submissions Processed: %', total_processed;
  RAISE NOTICE '  New Reports Created: %', total_created;
  RAISE NOTICE '  Submissions Linked: %', total_linked;
  RAISE NOTICE '';
  
  -- Show per-user summary
  RAISE NOTICE '📊 PER-USER SUMMARY:';
  FOR submission_record IN
    SELECT 
      COALESCE(up.email, 'unknown') as email,
      COALESCE(up.first_name || ' ' || up.last_name, 'Unknown User') as name,
      COUNT(*) as total_submissions,
      COUNT(s.report_id) as linked_submissions,
      COUNT(*) FILTER (WHERE s.report_id IS NULL) as unlinked_submissions
    FROM eod_submissions s
    LEFT JOIN user_profiles up ON s.user_id = up.user_id
    GROUP BY up.email, up.first_name, up.last_name
    HAVING COUNT(*) FILTER (WHERE s.report_id IS NULL) > 0 OR COUNT(s.report_id) > 0
    ORDER BY COUNT(*) DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  User: % (%)', submission_record.name, submission_record.email;
    RAISE NOTICE '    Total: % | Linked: % | Missing: %', 
      submission_record.total_submissions,
      submission_record.linked_submissions,
      submission_record.unlinked_submissions;
  END LOOP;
  
END $$;

-- Final verification query
SELECT 
  'FINAL CHECK' as status,
  COUNT(*) as total_submissions,
  COUNT(report_id) as submissions_with_report,
  COUNT(*) FILTER (WHERE report_id IS NULL) as still_missing,
  ROUND(100.0 * COUNT(report_id) / COUNT(*), 2) as percent_linked
FROM eod_submissions;

-- Show any remaining issues
SELECT 
  'REMAINING ISSUES' as status,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  COUNT(*) as submissions_still_missing
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.report_id IS NULL
GROUP BY up.email, up.first_name, up.last_name;

-- Migration to restore ALL missing eod_reports for ALL submissions
-- This fixes ALL submissions that have clock-in/out data but no report_id

DO $$
DECLARE
  submission_record RECORD;
  report_id_var UUID;
  report_date_var DATE;
  total_processed INTEGER := 0;
  total_created INTEGER := 0;
  total_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Starting COMPLETE EOD Reports Restoration ===';
  RAISE NOTICE 'This will fix ALL submissions with NULL report_id';
  RAISE NOTICE '';
  
  -- Loop through ALL submissions without a report_id (not just specific users)
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
    
    -- Extract the date from submitted_at or clocked_in_at
    report_date_var := COALESCE(
      DATE(submission_record.submitted_at),
      DATE(submission_record.clocked_in_at),
      CURRENT_DATE
    );
    
    IF total_processed <= 5 THEN
      RAISE NOTICE 'Processing submission % for user % (%) on date %',
        submission_record.submission_id,
        submission_record.email,
        submission_record.first_name || ' ' || submission_record.last_name,
        report_date_var;
    END IF;
    
    -- Try to find an existing eod_report for this user and date
    SELECT id INTO report_id_var
    FROM eod_reports
    WHERE user_id = submission_record.user_id
      AND report_date = report_date_var
    LIMIT 1;
    
    -- If no report exists, create one
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
      
      IF total_processed <= 5 THEN
        RAISE NOTICE '  ✅ Created new eod_report % for date %', report_id_var, report_date_var;
      END IF;
    ELSE
      IF total_processed <= 5 THEN
        RAISE NOTICE '  ✅ Found existing eod_report % for date %', report_id_var, report_date_var;
      END IF;
      
      -- Update the existing report with summary if it's empty
      UPDATE eod_reports
      SET 
        summary = COALESCE(summary, submission_record.summary),
        updated_at = NOW()
      WHERE id = report_id_var
        AND (summary IS NULL OR summary = '');
    END IF;
    
    -- Link the submission to the report
    UPDATE eod_submissions
    SET report_id = report_id_var
    WHERE id = submission_record.submission_id;
    
    total_linked := total_linked + 1;
    
    IF total_processed <= 5 THEN
      RAISE NOTICE '  ✅ Linked submission % to report %', submission_record.submission_id, report_id_var;
      RAISE NOTICE '';
    END IF;
    
  END LOOP;
  
  RAISE NOTICE '=== EOD Reports Restoration Complete ===';
  RAISE NOTICE '';
  RAISE NOTICE '📊 OVERALL SUMMARY:';
  RAISE NOTICE '  Total Submissions Processed: %', total_processed;
  RAISE NOTICE '  New Reports Created: %', total_created;
  RAISE NOTICE '  Submissions Linked: %', total_linked;
  RAISE NOTICE '';
  
  -- Show per-user summary
  RAISE NOTICE '📊 PER-USER SUMMARY:';
  FOR submission_record IN
    SELECT 
      COALESCE(up.email, 'unknown') as email,
      COALESCE(up.first_name || ' ' || up.last_name, 'Unknown User') as name,
      COUNT(*) as total_submissions,
      COUNT(s.report_id) as linked_submissions,
      COUNT(*) FILTER (WHERE s.report_id IS NULL) as unlinked_submissions
    FROM eod_submissions s
    LEFT JOIN user_profiles up ON s.user_id = up.user_id
    GROUP BY up.email, up.first_name, up.last_name
    HAVING COUNT(*) FILTER (WHERE s.report_id IS NULL) > 0 OR COUNT(s.report_id) > 0
    ORDER BY COUNT(*) DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  User: % (%)', submission_record.name, submission_record.email;
    RAISE NOTICE '    Total: % | Linked: % | Missing: %', 
      submission_record.total_submissions,
      submission_record.linked_submissions,
      submission_record.unlinked_submissions;
  END LOOP;
  
END $$;

-- Final verification query
SELECT 
  'FINAL CHECK' as status,
  COUNT(*) as total_submissions,
  COUNT(report_id) as submissions_with_report,
  COUNT(*) FILTER (WHERE report_id IS NULL) as still_missing,
  ROUND(100.0 * COUNT(report_id) / COUNT(*), 2) as percent_linked
FROM eod_submissions;

-- Show any remaining issues
SELECT 
  'REMAINING ISSUES' as status,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  COUNT(*) as submissions_still_missing
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.report_id IS NULL
GROUP BY up.email, up.first_name, up.last_name;

