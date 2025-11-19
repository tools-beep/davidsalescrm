-- 🔍 DEBUG: Why aren't the 5 deals showing in Fulfillment - Operators pipeline?

-- 1. Find the Fulfillment - Operators pipeline ID
SELECT id, name, stages, stage_order
FROM pipelines
WHERE name ILIKE '%fulfillment%' OR name ILIKE '%operator%'
ORDER BY name;

-- 2. Check all deals in this pipeline
SELECT 
  d.id,
  d.name,
  d.stage,
  d.pipeline_id,
  p.name as pipeline_name,
  d.created_at
FROM deals d
LEFT JOIN pipelines p ON d.pipeline_id = p.id
WHERE p.name ILIKE '%fulfillment%' OR p.name ILIKE '%operator%'
ORDER BY d.created_at DESC;

-- 3. Check what stages these deals have
SELECT 
  d.stage,
  COUNT(*) as deal_count
FROM deals d
LEFT JOIN pipelines p ON d.pipeline_id = p.id
WHERE p.name ILIKE '%fulfillment%' OR p.name ILIKE '%operator%'
GROUP BY d.stage
ORDER BY deal_count DESC;

-- 4. Check if the stages exist in the enum
SELECT enumlabel as stage_name
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
AND enumlabel IN (
  SELECT DISTINCT stage 
  FROM deals d
  LEFT JOIN pipelines p ON d.pipeline_id = p.id
  WHERE p.name ILIKE '%fulfillment%' OR p.name ILIKE '%operator%'
)
ORDER BY enumlabel;

-- 5. Check for stage mismatches (stages in deals but NOT in enum)
SELECT DISTINCT d.stage as missing_stage
FROM deals d
LEFT JOIN pipelines p ON d.pipeline_id = p.id
WHERE (p.name ILIKE '%fulfillment%' OR p.name ILIKE '%operator%')
AND d.stage NOT IN (
  SELECT enumlabel
  FROM pg_enum e
  JOIN pg_type t ON e.enumtypid = t.oid
  WHERE t.typname = 'deal_stage_enum'
)
ORDER BY d.stage;

-- 6. Show the pipeline configuration
SELECT 
  id,
  name,
  stages,
  stage_order,
  is_active
FROM pipelines
WHERE name ILIKE '%fulfillment%' OR name ILIKE '%operator%';

-- ✅ WHAT TO LOOK FOR:
-- Query 1: Pipeline ID and stage configuration
-- Query 2: The 5 deals and their current stages
-- Query 3: Stage distribution (which stages have deals)
-- Query 4: Which stages exist in the enum
-- Query 5: Any stages that are NOT in the enum (these cause issues)
-- Query 6: Pipeline configuration details

