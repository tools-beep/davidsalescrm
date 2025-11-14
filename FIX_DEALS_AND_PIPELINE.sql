-- ============================================
-- COMPLETE FIX: Deals showing 531 vs 768
-- ============================================

-- Step 1: Check for any stage UUIDs in deals
SELECT 
  stage,
  COUNT(*) as count,
  CASE 
    WHEN stage ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN '⚠️ UUID - NEEDS FIX'
    ELSE '✓ OK'
  END as status
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
GROUP BY stage
ORDER BY count DESC;

-- Step 2: Count deals by stage (exact count)
SELECT 
  stage::text as stage_name,
  COUNT(*) as exact_count
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
GROUP BY stage
ORDER BY exact_count DESC;

-- Step 3: Check total count
SELECT COUNT(*) as total_deals_in_outbound_funnel
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel');

-- Step 4: Specifically check uncontacted deals
SELECT COUNT(*) as uncontacted_deals
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
AND stage = 'uncontacted';

-- Step 5: Check if there are any NULL pipeline_ids
SELECT 
  CASE 
    WHEN pipeline_id IS NULL THEN 'NULL pipeline_id'
    ELSE 'Has pipeline_id'
  END as status,
  COUNT(*) as count
FROM deals
WHERE stage = 'uncontacted'
GROUP BY pipeline_id IS NULL;

-- Step 6: Show first 10 uncontacted deals to verify
SELECT id, name, stage, pipeline_id, created_at
FROM deals
WHERE stage = 'uncontacted'
AND pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
ORDER BY created_at DESC
LIMIT 10;

