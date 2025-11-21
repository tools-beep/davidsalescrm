-- Debug query for hannah@stafflyhq.ai client assignments
-- Run this in Supabase SQL Editor to diagnose the issue

-- 1. Find the user ID for hannah@stafflyhq.ai
SELECT 
    up.id as profile_id,
    up.user_id,
    up.email,
    up.role,
    up.first_name,
    up.last_name
FROM user_profiles up
WHERE up.email = 'hannah@stafflyhq.ai';

-- 2. Check client assignments for this user
SELECT 
    uca.id,
    uca.user_id,
    uca.client_name,
    up.email as user_email
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

-- 3. Check all deals in Fulfillment - Operators pipeline
SELECT 
    d.id,
    d.name as deal_name,
    d.stage,
    d.company_id,
    c.name as company_name,
    p.name as pipeline_name
FROM deals d
LEFT JOIN companies c ON c.id = d.company_id
LEFT JOIN pipelines p ON p.id = d.pipeline_id
WHERE p.name ILIKE '%fulfillment%operator%'
ORDER BY d.created_at DESC
LIMIT 20;

-- 4. Check if company names match assigned client names
SELECT 
    uca.client_name as assigned_client,
    c.name as company_name,
    CASE 
        WHEN LOWER(TRIM(uca.client_name)) = LOWER(TRIM(c.name)) THEN '✅ MATCH'
        ELSE '❌ NO MATCH'
    END as match_status,
    COUNT(d.id) as deal_count
FROM user_client_assignments uca
CROSS JOIN companies c
LEFT JOIN deals d ON d.company_id = c.id
WHERE uca.user_id IN (
    SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'
)
GROUP BY uca.client_name, c.name
ORDER BY match_status, company_name;

-- 5. Show what deals SHOULD be visible to this user
SELECT 
    d.id,
    d.name as deal_name,
    d.stage,
    c.name as company_name,
    uca.client_name as assigned_client_name,
    p.name as pipeline_name
FROM user_client_assignments uca
JOIN companies c ON LOWER(TRIM(c.name)) = LOWER(TRIM(uca.client_name))
JOIN deals d ON d.company_id = c.id
LEFT JOIN pipelines p ON p.id = d.pipeline_id
WHERE uca.user_id IN (
    SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'
)
ORDER BY d.created_at DESC;

