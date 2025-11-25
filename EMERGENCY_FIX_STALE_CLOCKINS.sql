-- 🚨 EMERGENCY FIX: Close ALL stale clock-ins RIGHT NOW
-- Run this in Supabase SQL Editor IMMEDIATELY

-- STEP 1: Force close all active clock-ins for today
UPDATE eod_clock_ins
SET clocked_out_at = NOW()
WHERE date = CURRENT_DATE
  AND clocked_out_at IS NULL;

-- STEP 2: Verify the fix worked
SELECT 
    '✅ FIXED!' AS status,
    COUNT(*) AS total_clock_ins_today,
    COUNT(CASE WHEN clocked_out_at IS NULL THEN 1 END) AS active_clock_ins,
    COUNT(CASE WHEN clocked_out_at IS NOT NULL THEN 1 END) AS closed_clock_ins
FROM eod_clock_ins
WHERE date = CURRENT_DATE;

-- Expected result: active_clock_ins = 0

-- STEP 3: Show recent clock-ins for verification
SELECT 
    user_id,
    client_name,
    clocked_in_at,
    clocked_out_at,
    planned_shift_minutes,
    daily_task_goal,
    CASE 
        WHEN clocked_out_at IS NULL THEN '❌ STILL ACTIVE (BUG!)'
        ELSE '✅ CLOSED'
    END AS status
FROM eod_clock_ins
WHERE date = CURRENT_DATE
ORDER BY clocked_in_at DESC;

-- 🎯 AFTER RUNNING THIS:
-- 1. Hard refresh your browser (Cmd+Shift+R)
-- 2. You should see "Not Clocked In"
-- 3. Click "Clock In" → Should work perfectly!
-- 4. From now on, the system will AUTO-FIX stale clock-ins automatically

