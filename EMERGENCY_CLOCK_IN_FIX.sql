-- 🚨 EMERGENCY FIX: Force Clock Out ALL Active Sessions
-- This will immediately fix the "Already clocked in" bug

-- ============================================================================
-- STEP 1: Show current problem (before fix)
-- ============================================================================

SELECT 
    '🚨 BEFORE FIX - Active Clock-Ins' AS status,
    id,
    user_id,
    client_name,
    clocked_in_at,
    date,
    EXTRACT(EPOCH FROM (NOW() - clocked_in_at))/60 AS minutes_since_clock_in
FROM eod_clock_ins
WHERE date = CURRENT_DATE
  AND clocked_out_at IS NULL
ORDER BY clocked_in_at DESC;

-- ============================================================================
-- STEP 2: FORCE CLOCK OUT ALL ACTIVE SESSIONS FOR TODAY
-- ============================================================================

UPDATE eod_clock_ins
SET clocked_out_at = NOW()
WHERE date = CURRENT_DATE
  AND clocked_out_at IS NULL;

-- ============================================================================
-- STEP 3: Make client_name nullable (if not already done)
-- ============================================================================

ALTER TABLE eod_clock_ins
ALTER COLUMN client_name DROP NOT NULL;

-- ============================================================================
-- STEP 4: Verify the fix
-- ============================================================================

SELECT 
    '✅ AFTER FIX - All Sessions Clocked Out' AS status,
    COUNT(*) AS total_clock_ins_today,
    COUNT(CASE WHEN clocked_out_at IS NULL THEN 1 END) AS active_clock_ins,
    COUNT(CASE WHEN clocked_out_at IS NOT NULL THEN 1 END) AS completed_clock_ins
FROM eod_clock_ins
WHERE date = CURRENT_DATE;

-- Should show: active_clock_ins = 0

-- ============================================================================
-- STEP 5: Show what was fixed
-- ============================================================================

SELECT 
    '📋 Sessions That Were Clocked Out' AS status,
    user_id,
    client_name,
    clocked_in_at,
    clocked_out_at,
    EXTRACT(EPOCH FROM (clocked_out_at - clocked_in_at))/60 AS session_duration_minutes
FROM eod_clock_ins
WHERE date = CURRENT_DATE
  AND clocked_out_at >= NOW() - INTERVAL '5 minutes'
ORDER BY clocked_out_at DESC;

