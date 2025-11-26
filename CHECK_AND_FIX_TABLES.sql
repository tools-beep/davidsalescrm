-- =====================================================
-- CHECK AND FIX TABLES
-- =====================================================

-- Step 1: Check if account_manager_meetings table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'account_manager_meetings'
) as account_manager_meetings_exists;

-- Step 2: Check if the old meetings table has our columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'meetings' 
AND column_name IN ('meeting_timestamp', 'meeting_type', 'meeting_outcome', 'account_manager_id', 'scheduled_at')
ORDER BY column_name;

-- Step 3: Drop the conflicting meetings table we created
DROP TABLE IF EXISTS meetings CASCADE;

-- Step 4: Now create account_manager_meetings table
CREATE TABLE IF NOT EXISTS account_manager_meetings (
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

-- Step 5: Create indexes
CREATE INDEX IF NOT EXISTS idx_am_meetings_account_manager ON account_manager_meetings(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_am_meetings_contact ON account_manager_meetings(related_contact_id);
CREATE INDEX IF NOT EXISTS idx_am_meetings_deal ON account_manager_meetings(related_deal_id);
CREATE INDEX IF NOT EXISTS idx_am_meetings_company ON account_manager_meetings(related_company_id);
CREATE INDEX IF NOT EXISTS idx_am_meetings_timestamp ON account_manager_meetings(meeting_timestamp DESC);

-- Step 6: Enable RLS
ALTER TABLE account_manager_meetings ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop existing policies if they exist
DROP POLICY IF EXISTS "Account managers can view own meetings" ON account_manager_meetings;
DROP POLICY IF EXISTS "Account managers can create own meetings" ON account_manager_meetings;
DROP POLICY IF EXISTS "Account managers can update own meetings" ON account_manager_meetings;
DROP POLICY IF EXISTS "Admins can delete meetings" ON account_manager_meetings;

-- Step 8: Create policies
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

-- Step 9: Create trigger function
CREATE OR REPLACE FUNCTION update_am_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create trigger
DROP TRIGGER IF EXISTS am_meetings_updated_at_trigger ON account_manager_meetings;
CREATE TRIGGER am_meetings_updated_at_trigger
  BEFORE UPDATE ON account_manager_meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_am_meetings_updated_at();

-- Step 11: Grant permissions
GRANT ALL ON account_manager_meetings TO authenticated;
GRANT ALL ON account_manager_meetings TO service_role;

-- Step 12: Verify the table was created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'account_manager_meetings') as column_count
FROM information_schema.tables 
WHERE table_name = 'account_manager_meetings';

-- Step 13: Show all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'account_manager_meetings'
ORDER BY ordinal_position;

