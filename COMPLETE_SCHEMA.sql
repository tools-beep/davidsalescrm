-- ===========================================
-- COMPLETE SCHEMA: Functions, Triggers, Policies, Indexes
-- ===========================================

-- FUNCTIONS (46)
-- -------------------------------------------

CREATE FUNCTION public.approve_invoice(p_invoice_id uuid, p_approved_by_email text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE invoices
    SET 
        status = 'approved',
        approved_at = NOW(),
        approved_by_email = p_approved_by_email,
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$;

CREATE FUNCTION public.award_points(p_user_id uuid, p_points integer, p_reason text, p_task_id uuid DEFAULT NULL::uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_current_week_start DATE;
  v_current_month_start DATE;
  v_last_weekly_reset DATE;
  v_last_monthly_reset DATE;
BEGIN
  v_current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  SELECT last_weekly_reset, last_monthly_reset 
  INTO v_last_weekly_reset, v_last_monthly_reset
  FROM user_profiles WHERE user_id = p_user_id;
  
  IF v_last_weekly_reset IS NULL OR v_last_weekly_reset < v_current_week_start THEN
    UPDATE user_profiles SET weekly_points = 0, last_weekly_reset = v_current_week_start WHERE user_id = p_user_id;
  END IF;
  
  IF v_last_monthly_reset IS NULL OR v_last_monthly_reset < v_current_month_start THEN
    UPDATE user_profiles SET monthly_points = 0, last_monthly_reset = v_current_month_start WHERE user_id = p_user_id;
  END IF;
  
  UPDATE user_profiles
  SET total_points = total_points + p_points, weekly_points = weekly_points + p_points, monthly_points = monthly_points + p_points
  WHERE user_id = p_user_id;
  
  INSERT INTO points_history (user_id, points, reason, task_id) VALUES (p_user_id, p_points, p_reason, p_task_id);
END;
$$;

CREATE FUNCTION public.calculate_shift_hours() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_total_seconds INTEGER;
  v_actual_hours NUMERIC;
  v_rounded_hours INTEGER;
BEGIN
  IF NEW.clocked_out_at IS NOT NULL AND (OLD.clocked_out_at IS NULL OR OLD.clocked_out_at IS DISTINCT FROM NEW.clocked_out_at) THEN
    v_total_seconds := EXTRACT(EPOCH FROM (NEW.clocked_out_at - NEW.clocked_in_at))::INTEGER;
    v_actual_hours := v_total_seconds / 3600.0;
    v_rounded_hours := ROUND(v_actual_hours);
    NEW.actual_hours := v_actual_hours;
    NEW.rounded_hours := v_rounded_hours;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.calculate_task_points(p_task_type text, p_task_priority text, p_focus_score integer, p_goal_duration_minutes integer, p_actual_duration_minutes integer, p_task_enjoyment integer, p_mood_answered boolean, p_energy_answered boolean, p_enjoyment_answered boolean) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE v_points INTEGER := 0;
BEGIN
  CASE p_task_type
    WHEN 'Quick Task' THEN v_points := v_points + 3;
    WHEN 'Standard Task' THEN v_points := v_points + 5;
    WHEN 'Deep Work Task' THEN v_points := v_points + 10;
    WHEN 'Long Task' THEN v_points := v_points + 12;
    WHEN 'Very Long Task' THEN v_points := v_points + 15;
    ELSE v_points := v_points + 3;
  END CASE;
  
  CASE p_task_priority
    WHEN 'Immediate Impact Task' THEN v_points := v_points + 5;
    WHEN 'Daily Task' THEN v_points := v_points + 3;
    WHEN 'Weekly Task' THEN v_points := v_points + 2;
    WHEN 'Monthly Task' THEN v_points := v_points + 1;
    WHEN 'Evergreen Task' THEN v_points := v_points + 1;
    WHEN 'Trigger Task' THEN v_points := v_points + 3;
  END CASE;
  
  IF p_focus_score >= 90 THEN v_points := v_points + 5;
  ELSIF p_focus_score >= 75 THEN v_points := v_points + 3;
  END IF;
  
  IF p_goal_duration_minutes > 0 AND p_actual_duration_minutes > 0 THEN
    IF ABS(p_actual_duration_minutes - p_goal_duration_minutes) / p_goal_duration_minutes * 100 <= 20 THEN
      v_points := v_points + 3;
    END IF;
  END IF;
  
  IF p_mood_answered THEN v_points := v_points + 2; END IF;
  IF p_energy_answered THEN v_points := v_points + 2; END IF;
  IF p_enjoyment_answered THEN v_points := v_points + 1; END IF;
  IF p_task_enjoyment >= 4 THEN v_points := v_points + 2; END IF;
  
  RETURN v_points;
END;
$$;

CREATE FUNCTION public.create_admin_notification(p_type text, p_title text, p_message text, p_user_id uuid, p_user_name text, p_related_id uuid DEFAULT NULL::uuid, p_redirect_url text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO admin_notifications (
        type, title, message, user_id, user_name, related_id, redirect_url
    ) VALUES (
        p_type, p_title, p_message, p_user_id, p_user_name, p_related_id, p_redirect_url
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

CREATE FUNCTION public.create_eod_user_simple(p_email text, p_first_name text, p_last_name text, p_role text DEFAULT 'eod_user'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
declare
  v_user_id uuid;
  v_result json;
begin
  -- Check if caller is admin
  if not exists (
    select 1 from public.user_profiles 
    where user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Only admins can create EOD users';
  end if;

  -- Check if user already exists in auth.users
  select id into v_user_id
  from auth.users
  where email = p_email;

  if v_user_id is not null then
    -- User exists in auth, just create/update profile
    insert into public.user_profiles (user_id, email, first_name, last_name, role, is_active)
    values (v_user_id, p_email, p_first_name, p_last_name, p_role, true)
    on conflict (user_id) do update
    set first_name = p_first_name,
        last_name = p_last_name,
        role = p_role,
        is_active = true;

    v_result := json_build_object(
      'success', true,
      'message', 'User profile created/updated. User already has auth account.',
      'user_id', v_user_id
    );
  else
    -- User doesn't exist - they need to sign up first
    v_result := json_build_object(
      'success', false,
      'message', 'User must sign up at /eod-login first, then you can assign their role here.',
      'email', p_email
    );
  end if;

  return v_result;
end;
$$;

CREATE FUNCTION public.generate_invoice_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    new_number TEXT;
    year_month TEXT;
    sequence_num INTEGER;
BEGIN
    -- Format: INV-YYYYMM-0001
    year_month := TO_CHAR(NOW(), 'YYYYMM');
    
    -- Get the next sequence number for this month
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 12) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || year_month || '-%';
    
    -- Generate the invoice number
    new_number := 'INV-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$;

CREATE FUNCTION public.generate_share_token() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  token TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 12-character token
    token := encode(gen_random_bytes(9), 'base64');
    token := replace(replace(replace(token, '/', '_'), '+', '-'), '=', '');
    token := substring(token, 1, 12);
    
    -- Check if token exists
    SELECT EXISTS(SELECT 1 FROM eod_shareable_reports WHERE share_token = token) INTO exists;
    
    EXIT WHEN NOT exists;
  END LOOP;
  
  RETURN token;
END;
$$;

CREATE FUNCTION public.get_all_users_for_eod() RETURNS TABLE(id uuid, email text, full_name text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    COALESCE(
      NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''),
      u.email::TEXT,
      'Unknown User'
    ) as full_name
  FROM auth.users u
  LEFT JOIN public.user_profiles up ON u.id = up.user_id
  WHERE u.deleted_at IS NULL
  ORDER BY u.email;
END;
$$;

CREATE FUNCTION public.get_daily_survey_stats(p_user_id uuid, p_date date DEFAULT CURRENT_DATE) RETURNS TABLE(mood_answered integer, mood_missed integer, energy_answered integer, energy_missed integer, total_points_earned integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  v_start_time := p_date::TIMESTAMPTZ;
  v_end_time := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE type = 'mood' AND responded)::INTEGER as mood_answered,
    COUNT(*) FILTER (WHERE type = 'mood' AND NOT responded)::INTEGER as mood_missed,
    COUNT(*) FILTER (WHERE type = 'energy' AND responded)::INTEGER as energy_answered,
    COUNT(*) FILTER (WHERE type = 'energy' AND NOT responded)::INTEGER as energy_missed,
    (COUNT(*) FILTER (WHERE responded) * 2)::INTEGER as total_points_earned
  FROM survey_events
  WHERE user_id = p_user_id
    AND timestamp >= v_start_time
    AND timestamp < v_end_time;
END;
$$;

CREATE FUNCTION public.get_monthly_summary(p_user_id uuid, p_year integer, p_month integer) RETURNS TABLE(total_tasks integer, completed_tasks integer, total_active_hours numeric, total_shift_hours numeric, avg_efficiency integer, avg_completion integer, avg_focus integer, avg_velocity integer, avg_rhythm integer, avg_energy integer, avg_utilization integer, avg_momentum integer, avg_consistency integer, total_points integer, days_worked integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total_tasks), 0)::INTEGER as total_tasks,
    COALESCE(SUM(s.completed_tasks), 0)::INTEGER as completed_tasks,
    COALESCE(SUM(s.total_active_time) / 3600.0, 0)::NUMERIC as total_active_hours,
    COALESCE(SUM(s.total_shift_hours), 0)::NUMERIC as total_shift_hours,
    COALESCE(AVG(s.efficiency_score), 0)::INTEGER as avg_efficiency,
    COALESCE(AVG(s.completion_rate), 0)::INTEGER as avg_completion,
    COALESCE(AVG(s.focus_index), 0)::INTEGER as avg_focus,
    COALESCE(AVG(s.task_velocity), 0)::INTEGER as avg_velocity,
    COALESCE(AVG(s.work_rhythm), 0)::INTEGER as avg_rhythm,
    COALESCE(AVG(s.energy_level), 0)::INTEGER as avg_energy,
    COALESCE(AVG(s.time_utilization), 0)::INTEGER as avg_utilization,
    COALESCE(AVG(s.productivity_momentum), 0)::INTEGER as avg_momentum,
    COALESCE(AVG(s.consistency_score), 0)::INTEGER as avg_consistency,
    COALESCE(SUM(s.points_earned), 0)::INTEGER as total_points,
    COUNT(*)::INTEGER as days_worked
  FROM public.smart_dar_snapshots s
  WHERE s.user_id = p_user_id
    AND EXTRACT(YEAR FROM s.snapshot_date) = p_year
    AND EXTRACT(MONTH FROM s.snapshot_date) = p_month;
END;
$$;

CREATE FUNCTION public.get_survey_miss_rate(p_user_id uuid, p_start_date timestamp with time zone DEFAULT CURRENT_DATE, p_end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(total_surveys integer, missed_surveys integer, answered_surveys integer, miss_rate numeric, engagement_penalty boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_surveys,
    COUNT(*) FILTER (WHERE NOT responded)::INTEGER as missed_surveys,
    COUNT(*) FILTER (WHERE responded)::INTEGER as answered_surveys,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND(COUNT(*) FILTER (WHERE NOT responded)::NUMERIC / COUNT(*)::NUMERIC, 2)
      ELSE 0
    END as miss_rate,
    CASE 
      WHEN COUNT(*) > 0 AND 
           COUNT(*) FILTER (WHERE NOT responded)::NUMERIC / COUNT(*)::NUMERIC >= 0.5 
      THEN true
      ELSE false
    END as engagement_penalty
  FROM survey_events
  WHERE user_id = p_user_id
    AND timestamp >= p_start_date
    AND timestamp <= p_end_date;
END;
$$;

CREATE FUNCTION public.get_unread_notification_count(p_user_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM notification_log
    WHERE user_id = p_user_id
      AND is_read = FALSE
      AND created_at >= CURRENT_DATE; -- Only today's notifications
    
    RETURN v_count;
END;
$$;

CREATE FUNCTION public.get_user_points_summary(p_user_id uuid) RETURNS TABLE(total_points integer, weekly_points integer, monthly_points integer, points_today integer, recent_history jsonb)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.total_points,
    up.weekly_points,
    up.monthly_points,
    COALESCE((SELECT SUM(points) FROM points_history WHERE user_id = p_user_id AND DATE(timestamp) = CURRENT_DATE), 0)::INTEGER AS points_today,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'timestamp', timestamp, 'points', points, 'reason', reason, 'task_id', task_id) ORDER BY timestamp DESC) FROM (SELECT * FROM points_history WHERE user_id = p_user_id ORDER BY timestamp DESC LIMIT 10) recent), '[]'::jsonb) AS recent_history
  FROM user_profiles up WHERE up.user_id = p_user_id;
END;
$$;

CREATE FUNCTION public.get_user_profile_id() RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  profile_id UUID;
BEGIN
  SELECT id INTO profile_id
  FROM public.user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN profile_id;
END;
$$;

CREATE FUNCTION public.get_user_role() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
  
  RETURN user_role;
END;
$$;

CREATE FUNCTION public.get_weekly_summary(p_user_id uuid, p_week_start date) RETURNS TABLE(total_tasks integer, completed_tasks integer, total_active_hours numeric, total_shift_hours numeric, avg_efficiency integer, avg_completion integer, avg_focus integer, avg_velocity integer, avg_rhythm integer, avg_energy integer, avg_utilization integer, avg_momentum integer, avg_consistency integer, total_points integer, days_worked integer)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(s.total_tasks), 0)::INTEGER as total_tasks,
    COALESCE(SUM(s.completed_tasks), 0)::INTEGER as completed_tasks,
    COALESCE(SUM(s.total_active_time) / 3600.0, 0)::NUMERIC as total_active_hours,
    COALESCE(SUM(s.total_shift_hours), 0)::NUMERIC as total_shift_hours,
    COALESCE(AVG(s.efficiency_score), 0)::INTEGER as avg_efficiency,
    COALESCE(AVG(s.completion_rate), 0)::INTEGER as avg_completion,
    COALESCE(AVG(s.focus_index), 0)::INTEGER as avg_focus,
    COALESCE(AVG(s.task_velocity), 0)::INTEGER as avg_velocity,
    COALESCE(AVG(s.work_rhythm), 0)::INTEGER as avg_rhythm,
    COALESCE(AVG(s.energy_level), 0)::INTEGER as avg_energy,
    COALESCE(AVG(s.time_utilization), 0)::INTEGER as avg_utilization,
    COALESCE(AVG(s.productivity_momentum), 0)::INTEGER as avg_momentum,
    COALESCE(AVG(s.consistency_score), 0)::INTEGER as avg_consistency,
    COALESCE(SUM(s.points_earned), 0)::INTEGER as total_points,
    COUNT(*)::INTEGER as days_worked
  FROM public.smart_dar_snapshots s
  WHERE s.user_id = p_user_id
    AND s.snapshot_date >= p_week_start
    AND s.snapshot_date < p_week_start + INTERVAL '7 days';
END;
$$;

CREATE FUNCTION public.increment_group_unread_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Increment unread count for all members except the sender
  UPDATE public.group_chat_members
  SET unread_count = unread_count + 1
  WHERE group_id = NEW.group_id
    AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.increment_unread_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Increment unread count for all participants except the sender
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.is_account_manager() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (SELECT role = 'manager' FROM public.user_profiles WHERE user_id = auth.uid());
END;
$$;

CREATE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (SELECT role = 'admin' FROM public.user_profiles WHERE user_id = auth.uid());
END;
$$;

CREATE FUNCTION public.is_operator() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (SELECT role = 'eod_user' FROM public.user_profiles WHERE user_id = auth.uid());
END;
$$;

CREATE FUNCTION public.is_sales_rep() RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN (SELECT role = 'rep' FROM public.user_profiles WHERE user_id = auth.uid());
END;
$$;

CREATE FUNCTION public.log_notification(p_user_id uuid, p_message text, p_type text, p_category text DEFAULT NULL::text, p_related_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO notification_log (
        user_id,
        message,
        type,
        category,
        related_id,
        metadata
    ) VALUES (
        p_user_id,
        p_message,
        p_type,
        p_category,
        p_related_id,
        p_metadata
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

CREATE FUNCTION public.mark_conversation_read(conversation_uuid uuid, user_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.conversation_participants
  SET unread_count = 0,
      last_read_at = NOW()
  WHERE conversation_id = conversation_uuid
    AND user_id = user_uuid;
END;
$$;

CREATE FUNCTION public.mark_group_chat_read(group_uuid uuid, user_uuid uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.group_chat_members
  SET unread_count = 0,
      last_read_at = NOW()
  WHERE group_id = group_uuid
    AND user_id = user_uuid;
END;
$$;

CREATE FUNCTION public.notify_clock_in() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_name TEXT;
    v_message TEXT;
BEGIN
    -- Only notify on new clock-ins (not updates)
    IF NEW.clocked_in_at IS NOT NULL AND (OLD IS NULL OR OLD.clocked_in_at IS NULL) THEN
        -- Get user name (with fallback)
        SELECT COALESCE(
            NULLIF(CONCAT(first_name, ' ', last_name), ' '),
            (SELECT email FROM auth.users WHERE id = NEW.user_id),
            'Unknown User'
        ) INTO v_user_name
        FROM user_profiles
        WHERE user_id = NEW.user_id;
        
        -- Fallback if no profile exists
        IF v_user_name IS NULL THEN
            SELECT COALESCE(email, 'Unknown User') INTO v_user_name
            FROM auth.users WHERE id = NEW.user_id;
        END IF;
        
        -- Build message safely
        v_message := COALESCE(v_user_name, 'A user') || ' clocked in for ' || COALESCE(NEW.client_name, 'Unknown Client');
        
        -- Create notification
        PERFORM create_admin_notification(
            'clock_in',
            'User Clocked In',
            v_message,
            NEW.user_id,
            COALESCE(v_user_name, 'Unknown User'),
            NEW.id,
            '/admin?tab=live'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.notify_new_feedback() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_name TEXT;
    v_message TEXT;
BEGIN
    -- Only notify on new feedback
    IF OLD IS NULL THEN
        -- Get user name (with fallback)
        SELECT COALESCE(
            NULLIF(CONCAT(first_name, ' ', last_name), ' '),
            (SELECT email FROM auth.users WHERE id = NEW.user_id),
            'Unknown User'
        ) INTO v_user_name
        FROM user_profiles
        WHERE user_id = NEW.user_id;
        
        -- Fallback if no profile exists
        IF v_user_name IS NULL THEN
            SELECT COALESCE(email, 'Unknown User') INTO v_user_name
            FROM auth.users WHERE id = NEW.user_id;
        END IF;
        
        -- Build message safely
        v_message := COALESCE(v_user_name, 'A user') || ' submitted feedback: ' || COALESCE(NEW.subject, 'No subject');
        
        -- Create notification
        PERFORM create_admin_notification(
            'feedback',
            'New Feedback Received',
            v_message,
            NEW.user_id,
            COALESCE(v_user_name, 'Unknown User'),
            NEW.id,
            '/admin?tab=feedback'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.notify_task_started() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
    v_user_name TEXT;
    v_client_name TEXT;
    v_message TEXT;
BEGIN
    -- Only notify when a task is started (started_at is set and ended_at is null)
    IF NEW.started_at IS NOT NULL AND NEW.ended_at IS NULL AND (OLD.started_at IS NULL OR OLD IS NULL) THEN
        -- Get user name (with fallback to email or 'Unknown User')
        SELECT COALESCE(
            NULLIF(CONCAT(first_name, ' ', last_name), ' '),
            (SELECT email FROM auth.users WHERE id = NEW.user_id),
            'Unknown User'
        ) INTO v_user_name
        FROM user_profiles
        WHERE user_id = NEW.user_id;
        
        -- Fallback if no profile exists
        IF v_user_name IS NULL THEN
            SELECT COALESCE(email, 'Unknown User') INTO v_user_name
            FROM auth.users WHERE id = NEW.user_id;
        END IF;
        
        -- Get client name from the entry
        v_client_name := COALESCE(NEW.client_name, 'Unknown Client');
        
        -- Build message safely
        v_message := COALESCE(v_user_name, 'A user') || ' started working on: ' || COALESCE(NEW.task_description, 'a task') || ' for ' || v_client_name;
        
        -- Create notification
        PERFORM create_admin_notification(
            'task_started',
            'New Task Started',
            v_message,
            NEW.user_id,
            COALESCE(v_user_name, 'Unknown User'),
            NEW.id,
            '/admin?tab=live'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.reject_invoice(p_invoice_id uuid, p_rejected_by_email text, p_notes text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    UPDATE invoices
    SET 
        status = 'rejected',
        approved_by_email = p_rejected_by_email,
        notes = COALESCE(p_notes, notes),
        updated_at = NOW()
    WHERE id = p_invoice_id;
END;
$$;

CREATE FUNCTION public.set_admin_role_on_signup() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if new.email in ('lukejason05@gmail.com', 'admin@stafflyhq.ai') then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

CREATE FUNCTION public.trigger_award_task_points() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
$$;

CREATE FUNCTION public.trigger_recalculate_points_on_enjoyment() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
      COALESCE(NEW.task_type, 'Standard Task'),
      COALESCE(NEW.task_priority, 'Daily Task'),
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
        'Enjoyment Bonus: ' || LEFT(NEW.task_description, 40),
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_am_meetings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_contact_last_contacted_from_call() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update the contact's last_contacted_at if the call has a related contact
  IF NEW.related_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_contacted_at = COALESCE(NEW.call_timestamp, NOW())
    WHERE id = NEW.related_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_contact_last_contacted_from_email() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update the contact's last_contacted_at if the email has a related contact
  IF NEW.related_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_contacted_at = COALESCE(NEW.sent_at, NOW())
    WHERE id = NEW.related_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_eod_report_hours() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE v_clock_in_data RECORD;
BEGIN
  SELECT actual_hours, rounded_hours INTO v_clock_in_data
  FROM eod_clock_ins WHERE user_id = NEW.user_id AND DATE(clocked_in_at) = DATE(NEW.created_at)
  ORDER BY clocked_in_at DESC LIMIT 1;
  
  IF v_clock_in_data IS NOT NULL THEN
    NEW.actual_hours := v_clock_in_data.actual_hours;
    NEW.rounded_hours := v_clock_in_data.rounded_hours;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_invoice_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_meetings_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_recurring_templates_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_smart_dar_snapshot_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_survey_count(p_user_id uuid, p_answered boolean) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
    -- Reset counts if it's a new day
    UPDATE user_profiles
    SET 
        survey_answered_count = 0,
        survey_missed_count = 0,
        last_survey_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id
      AND last_survey_reset_date < CURRENT_DATE;
    
    -- Update the appropriate count
    IF p_answered THEN
        UPDATE user_profiles
        SET survey_answered_count = survey_answered_count + 1
        WHERE user_id = p_user_id;
    ELSE
        UPDATE user_profiles
        SET survey_missed_count = survey_missed_count + 1
        WHERE user_id = p_user_id;
    END IF;
END;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE FUNCTION public.validate_pipeline_stages() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Basic validation: ensure stages is an array
  IF NEW.stages IS NOT NULL AND jsonb_typeof(NEW.stages) != 'array' THEN
    RAISE EXCEPTION 'stages must be a JSON array';
  END IF;
  
  -- Basic validation: ensure stage_order is an array
  IF NEW.stage_order IS NOT NULL AND jsonb_typeof(NEW.stage_order) != 'array' THEN
    RAISE EXCEPTION 'stage_order must be a JSON array';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()\nRETURNS TRIGGER AS $$\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()\nRETURNS trigger\nLANGUAGE plpgsql\nSECURITY DEFINER\nSET search_path = public\nAS $function$\nBEGIN\n  NEW.updated_at = NOW();\n  RETURN NEW;\nEND;\n$function$;"}		tools@stafflyhq.ai	\N
20250921020458	{"-- Insert simplified test data with correct enum values\n\n-- Insert test companies\nINSERT INTO companies (name, website, phone, address, industry, employees_count, city, state, country, timezone, description, linkedin_url) VALUES\n('TechCorp Inc.', 'https://techcorp.com', '+1-555-0101', '123 Tech St, Suite 100', 'Technology', 250, 'San Francisco', 'CA', 'USA', 'America/Los_Angeles', 'Leading technology solutions provider', 'https://linkedin.com/company/techcorp'),\n('Global Solutions Ltd.', 'https://globalsolutions.com', '+1-555-0102', '456 Business Ave', 'Consulting', 150, 'New York', 'NY', 'USA', 'America/New_York', 'International business consulting firm', 'https://linkedin.com/company/globalsolutions'),\n('StartupHub Co.', 'https://startuphub.com', '+1-555-0103', '789 Innovation Dr', 'Software', 50, 'Austin', 'TX', 'USA', 'America/Chicago', 'Early stage startup accelerator', 'https://linkedin.com/company/startuphub');\n\n-- Insert test contacts linked to companies\nINSERT INTO contacts (first_name, last_name, email, phone, mobile, secondary_phone, city, state, country, timezone, company_id, lifecycle_stage, last_contacted_at) VALUES\n('John', 'Smith', 'john.smith@techcorp.com', '+1-555-1001', '+1-555-1002', '+1-555-1003', 'San Francisco', 'CA', 'USA', 'America/Los_Angeles', (SELECT id FROM companies WHERE name = 'TechCorp Inc.' LIMIT 1), 'qualified', '2024-01-15 14:30:00'),\n('Sarah', 'Johnson', 'sarah.johnson@globalsolutions.com', '+1-555-1004', '+1-555-1005', NULL, 'New York', 'NY', 'USA', 'America/New_York', (SELECT id FROM companies WHERE name = 'Global Solutions Ltd.' LIMIT 1), 'prospect', '2024-01-14 10:15:00'),\n('Mike', 'Davis', 'mike.davis@startuphub.com', '+1-555-1006', '+1-555-1007', NULL, 'Austin', 'TX', 'USA', 'America/Chicago', (SELECT id FROM companies WHERE name = 'StartupHub Co.' LIMIT 1), 'lead', '2024-01-13 16:45:00');\n\n-- Insert test deals with correct enum values (using only 'open' status for now)\nINSERT INTO deals (name, amount, stage, priority, deal_status, close_date, timezone, currency, description, source, company_id, primary_contact_id, income_amount, contact_attempts, last_contact_date) VALUES\n('TechCorp Integration Project', 85000, 'strategy call booked', 'high', 'open', '2024-02-15', 'America/Los_Angeles', 'USD', 'Large scale integration project for TechCorp platform architecture', 'Website', (SELECT id FROM companies WHERE name = 'TechCorp Inc.' LIMIT 1), (SELECT id FROM contacts WHERE email = 'john.smith@techcorp.com' LIMIT 1), 100000, 3, '2024-01-15 14:30:00'),\n('Global Solutions Consulting', 45000, 'proposal / scope', 'medium', 'open', '2024-02-28', 'America/New_York', 'USD', 'Strategic consulting engagement for digital transformation', 'Referral', (SELECT id FROM companies WHERE name = 'Global Solutions Ltd.' LIMIT 1), (SELECT id FROM contacts WHERE email = 'sarah.johnson@globalsolutions.com' LIMIT 1), 60000, 2, '2024-01-14 10:15:00'),\n('StartupHub MVP Development', 25000, 'nurturing', 'low', 'open', '2024-03-10', 'America/Chicago', 'USD', 'MVP development for new startup in the accelerator program', 'Cold Outbound', (SELECT id FROM companies WHERE name = 'StartupHub Co.' LIMIT 1), (SELECT id FROM contacts WHERE email = 'mike.davis@startuphub.com' LIMIT 1), 35000, 1, '2024-01-13 16:45:00');\n\n-- Insert test tasks\nINSERT INTO tasks (title, description, status, priority, due_date, deal_id, contact_id, company_id, notes) VALUES\n('Follow up on TechCorp proposal', 'Call John Smith to discuss the integration project timeline and answer any questions', 'pending', 'high', '2024-01-16 10:00:00', (SELECT id FROM deals WHERE name = 'TechCorp Integration Project' LIMIT 1), (SELECT id FROM contacts WHERE email = 'john.smith@techcorp.com' LIMIT 1), (SELECT id FROM companies WHERE name = 'TechCorp Inc.' LIMIT 1), 'Focus on timeline and technical requirements'),\n('Send contract to Global Solutions', 'Prepare and send signed contract for consulting engagement', 'pending', 'medium', '2024-01-17 14:00:00', (SELECT id FROM deals WHERE name = 'Global Solutions Consulting' LIMIT 1), (SELECT id FROM contacts WHERE email = 'sarah.johnson@globalsolutions.com' LIMIT 1), (SELECT id FROM companies WHERE name = 'Global Solutions Ltd.' LIMIT 1), 'Include SOW and payment terms'),\n('Schedule demo for StartupHub', 'Set up product demo for the MVP development project', 'pending', 'low', '2024-01-19 15:00:00', (SELECT id FROM deals WHERE name = 'StartupHub MVP Development' LIMIT 1), (SELECT id FROM contacts WHERE email = 'mike.davis@startuphub.com' LIMIT 1), (SELECT id FROM companies WHERE name = 'StartupHub Co.' LIMIT 1), 'Show core features and customization options'),\n('Cold outreach - Tech sector', 'Reach out to 10 potential tech companies this week', 'pending', 'medium', '2024-01-22 09:00:00', NULL, NULL, NULL, 'Focus on companies with 100-500 employees'),\n('Update CRM data', 'Clean up and update contact information in the database', 'pending', 'low', '2024-01-25 16:00:00', NULL, NULL, NULL, 'Remove duplicates and verify email addresses');"}		tools@stafflyhq.ai	\N
20250928080619	{"-- Create storage bucket for deal attachments\nINSERT INTO storage.buckets (id, name, public) \nVALUES ('deal-attachments', 'deal-attachments', false);\n\n-- Create policies for deal attachments bucket\nCREATE POLICY \\"Users can view their own deal attachments\\" \nON storage.objects \nFOR SELECT \nUSING (bucket_id = 'deal-attachments');\n\nCREATE POLICY \\"Users can upload deal attachments\\" \nON storage.objects \nFOR INSERT \nWITH CHECK (bucket_id = 'deal-attachments');\n\nCREATE POLICY \\"Users can update their own deal attachments\\" \nON storage.objects \nFOR UPDATE \nUSING (bucket_id = 'deal-attachments');\n\nCREATE POLICY \\"Users can delete their own deal attachments\\" \nON storage.objects \nFOR DELETE \nUSING (bucket_id = 'deal-attachments');"}		tools@stafflyhq.ai	\N
20250928082631	{"-- Make the deal-attachments bucket public so images can be displayed\nUPDATE storage.buckets \nSET public = true \nWHERE id = 'deal-attachments';"}		tools@stafflyhq.ai	\N
20251001120846	{"-- Extend calls table with Dialpad-specific fields\nALTER TABLE public.calls\nADD COLUMN IF NOT EXISTS dialpad_call_id TEXT UNIQUE,\nADD COLUMN IF NOT EXISTS recording_url TEXT,\nADD COLUMN IF NOT EXISTS transcript TEXT,\nADD COLUMN IF NOT EXISTS dialpad_contact_id TEXT,\nADD COLUMN IF NOT EXISTS call_direction TEXT CHECK (call_direction IN ('inbound', 'outbound')),\nADD COLUMN IF NOT EXISTS caller_number TEXT,\nADD COLUMN IF NOT EXISTS callee_number TEXT,\nADD COLUMN IF NOT EXISTS call_status TEXT DEFAULT 'completed',\nADD COLUMN IF NOT EXISTS dialpad_metadata JSONB DEFAULT '{}'::jsonb;\n\n-- Create index for faster lookups by Dialpad call ID\nCREATE INDEX IF NOT EXISTS idx_calls_dialpad_call_id ON public.calls(dialpad_call_id);\n\n-- Create index for call direction filtering\nCREATE INDEX IF NOT EXISTS idx_calls_direction ON public.calls(call_direction);\n\n-- Create webhooks table to track Dialpad webhook events\nCREATE TABLE IF NOT EXISTS public.dialpad_webhooks (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  event_type TEXT NOT NULL,\n  event_id TEXT UNIQUE NOT NULL,\n  payload JSONB NOT NULL,\n  processed BOOLEAN DEFAULT false,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),\n  processed_at TIMESTAMP WITH TIME ZONE\n);\n\n-- Enable RLS on webhooks table\nALTER TABLE public.dialpad_webhooks ENABLE ROW LEVEL SECURITY;\n\n-- Create policies for webhooks\nCREATE POLICY \\"Users can view all webhooks\\"\n  ON public.dialpad_webhooks\n  FOR SELECT\n  USING (true);\n\n-- Create index for webhook processing\nCREATE INDEX IF NOT EXISTS idx_webhooks_processed ON public.dialpad_webhooks(processed, created_at);\nCREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON public.dialpad_webhooks(event_id);"}		tools@stafflyhq.ai	\N
20251001121740	{"-- Enable pg_cron and pg_net extensions for scheduled tasks\nCREATE EXTENSION IF NOT EXISTS pg_cron;\nCREATE EXTENSION IF NOT EXISTS pg_net;\n\n-- Schedule automatic Dialpad sync every hour\nSELECT cron.schedule(\n  'dialpad-hourly-sync',\n  '0 * * * *', -- Every hour at minute 0\n  $$\n  SELECT\n    net.http_post(\n      url:='https://qzxuhefnyskdtdfrcrtg.supabase.co/functions/v1/dialpad-sync',\n      headers:='{\\"Content-Type\\": \\"application/json\\", \\"Authorization\\": \\"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6eHVoZWZueXNrZHRkZnJjcnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3MDkwNjMsImV4cCI6MjA3MzI4NTA2M30.bWxU18LllaPPksIDSPsuHaj785EVWHcoEZj8jfLFoXQ\\"}'::jsonb,\n      body:='{\\"limit\\": 100, \\"start_time\\": \\"2024-01-01T00:00:00Z\\"}'::jsonb\n    ) as request_id;\n  $$\n);


-- TRIGGERS (63)
-- -------------------------------------------

CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';

CREATE TRIGGER update_companies_updated_at\n  BEFORE UPDATE ON public.companies\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at\n  BEFORE UPDATE ON public.contacts\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at\n  BEFORE UPDATE ON public.deals\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calls_updated_at\n  BEFORE UPDATE ON public.calls\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at\n  BEFORE UPDATE ON public.pipelines\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at\n  BEFORE UPDATE ON public.user_profiles\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at\n  BEFORE UPDATE ON public.tasks\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_queues_updated_at\n  BEFORE UPDATE ON public.task_queues\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emails_updated_at\n  BEFORE UPDATE ON public.emails\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at\n  BEFORE UPDATE ON public.meetings\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attachments_updated_at\n  BEFORE UPDATE ON public.attachments\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_line_items_updated_at\n  BEFORE UPDATE ON public.line_items\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_analytics_updated_at\nBEFORE UPDATE ON public.call_analytics\nFOR EACH ROW\nEXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_messages_updated_at\nBEFORE UPDATE ON public.sms_messages\nFOR EACH ROW\nEXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at\n  BEFORE UPDATE ON public.notes\n  FOR EACH ROW\n  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER am_meetings_updated_at_trigger BEFORE UPDATE ON public.account_manager_meetings FOR EACH ROW EXECUTE FUNCTION public.update_am_meetings_updated_at();

CREATE TRIGGER recurring_templates_updated_at BEFORE UPDATE ON public.recurring_task_templates FOR EACH ROW EXECUTE FUNCTION public.update_recurring_templates_updated_at();

CREATE TRIGGER set_admin_role_trigger BEFORE INSERT ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_admin_role_on_signup();

CREATE TRIGGER trg_award_task_points BEFORE UPDATE ON public.eod_time_entries FOR EACH ROW EXECUTE FUNCTION public.trigger_award_task_points();

CREATE TRIGGER trg_calculate_shift_hours BEFORE UPDATE ON public.eod_clock_ins FOR EACH ROW EXECUTE FUNCTION public.calculate_shift_hours();

CREATE TRIGGER trg_recalculate_points_on_enjoyment BEFORE UPDATE ON public.eod_time_entries FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_points_on_enjoyment();

CREATE TRIGGER trg_smart_dar_snapshots_updated BEFORE UPDATE ON public.smart_dar_snapshots FOR EACH ROW EXECUTE FUNCTION public.update_smart_dar_snapshot_timestamp();

CREATE TRIGGER trg_update_eod_report_hours BEFORE INSERT ON public.eod_submissions FOR EACH ROW EXECUTE FUNCTION public.update_eod_report_hours();

CREATE TRIGGER trigger_increment_group_unread AFTER INSERT ON public.group_chat_messages FOR EACH ROW EXECUTE FUNCTION public.increment_group_unread_count();

CREATE TRIGGER trigger_increment_unread AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.increment_unread_count();

CREATE TRIGGER trigger_notify_clock_in AFTER INSERT OR UPDATE ON public.eod_clock_ins FOR EACH ROW EXECUTE FUNCTION public.notify_clock_in();

CREATE TRIGGER trigger_notify_invoice_approved AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_approved();

CREATE TRIGGER trigger_notify_new_feedback AFTER INSERT ON public.user_feedback FOR EACH ROW EXECUTE FUNCTION public.notify_new_feedback();

CREATE TRIGGER trigger_notify_task_started AFTER INSERT OR UPDATE ON public.eod_time_entries FOR EACH ROW EXECUTE FUNCTION public.notify_task_started();

CREATE TRIGGER trigger_update_contact_last_contacted_calls AFTER INSERT ON public.calls FOR EACH ROW EXECUTE FUNCTION public.update_contact_last_contacted_from_call();

CREATE TRIGGER trigger_update_contact_last_contacted_emails AFTER INSERT ON public.emails FOR EACH ROW EXECUTE FUNCTION public.update_contact_last_contacted_from_email();

CREATE TRIGGER trigger_update_invoice_timestamp BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_invoice_updated_at();

CREATE TRIGGER update_attachments_updated_at BEFORE UPDATE ON public.attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_analytics_updated_at BEFORE UPDATE ON public.call_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON public.calls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_emails_updated_at BEFORE UPDATE ON public.emails FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_eod_queue_tasks_updated_at BEFORE UPDATE ON public.eod_queue_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_chats_updated_at BEFORE UPDATE ON public.group_chats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_group_messages_updated_at BEFORE UPDATE ON public.group_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_line_items_updated_at BEFORE UPDATE ON public.line_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_manual_call_logs_updated_at BEFORE UPDATE ON public.manual_call_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON public.meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at BEFORE UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sms_messages_updated_at BEFORE UPDATE ON public.sms_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_queues_updated_at BEFORE UPDATE ON public.task_queues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_pipeline_stages_trigger BEFORE INSERT OR UPDATE ON public.pipelines FOR EACH ROW EXECUTE FUNCTION public.validate_pipeline_stages();

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();

CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


-- RLS POLICIES (282)
-- -------------------------------------------

CREATE POLICY \\"Users can view all companies\\" ON public.companies FOR SELECT USING (true);

CREATE POLICY \\"Users can create companies\\" ON public.companies FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update companies\\" ON public.companies FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete companies\\" ON public.companies FOR DELETE USING (true);

CREATE POLICY \\"Users can view all contacts\\" ON public.contacts FOR SELECT USING (true);

CREATE POLICY \\"Users can create contacts\\" ON public.contacts FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update contacts\\" ON public.contacts FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete contacts\\" ON public.contacts FOR DELETE USING (true);

CREATE POLICY \\"Users can view all deals\\" ON public.deals FOR SELECT USING (true);

CREATE POLICY \\"Users can create deals\\" ON public.deals FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update deals\\" ON public.deals FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete deals\\" ON public.deals FOR DELETE USING (true);

CREATE POLICY \\"Users can view all calls\\" ON public.calls FOR SELECT USING (true);

CREATE POLICY \\"Users can create calls\\" ON public.calls FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update calls\\" ON public.calls FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete calls\\" ON public.calls FOR DELETE USING (true);

CREATE POLICY \\"Users can view all pipelines\\" ON public.pipelines FOR SELECT USING (true);

CREATE POLICY \\"Users can create pipelines\\" ON public.pipelines FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update pipelines\\" ON public.pipelines FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete pipelines\\" ON public.pipelines FOR DELETE USING (true);

CREATE POLICY \\"Users can view all profiles\\" ON public.user_profiles FOR SELECT USING (true);

CREATE POLICY \\"Users can create profiles\\" ON public.user_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update profiles\\" ON public.user_profiles FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete profiles\\" ON public.user_profiles FOR DELETE USING (true);

CREATE POLICY \\"Users can view all tasks\\" ON public.tasks FOR SELECT USING (true);

CREATE POLICY \\"Users can create tasks\\" ON public.tasks FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update tasks\\" ON public.tasks FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete tasks\\" ON public.tasks FOR DELETE USING (true);

CREATE POLICY \\"Users can view all task queues\\" ON public.task_queues FOR SELECT USING (true);

CREATE POLICY \\"Users can create task queues\\" ON public.task_queues FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update task queues\\" ON public.task_queues FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete task queues\\" ON public.task_queues FOR DELETE USING (true);

CREATE POLICY \\"Users can view all emails\\" ON public.emails FOR SELECT USING (true);

CREATE POLICY \\"Users can create emails\\" ON public.emails FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update emails\\" ON public.emails FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete emails\\" ON public.emails FOR DELETE USING (true);

CREATE POLICY \\"Users can view all meetings\\" ON public.meetings FOR SELECT USING (true);

CREATE POLICY \\"Users can create meetings\\" ON public.meetings FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update meetings\\" ON public.meetings FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete meetings\\" ON public.meetings FOR DELETE USING (true);

CREATE POLICY \\"Users can view all attachments\\" ON public.attachments FOR SELECT USING (true);

CREATE POLICY \\"Users can create attachments\\" ON public.attachments FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update attachments\\" ON public.attachments FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete attachments\\" ON public.attachments FOR DELETE USING (true);

CREATE POLICY \\"Users can view all line items\\" ON public.line_items FOR SELECT USING (true);

CREATE POLICY \\"Users can create line items\\" ON public.line_items FOR INSERT WITH CHECK (true);

CREATE POLICY \\"Users can update line items\\" ON public.line_items FOR UPDATE USING (true);

CREATE POLICY \\"Users can delete line items\\" ON public.line_items FOR DELETE USING (true);

CREATE POLICY \\"Users can view their own deal attachments\\" \nON storage.objects \nFOR SELECT \nUSING (bucket_id = 'deal-attachments');

CREATE POLICY \\"Users can upload deal attachments\\" \nON storage.objects \nFOR INSERT \nWITH CHECK (bucket_id = 'deal-attachments');

CREATE POLICY \\"Users can update their own deal attachments\\" \nON storage.objects \nFOR UPDATE \nUSING (bucket_id = 'deal-attachments');

CREATE POLICY \\"Users can delete their own deal attachments\\" \nON storage.objects \nFOR DELETE \nUSING (bucket_id = 'deal-attachments');

CREATE POLICY \\"Users can view all webhooks\\"\n  ON public.dialpad_webhooks\n  FOR SELECT\n  USING (true);

CREATE POLICY \\"Users can view all call analytics\\"\n  ON public.call_analytics\n  FOR SELECT\n  USING (true);

CREATE POLICY \\"Users can create call analytics\\"\n  ON public.call_analytics\n  FOR INSERT\n  WITH CHECK (true);

CREATE POLICY \\"Users can update call analytics\\"\n  ON public.call_analytics\n  FOR UPDATE\n  USING (true);

CREATE POLICY \\"Users can view all SMS messages\\"\n  ON public.sms_messages\n  FOR SELECT\n  USING (true);

CREATE POLICY \\"Users can create SMS messages\\"\n  ON public.sms_messages\n  FOR INSERT\n  WITH CHECK (true);

CREATE POLICY \\"Users can update SMS messages\\"\n  ON public.sms_messages\n  FOR UPDATE\n  USING (true);

CREATE POLICY \\"Users can view all notes\\"\n  ON public.notes FOR SELECT\n  TO authenticated\n  USING (true);

CREATE POLICY \\"Users can create notes\\"\n  ON public.notes FOR INSERT\n  TO authenticated\n  WITH CHECK (true);

CREATE POLICY \\"Users can update notes\\"\n  ON public.notes FOR UPDATE\n  TO authenticated\n  USING (true);

CREATE POLICY \\"Users can delete notes\\"\n  ON public.notes FOR DELETE\n  TO authenticated\n  USING (true);

CREATE POLICY "Account managers can create own meetings" ON public.account_manager_meetings FOR INSERT WITH CHECK ((account_manager_id = auth.uid()));

CREATE POLICY "Account managers can update own meetings" ON public.account_manager_meetings FOR UPDATE USING ((account_manager_id = auth.uid()));

CREATE POLICY "Account managers can view own meetings" ON public.account_manager_meetings FOR SELECT USING ((account_manager_id = auth.uid()));

CREATE POLICY "Admins can delete client assignments" ON public.user_client_assignments FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can delete meetings" ON public.account_manager_meetings FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

CREATE POLICY "Admins can delete notifications." ON public.admin_notifications FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can insert client assignments" ON public.user_client_assignments FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can manage client assignments" ON public.user_client_assignments USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can update all invoices" ON public.invoices FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can update client assignments" ON public.user_client_assignments FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can update feedback" ON public.user_feedback FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can update notifications." ON public.admin_notifications FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all behavior insights" ON public.behavior_insights FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all behavioral insights" ON public.behavioral_insights FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all category distribution" ON public.category_distribution FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all client assignments" ON public.user_client_assignments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all energy entries" ON public.energy_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all feedback" ON public.user_feedback FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all invoice items" ON public.invoice_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all invoices" ON public.invoices FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all monthly growth" ON public.monthly_growth_snapshots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all mood entries" ON public.mood_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all notifications" ON public.notification_log FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all notifications." ON public.admin_notifications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all points history" ON public.points_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all progress trends" ON public.progress_trends FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all snapshots" ON public.smart_dar_snapshots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all streak history" ON public.streak_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all submission images" ON public.eod_submission_images FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all submission tasks" ON public.eod_submission_tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all survey events" ON public.survey_events FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all templates" ON public.recurring_task_templates FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all weekly metrics" ON public.weekly_metrics_snapshots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all weekly progress" ON public.weekly_progress_insights FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Admins can view all work patterns" ON public.work_patterns FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY "Allow all authenticated users full access" ON public.deals USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Anyone can view shareable reports by token" ON public.eod_shareable_reports FOR SELECT USING (true);

CREATE POLICY "Service role can insert snapshots" ON public.smart_dar_snapshots FOR INSERT WITH CHECK (true);

CREATE POLICY "System can insert notifications." ON public.admin_notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "System can manage behavior insights" ON public.behavior_insights USING (true) WITH CHECK (true);

CREATE POLICY "System can manage behavioral insights" ON public.behavioral_insights USING (true) WITH CHECK (true);

CREATE POLICY "System can manage category distribution" ON public.category_distribution USING (true) WITH CHECK (true);

CREATE POLICY "System can manage monthly growth" ON public.monthly_growth_snapshots USING (true) WITH CHECK (true);

CREATE POLICY "System can manage progress trends" ON public.progress_trends USING (true) WITH CHECK (true);

CREATE POLICY "System can manage weekly metrics" ON public.weekly_metrics_snapshots USING (true) WITH CHECK (true);

CREATE POLICY "System can manage weekly progress" ON public.weekly_progress_insights USING (true) WITH CHECK (true);

CREATE POLICY "System can manage work patterns" ON public.work_patterns USING (true) WITH CHECK (true);

CREATE POLICY "Users can create SMS messages" ON public.sms_messages FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create attachments" ON public.attachments FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create call analytics" ON public.call_analytics FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create calls" ON public.calls FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can create companies" ON public.companies FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can create contacts" ON public.contacts FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can create emails" ON public.emails FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create feedback" ON public.user_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can create line items" ON public.line_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create manual call logs" ON public.manual_call_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create meetings" ON public.meetings FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can create pipelines" ON public.pipelines FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create profiles" ON public.user_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create report shares" ON public.eod_report_shares FOR INSERT WITH CHECK ((shared_by = auth.uid()));

CREATE POLICY "Users can create shareable reports" ON public.eod_shareable_reports FOR INSERT WITH CHECK ((created_by = auth.uid()));

CREATE POLICY "Users can create task queues" ON public.task_queues FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can create their own invoice items" ON public.invoice_items FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.user_id = auth.uid())))));

CREATE POLICY "Users can create their own invoices" ON public.invoices FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can delete attachments" ON public.attachments FOR DELETE USING (true);

CREATE POLICY "Users can delete calls" ON public.calls FOR DELETE USING (true);

CREATE POLICY "Users can delete companies" ON public.companies FOR DELETE USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can delete contacts" ON public.contacts FOR DELETE USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can delete emails" ON public.emails FOR DELETE USING (true);

CREATE POLICY "Users can delete line items" ON public.line_items FOR DELETE USING (true);

CREATE POLICY "Users can delete manual call logs" ON public.manual_call_logs FOR DELETE USING (true);

CREATE POLICY "Users can delete meetings" ON public.meetings FOR DELETE USING (true);

CREATE POLICY "Users can delete notes" ON public.notes FOR DELETE TO authenticated USING (true);

CREATE POLICY "Users can delete pipelines" ON public.pipelines FOR DELETE USING (true);

CREATE POLICY "Users can delete profiles" ON public.user_profiles FOR DELETE USING (true);

CREATE POLICY "Users can delete task queues" ON public.task_queues FOR DELETE USING (true);

CREATE POLICY "Users can delete tasks" ON public.tasks FOR DELETE USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can delete their own comment images" ON public.eod_task_comment_images FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (public.eod_submission_tasks t
     JOIN public.eod_submissions s ON ((t.submission_id = s.id)))
  WHERE ((t.id = eod_task_comment_images.task_id) AND (s.user_id = auth.uid())))));

CREATE POLICY "Users can delete their own queue tasks." ON public.eod_queue_tasks FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Users can delete their own templates" ON public.recurring_task_templates FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY "Users can insert own clock-ins" ON public.eod_clock_ins FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own energy entries" ON public.energy_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own mood entries" ON public.mood_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own notifications" ON public.notification_log FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own points history" ON public.points_history FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own snapshots" ON public.smart_dar_snapshots FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own streak history" ON public.streak_history FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own submission images" ON public.eod_submission_images FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.eod_submissions
  WHERE ((eod_submissions.id = eod_submission_images.submission_id) AND (eod_submissions.user_id = auth.uid())))));

CREATE POLICY "Users can insert own submission tasks" ON public.eod_submission_tasks FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.eod_submissions
  WHERE ((eod_submissions.id = eod_submission_tasks.submission_id) AND (eod_submissions.user_id = auth.uid())))));

CREATE POLICY "Users can insert own submissions" ON public.eod_submissions FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert own survey events" ON public.survey_events FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own comment images" ON public.eod_task_comment_images FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.eod_submission_tasks t
     JOIN public.eod_submissions s ON ((t.submission_id = s.id)))
  WHERE ((t.id = eod_task_comment_images.task_id) AND (s.user_id = auth.uid())))));

