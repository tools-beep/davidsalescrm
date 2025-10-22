-- ============================================
-- FIX ALL REMAINING ISSUES
-- ============================================

-- 1. Fix user_profiles RLS - Allow users to read all profiles (needed for messaging)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "view_all_profiles" ON public.user_profiles;

CREATE POLICY "view_all_profiles" ON public.user_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2. Make sure admin roles are set correctly
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'lukejason05@gmail.com';

UPDATE public.user_profiles 
SET role = 'user' 
WHERE email = 'pintermax0710@gmail.com';

-- 3. Check if EOD submissions table has data
SELECT COUNT(*) as total_eod_submissions FROM public.eod_submissions;

-- 4. Check if user_profiles exist for EOD users
SELECT 
  up.email,
  up.role,
  up.first_name,
  up.last_name,
  COUNT(es.id) as eod_count
FROM public.user_profiles up
LEFT JOIN public.eod_submissions es ON up.user_id = es.user_id
GROUP BY up.email, up.role, up.first_name, up.last_name
ORDER BY up.email;

-- Done! This should fix:
-- ✅ Messages tab in EOD Portal (user_profiles access)
-- ✅ EOD Admin showing reports (admin role set)

