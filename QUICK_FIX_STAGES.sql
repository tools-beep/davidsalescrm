-- QUICK FIX: Add all current stages to enum
-- Run this in your Supabase SQL Editor RIGHT NOW

ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'everyday';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'dmconnected';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'proposal';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'uncontacted';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'discovery';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'closed won';

-- Verify all stages exist
SELECT enumlabel as available_stages
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
ORDER BY enumlabel;
