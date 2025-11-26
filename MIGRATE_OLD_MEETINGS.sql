-- =====================================================
-- MIGRATE OLD ACCOUNT MANAGER MEETINGS (if any exist)
-- =====================================================

-- First, check if there are any Account Manager meetings in the old 'meetings' table
-- (This is just to see what data exists)
SELECT 
  id,
  meeting_type,
  meeting_outcome,
  duration_seconds,
  notes,
  created_at
FROM meetings
WHERE meeting_type IS NOT NULL 
  AND meeting_outcome IS NOT NULL
LIMIT 10;

-- If the above query returns data, run this to migrate it:
-- (Only run this AFTER creating the account_manager_meetings table)

/*
INSERT INTO account_manager_meetings (
  id,
  account_manager_id,
  meeting_type,
  meeting_outcome,
  related_contact_id,
  related_deal_id,
  related_company_id,
  duration_seconds,
  notes,
  meeting_timestamp,
  dialpad_call_id,
  caller_number,
  created_at,
  updated_at
)
SELECT 
  id,
  COALESCE(account_manager_id, rep_id) as account_manager_id,
  meeting_type,
  meeting_outcome,
  related_contact_id,
  related_deal_id,
  related_company_id,
  duration_seconds,
  notes,
  COALESCE(meeting_timestamp, call_timestamp, created_at) as meeting_timestamp,
  dialpad_call_id,
  caller_number,
  created_at,
  updated_at
FROM meetings
WHERE meeting_type IS NOT NULL 
  AND meeting_outcome IS NOT NULL
ON CONFLICT (id) DO NOTHING;
*/