CREATE POLICY "Users can insert their own energy entries" ON public.energy_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own mood entries" ON public.mood_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own queue tasks." ON public.eod_queue_tasks FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own submissions" ON public.eod_submissions FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can insert their own templates" ON public.recurring_task_templates FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can manage own EOD reports" ON public.eod_reports USING (((user_id = auth.uid()) OR (auth.uid() IS NOT NULL)));

CREATE POLICY "Users can manage own templates" ON public.recurring_task_templates USING ((auth.uid() = user_id));

CREATE POLICY "Users can manage profiles" ON public.user_profiles USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can update SMS messages" ON public.sms_messages FOR UPDATE USING (true);

CREATE POLICY "Users can update attachments" ON public.attachments FOR UPDATE USING (true);

CREATE POLICY "Users can update call analytics" ON public.call_analytics FOR UPDATE USING (true);

CREATE POLICY "Users can update calls" ON public.calls FOR UPDATE USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can update companies" ON public.companies FOR UPDATE USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can update contacts" ON public.contacts FOR UPDATE USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can update emails" ON public.emails FOR UPDATE USING (true);

CREATE POLICY "Users can update line items" ON public.line_items FOR UPDATE USING (true);

CREATE POLICY "Users can update manual call logs" ON public.manual_call_logs FOR UPDATE USING (true);

