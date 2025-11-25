-- 🔥 FIX: Make Clock-In GLOBAL (one per day, not per client)
-- Version 2: Fixed UUID MIN() issue

-- ============================================================================
-- STEP 1: Make client_name column NULLABLE
-- ============================================================================

ALTER TABLE eod_clock_ins
ALTER COLUMN client_name DROP NOT NULL;

-- ============================================================================
-- STEP 2: Clean up any duplicate clock-ins from today
-- ============================================================================

-- Find and clock out duplicate clock-ins (keep the earliest one)
WITH ranked_clock_ins AS (
  SELECT 
    id,
    user_id,
    date,
    clocked_in_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, date 
      ORDER BY clocked_in_at ASC
    ) as rn
  FROM eod_clock_ins
  WHERE date = CURRENT_DATE
    AND clocked_out_at IS NULL
)
UPDATE eod_clock_ins
SET clocked_out_at = NOW()
WHERE id IN (
  SELECT id 
  FROM ranked_clock_ins 
  WHERE rn > 1
);

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================

SELECT 
    'Clock-In System Fixed!' AS status,
    COUNT(DISTINCT user_id) AS users_clocked_in_today,
    COUNT(*) AS total_clock_ins_today,
    COUNT(CASE WHEN clocked_out_at IS NULL THEN 1 END) AS active_clock_ins
FROM eod_clock_ins
WHERE date = CURRENT_DATE;

-- ============================================================================
-- STEP 4: Check for any remaining duplicates (should be 0)
-- ============================================================================

SELECT 
    'Duplicate Check' AS check_type,
    user_id,
    COUNT(*) as active_clock_ins_count,
    ARRAY_AGG(id) as clock_in_ids
FROM eod_clock_ins
WHERE date = CURRENT_DATE
  AND clocked_out_at IS NULL
GROUP BY user_id
HAVING COUNT(*) > 1;

