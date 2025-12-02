-- ============================================
-- DEBUG: Check Smart DAR Snapshots System
-- ============================================

-- 1. Check if table exists and has data
SELECT 
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(snapshot_date) as latest_snapshot,
  MIN(snapshot_date) as earliest_snapshot
FROM smart_dar_snapshots;

-- 2. Check recent snapshots (last 7 days)
SELECT 
  user_id,
  snapshot_date,
  efficiency_score,
  completion_rate,
  energy_level,
  points_earned,
  created_at
FROM smart_dar_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY snapshot_date DESC, created_at DESC
LIMIT 20;

-- 3. Check if there are any snapshots for today
SELECT 
  user_id,
  snapshot_date,
  efficiency_score,
  total_tasks,
  completed_tasks,
  created_at
FROM smart_dar_snapshots
WHERE snapshot_date = CURRENT_DATE
ORDER BY created_at DESC;

-- 4. Check EOD submissions (to see if DARs are being submitted)
SELECT 
  user_id,
  submission_date,
  created_at
FROM eod_submissions
WHERE submission_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if there's a mismatch between submissions and snapshots
SELECT 
  s.user_id,
  s.submission_date,
  s.created_at as submission_time,
  snap.snapshot_date,
  snap.created_at as snapshot_time,
  CASE 
    WHEN snap.id IS NULL THEN '❌ NO SNAPSHOT'
    ELSE '✅ HAS SNAPSHOT'
  END as status
FROM eod_submissions s
LEFT JOIN smart_dar_snapshots snap 
  ON s.user_id = snap.user_id 
  AND s.submission_date = snap.snapshot_date
WHERE s.submission_date >= CURRENT_DATE - INTERVAL '3 days'
ORDER BY s.created_at DESC
LIMIT 20;

