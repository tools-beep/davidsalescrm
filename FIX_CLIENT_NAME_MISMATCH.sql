-- FIX: Client Assignment Name Mismatch
-- The assigned client name doesn't match the actual company name

-- 1. First, check what the EXACT company name is
SELECT 
    'Company in database' as source,
    c.name as exact_name,
    LENGTH(c.name) as length,
    d.name as deal_name
FROM companies c
JOIN deals d ON d.company_id = c.id
WHERE d.name ILIKE '%nexthome%northern%lights%'
LIMIT 1;

-- 2. Check what's currently assigned
SELECT 
    'Currently assigned' as source,
    uca.client_name as assigned_name,
    LENGTH(uca.client_name) as length,
    up.email
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

-- 3. Update the assignment to match the EXACT company name
-- This will fix the issue by making the names match exactly
UPDATE user_client_assignments
SET client_name = (
    SELECT c.name
    FROM companies c
    JOIN deals d ON d.company_id = c.id
    WHERE d.name ILIKE '%nexthome%northern%lights%'
    LIMIT 1
)
WHERE user_id IN (
    SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'
);

-- 4. Verify the fix
SELECT 
    '✅ AFTER UPDATE' as status,
    uca.client_name,
    up.email,
    -- Test if it will match now
    EXISTS (
        SELECT 1 
        FROM companies c 
        WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(uca.client_name))
    ) as will_match,
    -- Count how many deals this will unlock
    (
        SELECT COUNT(*) 
        FROM deals d 
        JOIN companies c ON c.id = d.company_id
        WHERE LOWER(TRIM(c.name)) = LOWER(TRIM(uca.client_name))
    ) as accessible_deals
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';


