-- Fix RLS policies for DAR Live to allow admins to view all active tasks

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "allow_admin_read_all_entries" ON eod_time_entries;
DROP POLICY IF EXISTS "allow_users_read_own_entries" ON eod_time_entries;

-- Enable RLS
ALTER TABLE eod_time_entries ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own entries
CREATE POLICY "allow_users_read_own_entries" 
ON eod_time_entries 
FOR SELECT 
USING (
  auth.uid() = user_id
);

-- Allow admins to read ALL entries (for DAR Live)
CREATE POLICY "allow_admin_read_all_entries" 
ON eod_time_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Allow users to insert their own entries
CREATE POLICY "allow_users_insert_own_entries" 
ON eod_time_entries 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

-- Allow users to update their own entries
CREATE POLICY "allow_users_update_own_entries" 
ON eod_time_entries 
FOR UPDATE 
USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
);

-- Allow users to delete their own entries
CREATE POLICY "allow_users_delete_own_entries" 
ON eod_time_entries 
FOR DELETE 
USING (
  auth.uid() = user_id
);

-- Allow admins to do everything
CREATE POLICY "allow_admin_all_operations" 
ON eod_time_entries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

