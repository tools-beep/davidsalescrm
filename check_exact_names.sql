-- Check exact character-by-character comparison
-- This will reveal any hidden characters or encoding issues

-- 1. Check the exact client assignment name
SELECT 
    'Client Assignment' as source,
    uca.client_name as name,
    LENGTH(uca.client_name) as char_length,
    OCTET_LENGTH(uca.client_name) as byte_length,
    LOWER(TRIM(uca.client_name)) as normalized,
    encode(uca.client_name::bytea, 'hex') as hex_representation
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

-- 2. Check the exact company name on the deal
SELECT 
    'Company Name' as source,
    c.name as name,
    LENGTH(c.name) as char_length,
    OCTET_LENGTH(c.name) as byte_length,
    LOWER(TRIM(c.name)) as normalized,
    encode(c.name::bytea, 'hex') as hex_representation
FROM companies c
WHERE c.name ILIKE '%nexthome%northern%lights%';

-- 3. Direct comparison test
SELECT 
    CASE 
        WHEN LOWER(TRIM(uca.client_name)) = LOWER(TRIM(c.name)) THEN '✅ EXACT MATCH'
        ELSE '❌ NO MATCH'
    END as match_result,
    uca.client_name as assigned_name,
    c.name as company_name,
    LOWER(TRIM(uca.client_name)) as normalized_assigned,
    LOWER(TRIM(c.name)) as normalized_company,
    LENGTH(LOWER(TRIM(uca.client_name))) as assigned_length,
    LENGTH(LOWER(TRIM(c.name))) as company_length
FROM user_client_assignments uca
JOIN user_profiles up ON up.user_id = uca.user_id
CROSS JOIN companies c
WHERE up.email = 'hannah@stafflyhq.ai'
  AND c.name ILIKE '%nexthome%northern%lights%';

-- 4. Check if deal exists in Fulfillment - Operators pipeline
SELECT 
    d.id,
    d.name as deal_name,
    d.pipeline_id,
    p.name as pipeline_name,
    d.company_id,
    c.name as company_name
FROM deals d
JOIN companies c ON c.id = d.company_id
JOIN pipelines p ON p.id = d.pipeline_id
WHERE d.name ILIKE '%nexthome%'
  AND p.name ILIKE '%fulfillment%operator%'
ORDER BY d.created_at DESC;

