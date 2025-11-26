-- =====================================================
-- STEP 1: CREATE THE MEETINGS TABLE (SIMPLE VERSION)
-- Run this first, then check if it works before adding policies
-- =====================================================

-- Create the meetings table
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

-- Grant permissions
GRANT ALL ON meetings TO authenticated;
GRANT ALL ON meetings TO service_role;

-- Verify table was created
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'meetings') as column_count
FROM information_schema.tables 
WHERE table_name = 'meetings';

