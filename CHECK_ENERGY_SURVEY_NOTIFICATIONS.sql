-- 🔍 CHECK ENERGY SURVEY NOTIFICATIONS
-- Verify if energy surveys are being logged to notification_log

-- 1. Check all energy-related notifications
SELECT 
  '1. ENERGY NOTIFICATIONS' AS check_type,
  id,
  message,
  type,
  category,
  created_at,
  is_read
FROM notification_log
WHERE user_id = auth.uid()
  AND (
    category = 'energy' 
    OR message ILIKE '%energy%'
    OR type = 'survey_completed'
  )
ORDER BY created_at DESC;

-- 2. Check all survey_completed notifications
SELECT 
  '2. ALL SURVEY NOTIFICATIONS' AS check_type,
  id,
  message,
  type,
  category,
  created_at,
  is_read
FROM notification_log
WHERE user_id = auth.uid()
  AND type = 'survey_completed'
ORDER BY created_at DESC;

-- 3. Check energy_entries table
SELECT 
  '3. ENERGY ENTRIES IN DB' AS check_type,
  id,
  timestamp,
  energy_level,
  created_at
FROM energy_entries
WHERE user_id = auth.uid()
ORDER BY timestamp DESC
LIMIT 10;

-- 4. Check mood_entries for comparison
SELECT 
  '4. MOOD ENTRIES IN DB' AS check_type,
  id,
  timestamp,
  mood_level,
  created_at
FROM mood_entries
WHERE user_id = auth.uid()
ORDER BY timestamp DESC
LIMIT 10;

-- 5. Count notifications by category
SELECT 
  '5. NOTIFICATION COUNT BY CATEGORY' AS check_type,
  category,
  COUNT(*) AS count
FROM notification_log
WHERE user_id = auth.uid()
GROUP BY category
ORDER BY count DESC;

-- 6. Check all notifications from today (EST)
SELECT 
  '6. ALL NOTIFICATIONS TODAY' AS check_type,
  id,
  message,
  type,
  category,
  created_at AT TIME ZONE 'America/New_York' AS created_at_est,
  is_read
FROM notification_log
WHERE user_id = auth.uid()
  AND created_at >= CURRENT_DATE AT TIME ZONE 'America/New_York'
ORDER BY created_at DESC;

