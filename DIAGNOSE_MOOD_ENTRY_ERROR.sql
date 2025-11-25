-- 🔍 DIAGNOSE: Why is mood entry insert failing with 400 error?

-- ============================================================================
-- STEP 1: Check mood_entries table schema
-- ============================================================================

SELECT 
    'Mood Entries Schema' AS check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'mood_entries'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Check RLS policies on mood_entries
-- ============================================================================

SELECT 
    'RLS Policies' AS check_type,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'mood_entries';

-- ============================================================================
-- STEP 3: Check if RLS is enabled
-- ============================================================================

SELECT 
    'RLS Status' AS check_type,
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'mood_entries';

-- ============================================================================
-- STEP 4: Try a manual insert to see the exact error
-- ============================================================================

-- Get current user ID first
SELECT 
    'Current User' AS check_type,
    auth.uid() AS user_id;

-- Try to insert a test mood entry
-- (This will show the exact error if it fails)
INSERT INTO mood_entries (user_id, timestamp, mood_level)
VALUES (
    auth.uid(),
    NOW(),
    '🔥'
)
RETURNING *;

