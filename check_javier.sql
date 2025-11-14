-- Check if javieescutin@gmail.com exists and has submissions
SELECT 
  'User Profile Check' as check_type,
  up.user_id,
  up.email,
  up.first_name,
  up.last_name
FROM user_profiles up
WHERE up.email = 'javieescutin@gmail.com';

-- Check all submissions for this email (with or without report_id)
SELECT 
  'Submissions Check' as check_type,
  s.id as submission_id,
  s.report_id,
  s.clocked_in_at,
  s.clocked_out_at,
  s.total_hours,
  s.submitted_at,
  up.email
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE up.email LIKE '%javier%' OR up.email LIKE '%escutin%';

-- Check if there are any submissions with NULL report_id for any user
SELECT 
  'All Missing Reports' as check_type,
  up.email,
  up.first_name || ' ' || up.last_name as name,
  COUNT(*) as submissions_without_report
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.report_id IS NULL
GROUP BY up.email, up.first_name, up.last_name;
