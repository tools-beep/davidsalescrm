-- 🔧 FIX POINTS SYSTEM MIGRATION
-- Safe migration that handles already-existing objects
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Drop existing policies that are causing conflicts
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own points history" ON points_history;
DROP POLICY IF EXISTS "Users can insert own points history" ON points_history;
DROP POLICY IF EXISTS "Admins can view all points history" ON points_history;

-- ============================================================================
-- STEP 2: Recreate policies with correct logic
-- ============================================================================

-- Users can view their own points history
CREATE POLICY "Users can view own points history" ON points_history
FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own points history (via triggers/functions)
CREATE POLICY "Users can insert own points history" ON points_history
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all points history
CREATE POLICY "Admins can view all points history" ON points_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================

SELECT 
  '✅ POLICIES FIXED!' AS status,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE tablename = 'points_history';

-- Show all policies
SELECT 
  policyname,
  cmd,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'points_history'
ORDER BY policyname;