CREATE POLICY "Users can update meetings" ON public.meetings FOR UPDATE USING (true);

CREATE POLICY "Users can update notes" ON public.notes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can update own clock-ins" ON public.eod_clock_ins FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own notifications" ON public.notification_log FOR UPDATE USING ((auth.uid() = user_id));

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING ((id = auth.uid()));

CREATE POLICY "Users can update own snapshots" ON public.smart_dar_snapshots FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update pipelines" ON public.pipelines FOR UPDATE USING (true);

CREATE POLICY "Users can update profiles" ON public.user_profiles FOR UPDATE USING (true);

CREATE POLICY "Users can update task queues" ON public.task_queues FOR UPDATE USING (true);

CREATE POLICY "Users can update tasks" ON public.tasks FOR UPDATE USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can update their own pending invoices" ON public.invoices FOR UPDATE USING (((auth.uid() = user_id) AND (status = 'pending'::text)));

CREATE POLICY "Users can update their own queue tasks." ON public.eod_queue_tasks FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can update their own templates" ON public.recurring_task_templates FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY "Users can view all SMS messages" ON public.sms_messages FOR SELECT USING (true);

CREATE POLICY "Users can view all attachments" ON public.attachments FOR SELECT USING (true);

CREATE POLICY "Users can view all call analytics" ON public.call_analytics FOR SELECT USING (true);

