-- URGENT FIX: Add your custom stages RIGHT NOW
-- Copy this entire script and run it in Supabase SQL Editor

-- Add all your custom stages
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'hello';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'hi';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'whats';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'up';

-- Verify stages were added
SELECT enumlabel as available_stages
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
ORDER BY enumlabel;
