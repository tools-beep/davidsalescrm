-- ============================================
-- COPY THIS ENTIRE SCRIPT TO SUPABASE SQL EDITOR AND RUN IT
-- This will fix ALL your stage issues permanently
-- ============================================

DO $$
DECLARE
    stage_name TEXT;
    stage_names TEXT[] := ARRAY[
        -- Your custom stages from all pipelines
        'hello',
        'hi',
        'whats',
        'up',
        'why',
        'honest',
        'courages',
        'sproposal',
        
        -- Current pipeline stages
        'uncontacted',
        'dmconnected',
        'proposal',
        
        -- All common variations
        'dm connected',
        'no answer / gatekeeper',
        'not qualified',
        'qualified',
        'discovery',
        'not interested',
        'not contacted',
        'contacted',
        'nurturing',
        'strategy call booked',
        'strategy call attended',
        'proposal sent',
        'negotiation',
        'closed won',
        'closed lost',
        'won',
        'lost',
        'onboarding',
        'active',
        'at risk',
        'churned',
        'renewed',
        'lead',
        'prospect',
        'opportunity',
        'quote',
        'verbal',
        'contract sent',
        'contract signed',
        'implementation',
        'live',
        'expansion',
        'renewal',
        'churn risk',
        'meeting scheduled',
        'meeting completed',
        'follow up',
        'demo scheduled',
        'demo completed',
        'new',
        'working',
        'pending',
        'approved',
        'rejected'
    ];
BEGIN
    RAISE NOTICE 'Starting to add stages...';
    
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
                RAISE NOTICE 'Added stage: %', stage_name;
            ELSE
                RAISE NOTICE 'Stage already exists: %', stage_name;
            END IF;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Stage already exists (duplicate): %', stage_name;
            WHEN OTHERS THEN
                RAISE WARNING 'Could not add stage % - Error: %', stage_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '=== STAGE ADDITION COMPLETE ===';
END
$$;

-- Show all available stages
SELECT 
    enumlabel as stage_name,
    enumsortorder as sort_order
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
ORDER BY enumsortorder;

-- Show count
SELECT COUNT(*) as total_stages
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum';
