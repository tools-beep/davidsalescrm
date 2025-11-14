-- ============================================
-- COMPLETE PIPELINE FIX
-- This will ensure all pipelines have correct stage names (not UUIDs)
-- ============================================

-- Step 1: Show current pipeline configuration
SELECT 
  id,
  name,
  stages,
  stage_order,
  is_active,
  created_at
FROM pipelines
ORDER BY created_at;

-- Step 2: Check if stages contain UUIDs (this will show the actual data type)
SELECT 
  id,
  name,
  jsonb_array_length(stages) as stage_count,
  stages,
  -- Try to detect if first element looks like a UUID
  CASE 
    WHEN stages->0 IS NOT NULL AND 
         stages->0::text ~ '"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"'
    THEN '⚠️ CONTAINS UUIDs - NEEDS FIX'
    ELSE '✓ OK - Contains stage names'
  END as status
FROM pipelines
WHERE is_active = true;

-- Step 3: Get all unique stages from deals to know what stages we need
SELECT DISTINCT stage::text as stage_name
FROM deals
ORDER BY stage_name;

-- Step 4: FIX - Update Outbound Funnel to have all necessary stages as names
UPDATE pipelines
SET stages = jsonb_build_array(
  'uncontacted',
  'no answer / gatekeeper',
  'dm connected',
  'not qualified',
  'discovery',
  'not interested',
  'not contacted',
  'nurturing',
  'strategy call booked',
  'strategy call attended',
  'proposal sent',
  'negotiation',
  'closed won',
  'closed lost'
)
WHERE name ILIKE '%outbound%';

-- Step 5: FIX - Update Client Success to have all necessary stages as names
UPDATE pipelines
SET stages = jsonb_build_array(
  'onboarding',
  'active',
  'at risk',
  'churned',
  'renewed'
)
WHERE name ILIKE '%client success%';

-- Step 6: Verify the fix
SELECT 
  id,
  name,
  stages,
  jsonb_array_length(stages) as stage_count
FROM pipelines
WHERE is_active = true;

-- Step 7: Ensure stage_order also uses correct names (if it exists)
-- This updates stage_order to match the stages array
UPDATE pipelines
SET stage_order = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'name', stage_name,
      'color', COALESCE(
        (stage_order->idx->'color')::text,
        CASE 
          WHEN stage_name = 'uncontacted' THEN '#94a3b8'
          WHEN stage_name LIKE '%connected%' THEN '#3b82f6'
          WHEN stage_name LIKE '%qualified%' THEN '#8b5cf6'
          WHEN stage_name LIKE '%discovery%' THEN '#06b6d4'
          WHEN stage_name LIKE '%call%' THEN '#f59e0b'
          WHEN stage_name LIKE '%proposal%' THEN '#10b981'
          WHEN stage_name LIKE '%negotiation%' THEN '#f59e0b'
          WHEN stage_name LIKE '%won%' THEN '#22c55e'
          WHEN stage_name LIKE '%lost%' THEN '#ef4444'
          ELSE '#6b7280'
        END
      )
    )
  )
  FROM (
    SELECT 
      (stages->idx)::text as stage_name,
      idx
    FROM generate_series(0, jsonb_array_length(stages) - 1) as idx
  ) as stage_data
)
WHERE is_active = true;

-- Step 8: Final verification - show everything
SELECT 
  id,
  name,
  stages,
  stage_order,
  jsonb_array_length(stages) as stage_count
FROM pipelines
WHERE is_active = true;

