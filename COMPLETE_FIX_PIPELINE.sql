-- ============================================
-- COMPLETE FIX: Pipeline Stages and Drag-Drop
-- ============================================

-- Step 1: Clear any UUID-based stages and set proper stage names
UPDATE public.pipelines
SET stages = '[
  "uncontacted",
  "no answer / gatekeeper", 
  "dm connected",
  "nurturing",
  "interested",
  "strategy call booked",
  "strategy call attended",
  "bizops audit agreement sent",
  "bizops audit paid / booked", 
  "bizops audit attended",
  "ms agreement sent",
  "balance paid / deal won",
  "proposal / scope",
  "closed won",
  "closed lost",
  "not interested",
  "not qualified"
]'::jsonb
WHERE name = 'Outbound Funnel';

-- Step 2: Verify the fix
SELECT 
  name,
  stages,
  jsonb_array_length(stages) as stage_count
FROM pipelines 
WHERE name = 'Outbound Funnel';

-- Step 3: Show all stages now in the pipeline
SELECT jsonb_array_elements_text(stages) as stage_name
FROM pipelines
WHERE name = 'Outbound Funnel'
ORDER BY stage_name;

-- Step 4: Check what stages your deals actually use
SELECT stage, COUNT(*) as count
FROM deals
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
GROUP BY stage
ORDER BY count DESC;

