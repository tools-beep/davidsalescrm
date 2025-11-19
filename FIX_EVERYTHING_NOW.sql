-- ⚡ RUN THIS ENTIRE FILE IN SUPABASE SQL EDITOR NOW ⚡
-- This fixes ALL issues:
-- 1. Adds all current stages to enum
-- 2. Changes annual_revenue to TEXT for dropdown
-- 3. Adds common stages for future use

-- ============================================
-- STEP 1: Add Your Current Pipeline Stages
-- ============================================
DO $$
BEGIN
    -- Add your current stages (lowercase, normalized)
    ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'everyday';
    ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'dmconnected';
    ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'proposal';
    ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'uncontacted';
    ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'discovery';
    ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS 'closed won';
    
    RAISE NOTICE '✅ Current stages added';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '✅ Stages already exist';
END $$;

-- ============================================
-- STEP 2: Change Annual Revenue to TEXT
-- ============================================
DO $$
BEGIN
    -- Change annual_revenue from DECIMAL to TEXT
    ALTER TABLE public.deals 
    ALTER COLUMN annual_revenue TYPE TEXT 
    USING CASE 
        WHEN annual_revenue IS NULL THEN NULL
        ELSE annual_revenue::TEXT
    END;
    
    -- Update comment
    COMMENT ON COLUMN public.deals.annual_revenue IS 'Annual revenue range of the client company (<100k, 100-250k, 251-500k, 500k-1M, 1M+)';
    
    RAISE NOTICE '✅ Annual revenue changed to TEXT';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Annual revenue might already be TEXT: %', SQLERRM;
END $$;

-- ============================================
-- STEP 3: Add Common Stages (Future-Proof)
-- ============================================
DO $$
DECLARE
    stage_name TEXT;
    stage_names TEXT[] := ARRAY[
        -- Common sales stages
        'new',
        'contacted',
        'qualified',
        'meeting scheduled',
        'meeting completed',
        'demo scheduled',
        'demo completed',
        'proposal sent',
        'negotiation',
        'closed lost',
        'won',
        'lost',
        
        -- Additional common stages
        'lead',
        'prospect',
        'opportunity',
        'follow up',
        'nurturing',
        'not interested',
        'not qualified',
        'contract sent',
        'contract signed',
        
        -- Your custom stages
        'dm connected',
        'strategy call booked',
        'strategy call attended'
    ];
BEGIN
    FOREACH stage_name IN ARRAY stage_names
    LOOP
        BEGIN
            -- Check if it exists first
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum e
                JOIN pg_type t ON e.enumtypid = t.oid
                WHERE t.typname = 'deal_stage_enum'
                AND e.enumlabel = stage_name
            ) THEN
                -- Add the enum value
                EXECUTE format('ALTER TYPE public.deal_stage_enum ADD VALUE %L', stage_name);
                RAISE NOTICE '✅ Added stage: %', stage_name;
            END IF;
        EXCEPTION
            WHEN duplicate_object THEN
                -- Silently ignore duplicates
                NULL;
        END;
    END LOOP;
    
    RAISE NOTICE '✅ Common stages added';
END $$;

-- ============================================
-- VERIFICATION: Check What We Have Now
-- ============================================
SELECT 
    '✅ All Available Stages:' as status,
    enumlabel as stage_name
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
ORDER BY enumlabel;

-- Check annual_revenue column type
SELECT 
    '✅ Annual Revenue Column Type:' as status,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'deals'
AND column_name = 'annual_revenue';

-- ============================================
-- 🎉 DONE! 
-- ============================================
-- Now:
-- 1. Refresh your browser (Cmd+Shift+R)
-- 2. Try creating a deal
-- 3. Select Annual Revenue from dropdown
-- 4. It should work! ✅

