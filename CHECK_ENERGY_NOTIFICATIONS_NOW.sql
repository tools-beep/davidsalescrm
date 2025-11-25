-- 🔍 CHECK: Are energy survey notifications being saved?

-- 1. Check if ANY energy notifications exist
SELECT 
  '🔍 Energy Notifications Check' AS status,
  COUNT(*) AS total_energy_notifications,
  COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS today_count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) AS last_hour_count,
  MAX(created_at) AT TIME ZONE 'America/New_York' AS most_recent_est
FROM notification_log
WHERE user_id = auth.uid()
  AND category = 'energy';

-- 2. Show recent energy notifications
SELECT 
  '📋 Recent Energy Notifications' AS type,
  message,
  type,
  category,
  created_at AT TIME ZONE 'America/New_York' AS created_at_est,
  metadata
FROM notification_log
WHERE user_id = auth.uid()
  AND category = 'energy'
ORDER BY created_at DESC
LIMIT 10;

-- 3. Compare: Energy entries vs Energy notifications
SELECT 
  '⚖️ Energy Entries vs Notifications' AS comparison,
  (SELECT COUNT(*) FROM energy_entries WHERE user_id = auth.uid()) AS total_energy_entries,
  (SELECT COUNT(*) FROM notification_log WHERE user_id = auth.uid() AND category = 'energy') AS total_energy_notifications,
  (SELECT COUNT(*) FROM energy_entries WHERE user_id = auth.uid() AND timestamp >= CURRENT_DATE) AS today_energy_entries,
  (SELECT COUNT(*) FROM notification_log WHERE user_id = auth.uid() AND category = 'energy' AND created_at >= CURRENT_DATE) AS today_energy_notifications;

-- 4. Show recent energy entries (to see if surveys are being answered)
SELECT 
  '🔋 Recent Energy Entries' AS type,
  timestamp AT TIME ZONE 'America/New_York' AS timestamp_est,
  energy_level
FROM energy_entries
WHERE user_id = auth.uid()
ORDER BY timestamp DESC
LIMIT 10;

