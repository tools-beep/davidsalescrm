-- 🚨 EMERGENCY FIX: Check for stale clock-in records and clean them up

-- STEP 1: Check what clock-in records exist for today
SELECT 
    id,
    user_id,
    client_name,
    clocked_in_at,
    clocked_out_at,
    date,
    planned_shift_minutes,
    daily_task_goal,
    created_at
FROM eod_clock_ins
WHERE date = CURRENT_DATE
ORDER BY created_at DESC;

-- STEP 2: If you see records with clocked_out_at = NULL, those are the problem
-- Run this to auto-clock-out any stale sessions older than 1 hour:

UPDATE eod_clock_ins
SET clocked_out_at = clocked_in_at + INTERVAL '1 hour'
WHERE clocked_out_at IS NULL
  AND date = CURRENT_DATE
  AND clocked_in_at < NOW() - INTERVAL '1 hour';

-- STEP 3: Verify the fix
SELECT 
    id,
    user_id,
    client_name,
    clocked_in_at,
    clocked_out_at,
    date
FROM eod_clock_ins
WHERE date = CURRENT_DATE
ORDER BY created_at DESC;

