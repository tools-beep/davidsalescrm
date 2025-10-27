-- ============================================
-- CHECK CLIENT SUCCESS PIPELINE
-- ============================================
-- Run this in Supabase SQL Editor to diagnose
-- why the Client Success Pipeline is not showing data
-- ============================================

-- 1. Check if the pipeline exists
SELECT id, name, description, is_active, stages
FROM pipelines
WHERE name = 'Client Success Pipeline';

-- 2. Check how many deals are in the Client Success Pipeline
SELECT 
  COUNT(*) as total_deals,
  stage,
  COUNT(*) as deals_per_stage
FROM deals
WHERE pipeline_id = '00000000-0000-0000-0000-000000000002'
GROUP BY stage
ORDER BY deals_per_stage DESC;

-- 3. Check all deals with Client Success Pipeline stages (even if pipeline_id is wrong)
SELECT 
  id,
  name,
  stage,
  pipeline_id,
  created_at
FROM deals
WHERE stage IN (
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
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check if any deals have NULL pipeline_id
SELECT COUNT(*) as deals_without_pipeline
FROM deals
WHERE pipeline_id IS NULL;

-- 5. Check distribution of deals across all pipelines
SELECT 
  p.name as pipeline_name,
  p.id as pipeline_id,
  COUNT(d.id) as deal_count
FROM pipelines p
LEFT JOIN deals d ON d.pipeline_id = p.id
GROUP BY p.id, p.name
ORDER BY deal_count DESC;

-- 6. Check if the enum values exist
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
-- DIAGNOSIS
-- ============================================
-- Based on the results above:
-- 
-- If Query 1 returns no results:
--   → The pipeline doesn't exist, run: 20251010180000_custom_pipelines.sql
--
-- If Query 2 returns 0 deals:
--   → No deals are assigned to this pipeline
--   → Check Query 3 to see if deals have the right stages but wrong pipeline_id
--
-- If Query 3 shows deals:
--   → Deals have Client Success stages but wrong pipeline_id
--   → Run the FIX below
--
-- If Query 4 shows deals:
--   → Some deals don't have a pipeline assigned
--   → Run the FIX below
--
-- If Query 6 doesn't show all 9 stages:
--   → Some enum values are missing
--   → Run: 20251010180000_custom_pipelines.sql
-- ============================================

-- ============================================
-- FIX: Assign Client Success stages to correct pipeline
-- ============================================
-- Uncomment and run this if Query 3 showed deals with wrong pipeline_id:

-- UPDATE deals
-- SET pipeline_id = '00000000-0000-0000-0000-000000000002'
-- WHERE stage IN (
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
-- After running the FIX, run Query 2 again to verify
-- ============================================

