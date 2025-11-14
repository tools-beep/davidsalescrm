-- ============================================
-- SIMPLE PIPELINE FIX - No complex queries
-- ============================================

-- Step 1: Check current pipeline stages
SELECT 
  id,
  name,
  stages,
  stage_order
FROM pipelines
WHERE is_active = true;

-- Step 2: Add missing stages to enum first
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'proposal sent' AND enumtypid = 'deal_stage_enum'::regtype) THEN
        ALTER TYPE deal_stage_enum ADD VALUE 'proposal sent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'negotiation' AND enumtypid = 'deal_stage_enum'::regtype) THEN
        ALTER TYPE deal_stage_enum ADD VALUE 'negotiation';
    END IF;
END $$;

-- Step 3: Directly update Outbound Funnel with correct stages
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

-- Step 4: Directly update Client Success with correct stages
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

-- Step 4: Verify the fix
SELECT 
  id,
  name,
  stages,
  jsonb_array_length(stages) as stage_count,
  stage_order
FROM pipelines
WHERE is_active = true;

-- Step 5: Show all unique stages from deals
SELECT DISTINCT stage::text as stage_name
FROM deals
ORDER BY stage_name;

