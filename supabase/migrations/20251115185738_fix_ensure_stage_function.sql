-- Drop the old function
DROP FUNCTION IF EXISTS public.ensure_stage_in_enum(TEXT);

-- Create a simpler function that just checks if stage exists
-- We'll handle adding stages differently
CREATE OR REPLACE FUNCTION public.check_stage_exists(stage_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Normalize the stage name
    stage_name := LOWER(TRIM(stage_name));
    
    -- Check if it already exists
    RETURN EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'deal_stage_enum'
        AND e.enumlabel = stage_name
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_stage_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_stage_exists(TEXT) TO service_role;

-- Add a comprehensive list of stages that should cover most use cases
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
        'demo completed',
        'honest',
        'courages',
        'sproposal',
        'lead',
        'prospect',
        'opportunity',
        'quote',
        'verbal',
        'won',
        'lost',
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
END
$$;
