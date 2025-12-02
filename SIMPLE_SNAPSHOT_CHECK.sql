-- ============================================
-- SIMPLIFIED DEBUG: Check Smart DAR Snapshots
-- ============================================

-- 1. Check if smart_dar_snapshots table has ANY data
SELECT 
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT user_id) as unique_users
FROM smart_dar_snapshots;

-- 2. Check recent snapshots (last 7 days)
SELECT 
  snapshot_date,
  user_id,
  efficiency_score,
  completion_rate,
  total_tasks,
  completed_tasks,
  points_earned,
  created_at
FROM smart_dar_snapshots
WHERE snapshot_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check today's snapshots specifically
SELECT 
  snapshot_date,
  user_id,
  total_tasks,
  completed_tasks,
  efficiency_score,
  created_at
FROM smart_dar_snapshots
WHERE snapshot_date = CURRENT_DATE
ORDER BY created_at DESC;

-- 4. Check recent EOD submissions (using correct column name)
SELECT 
  id,
  user_id,
  created_at
FROM eod_submissions
ORDER BY created_at DESC
LIMIT 10;

