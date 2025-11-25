-- 🔧 FIX: Enjoyment Bonus Not Being Awarded
-- Issue: Points calculated when task ends, but enjoyment added later
-- Solution: Recalculate points when task_enjoyment is updated

-- ============================================================================
-- STEP 1: Create function to recalculate points when enjoyment added
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_recalculate_points_on_enjoyment()
RETURNS TRIGGER AS $$
DECLARE
  v_points INTEGER;
  v_old_points INTEGER;
  v_points_diff INTEGER;
  v_focus_score INTEGER := 80;
  v_actual_minutes INTEGER;
  v_mood_answered BOOLEAN := FALSE;
  v_energy_answered BOOLEAN := FALSE;
  v_enjoyment_answered BOOLEAN;
BEGIN
  -- Only recalculate if task is already completed AND enjoyment just changed
  IF NEW.ended_at IS NOT NULL 
     AND NEW.task_enjoyment IS NOT NULL 
     AND (OLD.task_enjoyment IS NULL OR OLD.task_enjoyment IS DISTINCT FROM NEW.task_enjoyment) THEN
    
    -- Calculate actual duration
    v_actual_minutes := COALESCE(NEW.accumulated_seconds, 0) / 60;
    v_enjoyment_answered := TRUE;
    
    -- Store old points
    v_old_points := COALESCE(OLD.points_awarded, 0);
    
    -- Recalculate points with enjoyment
    v_points := calculate_task_points(
      COALESCE(NEW.task_type, 'Standard Task'),
      COALESCE(NEW.task_priority, 'Daily Task'),
      v_focus_score,
      COALESCE(NEW.goal_duration_minutes, 0),
      v_actual_minutes,
      NEW.task_enjoyment,
      v_mood_answered,
      v_energy_answered,
      v_enjoyment_answered
    );
    
    -- Calculate difference
    v_points_diff := v_points - v_old_points;
    
    -- Update task with new points
    NEW.points_awarded := v_points;
    
    -- Award additional points if there's a difference
    IF v_points_diff > 0 THEN
      PERFORM award_points(
        NEW.user_id,
        v_points_diff,
        'Enjoyment Bonus: ' || LEFT(NEW.task_description, 40),
        NEW.id
      );
      
      RAISE NOTICE 'Enjoyment bonus awarded: % points (was %, now %)', v_points_diff, v_old_points, v_points;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create trigger for enjoyment updates
-- ============================================================================

-- Drop if exists
DROP TRIGGER IF EXISTS trg_recalculate_points_on_enjoyment ON eod_time_entries;

-- Create trigger
CREATE TRIGGER trg_recalculate_points_on_enjoyment
BEFORE UPDATE ON eod_time_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_points_on_enjoyment();

-- ============================================================================
-- STEP 3: Verify the fix
-- ============================================================================

SELECT 
  '✅ ENJOYMENT BONUS TRIGGER INSTALLED!' AS status,
  'Points will now be recalculated when enjoyment is added' AS description;

-- ============================================================================
-- STEP 4: Test (optional - for verification)
-- ============================================================================

-- To test:
-- 1. Complete a task (gets base points)
-- 2. Rate enjoyment 5/5 (should get +2 bonus)
-- 3. Check points_history for two entries:
--    - "Task Completed: ..." (base points)
--    - "Enjoyment Bonus: ..." (+2 points)

SELECT 
  '📊 RECENT POINTS HISTORY' AS report,
  timestamp,
  points,
  reason
FROM points_history
WHERE user_id = auth.uid()
ORDER BY timestamp DESC
LIMIT 5;

