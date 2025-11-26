-- =====================================================
-- CREATE SEPARATE MEETINGS TABLE FOR ACCOUNT MANAGERS
-- =====================================================

-- Step 1: Create enum types for meeting fields
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

-- Step 2: Create the meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who logged the meeting
  account_manager_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- What the meeting was about
  meeting_type meeting_type_enum NOT NULL,
  meeting_outcome meeting_outcome_enum NOT NULL,
  
  -- Related entities
  related_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  related_deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  related_company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  
  -- Meeting details
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT,
  meeting_timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Optional: If this was from a phone call
  dialpad_call_id TEXT,
  caller_number TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes for better performance
CREATE INDEX idx_meetings_account_manager ON meetings(account_manager_id);
CREATE INDEX idx_meetings_contact ON meetings(related_contact_id);
CREATE INDEX idx_meetings_deal ON meetings(related_deal_id);
CREATE INDEX idx_meetings_company ON meetings(related_company_id);
CREATE INDEX idx_meetings_timestamp ON meetings(meeting_timestamp DESC);
CREATE INDEX idx_meetings_dialpad_call ON meetings(dialpad_call_id) WHERE dialpad_call_id IS NOT NULL;

-- Step 4: Enable Row Level Security (RLS)
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS Policies

-- Policy 1: Account Managers can view their own meetings
CREATE POLICY "Account managers can view own meetings"
  ON meetings
  FOR SELECT
  USING (
    account_manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 2: Account Managers can insert their own meetings
CREATE POLICY "Account managers can create own meetings"
  ON meetings
  FOR INSERT
  WITH CHECK (
    account_manager_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'admin', 'super_admin')
    )
  );

-- Policy 3: Account Managers can update their own meetings
CREATE POLICY "Account managers can update own meetings"
  ON meetings
  FOR UPDATE
  USING (
    account_manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 4: Only admins can delete meetings
CREATE POLICY "Only admins can delete meetings"
  ON meetings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Step 6: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at_trigger
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- Step 7: Grant permissions
GRANT ALL ON meetings TO authenticated;
GRANT ALL ON meetings TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if table was created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'meetings') as column_count
FROM information_schema.tables 
WHERE table_name = 'meetings';

-- Check enum types
SELECT 
  typname as enum_name,
  array_agg(enumlabel ORDER BY enumsortorder) as enum_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE typname IN ('meeting_type_enum', 'meeting_outcome_enum')
GROUP BY typname;

-- Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'meetings'
ORDER BY policyname;

-- =====================================================
-- MIGRATION NOTE
-- =====================================================
-- This creates a completely separate table for Account Manager meetings.
-- The existing 'calls' table will continue to be used for sales calls.
-- 
-- Benefits:
-- 1. Clean separation of concerns
-- 2. No need for nullable constraints or default values
-- 3. Proper enum types for meeting-specific fields
-- 4. Better performance with targeted indexes
-- 5. Easier to query and report on meetings vs calls
-- =====================================================

