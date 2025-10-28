-- Add client_phone column to user_client_assignments table
ALTER TABLE user_client_assignments
ADD COLUMN IF NOT EXISTS client_phone TEXT;

COMMENT ON COLUMN user_client_assignments.client_phone IS 'Client phone number for contact purposes';


