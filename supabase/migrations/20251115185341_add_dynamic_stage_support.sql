-- Migration to add all common stages to the enum
-- This ensures any stage name used in pipelines will work

DO $$
DECLARE
    stage_name TEXT;
    stage_names TEXT[] := ARRAY[
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
        'onboarding',
        'active',
        'at risk',
        'churned',
        'renewed',
        'qualified',
        'proposal',
        'contract sent',
        'contract signed',
        'implementation',
        'live',
        'expansion',
        'renewal',
        'churn risk',
        'contacted',
        'meeting scheduled',
        'meeting completed',
        'follow up',
        'demo scheduled',
        'demo completed'
    ];
BEGIN
    FOREACH stage_name IN ARRAY stage_names
    LOOP
        BEGIN
            -- Try to add the enum value
            EXECUTE format('ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS %L', stage_name);
            RAISE NOTICE 'Added stage: %', stage_name;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Stage already exists: %', stage_name;
            WHEN OTHERS THEN
                RAISE WARNING 'Could not add stage %: %', stage_name, SQLERRM;
        END;
    END LOOP;
END
$$;

-- Also add a function to dynamically add stages to enum
CREATE OR REPLACE FUNCTION public.ensure_stage_in_enum(stage_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Normalize the stage name
    stage_name := LOWER(TRIM(stage_name));
    
    -- Check if it already exists
    IF EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'deal_stage_enum'
        AND e.enumlabel = stage_name
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Try to add it
    BEGIN
        EXECUTE format('ALTER TYPE public.deal_stage_enum ADD VALUE IF NOT EXISTS %L', stage_name);
        RETURN TRUE;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE WARNING 'Could not add stage to enum: % - %', stage_name, SQLERRM;
            RETURN FALSE;
    END;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.ensure_stage_in_enum(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_stage_in_enum(TEXT) TO service_role;

COMMENT ON FUNCTION public.ensure_stage_in_enum(TEXT) IS 'Ensures a stage name exists in the deal_stage_enum type';
