-- Fix: Assign "NextHome Northern Lights Realty" to hannah@stafflyhq.ai

-- First, let's check if the assignment exists
SELECT 
    uca.id,
    uca.user_id,
    uca.client_name,
    up.email
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

-- If NO results above, run this INSERT:
INSERT INTO user_client_assignments (user_id, client_name)
SELECT 
    user_id,
    'NextHome Northern Lights Realty' as client_name
FROM user_profiles
WHERE email = 'hannah@stafflyhq.ai'
ON CONFLICT DO NOTHING;

-- Verify the assignment was created:
SELECT 
    uca.id,
    uca.user_id,
    uca.client_name,
    up.email,
    up.role
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

-- Double check: Show the deal that should now be visible
SELECT 
    d.id,
    d.name as deal_name,
    c.name as company_name,
    p.name as pipeline_name,
    uca.client_name as assigned_client,
    CASE 
        WHEN LOWER(TRIM(c.name)) = LOWER(TRIM(uca.client_name)) THEN '✅ WILL BE VISIBLE'
        ELSE '❌ NAME MISMATCH'
    END as visibility_status
FROM deals d
JOIN companies c ON c.id = d.company_id
JOIN pipelines p ON p.id = d.pipeline_id
CROSS JOIN user_client_assignments uca
WHERE uca.user_id IN (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai')
  AND d.name = 'NextHome Northern Lights';

