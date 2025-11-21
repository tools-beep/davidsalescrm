-- URGENT FIX: Update the deal's stage to match the pipeline column name exactly

-- First, check what stages the pipeline expects
SELECT 
    name as pipeline_name,
    stage_order
FROM pipelines
WHERE name ILIKE '%fulfillment%operator%';

-- Update the deal to have the correct capitalization
UPDATE deals
SET stage = 'Active Clients (Launched)'
WHERE name ILIKE '%nexthome%northern%lights%'
  AND pipeline_id IN (
    SELECT id FROM pipelines WHERE name ILIKE '%fulfillment%operator%'
  )
  AND stage = 'active clients (launched)';

-- Verify the update
SELECT 
    d.name as deal_name,
    d.stage as updated_stage,
    p.name as pipeline_name
FROM deals d
LEFT JOIN pipelines p ON p.id = d.pipeline_id
WHERE d.name ILIKE '%nexthome%northern%lights%'
  AND p.name ILIKE '%fulfillment%operator%';