CREATE POLICY "Users can view all calls" ON public.calls FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view all clock-ins" ON public.eod_clock_ins FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view all companies" ON public.companies FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view all contacts" ON public.contacts FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view all emails" ON public.emails FOR SELECT USING (true);

CREATE POLICY "Users can view all line items" ON public.line_items FOR SELECT USING (true);

CREATE POLICY "Users can view all manual call logs" ON public.manual_call_logs FOR SELECT USING (true);

CREATE POLICY "Users can view all meetings" ON public.meetings FOR SELECT USING (true);

CREATE POLICY "Users can view all notes" ON public.notes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view all pipelines" ON public.pipelines FOR SELECT USING (true);

CREATE POLICY "Users can view all profiles" ON public.user_profiles FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view all submissions" ON public.eod_submissions FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view all task queues" ON public.task_queues FOR SELECT USING (true);

CREATE POLICY "Users can view all tasks" ON public.tasks FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view all webhooks" ON public.dialpad_webhooks FOR SELECT USING (true);

CREATE POLICY "Users can view own behavior insights" ON public.behavior_insights FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own behavioral insights" ON public.behavioral_insights FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own category distribution" ON public.category_distribution FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own clock-ins" ON public.eod_clock_ins FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own energy entries" ON public.energy_entries FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own feedback" ON public.user_feedback FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own monthly growth" ON public.monthly_growth_snapshots FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own mood entries" ON public.mood_entries FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own notifications" ON public.notification_log FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own points history" ON public.points_history FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own progress trends" ON public.progress_trends FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own snapshots" ON public.smart_dar_snapshots FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own streak history" ON public.streak_history FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own submission images" ON public.eod_submission_images FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.eod_submissions
  WHERE ((eod_submissions.id = eod_submission_images.submission_id) AND (eod_submissions.user_id = auth.uid())))));

