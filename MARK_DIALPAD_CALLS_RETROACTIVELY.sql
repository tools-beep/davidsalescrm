-- Mark Dialpad CTI Calls Retroactively
-- This script identifies calls that were made via Dialpad but missing dialpad_call_id

-- ============================================
-- ANALYSIS: Identify Likely Dialpad Calls
-- ============================================

-- Calls that are likely from Dialpad CTI based on patterns:
-- 1. call_status = 'initiated' or 'in-progress' or 'completed'
-- 2. call_direction = 'outbound'
-- 3. duration_seconds = 0 (not manually entered)
-- 4. dialpad_call_id IS NULL
-- 5. Recent calls (last 30 days)

SELECT 
    id,
    call_timestamp,
    callee_number,
    call_status,
    duration_seconds,
    call_outcome,
    dialpad_call_id
FROM public.calls
WHERE dialpad_call_id IS NULL
  AND call_direction = 'outbound'
  AND call_status IN ('initiated', 'in-progress', 'completed')
  AND call_timestamp >= NOW() - INTERVAL '30 days'
ORDER BY call_timestamp DESC;

-- ============================================
-- TEMPORARY FIX: Mark as Dialpad Calls
-- ============================================

-- WARNING: This is a TEMPORARY workaround!
-- The real fix is in the code (DialpadCTI.tsx)
-- This just marks existing calls so reports look accurate

-- Option 1: Mark ALL recent outbound calls as Dialpad calls
-- (Use this if you KNOW all outbound calls were made via Dialpad)

/*
UPDATE public.calls
SET dialpad_call_id = 'temp_' || id::text
WHERE dialpad_call_id IS NULL
  AND call_direction = 'outbound'
  AND call_status IN ('initiated', 'in-progress', 'completed')
  AND call_timestamp >= NOW() - INTERVAL '30 days';
*/

-- Option 2: Mark only calls with specific patterns
-- (More conservative approach)

/*
UPDATE public.calls
SET dialpad_call_id = 'temp_' || id::text
WHERE dialpad_call_id IS NULL
  AND call_direction = 'outbound'
  AND call_status = 'completed'
  AND duration_seconds = 0  -- Likely from CTI (no manual duration entered)
  AND call_timestamp >= NOW() - INTERVAL '7 days';
*/

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the results after running the update
SELECT 
    CASE 
        WHEN dialpad_call_id IS NOT NULL THEN 'Dialpad CTI'
        ELSE 'Manual Log'
    END as call_source,
    COUNT(*) as call_count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY call_source;

-- ============================================
-- IMPORTANT NOTES
-- ============================================

/*
⚠️ THIS IS A TEMPORARY WORKAROUND ⚠️

This script marks calls with a fake dialpad_call_id (temp_XXXXX) so they 
appear as "Dialpad CTI" in reports.

WHY THIS IS NEEDED:
- The code fix prevents FUTURE calls from having this issue
- But EXISTING calls in your database don't have dialpad_call_id
- This makes reports look inaccurate (1.1% Dialpad when it should be 70%+)

WHAT THIS DOES:
- Adds a temporary dialpad_call_id to existing calls
- Format: 'temp_' + call_id (e.g., 'temp_123')
- Makes reports show accurate percentages

REAL FIX:
- The code changes in DialpadCTI.tsx will fix NEW calls
- Test making a new call to verify it has a REAL dialpad_call_id
- Once confirmed working, you can run this script to fix historical data

HOW TO USE:
1. Review the SELECT query results first
2. Decide which UPDATE option to use (Option 1 or 2)
3. Uncomment the chosen UPDATE query
4. Run it in Supabase SQL Editor
5. Run the VERIFICATION query to see improved stats

EXPECTED RESULTS:
Before: Dialpad CTI 1.1%, Manual 98.9%
After:  Dialpad CTI 60-80%, Manual 20-40%
*/

