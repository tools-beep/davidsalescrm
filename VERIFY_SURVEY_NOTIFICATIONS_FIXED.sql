-- 🔍 VERIFY: Survey Notifications Are Now Working

-- 1. Check recent survey notifications (should see new entries after fix)
SELECT 
  '✅ Recent Survey Notifications' AS check_type,
  message,
  type,
  category,
  created_at AT TIME ZONE 'America/New_York' AS created_at_est,
  CASE 
    WHEN created_at > NOW() - INTERVAL '5 minutes' THEN '🟢 JUST NOW'
    WHEN created_at > NOW() - INTERVAL '1 hour' THEN '🟡 Recent'
    ELSE '⚪ Older'
  END AS freshness
FROM notification_log
WHERE user_id = auth.uid()
  AND (
    category IN ('mood', 'energy', 'enjoyment', 'survey_completed', 'achievement')
    OR type IN ('survey_completed', 'survey_missed', 'enjoyment_bonus', 'enjoyment_recorded')
  )
ORDER BY created_at DESC
LIMIT 20;

-- 2. Count survey notifications by category
SELECT 
  '📊 Survey Notification Counts' AS check_type,
  category,
  type,
  COUNT(*) AS total_count,
  COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) AS today_count,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) AS last_hour_count
FROM notification_log
WHERE user_id = auth.uid()
  AND (
    category IN ('mood', 'energy', 'enjoyment', 'survey_completed', 'achievement')
    OR type IN ('survey_completed', 'survey_missed', 'enjoyment_bonus', 'enjoyment_recorded')
  )
GROUP BY category, type
ORDER BY today_count DESC, total_count DESC;

-- 3. Cross-check: Are surveys being answered but NOT logged?
WITH survey_entries AS (
  SELECT 
    'mood' AS survey_type,
    timestamp,
    mood_level::TEXT AS value
  FROM mood_entries
  WHERE user_id = auth.uid()
  
  UNION ALL
  
  SELECT 
    'energy' AS survey_type,
    timestamp,
    energy_level::TEXT AS value
  FROM energy_entries
  WHERE user_id = auth.uid()
),
logged_surveys AS (
  SELECT 
    category,
    created_at
  FROM notification_log
  WHERE user_id = auth.uid()
    AND category IN ('mood', 'energy', 'enjoyment')
)
SELECT 
  '🔍 Survey vs Notification Match' AS check_type,
  se.survey_type,
  COUNT(se.*) AS surveys_completed,
  COUNT(ls.*) AS notifications_logged,
  COUNT(se.*) - COUNT(ls.*) AS missing_notifications
FROM survey_entries se
LEFT JOIN logged_surveys ls 
  ON ls.category = se.survey_type 
  AND ls.created_at BETWEEN se.timestamp - INTERVAL '10 seconds' AND se.timestamp + INTERVAL '10 seconds'
GROUP BY se.survey_type;

-- 4. Final Status
SELECT 
  '🎯 FINAL STATUS' AS status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM notification_log 
      WHERE user_id = auth.uid() 
        AND category IN ('mood', 'energy', 'enjoyment')
        AND created_at > NOW() - INTERVAL '10 minutes'
    ) THEN '✅ WORKING - Recent survey notifications found!'
    WHEN EXISTS (
      SELECT 1 FROM notification_log 
      WHERE user_id = auth.uid() 
        AND category IN ('mood', 'energy', 'enjoyment')
    ) THEN '⚠️ Notifications exist but none recent. Complete a survey to test.'
    ELSE '❌ NO SURVEY NOTIFICATIONS YET - Complete a survey after deployment'
  END AS result;

