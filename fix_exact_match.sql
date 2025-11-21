-- Find the EXACT company name from the deal that should be visible
-- Then update the assignment to match EXACTLY

-- 1. First, find the exact company name
SELECT 
    c.id,
    c.name as exact_company_name,
    LENGTH(c.name) as name_length,
    d.name as deal_name,
    d.id as deal_id,
    p.name as pipeline_name
FROM companies c
JOIN deals d ON d.company_id = c.id
JOIN pipelines p ON p.id = d.pipeline_id
WHERE d.name = 'NextHome Northern Lights'
  AND p.name = 'fulfillment - Operators';

-- 2. Check what's currently assigned to hannah
SELECT 
    uca.client_name,
    LENGTH(uca.client_name) as assigned_length,
    up.email
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

-- 3. Update to the EXACT company name (run this after seeing results from #1)
-- REPLACE 'EXACT_COMPANY_NAME_FROM_QUERY_1' with the exact name from query 1
UPDATE user_client_assignments
SET client_name = (
    SELECT c.name
    FROM companies c
    JOIN deals d ON d.company_id = c.id
    JOIN pipelines p ON p.id = d.pipeline_id
    WHERE d.name = 'NextHome Northern Lights'
      AND p.name = 'fulfillment - Operators'
    LIMIT 1
)
WHERE user_id IN (
    SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'
);

-- 4. Verify the update
SELECT 
    uca.client_name,
    LENGTH(uca.client_name) as new_length,
    up.email,
    -- Show if it will match
    EXISTS (
        SELECT 1 FROM companies c 
        WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(uca.client_name))
    ) as will_match
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

