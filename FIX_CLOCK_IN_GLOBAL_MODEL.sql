-- 🔥 FIX: Make Clock-In GLOBAL (one per day, not per client)
-- This fixes the "Already clocked in" false positive bug

-- ============================================================================
-- STEP 1: Make client_name column NULLABLE (it's no longer required)
-- ============================================================================

ALTER TABLE eod_clock_ins
ALTER COLUMN client_name DROP NOT NULL;

COMMENT ON COLUMN eod_clock_ins.client_name IS 'DEPRECATED: Now nullable. Clock-ins are global (one per day), not per-client.';

-- ============================================================================
-- STEP 2: Update the notify_clock_in trigger (already fixed in previous deployment)
-- ============================================================================

-- The trigger was already updated to not depend on client_name
-- It now uses planned_shift_minutes and daily_task_goal instead
-- No changes needed here

-- ============================================================================
-- STEP 3: Clean up any duplicate clock-ins from today
-- ============================================================================

-- Find users with multiple active clock-ins today
WITH duplicate_clock_ins AS (
  SELECT 
    user_id,
    date,
    COUNT(*) as count,
    MIN(id) as keep_id
  FROM eod_clock_ins
  WHERE date = CURRENT_DATE
    AND clocked_out_at IS NULL
  GROUP BY user_id, date
  HAVING COUNT(*) > 1
)
-- Clock out the duplicates (keep the first one)
UPDATE eod_clock_ins
SET clocked_out_at = NOW()
WHERE id IN (
  SELECT e.id
  FROM eod_clock_ins e
  INNER JOIN duplicate_clock_ins d
    ON e.user_id = d.user_id
    AND e.date = d.date
  WHERE e.id != d.keep_id
    AND e.clocked_out_at IS NULL
);

-- ============================================================================
-- STEP 4: Verify the fix
-- ============================================================================

SELECT 
    'Clock-In System Fixed!' AS status,
    COUNT(DISTINCT user_id) AS users_clocked_in_today,
    COUNT(*) AS total_clock_ins_today,
    COUNT(CASE WHEN clocked_out_at IS NULL THEN 1 END) AS active_clock_ins
FROM eod_clock_ins
WHERE date = CURRENT_DATE;

-- Check for any remaining duplicates
SELECT 
    'Duplicate Check' AS check_type,
    user_id,
    COUNT(*) as active_clock_ins_count
FROM eod_clock_ins
WHERE date = CURRENT_DATE
  AND clocked_out_at IS NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

