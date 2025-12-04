-- ============================================
-- FIX: Admin Access to Smart DAR Snapshots
-- Date: December 4, 2025
-- Purpose: Allow admins to view all users' Smart DAR snapshots
-- ============================================

-- Enable RLS on smart_dar_snapshots if not already enabled
ALTER TABLE IF EXISTS smart_dar_snapshots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can view own snapshots" ON smart_dar_snapshots;
DROP POLICY IF EXISTS "Users can insert own snapshots" ON smart_dar_snapshots;
DROP POLICY IF EXISTS "Users can update own snapshots" ON smart_dar_snapshots;
DROP POLICY IF EXISTS "Admins can view all snapshots" ON smart_dar_snapshots;
DROP POLICY IF EXISTS "Service role can insert snapshots" ON smart_dar_snapshots;

-- Policy: Users can view their own snapshots
CREATE POLICY "Users can view own snapshots" ON smart_dar_snapshots
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own snapshots
CREATE POLICY "Users can insert own snapshots" ON smart_dar_snapshots
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own snapshots
CREATE POLICY "Users can update own snapshots" ON smart_dar_snapshots
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can view ALL snapshots (for viewing other users' historical data)
CREATE POLICY "Admins can view all snapshots" ON smart_dar_snapshots
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Allow service role to insert snapshots (for background jobs)
CREATE POLICY "Service role can insert snapshots" ON smart_dar_snapshots
FOR INSERT WITH CHECK (true);

-- Add index for admin queries across users
CREATE INDEX IF NOT EXISTS idx_smart_dar_snapshots_date_user 
ON smart_dar_snapshots(snapshot_date DESC, user_id);

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Smart DAR Admin Access Policies Created Successfully!';
  RAISE NOTICE '📊 Admins can now view all users'' Smart DAR snapshots';
END $$;