CREATE POLICY "Users can view own submission tasks" ON public.eod_submission_tasks FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.eod_submissions
  WHERE ((eod_submissions.id = eod_submission_tasks.submission_id) AND (eod_submissions.user_id = auth.uid())))));

CREATE POLICY "Users can view own submissions" ON public.eod_submissions FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own survey events" ON public.survey_events FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own weekly metrics" ON public.weekly_metrics_snapshots FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own weekly progress" ON public.weekly_progress_insights FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view own work patterns" ON public.work_patterns FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their assigned clients" ON public.user_client_assignments FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own client assignments" ON public.user_client_assignments FOR SELECT USING ((user_id = auth.uid()));

CREATE POLICY "Users can view their own comment images" ON public.eod_task_comment_images FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.eod_submission_tasks t
     JOIN public.eod_submissions s ON ((t.submission_id = s.id)))
  WHERE ((t.id = eod_task_comment_images.task_id) AND (s.user_id = auth.uid())))));

CREATE POLICY "Users can view their own energy entries" ON public.energy_entries FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text))))));

CREATE POLICY "Users can view their own invoice items" ON public.invoice_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.invoices
  WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.user_id = auth.uid())))));

CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own mood entries" ON public.mood_entries FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text))))));

CREATE POLICY "Users can view their own queue tasks." ON public.eod_queue_tasks FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY "Users can view their own report shares" ON public.eod_report_shares FOR SELECT USING ((shared_by = auth.uid()));

