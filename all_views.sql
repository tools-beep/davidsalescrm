-- ALL VIEW DEFINITIONS

CREATE OR REPLACE VIEW public.all_call_activity AS
 SELECT calls.id,
    calls.related_deal_id,
    calls.related_contact_id,
    calls.related_company_id,
    calls.rep_id,
    calls.outbound_type,
    calls.call_outcome,
    calls.duration_seconds,
    calls.notes,
    calls.caller_number,
    calls.callee_number,
    calls.call_timestamp,
    calls.created_at,
    'Dialpad API Data'::text AS call_source,
    calls.dialpad_call_id,
    calls.recording_url,
    calls.transcript,
    calls.dialpad_metadata
   FROM public.calls
  WHERE (calls.dialpad_metadata IS NOT NULL)
UNION ALL
 SELECT calls.id,
    calls.related_deal_id,
    calls.related_contact_id,
    calls.related_company_id,
    calls.rep_id,
    calls.outbound_type,
    calls.call_outcome,
    calls.duration_seconds,
    calls.notes,
    calls.caller_number,
    calls.callee_number,
    calls.call_timestamp,
    calls.created_at,
    'Dialpad CTI Call'::text AS call_source,
    calls.dialpad_call_id,
    calls.recording_url,
    calls.transcript,
    calls.dialpad_metadata
   FROM public.calls
  WHERE ((calls.dialpad_call_id IS NOT NULL) AND (calls.dialpad_metadata IS NULL))
UNION ALL
 SELECT manual_call_logs.id,
    manual_call_logs.related_deal_id,
    manual_call_logs.related_contact_id,
    manual_call_logs.related_company_id,
    manual_call_logs.rep_id,
    manual_call_logs.outbound_type,
    manual_call_logs.call_outcome,
    manual_call_logs.duration_seconds,
    manual_call_logs.notes,
    manual_call_logs.caller_number,
    manual_call_logs.callee_number,
    manual_call_logs.call_timestamp,
    manual_call_logs.created_at,
    'Manual Log'::text AS call_source,
    NULL::text AS dialpad_call_id,
    NULL::text AS recording_url,
    NULL::text AS transcript,
    NULL::jsonb AS dialpad_metadata
   FROM public.manual_call_logs;

CREATE OR REPLACE VIEW public.eod_admin_overview AS
 SELECT u.id AS user_id,
    u.email,
    COALESCE(((up.first_name || ' '::text) || up.last_name), (u.email)::text) AS full_name,
    s.id AS submission_id,
    s.submitted_at,
    s.clocked_in_at,
    s.clocked_out_at,
    s.total_hours,
    s.summary,
    s.email_sent,
    date(s.submitted_at) AS submission_date
   FROM ((auth.users u
     LEFT JOIN public.user_profiles up ON ((u.id = up.user_id)))
     LEFT JOIN public.eod_submissions s ON ((u.id = s.user_id)));

CREATE OR REPLACE VIEW public.eod_reports_with_users AS
 SELECT er.id,
    er.user_id,
    er.report_date,
    er.started_at,
    er.ended_at,
    er.total_minutes,
    er.summary,
    er.created_at,
    er.updated_at,
    concat(up.first_name, ' ', up.last_name) AS full_name,
    up.email,
    up.role
   FROM (public.eod_reports er
     LEFT JOIN public.user_profiles up ON ((er.user_id = up.user_id)));

