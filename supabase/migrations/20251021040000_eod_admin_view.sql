-- Create a view to make EOD admin data easier to fetch
-- This combines auth users with their EOD submissions

CREATE OR REPLACE VIEW public.eod_admin_overview AS
SELECT 
  u.id as user_id,
  u.email,
  COALESCE(up.first_name || ' ' || up.last_name, u.email) as full_name,
  s.id as submission_id,
  s.submitted_at,
  s.clocked_in_at,
  s.clocked_out_at,
  s.total_hours,
  s.summary,
  s.email_sent,
  DATE(s.submitted_at) as submission_date
FROM auth.users u
LEFT JOIN public.user_profiles up ON u.id = up.user_id
LEFT JOIN public.eod_submissions s ON u.id = s.user_id;

-- Grant access to authenticated users
GRANT SELECT ON public.eod_admin_overview TO authenticated;

-- Enable RLS on the view
ALTER VIEW public.eod_admin_overview SET (security_invoker = true);

