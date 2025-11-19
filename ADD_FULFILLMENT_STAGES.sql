-- ⚡ ADD FULFILLMENT - OPERATORS PIPELINE STAGES
-- Run this in Supabase SQL Editor NOW
-- This adds all stages from the Fulfillment - Operators Pipeline

-- Add all stages to the enum
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'onboarding call booked';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'onboarding call attended';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'active clients (launched)';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'paused clients';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'candidate replacement';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'cancelled clients';

-- Also add common variations
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'active clients';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'launched';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'replacement';

-- Verify all stages exist
SELECT enumlabel as available_stages
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
AND enumlabel IN (
  'onboarding call booked',
  'onboarding call attended',
  'active clients (launched)',
  'paused clients',
  'candidate replacement',
  'cancelled clients'
)
ORDER BY enumlabel;

-- Expected result: Should show all 6 stages
-- If any are missing, they will be added by the ALTER TYPE commands above

