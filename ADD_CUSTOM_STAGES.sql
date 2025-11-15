-- Run this in Supabase SQL Editor to add your custom stages
-- Add any stage name you want to use in your pipelines

DO $$
DECLARE
    stage_name TEXT;
    stage_names TEXT[] := ARRAY[
        -- Your custom stages
        'hello',
        'why',
        'whats',
        'honest',
        'courages',
        'sproposal',
        
        -- Common stages (already added, but safe to re-run)
        'uncontacted',
        'contacted',
        'no answer / gatekeeper',
        'dm connected',
        'not qualified',
        'qualified',
        'discovery',
        'not interested',
        'nurturing',
        'strategy call booked',
        'strategy call attended',
        'proposal',
        'proposal sent',
        'negotiation',
        'closed won',
        'closed lost',
        'won',
        'lost',
        
        -- Client success stages
        'onboarding',
        'active',
        'at risk',
        'churned',
        'renewed',
        
        -- Additional common stages
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
                -- Try to add the enum value
                EXECUTE format('ALTER TYPE public.deal_stage_enum ADD VALUE %L', stage_name);
                RAISE NOTICE 'Added stage: %', stage_name;
            ELSE
                RAISE NOTICE 'Stage already exists: %', stage_name;
            END IF;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Stage already exists: %', stage_name;
            WHEN OTHERS THEN
                RAISE WARNING 'Could not add stage %: %', stage_name, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE 'Stage addition complete!';
END
$$;

-- Verify what stages now exist
SELECT enumlabel as stage_name
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'deal_stage_enum'
ORDER BY enumlabel;
