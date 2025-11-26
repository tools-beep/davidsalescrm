-- =====================================================
-- FIX UNKNOWN REP NAMES - Match calls to user_profiles
-- =====================================================

-- Step 1: Check current rep_id values in calls
SELECT DISTINCT rep_id, COUNT(*) as call_count
FROM calls
GROUP BY rep_id
ORDER BY call_count DESC
LIMIT 10;

-- Step 2: Check user_profiles to see available users
SELECT user_id, email, first_name, last_name, role
FROM user_profiles
WHERE role IN ('rep', 'manager', 'admin', 'super_admin')
ORDER BY email;

-- Step 3: Find calls with rep_id that don't match any user_profiles
SELECT 
  c.rep_id,
  COUNT(*) as orphan_calls
FROM calls c
LEFT JOIN user_profiles up ON c.rep_id = up.user_id
WHERE up.user_id IS NULL
GROUP BY c.rep_id;

-- Step 4: Update calls to use correct rep_id
-- (Run this after identifying the correct user_id from Step 2)

-- Example: Update calls for Miguel Diaz
-- Replace 'OLD_REP_ID' with the current rep_id from Step 1
-- Replace 'MIGUEL_USER_ID' with the correct user_id from Step 2

/*
UPDATE calls
SET rep_id = (SELECT user_id FROM user_profiles WHERE email = 'miguel@stafflyhq.ai')
WHERE rep_id = 'OLD_REP_ID' OR rep_id IS NULL;
*/

-- Example: Update calls for Hannah
/*
UPDATE calls
SET rep_id = (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai')
WHERE account_manager_id = (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai')
  AND is_account_manager_meeting = true;
*/

-- Step 5: Verify the updates
SELECT 
  up.first_name,
  up.last_name,
  up.email,
  COUNT(c.id) as call_count
FROM calls c
JOIN user_profiles up ON c.rep_id = up.user_id
GROUP BY up.user_id, up.first_name, up.last_name, up.email
ORDER BY call_count DESC;

