-- ============================================
-- Add Missing Stages to Enum
-- ============================================

-- Add 'proposal sent' if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'proposal sent' AND enumtypid = 'deal_stage_enum'::regtype) THEN
        ALTER TYPE deal_stage_enum ADD VALUE 'proposal sent';
        RAISE NOTICE 'Added: proposal sent';
    ELSE
        RAISE NOTICE 'Already exists: proposal sent';
    END IF;
END $$;

-- Add 'negotiation' if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'negotiation' AND enumtypid = 'deal_stage_enum'::regtype) THEN
        ALTER TYPE deal_stage_enum ADD VALUE 'negotiation';
        RAISE NOTICE 'Added: negotiation';
    ELSE
        RAISE NOTICE 'Already exists: negotiation';
    END IF;
END $$;

-- Show all enum values
SELECT enumlabel as stage_name
FROM pg_enum
WHERE enumtypid = 'deal_stage_enum'::regtype
ORDER BY enumlabel;

