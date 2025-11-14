-- First, let's see what we're dealing with
SELECT 
  s.id as submission_id,
  s.user_id,
  s.report_id,
  s.clocked_in_at,
  s.clocked_out_at,
  s.total_hours,
  s.submitted_at,
  up.email,
  up.first_name,
  up.last_name
FROM eod_submissions s
LEFT JOIN user_profiles up ON s.user_id = up.user_id
WHERE s.report_id IS NULL
  AND up.email IN ('admin@giordanocollective.com', 'javieescutin@gmail.com')
ORDER BY s.submitted_at DESC;
