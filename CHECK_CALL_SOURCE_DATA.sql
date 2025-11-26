-- Check Call Source Data
-- This query helps verify if calls are being properly tagged with dialpad_call_id

-- 1. Count calls by source
SELECT 
    CASE 
        WHEN dialpad_call_id IS NOT NULL THEN 'Dialpad CTI'
        ELSE 'Manual Log'
    END as call_source,
    COUNT(*) as call_count,
    ROUND(AVG(duration_seconds), 2) as avg_duration_seconds,
    SUM(duration_seconds) as total_duration_seconds
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '30 days'
GROUP BY call_source
ORDER BY call_count DESC;

-- 2. Recent calls with source information
SELECT 
    id,
    call_timestamp,
    CASE 
        WHEN dialpad_call_id IS NOT NULL THEN 'Dialpad CTI'
        ELSE 'Manual Log'
    END as call_source,
    dialpad_call_id,
    call_direction,
    call_outcome,
    duration_seconds,
    caller_number,
    callee_number,
    recording_url IS NOT NULL as has_recording,
    transcript IS NOT NULL as has_transcript
FROM public.calls
ORDER BY call_timestamp DESC
LIMIT 20;

-- 3. Check for calls that might be missing dialpad_call_id
SELECT 
    COUNT(*) as calls_without_dialpad_id,
    COUNT(*) FILTER (WHERE recording_url IS NOT NULL) as have_recording_but_no_id,
    COUNT(*) FILTER (WHERE transcript IS NOT NULL) as have_transcript_but_no_id
FROM public.calls
WHERE dialpad_call_id IS NULL
  AND call_timestamp >= NOW() - INTERVAL '30 days';

-- 4. Verify dialpad_call_id format
SELECT 
    dialpad_call_id,
    COUNT(*) as count,
    MIN(call_timestamp) as first_call,
    MAX(call_timestamp) as last_call
FROM public.calls
WHERE dialpad_call_id IS NOT NULL
GROUP BY dialpad_call_id
ORDER BY last_call DESC
LIMIT 10;

