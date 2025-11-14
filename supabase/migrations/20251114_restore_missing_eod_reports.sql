-- Migration to restore missing eod_reports for submissions
-- This fixes submissions that have clock-in/out data but no report_id

DO $$
DECLARE
  submission_record RECORD;
  report_id_var UUID;
  report_date_var DATE;
BEGIN
  RAISE NOTICE '=== Starting EOD Reports Restoration ===';
  
  -- Loop through all submissions without a report_id for the affected users
  FOR submission_record IN 
    SELECT 
      s.id as submission_id,
      s.user_id,
      s.clocked_in_at,
      s.clocked_out_at,
      s.total_hours,
      s.submitted_at,
      s.summary,
      up.email,
      up.first_name,
      up.last_name
    FROM eod_submissions s
    LEFT JOIN user_profiles up ON s.user_id = up.user_id
    WHERE s.report_id IS NULL
      AND up.email IN ('admin@giordanocollective.com', 'javieescutin@gmail.com')
    ORDER BY s.submitted_at
  LOOP
    -- Extract the date from submitted_at or clocked_in_at
    report_date_var := COALESCE(
      DATE(submission_record.submitted_at),
      DATE(submission_record.clocked_in_at)
    );
    
    RAISE NOTICE 'Processing submission % for user % (%) on date %',
      submission_record.submission_id,
      submission_record.email,
      submission_record.first_name || ' ' || submission_record.last_name,
      report_date_var;
    
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
      
      RAISE NOTICE '✅ Created new eod_report % for date %', report_id_var, report_date_var;
    ELSE
      RAISE NOTICE '✅ Found existing eod_report % for date %', report_id_var, report_date_var;
      
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
    
    RAISE NOTICE '✅ Linked submission % to report %', submission_record.submission_id, report_id_var;
    
  END LOOP;
  
  RAISE NOTICE '=== EOD Reports Restoration Complete ===';
  
  -- Show final summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 FINAL SUMMARY:';
  
  FOR submission_record IN
    SELECT 
      up.email,
      up.first_name || ' ' || up.last_name as name,
      COUNT(*) as total_submissions,
      COUNT(s.report_id) as linked_submissions,
      COUNT(*) FILTER (WHERE s.report_id IS NULL) as unlinked_submissions
    FROM eod_submissions s
    LEFT JOIN user_profiles up ON s.user_id = up.user_id
    WHERE up.email IN ('admin@giordanocollective.com', 'javieescutin@gmail.com')
    GROUP BY up.email, up.first_name, up.last_name
  LOOP
    RAISE NOTICE '  User: % (%)', submission_record.name, submission_record.email;
    RAISE NOTICE '    Total Submissions: %', submission_record.total_submissions;
    RAISE NOTICE '    Linked: %', submission_record.linked_submissions;
    RAISE NOTICE '    Unlinked: %', submission_record.unlinked_submissions;
    RAISE NOTICE '';
  END LOOP;
  
END $$;

-- Verify the fix
SELECT 
  up.email,
  up.first_name || ' ' || up.last_name as name,
  COUNT(*) as total_submissions,
  COUNT(s.report_id) as linked_submissions,
  COUNT(*) FILTER (WHERE s.report_id IS NULL) as still_missing
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE up.email IN ('admin@giordanocollective.com', 'javieescutin@gmail.com')
GROUP BY up.email, up.first_name, up.last_name;

-- Migration to restore missing eod_reports for submissions
-- This fixes submissions that have clock-in/out data but no report_id

DO $$
DECLARE
  submission_record RECORD;
  report_id_var UUID;
  report_date_var DATE;
BEGIN
  RAISE NOTICE '=== Starting EOD Reports Restoration ===';
  
  -- Loop through all submissions without a report_id for the affected users
  FOR submission_record IN 
    SELECT 
      s.id as submission_id,
      s.user_id,
      s.clocked_in_at,
      s.clocked_out_at,
      s.total_hours,
      s.submitted_at,
      s.summary,
      up.email,
      up.first_name,
      up.last_name
    FROM eod_submissions s
    LEFT JOIN user_profiles up ON s.user_id = up.user_id
    WHERE s.report_id IS NULL
      AND up.email IN ('admin@giordanocollective.com', 'javieescutin@gmail.com')
    ORDER BY s.submitted_at
  LOOP
    -- Extract the date from submitted_at or clocked_in_at
    report_date_var := COALESCE(
      DATE(submission_record.submitted_at),
      DATE(submission_record.clocked_in_at)
    );
    
    RAISE NOTICE 'Processing submission % for user % (%) on date %',
      submission_record.submission_id,
      submission_record.email,
      submission_record.first_name || ' ' || submission_record.last_name,
      report_date_var;
    
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
      
      RAISE NOTICE '✅ Created new eod_report % for date %', report_id_var, report_date_var;
    ELSE
      RAISE NOTICE '✅ Found existing eod_report % for date %', report_id_var, report_date_var;
      
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
    
    RAISE NOTICE '✅ Linked submission % to report %', submission_record.submission_id, report_id_var;
    
  END LOOP;
  
  RAISE NOTICE '=== EOD Reports Restoration Complete ===';
  
  -- Show final summary
  RAISE NOTICE '';
  RAISE NOTICE '📊 FINAL SUMMARY:';
  
  FOR submission_record IN
    SELECT 
      up.email,
      up.first_name || ' ' || up.last_name as name,
      COUNT(*) as total_submissions,
      COUNT(s.report_id) as linked_submissions,
      COUNT(*) FILTER (WHERE s.report_id IS NULL) as unlinked_submissions
    FROM eod_submissions s
    LEFT JOIN user_profiles up ON s.user_id = up.user_id
    WHERE up.email IN ('admin@giordanocollective.com', 'javieescutin@gmail.com')
    GROUP BY up.email, up.first_name, up.last_name
  LOOP
    RAISE NOTICE '  User: % (%)', submission_record.name, submission_record.email;
    RAISE NOTICE '    Total Submissions: %', submission_record.total_submissions;
    RAISE NOTICE '    Linked: %', submission_record.linked_submissions;
    RAISE NOTICE '    Unlinked: %', submission_record.unlinked_submissions;
    RAISE NOTICE '';
  END LOOP;
  
END $$;

-- Verify the fix
SELECT 
  up.email,
  up.first_name || ' ' || up.last_name as name,
  COUNT(*) as total_submissions,
  COUNT(s.report_id) as linked_submissions,
  COUNT(*) FILTER (WHERE s.report_id IS NULL) as still_missing
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE up.email IN ('admin@giordanocollective.com', 'javieescutin@gmail.com')
GROUP BY up.email, up.first_name, up.last_name;

