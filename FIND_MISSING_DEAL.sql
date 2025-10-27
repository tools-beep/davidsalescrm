-- ============================================
-- FIND THE MISSING DEAL IN CLIENT SUCCESS PIPELINE
-- ============================================
-- This will show you exactly what stage the deal is in
-- and why it's not appearing in the pipeline view
-- ============================================

-- 1. Find the deal(s) in Client Success Pipeline
SELECT 
  id,
  name,
  stage,
  amount,
  pipeline_id,
  created_at
FROM deals
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
ORDER BY created_at DESC;

-- 2. Check what stage value is stored (exact string)
SELECT 
  stage,
  COUNT(*) as count,
  LENGTH(stage::text) as stage_length,
  -- Show any hidden characters
  ENCODE(stage::text::bytea, 'hex') as stage_hex
FROM deals
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
GROUP BY stage;

-- 3. Check if the stage exists in the enum
SELECT 
  d.stage,
  CASE 
    WHEN d.stage::text = ANY(enum_range(NULL::deal_stage_enum)::text[])
    THEN 'EXISTS IN ENUM ✅'
    ELSE 'NOT IN ENUM ❌'
  END as enum_status
FROM deals d
WHERE d.pipeline_id = '00000000-0000-0000-0000-000000000002';

-- 4. Show all valid Client Success stages from enum
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'deal_stage_enum'::regtype 
AND enumlabel IN (
  'onboarding call booked',
  'onboarding call attended',
  'active client (operator)',
  'active client - project in progress',
  'paused client',
  'candidate replacement',
  'project rescope / expansion',
  'active client - project maintenance',
  'cancelled / completed'
)
ORDER BY enumlabel;

-- ============================================
-- COMMON ISSUES & FIXES
-- ============================================

-- Issue 1: Stage has wrong spacing/capitalization
-- Example: "Active Client (Operator)" vs "active client (operator)"
-- FIX: Normalize the stage value

-- Issue 2: Stage is from a different pipeline
-- Example: Deal has stage "uncontacted" but is in Client Success pipeline
-- FIX: Update the stage to a valid Client Success stage

-- Issue 3: Stage has trailing spaces or special characters
-- FIX: Clean the stage value

-- ============================================
-- AUTOMATIC FIX (uncomment after reviewing Query 1)
-- ============================================

-- If Query 1 shows the deal has a stage that's NOT in Client Success Pipeline,
-- update it to the first stage:

-- UPDATE deals
-- SET stage = 'onboarding call booked'
-- WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
-- AND stage NOT IN (
--   'onboarding call booked',
--   'onboarding call attended',
--   'active client (operator)',
--   'active client - project in progress',
--   'paused client',
--   'candidate replacement',
--   'project rescope / expansion',
--   'active client - project maintenance',
--   'cancelled / completed'
-- );

-- ============================================
-- VERIFICATION
-- ============================================
-- After running the fix, refresh the Deals page
-- The deal should now appear in "Onboarding Call Booked" stage
-- ============================================

