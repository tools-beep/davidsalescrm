-- ⚡ FIX FULFILLMENT - OPERATORS PIPELINE DEALS
-- This script will help diagnose and fix why the 5 deals aren't showing

-- STEP 1: Find the pipeline and see its configuration
SELECT 
  id,
  name,
  stages,
  stage_order,
  is_active
FROM pipelines
WHERE name ILIKE '%fulfillment%' OR name ILIKE '%operator%';

-- STEP 2: See the 5 deals and their current stages
SELECT 
  d.id,
  d.name,
  d.stage as current_stage,
  d.pipeline_id,
  d.created_at
FROM deals d
JOIN pipelines p ON d.pipeline_id = p.id
WHERE p.name ILIKE '%fulfillment%' OR p.name ILIKE '%operator%'
ORDER BY d.created_at DESC;

-- STEP 3: Check if those stages exist in the enum
-- First, let's see what stages the deals have
SELECT DISTINCT stage
FROM deals d
JOIN pipelines p ON d.pipeline_id = p.id
WHERE p.name ILIKE '%fulfillment%' OR p.name ILIKE '%operator%';

-- STEP 4: Add any missing stages to the enum
-- (Run these one by one based on what you see in STEP 3)
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'onboarding call booked';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'onboarding call attended';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'active clients (launched)';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'paused clients';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'candidate replacement';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'cancelled clients';

-- STEP 5: Verify the stages are now in the enum
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
AND enumlabel IN (
  'onboarding call booked',
  'onboarding call attended',
  'active clients (launched)',
  'paused clients',
  'candidate replacement',
  'cancelled clients'
)
ORDER BY enumlabel;

-- STEP 6: Check the pipeline's stages configuration
-- This shows what stages are configured in the pipeline
SELECT 
  name,
  stages,
  stage_order
FROM pipelines
WHERE name ILIKE '%fulfillment%' OR name ILIKE '%operator%';

-- ✅ EXPECTED RESULTS:
-- STEP 1: Should show the Fulfillment - Operators pipeline
-- STEP 2: Should show 5 deals with their stages
-- STEP 3: Shows what stages those deals currently have
-- STEP 4: Adds those stages to the enum
-- STEP 5: Confirms stages are in enum
-- STEP 6: Shows pipeline configuration

-- 🔧 COMMON ISSUES:
-- 1. Deals have stages that aren't in the enum → Run STEP 4
-- 2. Deals have stages that aren't in pipeline config → Need to update pipeline
-- 3. Stage names have typos or different capitalization → Need to normalize

