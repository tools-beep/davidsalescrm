-- 🔧 FIX: Enjoyment Bonus Not Being Awarded
-- Simplified version for Supabase SQL Editor (no $$ delimiters)

-- Step 1: Create the function
CREATE OR REPLACE FUNCTION trigger_recalculate_points_on_enjoyment()
RETURNS TRIGGER AS '
DECLARE
  v_points INTEGER;
  v_old_points INTEGER;
  v_points_diff INTEGER;
BEGIN
  IF NEW.ended_at IS NOT NULL 
     AND NEW.task_enjoyment IS NOT NULL 
     AND (OLD.task_enjoyment IS NULL OR OLD.task_enjoyment IS DISTINCT FROM NEW.task_enjoyment) THEN 
    
    v_old_points := COALESCE(OLD.points_awarded, 0);
    
    v_points := calculate_task_points(
      COALESCE(NEW.task_type, ''Standard Task''),
      COALESCE(NEW.task_priority, ''Daily Task''),
      80,
      COALESCE(NEW.goal_duration_minutes, 0),
      COALESCE(NEW.accumulated_seconds, 0) / 60,
      NEW.task_enjoyment,
      FALSE, FALSE, TRUE
    );
    
    v_points_diff := v_points - v_old_points;
    NEW.points_awarded := v_points;
    
    IF v_points_diff > 0 THEN
      PERFORM award_points(
        NEW.user_id,
        v_points_diff,
        ''Enjoyment Bonus: '' || LEFT(NEW.task_description, 40),
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
' LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Drop old trigger if exists
DROP TRIGGER IF EXISTS trg_recalculate_points_on_enjoyment ON eod_time_entries;

-- Step 3: Create the trigger
CREATE TRIGGER trg_recalculate_points_on_enjoyment
BEFORE UPDATE ON eod_time_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_points_on_enjoyment();

-- Step 4: Verify it was created
SELECT 
  '✅ TRIGGER CREATED!' AS status,
  tgname AS trigger_name,
  tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname = 'trg_recalculate_points_on_enjoyment';

