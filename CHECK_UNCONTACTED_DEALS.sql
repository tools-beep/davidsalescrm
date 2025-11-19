-- ⚡ CHECK UNCONTACTED DEALS DISTRIBUTION
-- Run this in Supabase SQL Editor to see where your 658 uncontacted deals are

-- 1. Total uncontacted deals across ALL pipelines
SELECT COUNT(*) as total_uncontacted
FROM deals
WHERE stage = 'uncontacted';
-- Expected: 658

-- 2. Uncontacted deals by pipeline
SELECT 
  p.name as pipeline_name,
  p.id as pipeline_id,
  COUNT(d.id) as uncontacted_count
FROM deals d
LEFT JOIN pipelines p ON d.pipeline_id = p.id
WHERE d.stage = 'uncontacted'
GROUP BY p.id, p.name
ORDER BY uncontacted_count DESC;
-- This shows how many uncontacted deals are in each pipeline

-- 3. Uncontacted deals with NO pipeline assigned
SELECT COUNT(*) as uncontacted_no_pipeline
FROM deals
WHERE stage = 'uncontacted'
AND pipeline_id IS NULL;
-- This shows deals that aren't assigned to any pipeline

-- 4. Sample uncontacted deals to verify
SELECT 
  d.id,
  d.name,
  d.stage,
  d.pipeline_id,
  p.name as pipeline_name,
  d.created_at
FROM deals d
LEFT JOIN pipelines p ON d.pipeline_id = p.id
WHERE d.stage = 'uncontacted'
ORDER BY d.created_at DESC
LIMIT 20;
-- Shows first 20 uncontacted deals with their pipeline

-- 5. Check for case sensitivity issues
SELECT 
  stage,
  COUNT(*) as count
FROM deals
WHERE LOWER(stage) = 'uncontacted'
GROUP BY stage;
-- This checks if there are variations like "Uncontacted" vs "uncontacted"

-- ✅ EXPECTED RESULTS:
-- Query 1: Should show 658
-- Query 2: Should show breakdown by pipeline (one should have ~556)
-- Query 3: Should show how many have no pipeline (if any)
-- Query 4: Shows sample deals
-- Query 5: Should only show "uncontacted" (lowercase)
