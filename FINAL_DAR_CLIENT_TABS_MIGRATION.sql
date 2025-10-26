-- Final DAR Client Tabs Migration
-- This migration adds support for per-client clock-ins and task tracking
-- Run this in your Supabase SQL Editor

-- Step 1: Add client_name to eod_clock_ins (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eod_clock_ins' AND column_name = 'client_name'
  ) THEN
    ALTER TABLE eod_clock_ins ADD COLUMN client_name TEXT;
    COMMENT ON COLUMN eod_clock_ins.client_name IS 'Name of the client for this clock-in session';
  END IF;
END $$;

-- Step 2: Ensure comment_images column exists in eod_time_entries
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eod_time_entries' AND column_name = 'comment_images'
  ) THEN
    ALTER TABLE eod_time_entries ADD COLUMN comment_images TEXT[];
    COMMENT ON COLUMN eod_time_entries.comment_images IS 'Array of image URLs attached to the task';
  END IF;
END $$;

-- Step 3: Verify user_client_assignments table exists (should be created already)
CREATE TABLE IF NOT EXISTS user_client_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_email TEXT,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, client_name)
);

-- Add RLS policies for user_client_assignments
ALTER TABLE user_client_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their assigned clients" ON user_client_assignments;
CREATE POLICY "Users can view their assigned clients"
  ON user_client_assignments FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage client assignments" ON user_client_assignments;
CREATE POLICY "Admins can manage client assignments"
  ON user_client_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_client_assignments_user_id 
  ON user_client_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_eod_clock_ins_client_name 
  ON eod_clock_ins(client_name) 
  WHERE client_name IS NOT NULL;

-- Verify migration
DO $$
DECLARE
  client_name_exists BOOLEAN;
  comment_images_exists BOOLEAN;
  assignments_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eod_clock_ins' AND column_name = 'client_name'
  ) INTO client_name_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'eod_time_entries' AND column_name = 'comment_images'
  ) INTO comment_images_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_client_assignments'
  ) INTO assignments_table_exists;
  
  IF client_name_exists AND comment_images_exists AND assignments_table_exists THEN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '✅ client_name added to eod_clock_ins';
    RAISE NOTICE '✅ comment_images added to eod_time_entries';
    RAISE NOTICE '✅ user_client_assignments table ready';
  ELSE
    RAISE WARNING '⚠️  Some columns/tables may not have been created. Please check manually.';
  END IF;
END $$;

