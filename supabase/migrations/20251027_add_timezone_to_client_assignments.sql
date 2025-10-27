-- Add timezone column to user_client_assignments table
ALTER TABLE user_client_assignments 
ADD COLUMN IF NOT EXISTS client_timezone TEXT DEFAULT 'America/Los_Angeles';

-- Add comment
COMMENT ON COLUMN user_client_assignments.client_timezone IS 'Timezone for the client (e.g., America/Los_Angeles, America/New_York)';

