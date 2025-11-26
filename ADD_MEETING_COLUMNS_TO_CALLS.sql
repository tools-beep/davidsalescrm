-- =====================================================
-- ADD MEETING COLUMNS TO EXISTING CALLS TABLE
-- This is the safest approach - no new tables needed
-- =====================================================

-- Add meeting-specific columns to calls table if they don't exist
DO $$ 
BEGIN
  -- Add meeting_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'meeting_type'
  ) THEN
    ALTER TABLE calls ADD COLUMN meeting_type TEXT;
  END IF;

  -- Add meeting_outcome column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'meeting_outcome'
  ) THEN
    ALTER TABLE calls ADD COLUMN meeting_outcome TEXT;
  END IF;

  -- Add meeting_timestamp column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'meeting_timestamp'
  ) THEN
    ALTER TABLE calls ADD COLUMN meeting_timestamp TIMESTAMPTZ;
  END IF;

  -- Add is_account_manager_meeting column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'is_account_manager_meeting'
  ) THEN
    ALTER TABLE calls ADD COLUMN is_account_manager_meeting BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add account_manager_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calls' AND column_name = 'account_manager_id'
  ) THEN
    ALTER TABLE calls ADD COLUMN account_manager_id UUID;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_is_account_manager_meeting 
  ON calls(is_account_manager_meeting) 
  WHERE is_account_manager_meeting = TRUE;

CREATE INDEX IF NOT EXISTS idx_calls_account_manager_id 
  ON calls(account_manager_id) 
  WHERE account_manager_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calls_meeting_timestamp 
  ON calls(meeting_timestamp DESC) 
  WHERE meeting_timestamp IS NOT NULL;

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'calls'
  AND column_name IN ('meeting_type', 'meeting_outcome', 'meeting_timestamp', 'is_account_manager_meeting', 'account_manager_id')
ORDER BY column_name;

