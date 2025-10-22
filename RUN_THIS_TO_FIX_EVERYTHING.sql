-- ============================================
-- RUN THIS TO FIX EVERYTHING
-- ============================================
-- Copy this entire file and run in Supabase SQL Editor

-- Fix 1: Allow users to view all profiles (fixes 406 error)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "view_all_profiles" ON public.user_profiles;

CREATE POLICY "view_all_profiles" ON public.user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fix 2: Set correct admin roles
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'lukejason05@gmail.com';

UPDATE public.user_profiles 
SET role = 'user' 
WHERE email = 'pintermax0710@gmail.com';

-- Check results:
SELECT 'Admin roles set:' as status;
SELECT email, role FROM public.user_profiles 
WHERE email IN ('lukejason05@gmail.com', 'pintermax0710@gmail.com');

SELECT 'EOD Submissions count:' as status;
SELECT COUNT(*) as total FROM public.eod_submissions;

-- Done! Refresh your app and test.

