-- Quick fix: Add the "everyday" stage to the enum
ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'everyday';

-- Verify it was added
SELECT enumlabel as stage_name
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
AND enumlabel = 'everyday';
