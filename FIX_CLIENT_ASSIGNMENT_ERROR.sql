-- ============================================
-- FIX CLIENT ASSIGNMENT ERROR
-- ============================================
-- Run this in Supabase SQL Editor to fix the
-- "assigned_by column not found" error
-- ============================================

-- Add assigned_by column if it doesn't exist
ALTER TABLE user_client_assignments 
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES auth.users(id);

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_client_assignments' 
AND column_name = 'assigned_by';

-- ============================================
-- SUCCESS!
-- ============================================
-- The assigned_by column has been added.
-- You can now assign clients without errors.
-- ============================================

