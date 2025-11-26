-- =====================================================
-- FINAL SIMPLE SOLUTION: Add columns to calls table
-- =====================================================

-- Check if columns already exist, if not add them
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS meeting_type TEXT,
ADD COLUMN IF NOT EXISTS meeting_outcome TEXT,
ADD COLUMN IF NOT EXISTS meeting_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_account_manager_meeting BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS account_manager_id UUID;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_calls_account_manager_meeting 
ON calls(is_account_manager_meeting) 
WHERE is_account_manager_meeting = TRUE;

CREATE INDEX IF NOT EXISTS idx_calls_meeting_timestamp 
ON calls(meeting_timestamp) 
WHERE meeting_timestamp IS NOT NULL;

-- Verify columns were added
SELECT 
  column_name, 
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls' 
AND column_name IN (
  'meeting_type', 
  'meeting_outcome', 
  'meeting_timestamp', 
  'is_account_manager_meeting',
  'account_manager_id'
)
ORDER BY column_name;

