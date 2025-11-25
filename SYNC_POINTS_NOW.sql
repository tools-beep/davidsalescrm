-- 🔥 SYNC POINTS FROM HISTORY TO USER PROFILE
-- This will update your points badge to show 17 instead of 0

-- Step 1: Add points columns if they don't exist (safe to run multiple times)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'total_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN total_points INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added total_points column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'weekly_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN weekly_points INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added weekly_points column';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'monthly_points'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN monthly_points INTEGER DEFAULT 0;
    RAISE NOTICE '✅ Added monthly_points column';
  END IF;
END $$;

-- Step 2: Sync points from points_history to user_profiles
UPDATE user_profiles up
SET 
  total_points = COALESCE(ph.total, 0),
  weekly_points = COALESCE(ph.total, 0),  -- For now, all points are "weekly"
  monthly_points = COALESCE(ph.total, 0)  -- For now, all points are "monthly"
FROM (
  SELECT 
    user_id,
    SUM(points) AS total
  FROM points_history
  GROUP BY user_id
) ph
WHERE up.user_id = ph.user_id;

-- Step 3: Verify it worked!
SELECT 
  '🎉 POINTS SYNCED!' AS status,
  full_name,
  total_points,
  weekly_points,
  monthly_points
FROM user_profiles
WHERE user_id = auth.uid();

