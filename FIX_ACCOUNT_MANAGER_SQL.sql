-- ============================================
-- SQL COMMANDS TO FIX ACCOUNT MANAGER PIPELINE ACCESS
-- Run these in Supabase SQL Editor (FIXED VERSION)
-- ============================================

-- 1. CHECK CURRENT STATE
-- ============================================

-- Check what pipelines exist
SELECT id, name, is_active 
FROM pipelines 
ORDER BY created_at;

-- Check Hannah's user profile and role
SELECT user_id, email, role, first_name, last_name
FROM user_profiles
WHERE email = 'hannah@stafflyhq.ai';

-- Check Hannah's client assignments
SELECT uca.user_id, uca.client_name, up.email
FROM user_client_assignments uca
JOIN user_profiles up ON uca.user_id = up.user_id
WHERE up.email = 'hannah@stafflyhq.ai';

-- Check which deals are assigned to Hannah's clients
SELECT 
    d.id,
    d.name as deal_name,
    d.stage,
    d.pipeline_id,
    p.name as pipeline_name,
    c.name as company_name,
    d.account_manager_id
FROM deals d
LEFT JOIN companies c ON d.company_id = c.id
LEFT JOIN pipelines p ON d.pipeline_id = p.id
WHERE c.name IN (
    SELECT uca.client_name 
    FROM user_client_assignments uca
    JOIN user_profiles up ON uca.user_id = up.user_id
    WHERE up.email = 'hannah@stafflyhq.ai'
)
ORDER BY d.created_at DESC;


-- 2. FIX CLIENT ASSIGNMENTS (CORRECTED - NO updated_at)
-- ============================================

-- Option A: Assign NextHome Northern Lights Realty to Hannah
INSERT INTO user_client_assignments (user_id, client_name, client_email, client_phone, client_timezone)
SELECT 
    up.user_id,
    c.name,
    c.email,
    c.phone,
    c.timezone
FROM user_profiles up
CROSS JOIN companies c
WHERE up.email = 'hannah@stafflyhq.ai'
  AND c.name = 'NextHome Northern Lights Realty'
ON CONFLICT (user_id, client_name) DO UPDATE
SET 
    client_email = EXCLUDED.client_email,
    client_phone = EXCLUDED.client_phone,
    client_timezone = EXCLUDED.client_timezone;

-- Repeat for any other clients you want to assign to Hannah
-- Just change the company name in the WHERE clause


-- 3. UPDATE DEALS TO HAVE CORRECT ACCOUNT MANAGER
-- ============================================

-- Set Hannah as account manager for her assigned clients' deals
UPDATE deals d
SET account_manager_id = (
    SELECT user_id 
    FROM user_profiles 
    WHERE email = 'hannah@stafflyhq.ai'
)
FROM companies c
WHERE d.company_id = c.id
  AND c.name IN (
    SELECT uca.client_name 
    FROM user_client_assignments uca
    JOIN user_profiles up ON uca.user_id = up.user_id
    WHERE up.email = 'hannah@stafflyhq.ai'
  );


-- 4. VERIFY EVERYTHING IS CORRECT
-- ============================================

-- Verify Hannah's assignments
SELECT 
    up.email,
    up.role,
    uca.client_name,
    COUNT(d.id) as deal_count
FROM user_profiles up
LEFT JOIN user_client_assignments uca ON up.user_id = uca.user_id
LEFT JOIN companies c ON uca.client_name = c.name
LEFT JOIN deals d ON c.id = d.company_id
WHERE up.email = 'hannah@stafflyhq.ai'
GROUP BY up.email, up.role, uca.client_name;

-- Verify deals are in correct pipeline
SELECT 
    p.name as pipeline_name,
    d.stage,
    d.name as deal_name,
    c.name as company_name
FROM deals d
JOIN companies c ON d.company_id = c.id
JOIN pipelines p ON d.pipeline_id = p.id
WHERE d.account_manager_id = (
    SELECT user_id 
    FROM user_profiles 
    WHERE email = 'hannah@stafflyhq.ai'
)
ORDER BY p.name, d.stage;


-- 5. CLEAN UP WRONG PIPELINE ASSIGNMENTS (IF NEEDED)
-- ============================================

-- If Hannah's deals are in Outbound Funnel, move them to Fulfillment - Operators
UPDATE deals d
SET pipeline_id = (
    SELECT id FROM pipelines WHERE name = 'Fulfillment - Operators' LIMIT 1
)
WHERE d.account_manager_id = (
    SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'
)
AND d.pipeline_id = (
    SELECT id FROM pipelines WHERE name = 'Outbound Funnel' LIMIT 1
);


-- 6. FINAL VERIFICATION (This is what you were running)
-- ============================================

-- This should show only deals from Fulfillment - Operators pipeline
SELECT 
    d.name as deal_name,
    d.stage,
    p.name as pipeline_name,
    c.name as company_name,
    CASE 
        WHEN p.name = 'Fulfillment - Operators' THEN '✅ CORRECT'
        ELSE '❌ WRONG PIPELINE'
    END as status
FROM deals d
JOIN companies c ON d.company_id = c.id
JOIN pipelines p ON d.pipeline_id = p.id
WHERE d.account_manager_id = (
    SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai'
)
ORDER BY p.name, d.stage;


-- ============================================
-- QUICK FIX - RUN THIS FIRST TO TEST
-- ============================================

-- Step 1: Check if Hannah exists and get her user_id
SELECT user_id, email, role FROM user_profiles WHERE email = 'hannah@stafflyhq.ai';

-- Step 2: Check what companies exist (to find exact name)
SELECT id, name FROM companies WHERE name ILIKE '%nexthome%' OR name ILIKE '%northern%';

-- Step 3: Assign the client to Hannah (use exact company name from Step 2)
-- Replace 'EXACT_COMPANY_NAME' with the actual name from Step 2
INSERT INTO user_client_assignments (user_id, client_name)
SELECT 
    up.user_id,
    'EXACT_COMPANY_NAME_HERE'
FROM user_profiles up
WHERE up.email = 'hannah@stafflyhq.ai'
ON CONFLICT (user_id, client_name) DO NOTHING;

-- Step 4: Update the deal's account_manager_id
UPDATE deals 
SET account_manager_id = (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai')
WHERE company_id IN (
    SELECT id FROM companies WHERE name = 'EXACT_COMPANY_NAME_HERE'
);

-- Step 5: Verify
SELECT 
    d.name as deal_name,
    c.name as company_name,
    p.name as pipeline_name,
    d.stage
FROM deals d
JOIN companies c ON d.company_id = c.id
JOIN pipelines p ON d.pipeline_id = p.id
WHERE d.account_manager_id = (SELECT user_id FROM user_profiles WHERE email = 'hannah@stafflyhq.ai');
