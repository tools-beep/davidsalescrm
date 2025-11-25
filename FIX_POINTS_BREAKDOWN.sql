-- 🔧 FIX: Create detailed points breakdown instead of single lump sum

-- Drop existing trigger
DROP TRIGGER IF EXISTS trg_award_task_points ON eod_time_entries;

-- Create new trigger function that awards points with detailed breakdown
CREATE OR REPLACE FUNCTION trigger_award_task_points()
RETURNS TRIGGER AS $$
DECLARE
  v_base_points INTEGER := 0;
  v_priority_bonus INTEGER := 0;
  v_focus_bonus INTEGER := 0;
  v_estimation_bonus INTEGER := 0;
  v_enjoyment_bonus INTEGER := 0;
  v_total_points INTEGER := 0;
  v_focus_score INTEGER := 80;
  v_actual_minutes INTEGER;
  v_task_name TEXT;
BEGIN
  -- Only award points when task is completed
  IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at IS DISTINCT FROM NEW.ended_at) THEN
    
    v_actual_minutes := COALESCE(NEW.accumulated_seconds, 0) / 60;
    v_task_name := LEFT(NEW.task_description, 40);
    
    -- 1. BASE POINTS (task type)
    CASE COALESCE(NEW.task_type, 'Standard Task')
      WHEN 'Deep Work' THEN v_base_points := 10;
      WHEN 'Standard Task' THEN v_base_points := 5;
      WHEN 'Quick Task' THEN v_base_points := 3;
      ELSE v_base_points := 5;
    END CASE;
    
    -- Award base points
    IF v_base_points > 0 THEN
      PERFORM award_points(
        NEW.user_id,
        v_base_points,
        CASE COALESCE(NEW.task_type, 'Standard Task')
          WHEN 'Deep Work' THEN '🧠 Deep Work Task: ' || v_task_name
          WHEN 'Quick Task' THEN '⚡ Quick Task: ' || v_task_name
          ELSE '✅ Task Completed: ' || v_task_name
        END,
        NEW.id
      );
      v_total_points := v_total_points + v_base_points;
    END IF;
    
    -- 2. PRIORITY BONUS
    CASE COALESCE(NEW.task_priority, 'Daily Task')
      WHEN 'Immediate Impact' THEN v_priority_bonus := 5;
      WHEN 'High Priority' THEN v_priority_bonus := 3;
      WHEN 'Daily Task' THEN v_priority_bonus := 1;
      ELSE v_priority_bonus := 0;
    END CASE;
    
    IF v_priority_bonus > 0 THEN
      PERFORM award_points(
        NEW.user_id,
        v_priority_bonus,
        CASE COALESCE(NEW.task_priority, 'Daily Task')
          WHEN 'Immediate Impact' THEN '🔥 Immediate Impact Task: ' || v_task_name
          WHEN 'High Priority' THEN '⭐ High-Priority Task: ' || v_task_name
          ELSE '📋 Daily Task: ' || v_task_name
        END,
        NEW.id
      );
      v_total_points := v_total_points + v_priority_bonus;
    END IF;
    
    -- 3. FOCUS BONUS (if focus score > 70)
    IF v_focus_score > 70 THEN
      v_focus_bonus := 2;
      PERFORM award_points(
        NEW.user_id,
        v_focus_bonus,
        '🎯 High Focus: ' || v_task_name,
        NEW.id
      );
      v_total_points := v_total_points + v_focus_bonus;
    END IF;
    
    -- 4. ESTIMATION ACCURACY BONUS
    IF NEW.goal_duration_minutes IS NOT NULL AND NEW.goal_duration_minutes > 0 THEN
      DECLARE
        v_accuracy FLOAT;
        v_diff INTEGER;
      BEGIN
        v_diff := ABS(v_actual_minutes - NEW.goal_duration_minutes);
        v_accuracy := 100.0 * (1.0 - (v_diff::FLOAT / NEW.goal_duration_minutes::FLOAT));
        
        -- Within 20% = accurate
        IF v_accuracy >= 80 THEN
          v_estimation_bonus := 3;
          PERFORM award_points(
            NEW.user_id,
            v_estimation_bonus,
            '🎯 Accurate Estimation: ' || v_actual_minutes || '/' || NEW.goal_duration_minutes || ' min',
            NEW.id
          );
          v_total_points := v_total_points + v_estimation_bonus;
        END IF;
      END;
    END IF;
    
    -- 5. ENJOYMENT BONUS (handled separately by enjoyment trigger, but track here)
    IF NEW.task_enjoyment >= 4 THEN
      v_enjoyment_bonus := 2;
      -- Note: This is also awarded by the enjoyment trigger, so we don't double-award
      -- Just tracking it in the total
    END IF;
    
    -- Update task with total points
    NEW.points_awarded := v_total_points + v_enjoyment_bonus;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER trg_award_task_points
BEFORE UPDATE ON eod_time_entries
FOR EACH ROW
EXECUTE FUNCTION trigger_award_task_points();

-- Success message
SELECT '✅ Points breakdown trigger updated! Now awards separate entries for:' AS status
UNION ALL SELECT '   🧠 Task type bonus (Deep Work +10, Standard +5, Quick +3)'
UNION ALL SELECT '   🔥 Priority bonus (Immediate Impact +5, High +3, Daily +1)'
UNION ALL SELECT '   🎯 Focus bonus (+2 if focus > 70%)'
UNION ALL SELECT '   📊 Estimation accuracy (+3 if within 20%)'
UNION ALL SELECT '   😊 Enjoyment bonus (+2 if rating >= 4, separate trigger)';

