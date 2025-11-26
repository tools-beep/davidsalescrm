-- =====================================================
-- CHECK IF SETUP IS COMPLETE
-- =====================================================

-- Step 1: Check if the new columns exist in calls table
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name IN (
  'meeting_type', 
  'meeting_outcome', 
  'meeting_timestamp', 
  'is_account_manager_meeting',
  'account_manager_id'
)
ORDER BY column_name;

-- Step 2: Check if there are any Account Manager meetings
SELECT 
  id,
  meeting_type,
  meeting_outcome,
  is_account_manager_meeting,
  account_manager_id,
  meeting_timestamp,
  created_at
FROM calls
WHERE is_account_manager_meeting = true
LIMIT 10;

-- Step 3: If no meetings exist, insert a test meeting for Hannah
-- First, get Hannah's user_id
SELECT user_id, email, first_name, last_name, role
FROM user_profiles
WHERE email = 'hannah@stafflyhq.ai';

-- Step 4: Insert a test meeting (ONLY run after getting Hannah's user_id from Step 3)
-- Replace 'HANNAH_USER_ID_HERE' with the actual user_id from Step 3

/*
INSERT INTO calls (
  rep_id,
  account_manager_id,
  meeting_type,
  meeting_outcome,
  duration_seconds,
  notes,
  meeting_timestamp,
  call_timestamp,
  is_account_manager_meeting,
  call_direction,
  call_status,
  outbound_type,
  call_outcome,
  related_deal_id
) VALUES (
  'HANNAH_USER_ID_HERE',
  'HANNAH_USER_ID_HERE',
  'Client Check-In',
  'Client - Positive',
  600,
  'Test meeting for analytics',
  NOW(),
  NOW(),
  true,
  'outbound',
  'completed',
  'onboarding call',
  'not applicable',
  (SELECT id FROM deals WHERE name = 'NextHome Northern Lights' LIMIT 1)
);
*/

-- Step 5: Verify the test meeting was inserted
SELECT 
  id,
  meeting_type,
  meeting_outcome,
  is_account_manager_meeting,
  duration_seconds,
  notes,
  meeting_timestamp
FROM calls
WHERE is_account_manager_meeting = true
ORDER BY meeting_timestamp DESC
LIMIT 5;

