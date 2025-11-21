-- Update call_outcome_enum: Remove "introduction" and add "deal won"
-- Update outbound_type_enum: Change "scope call" to "operations audit"

-- Step 1: Update call outcomes
-- Rename the old enum
ALTER TYPE call_outcome_enum RENAME TO call_outcome_enum_old;

-- Create new enum with updated values (removed "introduction", added new outcomes)
CREATE TYPE call_outcome_enum AS ENUM (
  'do not call',
  'did not dial',
  'no answer',
  'gatekeeper',
  'voicemail',
  'DM introduction',
  'DM short story',
  'DM discovery',
  'DM presentation',
  'DM resume request',
  'discovery in progress',
  'strategy call booked',
  'strategy call attended',
  'strategy call no show',
  'strategy call rescheduled',
  'operations audit booked',
  'operations audit attended',
  'operations audit no show',
  'operations audit rescheduled',
  'candidate interview booked',
  'candidate interview attended',
  'candidate interview no show',
  'candidate interview rescheduled',
  'awaiting docs',
  'deal won',
  'not interested',
  'no show',
  'onboarding call booked',
  'onboarding call attended',
  'nurturing'
);

-- Update the calls table to use the new enum with data transformation
ALTER TABLE calls 
  ALTER COLUMN call_outcome TYPE call_outcome_enum 
  USING (
    CASE call_outcome::text
      WHEN 'introduction' THEN 'DM introduction'::call_outcome_enum
      ELSE call_outcome::text::call_outcome_enum
    END
  );

-- Drop the old enum
DROP TYPE call_outcome_enum_old;

-- Step 2: Update outbound types
-- Rename the old enum
ALTER TYPE outbound_type_enum RENAME TO outbound_type_enum_old;

-- Create new enum with updated values (changed "scope call" to "operations audit")
CREATE TYPE outbound_type_enum AS ENUM (
  'outbound call',
  'inbound call',
  'strategy call',
  'operations audit',
  'candidate interview',
  'onboarding call'
);

-- Update the calls table to use the new enum with data transformation
ALTER TABLE calls 
  ALTER COLUMN outbound_type TYPE outbound_type_enum 
  USING (
    CASE outbound_type::text
      WHEN 'scope call' THEN 'operations audit'::outbound_type_enum
      ELSE outbound_type::text::outbound_type_enum
    END
  );

-- Drop the old enum
DROP TYPE outbound_type_enum_old;

-- Add comments explaining the changes
COMMENT ON TYPE call_outcome_enum IS 'Updated on 2025-11-21: Removed introduction, added deal won, operations audit outcomes, and rescheduled statuses';
COMMENT ON TYPE outbound_type_enum IS 'Updated on 2025-11-21: Changed scope call to operations audit';

