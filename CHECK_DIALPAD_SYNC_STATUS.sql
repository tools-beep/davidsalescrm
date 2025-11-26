-- Check Dialpad Sync Status
-- This verifies if calls are being synced from Dialpad API

-- ============================================
-- 1. Check if ANY calls have dialpad_metadata
-- ============================================
-- If dialpad_metadata exists, it means the call was synced from Dialpad API

SELECT 
    COUNT(*) as total_calls_with_metadata,
    COUNT(*) FILTER (WHERE dialpad_metadata IS NOT NULL) as calls_with_dialpad_metadata,
    COUNT(*) FILTER (WHERE recording_url IS NOT NULL) as calls_with_recordings,
    COUNT(*) FILTER (WHERE transcript IS NOT NULL) as calls_with_transcripts
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '30 days';

-- ============================================
-- 2. Check recent calls with Dialpad metadata
-- ============================================
-- These are calls that were definitely synced from Dialpad

SELECT 
    id,
    call_timestamp,
    dialpad_call_id,
    call_direction,
    duration_seconds,
    recording_url IS NOT NULL as has_recording,
    transcript IS NOT NULL as has_transcript,
    dialpad_metadata IS NOT NULL as has_metadata
FROM public.calls
WHERE dialpad_metadata IS NOT NULL
ORDER BY call_timestamp DESC
LIMIT 10;

-- ============================================
-- 3. Check if dialpad_tokens table has tokens
-- ============================================
-- Auto-sync needs valid Dialpad access tokens

SELECT 
    user_id,
    created_at,
    updated_at,
    access_token IS NOT NULL as has_access_token,
    refresh_token IS NOT NULL as has_refresh_token,
    expires_at,
    CASE 
        WHEN expires_at > NOW() THEN '✅ Valid'
        WHEN expires_at <= NOW() THEN '❌ Expired'
        ELSE '⚠️ Unknown'
    END as token_status
FROM public.dialpad_tokens
ORDER BY updated_at DESC;

-- ============================================
-- 4. Check for calls in last 24 hours
-- ============================================
-- Recent activity check

SELECT 
    DATE_TRUNC('hour', call_timestamp) as hour,
    COUNT(*) as calls_count,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NOT NULL) as dialpad_calls,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NULL) as manual_calls
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', call_timestamp)
ORDER BY hour DESC;

-- ============================================
-- 5. Check if calls exist in Dialpad but not in CRM
-- ============================================
-- This would indicate sync is not working

-- You need to manually check Dialpad dashboard:
-- 1. Go to https://dialpad.com/calls
-- 2. Check how many calls you see in last 7 days
-- 3. Compare with this query:

SELECT 
    COUNT(*) as calls_in_crm_last_7_days,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NOT NULL) as dialpad_tagged_calls,
    COUNT(*) FILTER (WHERE dialpad_call_id IS NULL) as manual_logged_calls
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '7 days';

-- ============================================
-- INTERPRETATION GUIDE
-- ============================================

/*
SCENARIO 1: Auto-sync is working
- Query 1: calls_with_dialpad_metadata > 0
- Query 2: Shows recent calls with metadata
- Query 3: Token status = '✅ Valid'
- Action: Calls ARE being synced from Dialpad

SCENARIO 2: Auto-sync is NOT working
- Query 1: calls_with_dialpad_metadata = 0
- Query 2: No results
- Query 3: Token status = '❌ Expired' or no tokens
- Action: Need to fix Dialpad OAuth connection

SCENARIO 3: No calls in Dialpad
- Query 1: calls_with_dialpad_metadata = 0
- Query 3: Token status = '✅ Valid'
- Query 5: 0 calls in Dialpad dashboard
- Action: Team is not using Dialpad, only manual logging

SCENARIO 4: Calls in Dialpad but not syncing
- Query 3: Token status = '✅ Valid'
- Query 5: Dialpad dashboard shows 50+ calls
- Query 5: CRM shows 0 dialpad_tagged_calls
- Action: Auto-sync function is broken, needs debugging
*/

-- ============================================
-- NEXT STEPS BASED ON RESULTS
-- ============================================

/*
IF Query 1 shows calls_with_dialpad_metadata = 0:
→ Auto-sync is NOT working
→ Check Query 3 for token status
→ May need to reconnect Dialpad OAuth

IF Query 3 shows no tokens or expired tokens:
→ Go to CRM settings
→ Reconnect Dialpad integration
→ Authorize OAuth access

IF Query 3 shows valid tokens BUT Query 1 = 0:
→ Auto-sync function might be broken
→ Check browser console for sync errors
→ Look for: "🔄 Starting Dialpad auto-sync..."

IF ALL queries show 0:
→ Team might not be using Dialpad at all
→ All 172 calls are genuinely manual logs
→ Need to train team to use Dialpad CTI
*/

