-- Create the meetings table (SIMPLE - NO VERIFICATION)
CREATE TABLE IF NOT EXISTS meetings (
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
CREATE INDEX IF NOT EXISTS idx_meetings_account_manager ON meetings(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_meetings_contact ON meetings(related_contact_id);
CREATE INDEX IF NOT EXISTS idx_meetings_deal ON meetings(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_meetings_company ON meetings(related_company_id);
CREATE INDEX IF NOT EXISTS idx_meetings_timestamp ON meetings(meeting_timestamp DESC);

-- Enable RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Account managers can view own meetings" ON meetings;
DROP POLICY IF EXISTS "Account managers can create own meetings" ON meetings;
DROP POLICY IF EXISTS "Account managers can update own meetings" ON meetings;
DROP POLICY IF EXISTS "Admins can delete meetings" ON meetings;

-- Create policies
CREATE POLICY "Account managers can view own meetings"
  ON meetings FOR SELECT
  USING (account_manager_id = auth.uid());

CREATE POLICY "Account managers can create own meetings"
  ON meetings FOR INSERT
  WITH CHECK (account_manager_id = auth.uid());

CREATE POLICY "Account managers can update own meetings"
  ON meetings FOR UPDATE
  USING (account_manager_id = auth.uid());

CREATE POLICY "Admins can delete meetings"
  ON meetings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create trigger function
CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS meetings_updated_at_trigger ON meetings;
CREATE TRIGGER meetings_updated_at_trigger
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- Grant permissions
GRANT ALL ON meetings TO authenticated;
GRANT ALL ON meetings TO service_role;

