-- ============================================
-- Add ALL existing deal stages to the enum
-- This ensures every deal can be moved
-- ============================================

-- Step 1: Show all unique stages currently in deals
SELECT DISTINCT stage::text as current_stages
FROM deals
ORDER BY stage::text;

-- Step 2: Add all missing stages to the enum
-- We'll add them one by one to avoid errors

DO $$ 
DECLARE
    stage_name TEXT;
    stage_list TEXT[] := ARRAY[
        'uncontacted',
        'no answer / gatekeeper',
        'dm connected',
        'not qualified',
        'discovery',
        'not interested',
        'not contacted',
        'nurturing',
        'strategy call booked',
        'strategy call attended',
        'proposal sent',
        'negotiation',
        'closed won',
        'closed lost',
        'proposal / scope',
        'decision maker',
        'interested',
        'bizops audit agreement sent',
        'bizops audit paid / booked',
        'bizops audit attended',
        'candidate interview booked',
        'candidate interview attended',
        'ms agreement sent',
        'deal won',
        'balance paid / deal won',
        'onboarding call booked',
        'onboarding call attended',
        'active client (operator)',
        'active client - project in progress',
        'paused client',
        'candidate replacement',
        'project rescope / expansion',
        'active client - project maintenance',
        'cancelled / completed',
        'onboarding',
        'active',
        'at risk',
        'churned',
        'renewed'
    ];
BEGIN
    FOREACH stage_name IN ARRAY stage_list
    LOOP
        BEGIN
            -- Try to add the stage
            EXECUTE format('ALTER TYPE deal_stage_enum ADD VALUE IF NOT EXISTS %L', stage_name);
            RAISE NOTICE '✅ Added or verified: %', stage_name;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE '✓ Already exists: %', stage_name;
            WHEN OTHERS THEN
                RAISE WARNING '⚠️ Could not add %: %', stage_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 3: Show all enum values now
SELECT enumlabel as stage_name
FROM pg_enum
WHERE enumtypid = 'deal_stage_enum'::regtype
ORDER BY enumlabel;

-- Step 4: Check if there are any deals with stages NOT in the enum
SELECT DISTINCT d.stage::text as orphan_stage
FROM deals d
WHERE NOT EXISTS (
    SELECT 1 
    FROM pg_enum e
    WHERE e.enumtypid = 'deal_stage_enum'::regtype
    AND e.enumlabel = d.stage::text
)
ORDER BY d.stage::text;

