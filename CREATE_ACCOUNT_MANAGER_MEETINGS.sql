-- =====================================================
-- CREATE ACCOUNT_MANAGER_MEETINGS TABLE
-- (Different from the existing 'meetings' table for calendar)
-- =====================================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS account_manager_meetings CASCADE;

-- Create the account_manager_meetings table
CREATE TABLE account_manager_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_manager_id UUID NOT NULL,
  meeting_type TEXT NOT NULL,
  meeting_outcome TEXT NOT NULL,
  related_contact_id UUID,
  related_deal_id UUID,
  related_company_id UUID,
  duration_seconds INTEGER DEFAULT 0,
  notes TEXT,
  meeting_timestamp TIMESTAMPTZ DEFAULT NOW(),
  dialpad_call_id TEXT,
  caller_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_am_meetings_account_manager ON account_manager_meetings(account_manager_id);
CREATE INDEX idx_am_meetings_contact ON account_manager_meetings(related_contact_id);
CREATE INDEX idx_am_meetings_deal ON account_manager_meetings(related_deal_id);
CREATE INDEX idx_am_meetings_company ON account_manager_meetings(related_company_id);
CREATE INDEX idx_am_meetings_timestamp ON account_manager_meetings(meeting_timestamp DESC);

-- Enable RLS
ALTER TABLE account_manager_meetings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Account managers can view own meetings"
  ON account_manager_meetings FOR SELECT
  USING (account_manager_id = auth.uid());

CREATE POLICY "Account managers can create own meetings"
  ON account_manager_meetings FOR INSERT
  WITH CHECK (account_manager_id = auth.uid());

CREATE POLICY "Account managers can update own meetings"
  ON account_manager_meetings FOR UPDATE
  USING (account_manager_id = auth.uid());

CREATE POLICY "Admins can delete meetings"
  ON account_manager_meetings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create trigger function
CREATE OR REPLACE FUNCTION update_am_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER am_meetings_updated_at_trigger
  BEFORE UPDATE ON account_manager_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_am_meetings_updated_at();

-- Grant permissions
GRANT ALL ON account_manager_meetings TO authenticated;
GRANT ALL ON account_manager_meetings TO service_role;