CREATE POLICY "Users can view their own shareable reports" ON public.eod_shareable_reports FOR SELECT USING ((created_by = auth.uid()));

CREATE POLICY "Users can view their own submissions" ON public.eod_submissions FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text))))));

CREATE POLICY "Users can view their own templates" ON public.recurring_task_templates FOR SELECT USING (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text))))));

CREATE POLICY allow_admin_all_operations ON public.eod_time_entries USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY allow_admin_read_all_entries ON public.eod_time_entries FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_profiles
  WHERE ((user_profiles.user_id = auth.uid()) AND (user_profiles.role = 'admin'::text)))));

CREATE POLICY allow_all_conversations ON public.conversations USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY allow_all_messages ON public.messages USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY allow_all_participants ON public.conversation_participants USING ((auth.uid() IS NOT NULL)) WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY allow_users_delete_own_entries ON public.eod_time_entries FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY allow_users_insert_own_entries ON public.eod_time_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY allow_users_read_own_entries ON public.eod_time_entries FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY allow_users_update_own_entries ON public.eod_time_entries FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY authenticated_all_group_chats ON public.group_chats TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY authenticated_all_group_members ON public.group_chat_members TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY authenticated_all_group_messages ON public.group_chat_messages TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY dialpad_tokens_delete_self ON public.dialpad_tokens FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY dialpad_tokens_insert_self ON public.dialpad_tokens FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY dialpad_tokens_select_self ON public.dialpad_tokens FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY dialpad_tokens_update_self ON public.dialpad_tokens FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY eod_delete_own ON public.eod_reports FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY eod_images_delete_own ON public.eod_report_images FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY eod_images_insert_own ON public.eod_report_images FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY eod_images_select_own ON public.eod_report_images FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY eod_insert_own ON public.eod_reports FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY eod_select_own ON public.eod_reports FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY eod_time_delete_own ON public.eod_time_entries FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY eod_time_entries_delete_own ON public.eod_time_entries FOR DELETE USING ((auth.uid() = user_id));

CREATE POLICY eod_time_entries_insert_own ON public.eod_time_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY eod_time_entries_select_own ON public.eod_time_entries FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY eod_time_entries_update_own ON public.eod_time_entries FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY eod_time_insert_own ON public.eod_time_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));

CREATE POLICY eod_time_select_own ON public.eod_time_entries FOR SELECT USING ((auth.uid() = user_id));

CREATE POLICY eod_time_update_own ON public.eod_time_entries FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY eod_update_own ON public.eod_reports FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));

CREATE POLICY update_own_profile ON public.user_profiles FOR UPDATE USING ((user_id = auth.uid()));

CREATE POLICY view_all_profiles ON public.user_profiles FOR SELECT USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Allow authenticated users to upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'message-attachments'::text) AND ((storage.foldername(name))[1] = 'message-images'::text)));

CREATE POLICY "Allow public to view images" ON storage.objects FOR SELECT USING ((bucket_id = 'message-attachments'::text));

CREATE POLICY "Allow users to delete their own images" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'message-attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[2])));

CREATE POLICY "Users can delete their own deal attachments" ON storage.objects FOR DELETE USING ((bucket_id = 'deal-attachments'::text));

CREATE POLICY "Users can update their own deal attachments" ON storage.objects FOR UPDATE USING ((bucket_id = 'deal-attachments'::text));

CREATE POLICY "Users can upload deal attachments" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'deal-attachments'::text));

CREATE POLICY "Users can view their own deal attachments" ON storage.objects FOR SELECT USING ((bucket_id = 'deal-attachments'::text));

CREATE POLICY eod_images_bucket_delete ON storage.objects FOR DELETE USING ((bucket_id = 'eod-images'::text));

CREATE POLICY eod_images_bucket_insert ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'eod-images'::text));

CREATE POLICY eod_images_bucket_select ON storage.objects FOR SELECT USING ((bucket_id = 'eod-images'::text));

CREATE POLICY eod_images_bucket_update ON storage.objects FOR UPDATE USING ((bucket_id = 'eod-images'::text));


-- INDEXES (231)
-- -------------------------------------------

CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);

CREATE INDEX idx_deals_company_id ON public.deals(company_id);

CREATE INDEX idx_deals_primary_contact_id ON public.deals(primary_contact_id);

CREATE INDEX idx_calls_related_deal_id ON public.calls(related_deal_id);

CREATE INDEX idx_calls_related_contact_id ON public.calls(related_contact_id);

CREATE INDEX idx_calls_related_company_id ON public.calls(related_company_id);

CREATE INDEX idx_calls_timestamp ON public.calls(call_timestamp);

CREATE INDEX idx_calls_rep_id ON public.calls(rep_id);

CREATE INDEX idx_calls_call_outcome ON public.calls(call_outcome);

CREATE INDEX idx_deals_pipeline_id ON public.deals(pipeline_id);

CREATE INDEX idx_deals_priority ON public.deals(priority);

CREATE INDEX idx_deals_deal_status ON public.deals(deal_status);

CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);

CREATE INDEX idx_tasks_status ON public.tasks(status);

CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);

CREATE INDEX idx_emails_contact_id ON public.emails(contact_id);

CREATE INDEX idx_emails_status ON public.emails(status);

CREATE INDEX idx_meetings_scheduled_at ON public.meetings(scheduled_at);

CREATE INDEX idx_meetings_contact_id ON public.meetings(contact_id);

CREATE INDEX IF NOT EXISTS idx_calls_dialpad_call_id ON public.calls(dialpad_call_id);

CREATE INDEX IF NOT EXISTS idx_calls_direction ON public.calls(call_direction);

