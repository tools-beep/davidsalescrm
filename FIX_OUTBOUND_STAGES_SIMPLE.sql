-- ============================================
-- FIX: Add ALL Missing Stages to Outbound Funnel
-- ============================================

-- First, let's see what stages deals actually have
SELECT DISTINCT stage, COUNT(*) as deal_count
FROM deals 
WHERE pipeline_id = (SELECT id FROM pipelines WHERE name = 'Outbound Funnel')
GROUP BY stage
ORDER BY deal_count DESC;

-- Update Outbound Funnel to include ALL stages that deals use
UPDATE public.pipelines
SET 
  stages = '[
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
  ]'::jsonb,
  stage_order = '[
    {"name": "Uncontacted", "color": "#9CA3AF"},
    {"name": "No Answer / Gatekeeper", "color": "#9CA3AF"},
    {"name": "DM Connected", "color": "#F59E0B"},
    {"name": "Nurturing", "color": "#9CA3AF"},
    {"name": "Interested", "color": "#3B82F6"},
    {"name": "Strategy Call Booked", "color": "#3B82F6"},
    {"name": "Strategy Call Attended", "color": "#3B82F6"},
    {"name": "BizOps Audit Agreement Sent", "color": "#8B5CF6"},
    {"name": "BizOps Audit Paid / Booked", "color": "#8B5CF6"},
    {"name": "BizOps Audit Attended", "color": "#8B5CF6"},
    {"name": "MS Agreement Sent", "color": "#10B981"},
    {"name": "Balance Paid / Deal Won", "color": "#10B981"},
    {"name": "Proposal / Scope", "color": "#10B981"},
    {"name": "Closed Won", "color": "#10B981"},
    {"name": "Closed Lost", "color": "#EF4444"},
    {"name": "Not Interested", "color": "#EF4444"},
    {"name": "Not Qualified", "color": "#EF4444"}
  ]'::jsonb
WHERE name = 'Outbound Funnel';

-- Verify the update
SELECT 
  name,
  jsonb_array_length(stages) as total_stages,
  stages
FROM pipelines 
WHERE name = 'Outbound Funnel';

-- Show all stages now in the pipeline
SELECT jsonb_array_elements_text(stages) as stage_name
FROM pipelines
WHERE name = 'Outbound Funnel';

