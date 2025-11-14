-- ============================================
-- Simple Check: Uncontacted Deals Count
-- ============================================

-- Step 1: Count all uncontacted deals in Outbound Funnel
SELECT COUNT(*) as uncontacted_count
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
AND stage = 'uncontacted';

-- Step 2: Count all deals by stage in Outbound Funnel
SELECT 
  stage,
  COUNT(*) as count
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
GROUP BY stage
ORDER BY count DESC;

-- Step 3: Check total in Outbound Funnel
SELECT COUNT(*) as total_deals
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel');

-- Step 4: Show a sample of uncontacted deals
SELECT id, name, stage, pipeline_id, created_at
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
AND stage = 'uncontacted'
ORDER BY created_at DESC
LIMIT 10;

-- Step 5: Check if there are uncontacted deals with NULL pipeline_id
SELECT COUNT(*) as uncontacted_without_pipeline
FROM deals
WHERE stage = 'uncontacted'
AND pipeline_id IS NULL;

-- Step 6: Verify the pipeline stages are correct
SELECT name, stages
FROM pipelines
WHERE name = 'Outbound Funnel';