CREATE INDEX IF NOT EXISTS idx_webhooks_processed ON public.dialpad_webhooks(processed, created_at);

CREATE INDEX IF NOT EXISTS idx_webhooks_event_id ON public.dialpad_webhooks(event_id);

CREATE INDEX IF NOT EXISTS idx_call_analytics_call_id ON public.call_analytics(call_id);

CREATE INDEX IF NOT EXISTS idx_call_analytics_sentiment ON public.call_analytics(sentiment_label);

CREATE INDEX IF NOT EXISTS idx_sms_contact_id ON public.sms_messages(contact_id);

CREATE INDEX IF NOT EXISTS idx_sms_deal_id ON public.sms_messages(deal_id);

CREATE INDEX IF NOT EXISTS idx_sms_sent_at ON public.sms_messages(sent_at DESC);

CREATE INDEX idx_notes_deal_id ON public.notes(deal_id);

CREATE INDEX idx_notes_contact_id ON public.notes(contact_id);

CREATE INDEX idx_notes_company_id ON public.notes(company_id);

CREATE INDEX idx_notes_source_call_id ON public.notes(source_call_id);

CREATE INDEX deals_business_audit_attended_at_idx ON public.deals USING btree (business_audit_attended_at);

CREATE INDEX deals_business_audit_booked_at_idx ON public.deals USING btree (business_audit_booked_at);

CREATE INDEX deals_invoice_agreement_sent_at_idx ON public.deals USING btree (invoice_agreement_sent_at);

CREATE INDEX deals_primary_product_category_idx ON public.deals USING btree (primary_product_category);

CREATE INDEX deals_proposal_sent_at_idx ON public.deals USING btree (proposal_sent_at);

CREATE INDEX deals_qualification_status_idx ON public.deals USING btree (qualification_status);

CREATE INDEX deals_vertical_idx ON public.deals USING btree (vertical);

CREATE INDEX idx_admin_notifications_type ON public.admin_notifications USING btree (type, created_at DESC);

CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications USING btree (is_read, created_at DESC);

CREATE INDEX idx_am_meetings_account_manager ON public.account_manager_meetings USING btree (account_manager_id);

CREATE INDEX idx_am_meetings_company ON public.account_manager_meetings USING btree (related_company_id);

CREATE INDEX idx_am_meetings_contact ON public.account_manager_meetings USING btree (related_contact_id);

CREATE INDEX idx_am_meetings_deal ON public.account_manager_meetings USING btree (related_deal_id);

CREATE INDEX idx_am_meetings_timestamp ON public.account_manager_meetings USING btree (meeting_timestamp DESC);

CREATE INDEX idx_behavior_insights_user_date ON public.behavior_insights USING btree (user_id, insight_date DESC, is_active, priority DESC);

CREATE INDEX idx_behavioral_insights_active ON public.behavioral_insights USING btree (user_id, is_active, priority DESC);

CREATE INDEX idx_behavioral_insights_user_date ON public.behavioral_insights USING btree (user_id, insight_date DESC);

CREATE INDEX idx_call_analytics_call_id ON public.call_analytics USING btree (call_id);

CREATE INDEX idx_call_analytics_sentiment ON public.call_analytics USING btree (sentiment_label);

CREATE INDEX idx_calls_account_manager_id ON public.calls USING btree (account_manager_id) WHERE (account_manager_id IS NOT NULL);

CREATE INDEX idx_calls_account_manager_meeting ON public.calls USING btree (is_account_manager_meeting) WHERE (is_account_manager_meeting = true);

CREATE INDEX idx_calls_call_outcome ON public.calls USING btree (call_outcome);

CREATE INDEX idx_calls_contact ON public.calls USING btree (related_contact_id);

CREATE INDEX idx_calls_created_at ON public.calls USING btree (created_at DESC);

CREATE INDEX idx_calls_deal ON public.calls USING btree (related_deal_id);

CREATE INDEX idx_calls_dialpad_call_id ON public.calls USING btree (dialpad_call_id);

CREATE INDEX idx_calls_direction ON public.calls USING btree (call_direction);

CREATE INDEX idx_calls_is_account_manager_meeting ON public.calls USING btree (is_account_manager_meeting) WHERE (is_account_manager_meeting = true);

CREATE INDEX idx_calls_is_am_meeting ON public.calls USING btree (is_account_manager_meeting);

CREATE INDEX idx_calls_meeting_outcome ON public.calls USING btree (meeting_outcome);

CREATE INDEX idx_calls_meeting_timestamp ON public.calls USING btree (meeting_timestamp DESC) WHERE (meeting_timestamp IS NOT NULL);

CREATE INDEX idx_calls_meeting_type ON public.calls USING btree (meeting_type);

CREATE INDEX idx_calls_outcome ON public.calls USING btree (call_outcome);

CREATE INDEX idx_calls_related_company_id ON public.calls USING btree (related_company_id);

CREATE INDEX idx_calls_related_contact_id ON public.calls USING btree (related_contact_id);

CREATE INDEX idx_calls_related_deal_id ON public.calls USING btree (related_deal_id);

CREATE INDEX idx_calls_rep_id ON public.calls USING btree (rep_id);

CREATE INDEX idx_calls_timestamp ON public.calls USING btree (call_timestamp);

CREATE INDEX idx_calls_user ON public.calls USING btree (rep_id);

CREATE INDEX idx_calls_user_created ON public.calls USING btree (rep_id, created_at DESC);

CREATE INDEX idx_category_distribution_user_date ON public.category_distribution USING btree (user_id, analysis_date DESC);

CREATE INDEX idx_clock_ins_daily_goal ON public.eod_clock_ins USING btree (user_id, daily_task_goal) WHERE (daily_task_goal IS NOT NULL);

CREATE INDEX idx_clock_ins_user_time ON public.eod_clock_ins USING btree (user_id, clocked_in_at DESC);

CREATE INDEX idx_comment_images_task ON public.eod_task_comment_images USING btree (task_id);

CREATE INDEX idx_companies_country ON public.companies USING btree (country);

CREATE INDEX idx_companies_created_at ON public.companies USING btree (created_at DESC);

CREATE INDEX idx_companies_domain ON public.companies USING btree (domain);

CREATE INDEX idx_companies_email ON public.companies USING btree (email);

CREATE INDEX idx_companies_industry ON public.companies USING btree (industry);

CREATE INDEX idx_companies_name ON public.companies USING btree (name);

CREATE INDEX idx_companies_name_trgm ON public.companies USING gin (name public.gin_trgm_ops);

CREATE INDEX idx_companies_owner_id ON public.companies USING btree (owner_id);

CREATE INDEX idx_companies_vertical ON public.companies USING btree (vertical);

CREATE INDEX idx_companies_zip_code ON public.companies USING btree (zip_code);

CREATE INDEX idx_contacts_company ON public.contacts USING btree (company_id);

CREATE INDEX idx_contacts_company_id ON public.contacts USING btree (company_id);

CREATE INDEX idx_contacts_created_at ON public.contacts USING btree (created_at DESC);

CREATE INDEX idx_contacts_email ON public.contacts USING btree (email);

CREATE INDEX idx_contacts_first_name_trgm ON public.contacts USING gin (first_name public.gin_trgm_ops);

CREATE INDEX idx_contacts_last_contacted ON public.contacts USING btree (last_contacted_at DESC);

CREATE INDEX idx_contacts_last_name_trgm ON public.contacts USING gin (last_name public.gin_trgm_ops);

CREATE INDEX idx_contacts_name ON public.contacts USING btree (first_name, last_name);

CREATE INDEX idx_contacts_owner_id ON public.contacts USING btree (owner_id);

CREATE INDEX idx_contacts_primary_email ON public.contacts USING btree (primary_email);

CREATE INDEX idx_contacts_secondary_email ON public.contacts USING btree (secondary_email);

CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants USING btree (conversation_id);

CREATE INDEX idx_conversation_participants_user ON public.conversation_participants USING btree (user_id);

CREATE INDEX idx_conversations_archived ON public.conversations USING btree (archived) WHERE (archived = false);

CREATE INDEX idx_deals_account_manager ON public.deals USING btree (account_manager_id);

CREATE INDEX idx_deals_amount ON public.deals USING btree (amount);

CREATE INDEX idx_deals_assigned_operator ON public.deals USING btree (assigned_operator);

CREATE INDEX idx_deals_city ON public.deals USING btree (city);

CREATE INDEX idx_deals_close_date ON public.deals USING btree (close_date);

CREATE INDEX idx_deals_company_id ON public.deals USING btree (company_id);

CREATE INDEX idx_deals_country ON public.deals USING btree (country);

CREATE INDEX idx_deals_created_at ON public.deals USING btree (created_at DESC);

CREATE INDEX idx_deals_deal_owner ON public.deals USING btree (deal_owner_id);

CREATE INDEX idx_deals_deal_status ON public.deals USING btree (deal_status);

CREATE INDEX idx_deals_industry ON public.deals USING btree (industry);

CREATE INDEX idx_deals_last_activity ON public.deals USING btree (last_activity_date DESC);

CREATE INDEX idx_deals_lead_source ON public.deals USING btree (lead_source);

CREATE INDEX idx_deals_name_trgm ON public.deals USING gin (name public.gin_trgm_ops);

CREATE INDEX idx_deals_pipeline ON public.deals USING btree (pipeline_id);

CREATE INDEX idx_deals_pipeline_id ON public.deals USING btree (pipeline_id);

CREATE INDEX idx_deals_primary_contact ON public.deals USING btree (primary_contact_id);

CREATE INDEX idx_deals_primary_contact_id ON public.deals USING btree (primary_contact_id);

CREATE INDEX idx_deals_priority ON public.deals USING btree (priority);

CREATE INDEX idx_deals_setter ON public.deals USING btree (setter_id);

CREATE INDEX idx_deals_stage ON public.deals USING btree (stage);

CREATE INDEX idx_deals_stage_priority ON public.deals USING btree (stage, priority);

CREATE INDEX idx_deals_state ON public.deals USING btree (state);

CREATE INDEX idx_dialpad_tokens_expires_at ON public.dialpad_tokens USING btree (expires_at);

CREATE INDEX idx_emails_contact_id ON public.emails USING btree (contact_id);

CREATE INDEX idx_emails_status ON public.emails USING btree (status);

CREATE INDEX idx_energy_entries_user_timestamp ON public.energy_entries USING btree (user_id, "timestamp" DESC);

CREATE INDEX idx_eod_clock_ins_client ON public.eod_clock_ins USING btree (user_id, client_name, date);

CREATE INDEX idx_eod_clock_ins_client_name ON public.eod_clock_ins USING btree (client_name) WHERE (client_name IS NOT NULL);

