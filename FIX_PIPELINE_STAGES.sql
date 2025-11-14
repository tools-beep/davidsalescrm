-- ============================================
-- FIX: Pipeline Stages Format
-- ============================================
-- This script ensures all pipeline stages are stored as stage names (strings)
-- not UUIDs, so drag-and-drop works correctly.

-- First, let's see what we have
SELECT id, name, stages, stage_order FROM public.pipelines WHERE is_active = true;

-- Update Outbound Funnel Pipeline
UPDATE public.pipelines
SET stages = '["uncontacted", "no answer / gatekeeper", "dm connected", "strategy call booked", "strategy call attended", "bizops audit agreement sent", "bizops audit paid / booked", "bizops audit attended", "ms agreement sent", "balance paid / deal won", "not interested", "not qualified"]'::jsonb
WHERE name ILIKE '%outbound%';

-- Update Client Success Pipeline  
UPDATE public.pipelines
SET stages = '["onboarding call booked", "onboarding call attended", "active client (operator)", "active client - project in progress", "paused client", "candidate replacement", "project rescope / expansion", "active client - project maintenance", "cancelled / completed"]'::jsonb
WHERE name ILIKE '%client%success%';

-- Update any Discovery/Default Pipeline
UPDATE public.pipelines
SET stages = '["not contacted", "no answer / gatekeeper", "decision maker", "nurturing", "interested", "strategy call booked", "strategy call attended", "proposal / scope", "closed won", "closed lost"]'::jsonb
WHERE name ILIKE '%discovery%' OR name ILIKE '%lead%generation%';

-- Verify the fix
SELECT 
  id, 
  name, 
  jsonb_array_length(stages) as stage_count,
  stages,
  stage_order
FROM public.pipelines 
WHERE is_active = true;

-- Check if any stages are UUIDs (they shouldn't be after this fix)
SELECT 
  name,
  stages,
  CASE 
    WHEN stages::text LIKE '%-%-%-%-%' THEN 'HAS UUIDs - NEEDS FIX'
    ELSE 'OK - Stage names only'
  END as status
FROM public.pipelines 
WHERE is_active = true;

