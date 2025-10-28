-- ============================================
-- ADD CLIENT PHONE TO USER_CLIENT_ASSIGNMENTS
-- ============================================
-- Run this in your Supabase SQL Editor

-- 1. Add client_phone column
ALTER TABLE user_client_assignments
ADD COLUMN IF NOT EXISTS client_phone TEXT;

COMMENT ON COLUMN user_client_assignments.client_phone IS 'Client phone number for contact purposes';

-- 2. Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_client_assignments'
ORDER BY ordinal_position;

-- 3. Check existing data
SELECT id, client_name, client_email, client_phone, client_timezone
FROM user_client_assignments
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ client_phone column added successfully to user_client_assignments table';
END $$;