CREATE INDEX idx_eod_clock_ins_user_date ON public.eod_clock_ins USING btree (user_id, date DESC);

CREATE INDEX idx_eod_clock_ins_user_date_client ON public.eod_clock_ins USING btree (user_id, date, client_name);

CREATE INDEX idx_eod_images_eod ON public.eod_report_images USING btree (eod_id);

CREATE INDEX idx_eod_queue_tasks_user_client ON public.eod_queue_tasks USING btree (user_id, client_name);

CREATE INDEX idx_eod_reports_clocked_in ON public.eod_reports USING btree (clocked_in_at);

CREATE INDEX idx_eod_reports_share_token ON public.eod_reports USING btree (share_token);

CREATE INDEX idx_eod_reports_submitted ON public.eod_reports USING btree (submitted_at);

CREATE INDEX idx_eod_reports_user_date ON public.eod_reports USING btree (user_id, report_date);

CREATE INDEX idx_eod_submission_images_submission ON public.eod_submission_images USING btree (submission_id);

CREATE INDEX idx_eod_submission_tasks_submission ON public.eod_submission_tasks USING btree (submission_id);

CREATE INDEX idx_eod_submissions_user_submitted ON public.eod_submissions USING btree (user_id, submitted_at DESC);

CREATE INDEX idx_eod_time_entries_active ON public.eod_time_entries USING btree (user_id, ended_at) WHERE (ended_at IS NULL);

CREATE INDEX idx_eod_time_entries_eod ON public.eod_time_entries USING btree (eod_id);

CREATE INDEX idx_eod_time_entries_eod_id ON public.eod_time_entries USING btree (eod_id);

CREATE INDEX idx_eod_time_entries_has_images ON public.eod_time_entries USING btree ((((comment_images IS NOT NULL) AND (array_length(comment_images, 1) > 0))));

CREATE INDEX idx_eod_time_entries_paused ON public.eod_time_entries USING btree (user_id, paused_at) WHERE (paused_at IS NOT NULL);

CREATE INDEX idx_eod_time_entries_task_priority ON public.eod_time_entries USING btree (task_priority);

CREATE INDEX idx_eod_time_entries_user ON public.eod_time_entries USING btree (user_id);

CREATE INDEX idx_eod_time_entries_user_id ON public.eod_time_entries USING btree (user_id);

CREATE INDEX idx_group_chat_members_group ON public.group_chat_members USING btree (group_id);

CREATE INDEX idx_group_chat_members_user ON public.group_chat_members USING btree (user_id);

CREATE INDEX idx_group_chats_deleted ON public.group_chats USING btree (deleted_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_group_messages_group ON public.group_chat_messages USING btree (group_id, created_at DESC);

CREATE INDEX idx_group_messages_sender ON public.group_chat_messages USING btree (sender_id);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

CREATE INDEX idx_invoices_client_email ON public.invoices USING btree (client_email);

CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at);

CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

CREATE INDEX idx_invoices_user_id ON public.invoices USING btree (user_id);

CREATE INDEX idx_manual_call_logs_call_outcome ON public.manual_call_logs USING btree (call_outcome);

CREATE INDEX idx_manual_call_logs_related_company_id ON public.manual_call_logs USING btree (related_company_id);

CREATE INDEX idx_manual_call_logs_related_contact_id ON public.manual_call_logs USING btree (related_contact_id);

CREATE INDEX idx_manual_call_logs_related_deal_id ON public.manual_call_logs USING btree (related_deal_id);

CREATE INDEX idx_manual_call_logs_rep_id ON public.manual_call_logs USING btree (rep_id);

CREATE INDEX idx_manual_call_logs_timestamp ON public.manual_call_logs USING btree (call_timestamp);

CREATE INDEX idx_meetings_created_by ON public.meetings USING btree (created_by);

CREATE INDEX idx_meetings_related_contact_id ON public.meetings USING btree (related_contact_id);

CREATE INDEX idx_meetings_related_deal_id ON public.meetings USING btree (related_deal_id);

CREATE INDEX idx_meetings_scheduled_at ON public.meetings USING btree (scheduled_at);

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, created_at DESC);

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);

CREATE INDEX idx_monthly_growth_user_month ON public.monthly_growth_snapshots USING btree (user_id, month_start_date DESC);

CREATE INDEX idx_mood_entries_user_timestamp ON public.mood_entries USING btree (user_id, "timestamp" DESC);

CREATE INDEX idx_notes_company_id ON public.notes USING btree (company_id);

CREATE INDEX idx_notes_contact_id ON public.notes USING btree (contact_id);

CREATE INDEX idx_notes_deal_id ON public.notes USING btree (deal_id);

CREATE INDEX idx_notes_source_call_id ON public.notes USING btree (source_call_id);

CREATE INDEX idx_notification_log_created_at ON public.notification_log USING btree (created_at DESC);

CREATE INDEX idx_notification_log_type ON public.notification_log USING btree (type);

CREATE INDEX idx_notification_log_user_id ON public.notification_log USING btree (user_id);

CREATE INDEX idx_notification_log_user_unread ON public.notification_log USING btree (user_id, is_read, created_at DESC);

CREATE INDEX idx_points_history_task ON public.points_history USING btree (task_id) WHERE (task_id IS NOT NULL);

CREATE INDEX idx_points_history_user_timestamp ON public.points_history USING btree (user_id, "timestamp" DESC);

CREATE INDEX idx_progress_trends_user_week ON public.progress_trends USING btree (user_id, week_start_date DESC);

CREATE INDEX idx_recurring_task_templates_scheduled_date ON public.recurring_task_templates USING btree (scheduled_date);

CREATE INDEX idx_recurring_templates_created_at ON public.recurring_task_templates USING btree (created_at DESC);

CREATE INDEX idx_recurring_templates_user_id ON public.recurring_task_templates USING btree (user_id);

CREATE INDEX idx_report_shares_shareable ON public.eod_report_shares USING btree (shareable_report_id);

CREATE INDEX idx_reports_user_date ON public.eod_reports USING btree (user_id, report_date DESC);

CREATE INDEX idx_shareable_reports_submission ON public.eod_shareable_reports USING btree (submission_id);

CREATE INDEX idx_shareable_reports_token ON public.eod_shareable_reports USING btree (share_token);

CREATE INDEX idx_smart_dar_snapshots_date_range ON public.smart_dar_snapshots USING btree (snapshot_date, user_id);

CREATE INDEX idx_smart_dar_snapshots_date_user ON public.smart_dar_snapshots USING btree (snapshot_date DESC, user_id);

CREATE INDEX idx_smart_dar_snapshots_points ON public.smart_dar_snapshots USING btree (user_id, points_earned DESC);

CREATE INDEX idx_smart_dar_snapshots_submission ON public.smart_dar_snapshots USING btree (submission_id);

CREATE INDEX idx_smart_dar_snapshots_user_date ON public.smart_dar_snapshots USING btree (user_id, snapshot_date DESC);

CREATE INDEX idx_sms_contact ON public.sms_messages USING btree (contact_id);

CREATE INDEX idx_sms_contact_id ON public.sms_messages USING btree (contact_id);

CREATE INDEX idx_sms_created_at ON public.sms_messages USING btree (created_at DESC);

CREATE INDEX idx_sms_deal_id ON public.sms_messages USING btree (deal_id);

CREATE INDEX idx_sms_sent_at ON public.sms_messages USING btree (sent_at DESC);

CREATE INDEX idx_streak_history_user_date ON public.streak_history USING btree (user_id, date DESC);

CREATE INDEX idx_streak_history_weekday ON public.streak_history USING btree (user_id, is_weekday, date DESC);

CREATE INDEX idx_survey_events_user_responded ON public.survey_events USING btree (user_id, responded, "timestamp" DESC);

CREATE INDEX idx_survey_events_user_timestamp ON public.survey_events USING btree (user_id, "timestamp" DESC);

CREATE INDEX idx_survey_events_user_type ON public.survey_events USING btree (user_id, type, "timestamp" DESC);

CREATE INDEX idx_tasks_assigned_status ON public.tasks USING btree (assigned_to, status);

CREATE INDEX idx_tasks_assigned_to ON public.tasks USING btree (assigned_to);

CREATE INDEX idx_tasks_contact ON public.tasks USING btree (contact_id);

CREATE INDEX idx_tasks_deal ON public.tasks USING btree (deal_id);

CREATE INDEX idx_tasks_due_date ON public.tasks USING btree (due_date);

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);

CREATE INDEX idx_templates_user ON public.recurring_task_templates USING btree (user_id);

CREATE INDEX idx_time_entries_categories ON public.eod_time_entries USING gin (task_categories);

CREATE INDEX idx_time_entries_priority ON public.eod_time_entries USING btree (user_id, task_priority);

CREATE INDEX idx_time_entries_task_type ON public.eod_time_entries USING btree (user_id, task_type) WHERE (task_type IS NOT NULL);

CREATE INDEX idx_time_entries_type ON public.eod_time_entries USING btree (user_id, task_type);

CREATE INDEX idx_time_entries_user_completed ON public.eod_time_entries USING btree (user_id, completed_at DESC) WHERE (completed_at IS NOT NULL);

CREATE INDEX idx_time_entries_user_started ON public.eod_time_entries USING btree (user_id, started_at DESC);

CREATE INDEX idx_user_client_assignments_client_name ON public.user_client_assignments USING btree (client_name);

CREATE INDEX idx_user_client_assignments_user_id ON public.user_client_assignments USING btree (user_id);

CREATE INDEX idx_user_feedback_created_at ON public.user_feedback USING btree (created_at DESC);

CREATE INDEX idx_user_feedback_status ON public.user_feedback USING btree (status);

CREATE INDEX idx_user_feedback_user_id ON public.user_feedback USING btree (user_id);

CREATE INDEX idx_user_profiles_email ON public.user_profiles USING btree (email);

CREATE INDEX idx_user_profiles_role ON public.user_profiles USING btree (role);

CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);

CREATE INDEX idx_webhooks_event_id ON public.dialpad_webhooks USING btree (event_id);

CREATE INDEX idx_webhooks_processed ON public.dialpad_webhooks USING btree (processed, created_at);

CREATE INDEX idx_weekly_metrics_user_week ON public.weekly_metrics_snapshots USING btree (user_id, week_start_date DESC);

CREATE INDEX idx_weekly_progress_user_week ON public.weekly_progress_insights USING btree (user_id, week_start_date DESC);

CREATE INDEX idx_work_patterns_user_date ON public.work_patterns USING btree (user_id, analysis_date DESC);

