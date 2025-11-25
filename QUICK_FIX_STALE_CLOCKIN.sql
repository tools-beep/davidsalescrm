-- 🚨 QUICK FIX: Auto-clock-out all stale sessions from today
-- This will allow you to clock in again immediately

UPDATE eod_clock_ins
SET clocked_out_at = NOW()
WHERE clocked_out_at IS NULL
  AND date = CURRENT_DATE;

-- Verify: This should return 0 rows (no active clock-ins)
SELECT 
    id,
    user_id,
    client_name,
    clocked_in_at,
    clocked_out_at
FROM eod_clock_ins
WHERE clocked_out_at IS NULL
  AND date = CURRENT_DATE;

