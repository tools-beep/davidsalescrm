-- ============================================
-- Fix Pipeline Stages - Simple Version
-- ============================================

-- Step 1: Update Outbound Funnel with correct stages
UPDATE pipelines
SET 
  stages = '["uncontacted", "no answer / gatekeeper", "dm connected", "not qualified", "discovery", "not interested", "not contacted", "nurturing", "strategy call booked", "strategy call attended", "proposal sent", "negotiation", "closed won", "closed lost"]'::jsonb,
  stage_order = '[
    {"name": "uncontacted", "color": "#94a3b8"},
    {"name": "no answer / gatekeeper", "color": "#64748b"},
    {"name": "dm connected", "color": "#3b82f6"},
    {"name": "not qualified", "color": "#ef4444"},
    {"name": "discovery", "color": "#06b6d4"},
    {"name": "not interested", "color": "#f87171"},
    {"name": "not contacted", "color": "#9ca3af"},
    {"name": "nurturing", "color": "#fbbf24"},
    {"name": "strategy call booked", "color": "#f59e0b"},
    {"name": "strategy call attended", "color": "#fb923c"},
    {"name": "proposal sent", "color": "#10b981"},
    {"name": "negotiation", "color": "#8b5cf6"},
    {"name": "closed won", "color": "#22c55e"},
    {"name": "closed lost", "color": "#dc2626"}
  ]'::jsonb
WHERE name ILIKE '%outbound%';

-- Step 2: Update Client Success with correct stages
UPDATE pipelines
SET 
  stages = '["onboarding", "active", "at risk", "churned", "renewed"]'::jsonb,
  stage_order = '[
    {"name": "onboarding", "color": "#3b82f6"},
    {"name": "active", "color": "#22c55e"},
    {"name": "at risk", "color": "#f59e0b"},
    {"name": "churned", "color": "#ef4444"},
    {"name": "renewed", "color": "#10b981"}
  ]'::jsonb
WHERE name ILIKE '%client success%';

-- Step 3: Create a simple validation function
CREATE OR REPLACE FUNCTION validate_pipeline_stages()
RETURNS TRIGGER AS $$
BEGIN
  -- Basic validation: ensure stages is an array
  IF NEW.stages IS NOT NULL AND jsonb_typeof(NEW.stages) != 'array' THEN
    RAISE EXCEPTION 'stages must be a JSON array';
  END IF;
  
  -- Basic validation: ensure stage_order is an array
  IF NEW.stage_order IS NOT NULL AND jsonb_typeof(NEW.stage_order) != 'array' THEN
    RAISE EXCEPTION 'stage_order must be a JSON array';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger
DROP TRIGGER IF EXISTS validate_pipeline_stages_trigger ON pipelines;
CREATE TRIGGER validate_pipeline_stages_trigger
  BEFORE INSERT OR UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION validate_pipeline_stages();

