-- Check if smart_dar_snapshots has ANY data at all
SELECT 
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT user_id) as unique_users,
  MAX(created_at) as most_recent_snapshot
FROM smart_dar_snapshots;

-- Check for snapshots from Dec 1-2
SELECT 
  snapshot_date,
  user_id,
  efficiency_score,
  total_tasks,
  completed_tasks,
  points_earned,
  created_at
FROM smart_dar_snapshots
WHERE snapshot_date >= '2025-12-01'
ORDER BY created_at DESC;

