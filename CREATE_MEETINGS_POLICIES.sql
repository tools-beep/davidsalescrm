-- =====================================================
-- STEP 2: ADD RLS POLICIES TO MEETINGS TABLE
-- Run this AFTER the table is created successfully
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Account managers can view own meetings" ON meetings;
DROP POLICY IF EXISTS "Account managers can create own meetings" ON meetings;
DROP POLICY IF EXISTS "Account managers can update own meetings" ON meetings;
DROP POLICY IF EXISTS "Only admins can delete meetings" ON meetings;

-- Policy 1: Account Managers can view their own meetings
CREATE POLICY "Account managers can view own meetings"
  ON meetings
  FOR SELECT
  USING (
    account_manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 2: Account Managers can insert their own meetings
CREATE POLICY "Account managers can create own meetings"
  ON meetings
  FOR INSERT
  WITH CHECK (
    account_manager_id = auth.uid()
    AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('manager', 'admin', 'super_admin')
    )
  );

-- Policy 3: Account Managers can update their own meetings
CREATE POLICY "Account managers can update own meetings"
  ON meetings
  FOR UPDATE
  USING (
    account_manager_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 4: Only admins can delete meetings
CREATE POLICY "Only admins can delete meetings"
  ON meetings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Create updated_at trigger
DROP TRIGGER IF EXISTS meetings_updated_at_trigger ON meetings;
DROP FUNCTION IF EXISTS update_meetings_updated_at();

CREATE OR REPLACE FUNCTION update_meetings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meetings_updated_at_trigger
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_meetings_updated_at();

-- Verify policies were created
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'meetings'
ORDER BY policyname;

