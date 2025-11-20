-- Update call_outcome_enum to reflect new business requirements
-- Remove: "dash", "asked to be put on DNC list", "phone did not ring", "sensor decision maker"
-- Change: "DM" → "DM introduction"
-- Add: "discovery in progress", "candidate interview no show", "awaiting docs"

-- Step 1: Rename the old enum
ALTER TYPE call_outcome_enum RENAME TO call_outcome_enum_old;

-- Step 2: Create new enum with updated values
CREATE TYPE call_outcome_enum AS ENUM (
  'do not call',
  'did not dial',
  'no answer',
  'gatekeeper',
  'voicemail',
  'DM introduction',
  'introduction',
  'DM short story',
  'DM discovery',
  'DM presentation',
  'DM resume request',
  'discovery in progress',
  'strategy call booked',
  'strategy call attended',
  'strategy call no show',
  'candidate interview booked',
  'candidate interview attended',
  'candidate interview no show',
  'awaiting docs',
  'not interested',
  'no show',
  'onboarding call booked',
  'onboarding call attended',
  'nurturing'
);

-- Step 3: Update the calls table to use the new enum with data transformation
ALTER TABLE calls 
  ALTER COLUMN call_outcome TYPE call_outcome_enum 
  USING (
    CASE call_outcome::text
      WHEN 'DM' THEN 'DM introduction'::call_outcome_enum
      WHEN 'dash' THEN 'did not dial'::call_outcome_enum
      WHEN 'asked to be put on DNC list' THEN 'do not call'::call_outcome_enum
      WHEN 'phone did not ring' THEN 'did not dial'::call_outcome_enum
      WHEN 'sensor decision maker' THEN 'introduction'::call_outcome_enum
      ELSE call_outcome::text::call_outcome_enum
    END
  );

-- Step 4: Drop the old enum
DROP TYPE call_outcome_enum_old;

-- Add a comment explaining the changes
COMMENT ON TYPE call_outcome_enum IS 'Updated on 2025-11-20: Removed outdated outcomes, renamed DM to DM introduction, added discovery in progress, candidate interview no show, awaiting docs';

