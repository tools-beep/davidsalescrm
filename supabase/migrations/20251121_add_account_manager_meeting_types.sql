-- Add Account Manager specific meeting types and outcomes
-- This allows Account Managers to log meetings with different types and outcomes

-- Drop existing meeting_type_enum if it exists and recreate with new values
DROP TYPE IF EXISTS meeting_type_enum CASCADE;

-- Create enum for Account Manager meeting types
CREATE TYPE meeting_type_enum AS ENUM (
  'Client Check-In',
  'Client Strategy Session',
  'Client Resolution Meeting',
  'Campaign Alignment (Client + Operator)',
  'Referral Request Meeting',
  'Upsell/Downsell Conversation',
  'Operator Leadership Meeting',
  'Operator Resolution Meeting',
  'Internal Performance Alignment'
);

-- Create enum for Account Manager meeting outcomes
CREATE TYPE meeting_outcome_enum AS ENUM (
  'Client - Resolved',
  'Client - Revisit',
  'Client - Positive',
  'Client - Neutral',
  'Client - Negative',
  'Client - Risk Churn',
  'Client - Upsell Opportunity',
  'Client - Referral Opportunity',
  'Operator - Resolved',
  'Operator - Revisit',
  'Operator - Aligned',
  'Operator - Overwhelmed',
  'Operator - At Risk'
);

-- Add new columns to calls table for Account Manager meetings
ALTER TABLE public.calls 
ADD COLUMN IF NOT EXISTS meeting_type meeting_type_enum,
ADD COLUMN IF NOT EXISTS meeting_outcome meeting_outcome_enum,
ADD COLUMN IF NOT EXISTS is_account_manager_meeting BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_meeting_type ON public.calls(meeting_type);
CREATE INDEX IF NOT EXISTS idx_calls_meeting_outcome ON public.calls(meeting_outcome);
CREATE INDEX IF NOT EXISTS idx_calls_is_am_meeting ON public.calls(is_account_manager_meeting);

-- Add comments for documentation
COMMENT ON COLUMN public.calls.meeting_type IS 'Meeting type for Account Manager meetings';
COMMENT ON COLUMN public.calls.meeting_outcome IS 'Meeting outcome for Account Manager meetings';
COMMENT ON COLUMN public.calls.is_account_manager_meeting IS 'Flag to indicate if this is an Account Manager meeting vs regular call';
COMMENT ON TYPE meeting_type_enum IS 'Meeting types specifically for Account Manager client and operator meetings';
COMMENT ON TYPE meeting_outcome_enum IS 'Meeting outcomes specifically for Account Manager meetings';

