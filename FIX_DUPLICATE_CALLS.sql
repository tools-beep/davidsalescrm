-- Fix Duplicate Calls and Missing dialpad_call_id
-- Run this to identify and fix issues with call logging

-- ============================================
-- STEP 1: Identify Duplicate Calls
-- ============================================

-- Find calls that might be duplicates (same phone number, same time window)
SELECT 
    callee_number,
    DATE_TRUNC('minute', call_timestamp) as call_minute,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as call_ids,
    STRING_AGG(COALESCE(dialpad_call_id, 'NULL'), ', ') as dialpad_ids
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY callee_number, DATE_TRUNC('minute', call_timestamp)
HAVING COUNT(*) > 1
ORDER BY call_minute DESC;

-- ============================================
-- STEP 2: Find Calls Missing dialpad_call_id
-- ============================================

-- These are likely calls made via CTI but not properly logged
SELECT 
    id,
    call_timestamp,
    call_direction,
    caller_number,
    callee_number,
    call_status,
    duration_seconds,
    call_outcome,
    dialpad_call_id
FROM public.calls
WHERE dialpad_call_id IS NULL
  AND call_timestamp >= NOW() - INTERVAL '7 days'
  AND call_direction = 'outbound'
  AND call_status IN ('initiated', 'in-progress', 'completed')
ORDER BY call_timestamp DESC
LIMIT 50;

-- ============================================
-- STEP 3: Statistics Before Fix
-- ============================================

SELECT 
    'Before Fix' as status,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NOT NULL) as dialpad_calls,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NULL) as manual_calls,
    ROUND(100.0 * COUNT(*) FILTER (WHERE dialpad_call_id IS NOT NULL) / COUNT(*), 2) as dialpad_percentage
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '30 days';

-- ============================================
-- STEP 4: Delete Duplicate Calls (CAREFUL!)
-- ============================================

-- This will delete duplicate calls, keeping only the one WITH dialpad_call_id
-- REVIEW THE RESULTS FROM STEP 1 BEFORE RUNNING THIS!

/*
DELETE FROM public.calls
WHERE id IN (
    SELECT c1.id
    FROM public.calls c1
    INNER JOIN public.calls c2 ON 
        c1.callee_number = c2.callee_number
        AND DATE_TRUNC('minute', c1.call_timestamp) = DATE_TRUNC('minute', c2.call_timestamp)
        AND c1.id != c2.id
    WHERE c1.dialpad_call_id IS NULL
      AND c2.dialpad_call_id IS NOT NULL
      AND c1.call_timestamp >= NOW() - INTERVAL '30 days'
);
*/

-- ============================================
-- STEP 5: Statistics After Fix
-- ============================================

-- Run this AFTER deleting duplicates to see the improvement
/*
SELECT 
    'After Fix' as status,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NOT NULL) as dialpad_calls,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NULL) as manual_calls,
    ROUND(100.0 * COUNT(*) FILTER (WHERE dialpad_call_id IS NOT NULL) / COUNT(*), 2) as dialpad_percentage
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '30 days';
*/

-- ============================================
-- STEP 6: Verify Recent Calls Have dialpad_call_id
-- ============================================

-- Check the last 20 calls to ensure new calls are being logged correctly
SELECT 
    id,
    call_timestamp,
    CASE 
        WHEN dialpad_call_id IS NOT NULL THEN '✅ Dialpad CTI'
        ELSE '❌ Manual Log'
    END as call_source,
    dialpad_call_id,
    call_direction,
    callee_number,
    duration_seconds,
    call_status
FROM public.calls
ORDER BY call_timestamp DESC
LIMIT 20;

-- ============================================
-- NOTES
-- ============================================

/*
WHAT THIS SCRIPT DOES:

1. Identifies duplicate calls (same number, same minute)
2. Shows calls that should have dialpad_call_id but don't
3. Shows statistics before cleanup
4. Provides a DELETE query to remove duplicates (commented out for safety)
5. Shows statistics after cleanup
6. Verifies recent calls are logging correctly

HOW TO USE:

1. Run STEP 1 to see if you have duplicates
2. Run STEP 2 to see calls missing dialpad_call_id
3. Run STEP 3 to see current statistics
4. If you have duplicates, UNCOMMENT and run STEP 4 (BE CAREFUL!)
5. Run STEP 5 to see improved statistics
6. Run STEP 6 to verify new calls are working

EXPECTED RESULTS AFTER FIX:

- Dialpad CTI calls should be 60-80% (if team uses CTI regularly)
- No duplicate calls for the same phone number at the same time
- All calls made via "Call" button should have dialpad_call_id

IMPORTANT:
- The DELETE query in STEP 4 is commented out for safety
- Review the duplicates carefully before deleting
- Make a backup before running DELETE queries
- Test making a new call after the code fix to verify it works
*/

