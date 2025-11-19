-- ⚡ FIX MISSING STAGES - Run this in Supabase SQL Editor NOW
-- This adds all the missing stages that are causing enum errors

-- Add missing stages to the enum
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'awaiting docs / signature';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'business audit booked';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'business audit attended';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'not qualified / disqualified';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'do not call';

-- Also add any other common stages that might be missing
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'awaiting docs';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'signature';
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'docs / signature';

-- Verify all stages exist
SELECT enumlabel as available_stages
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
ORDER BY enumlabel;

-- ✅ After running this:
-- 1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)
-- 2. "Not interested" and "Do Not Call" will now be separate stages
-- 3. No more enum errors!

