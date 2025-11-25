-- 🔧 FIX: Sync points from points_history to user_profiles
-- Issue: Points are in points_history but not showing in user_profiles.total_points

-- ============================================================================
-- STEP 1: Check if total_points columns exist in user_profiles
-- ============================================================================

DO $$
BEGIN
  -- Add total_points if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN total_points INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added total_points column';
  ELSE
    RAISE NOTICE '✅ total_points column already exists';
  END IF;

  -- Add weekly_points if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'weekly_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN weekly_points INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added weekly_points column';
  ELSE
    RAISE NOTICE '✅ weekly_points column already exists';
  END IF;

  -- Add monthly_points if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'monthly_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN monthly_points INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added monthly_points column';
  ELSE
    RAISE NOTICE '✅ monthly_points column already exists';
  END IF;

  -- Add last_weekly_reset if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'last_weekly_reset'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_weekly_reset TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added last_weekly_reset column';
  ELSE
    RAISE NOTICE '✅ last_weekly_reset column already exists';
  END IF;

  -- Add last_monthly_reset if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'last_monthly_reset'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_monthly_reset TIMESTAMPTZ DEFAULT NOW();
    RAISE NOTICE '✅ Added last_monthly_reset column';
  ELSE
    RAISE NOTICE '✅ last_monthly_reset column already exists';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Sync existing points from points_history to user_profiles
-- ============================================================================

-- Calculate total points for each user and update user_profiles
UPDATE user_profiles up
SET total_points = COALESCE(ph.total, 0)
FROM (
  SELECT 
    user_id,
    SUM(points) AS total
  FROM points_history
  GROUP BY user_id
) ph
WHERE up.user_id = ph.user_id;

-- ============================================================================
-- STEP 3: Verify the sync worked
-- ============================================================================

SELECT 
  '✅ POINTS SYNCED!' AS status,
  up.full_name,
  up.total_points AS points_in_profile,
  COALESCE(SUM(ph.points), 0) AS points_in_history,
  CASE 
    WHEN up.total_points = COALESCE(SUM(ph.points), 0) THEN '✅ MATCH'
    ELSE '⚠️ MISMATCH'
  END AS sync_status
FROM user_profiles up
LEFT JOIN points_history ph ON ph.user_id = up.user_id
WHERE up.user_id = auth.uid()
GROUP BY up.user_id, up.full_name, up.total_points;

-- ============================================================================
-- STEP 4: Check if award_points function exists and is working
-- ============================================================================

SELECT 
  '📊 AWARD_POINTS FUNCTION' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'award_points')
    THEN '✅ Function EXISTS'
    ELSE '❌ Function MISSING - Need to run full migration'
  END AS status;

