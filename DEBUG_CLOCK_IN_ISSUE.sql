-- 🔍 DEBUG: Check current clock-in status

-- 1. Show ALL clock-ins for today (including clocked out ones)
SELECT 
    'All Clock-Ins Today' AS check_type,
    id,
    user_id,
    client_name,
    clocked_in_at,
    clocked_out_at,
    date,
    CASE 
        WHEN clocked_out_at IS NULL THEN '🔴 ACTIVE'
        ELSE '✅ COMPLETED'
    END AS status
FROM eod_clock_ins
WHERE date = CURRENT_DATE
ORDER BY clocked_in_at DESC;

-- 2. Show ONLY active (not clocked out) clock-ins
SELECT 
    'Active Clock-Ins' AS check_type,
    id,
    user_id,
    client_name,
    clocked_in_at,
    date
FROM eod_clock_ins
WHERE date = CURRENT_DATE
  AND clocked_out_at IS NULL;

-- 3. Check if there are any "zombie" clock-ins from tab switching
SELECT 
    'Potential Zombie Clock-Ins' AS check_type,
    id,
    client_name,
    clocked_in_at,
    clocked_out_at,
    EXTRACT(EPOCH FROM (NOW() - clocked_in_at))/60 AS minutes_since_clock_in
FROM eod_clock_ins
WHERE date = CURRENT_DATE
  AND clocked_out_at IS NULL
  AND clocked_in_at < NOW() - INTERVAL '5 minutes';

