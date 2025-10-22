-- Check admin roles
SELECT 
  up.user_id,
  up.email,
  up.role,
  up.first_name,
  up.last_name
FROM user_profiles up
WHERE up.email IN ('lukejason05@gmail.com', 'pintermax0710@gmail.com', 'admin@stafflyhq.ai')
ORDER BY up.email;

-- If lukejason05@gmail.com doesn't have admin role, update it:
-- UPDATE user_profiles 
-- SET role = 'admin' 
-- WHERE email = 'lukejason05@gmail.com';

