-- 🔍 CHECK USER_PROFILES TABLE SCHEMA
-- Verify if total_points column exists

-- 1. Check if user_profiles table exists and its columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. Check if total_points column exists specifically
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name = 'total_points'
    ) THEN '✅ total_points column EXISTS'
    ELSE '❌ total_points column MISSING - Need to run migration!'
  END AS status;

-- 3. Check current user's profile
SELECT 
  user_id,
  full_name,
  role,
  total_points,
  weekly_points,
  monthly_points
FROM user_profiles
WHERE user_id = auth.uid();

