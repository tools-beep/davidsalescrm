-- Fix pipeline stages to ensure they contain stage names, not UUIDs
-- This migration ensures the stages column contains an array of stage name strings

-- Update Outbound Funnel pipeline to have correct stage names
UPDATE public.pipelines
SET stages = '[
  "uncontacted",
  "no answer / gatekeeper",
  "dm connected",
  "strategy call booked",
  "strategy call attended",
  "bizops audit agreement sent",
  "bizops audit paid / booked",
  "bizops audit attended",
  "ms agreement sent",
  "balance paid / deal won",
  "not interested",
  "not qualified"
]'::jsonb
WHERE name ILIKE '%outbound%';

-- Update Client Success pipeline to have correct stage names
UPDATE public.pipelines
SET stages = '[
  "onboarding call booked",
  "onboarding call attended",
  "active client (operator)",
  "active client - project in progress",
  "paused client",
  "candidate replacement",
  "project rescope / expansion",
  "active client - project maintenance",
  "cancelled / completed"
]'::jsonb
WHERE name ILIKE '%client success%';

-- Update Discovery pipeline if it exists
UPDATE public.pipelines
SET stages = '[
  "not contacted",
  "no answer / gatekeeper",
  "decision maker",
  "nurturing",
  "interested",
  "strategy call booked",
  "strategy call attended",
  "proposal / scope",
  "closed won",
  "closed lost"
]'::jsonb
WHERE name ILIKE '%discovery%';

-- Log the update
DO $$
DECLARE
  pipeline_record RECORD;
BEGIN
  RAISE NOTICE '=== Pipeline Stages Fixed ===';
  
  FOR pipeline_record IN 
    SELECT id, name, stages 
    FROM public.pipelines 
    WHERE is_active = true
  LOOP
    RAISE NOTICE 'Pipeline: % - Stages: %', pipeline_record.name, pipeline_record.stages;
  END LOOP;
END $$;

