-- ============================================
-- SIMPLE FIX FOR CLIENT SUCCESS PIPELINE
-- ============================================
-- Just run this - it will show you the problem and fix it
-- ============================================

-- STEP 1: See what stage the deal has
SELECT 
  id,
  name,
  stage::text as current_stage,
  amount,
  created_at
FROM deals
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002';

-- STEP 2: Fix any deals with wrong stages
UPDATE deals
SET stage = 'onboarding call booked'
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
AND stage::text NOT IN (
  'onboarding call booked',
  'onboarding call attended',
  'active client (operator)',
  'active client - project in progress',
  'paused client',
  'candidate replacement',
  'project rescope / expansion',
  'active client - project maintenance',
  'cancelled / completed'
);

-- STEP 3: Verify the fix
SELECT 
  id,
  name,
  stage::text as new_stage,
  amount
FROM deals
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002';

-- ============================================
-- DONE!
-- ============================================
-- Now refresh your Deals page and select Client Success Pipeline
-- The deal should appear in "Onboarding Call Booked" stage
-- ============================================

