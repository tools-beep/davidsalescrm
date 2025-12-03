-- Run this in Supabase SQL Editor to verify snapshots are being saved correctly

-- Check ALL snapshots from December 2025
SELECT 
  snapshot_date,
  user_id,
  efficiency_score,
  completion_rate,
  focus_index,
  task_velocity,
  work_rhythm,
  energy_level,
  time_utilization,
  productivity_momentum,
  consistency_score,
  total_tasks,
  completed_tasks,
  points_earned,
  total_shift_hours,
  expert_insight,
  created_at
FROM smart_dar_snapshots
WHERE snapshot_date >= '2025-12-01'
ORDER BY snapshot_date DESC, created_at DESC;

-- Check if snapshot_date format matches what dashboard expects
-- Dashboard uses format: YYYY-MM-DD (from getDateKeyEST)
SELECT DISTINCT snapshot_date, LENGTH(snapshot_date) as date_length
FROM smart_dar_snapshots
ORDER BY snapshot_date DESC
LIMIT 10;

