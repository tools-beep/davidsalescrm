-- 🔍 CHECK IF SURVEY NOTIFICATIONS ARE IN DATABASE
-- User says surveys work but don't show in notification log

-- 1. Check ALL notifications (no date filter)
SELECT 
  '1. ALL NOTIFICATIONS (LAST 20)' AS check,
  id,
  message,
  type,
  category,
  created_at,
  is_read
FROM notification_log
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check specifically for survey-related notifications
SELECT 
  '2. SURVEY NOTIFICATIONS ONLY' AS check,
  id,
  message,
  type,
  category,
  created_at,
  DATE(created_at AT TIME ZONE 'America/New_York') AS created_date_est
FROM notification_log
WHERE user_id = auth.uid()
  AND (
    type = 'survey_completed'
    OR category IN ('mood', 'energy', 'enjoyment')
    OR message ILIKE '%survey%'
    OR message ILIKE '%mood%'
    OR message ILIKE '%energy%'
    OR message ILIKE '%enjoyment%'
  )
ORDER BY created_at DESC;

-- 3. Check what TODAY is in the database vs query
SELECT 
  '3. DATE COMPARISON' AS check,
  NOW() AS db_now,
  NOW() AT TIME ZONE 'America/New_York' AS db_now_est,
  CURRENT_DATE AS current_date,
  DATE(NOW() AT TIME ZONE 'America/New_York') AS current_date_est,
  (NOW() AT TIME ZONE 'America/New_York')::date AS today_est_cast;

-- 4. Check notifications from "today" using different date logic
SELECT 
  '4. NOTIFICATIONS TODAY (EST)' AS check,
  COUNT(*) AS count
FROM notification_log
WHERE user_id = auth.uid()
  AND DATE(created_at AT TIME ZONE 'America/New_York') = CURRENT_DATE;

-- 5. Check notifications using the SAME logic as useNotifications hook
-- The hook uses: .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
-- This is LOCAL TIME, not EST!
SELECT 
  '5. USING HOOK LOGIC (UTC MIDNIGHT)' AS check,
  id,
  message,
  created_at,
  created_at AT TIME ZONE 'America/New_York' AS created_at_est
FROM notification_log
WHERE user_id = auth.uid()
  AND created_at >= date_trunc('day', NOW())
ORDER BY created_at DESC
LIMIT 10;

-- 6. Count by type/category
SELECT 
  '6. COUNT BY TYPE' AS check,
  type,
  category,
  COUNT(*) AS count
FROM notification_log
WHERE user_id = auth.uid()
GROUP BY type, category
ORDER BY count DESC;

