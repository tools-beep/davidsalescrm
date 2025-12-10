-- ALL TABLE DEFINITIONS

CREATE TABLE IF NOT EXISTS public.account_manager_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_manager_id uuid NOT NULL,
    meeting_type text NOT NULL,
    meeting_outcome text NOT NULL,
    related_contact_id uuid,
    related_deal_id uuid,
    related_company_id uuid,
    duration_seconds integer DEFAULT 0,
    notes text,
    meeting_timestamp timestamp with time zone DEFAULT now(),
    dialpad_call_id text,
    caller_number text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    user_id uuid,
    user_name text,
    related_id uuid,
    redirect_url text,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    related_deal_id uuid,
    related_contact_id uuid,
    related_company_id uuid,
    outbound_type public.outbound_type_enum NOT NULL,
    call_outcome public.call_outcome_enum NOT NULL,
    duration_seconds integer DEFAULT 0,
    notes text,
    call_timestamp timestamp with time zone DEFAULT now(),
    rep_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    dialpad_call_id text,
    recording_url text,
    transcript text,
    dialpad_contact_id text,
    call_direction text,
    caller_number text,
    callee_number text,
    call_status text DEFAULT 'completed'::text,
    dialpad_metadata jsonb DEFAULT '{}'::jsonb,
    meeting_type public.meeting_type_enum,
    meeting_outcome public.meeting_outcome_enum,
    is_account_manager_meeting boolean DEFAULT false,
    meeting_timestamp timestamp with time zone,
    account_manager_id uuid,
    CONSTRAINT calls_call_direction_check CHECK ((call_direction = ANY (ARRAY['inbound'::text, 'outbound'::text])))
);

CREATE TABLE IF NOT EXISTS public.manual_call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    related_deal_id uuid,
    related_contact_id uuid,
    related_company_id uuid,
    rep_id uuid,
    outbound_type public.outbound_type_enum NOT NULL,
    call_outcome public.call_outcome_enum NOT NULL,
    duration_seconds integer DEFAULT 0,
    notes text,
    caller_number text,
    callee_number text,
    call_timestamp timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid,
    contact_id uuid,
    company_id uuid,
    uploaded_by uuid,
    file_name text NOT NULL,
    file_url text NOT NULL,
    file_size integer,
    file_type public.attachment_type_enum DEFAULT 'other'::public.attachment_type_enum NOT NULL,
    mime_type text,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.behavior_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    insight_date date DEFAULT CURRENT_DATE NOT NULL,
    insight_type text NOT NULL,
    insight_title text NOT NULL,
    insight_subtitle text NOT NULL,
    insight_description text NOT NULL,
    insight_badge text,
    metric_score integer,
    icon_color text,
    badge_color text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.behavioral_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    insight_date date DEFAULT CURRENT_DATE NOT NULL,
    insight_type text NOT NULL,
    insight_title text NOT NULL,
    insight_description text NOT NULL,
    insight_badge text,
    metric_value integer,
    metric_trend text,
    is_active boolean DEFAULT true,
    priority integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.call_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    call_id uuid,
    sentiment_score numeric(3,2),
    sentiment_label text,
    key_topics text[],
    action_items text[],
    call_quality_score integer,
    talk_time_ratio numeric(3,2),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT call_analytics_call_quality_score_check CHECK (((call_quality_score >= 0) AND (call_quality_score <= 100))),
    CONSTRAINT call_analytics_sentiment_label_check CHECK ((sentiment_label = ANY (ARRAY['positive'::text, 'neutral'::text, 'negative'::text])))
);

CREATE TABLE IF NOT EXISTS public.category_distribution (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_date date DEFAULT CURRENT_DATE NOT NULL,
    category_name text NOT NULL,
    task_count integer DEFAULT 0,
    total_minutes integer DEFAULT 0,
    percentage numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    website text,
    phone text,
    address text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    industry text,
    employees_count integer,
    description text,
    linkedin_url text,
    tiktok_url text,
    youtube_url text,
    city text,
    state text,
    country text,
    timezone text DEFAULT 'UTC'::text,
    email text,
    domain text,
    founder_full_name text,
    founder_email text,
    instagram_url text,
    facebook_url text,
    owner_id uuid,
    vertical text,
    zip_code text
);

CREATE TABLE IF NOT EXISTS public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text,
    phone text,
    mobile text,
    company_id uuid,
    owner_id uuid,
    timezone text DEFAULT 'UTC'::text,
    lifecycle_stage public.lifecycle_stage_enum DEFAULT 'lead'::public.lifecycle_stage_enum,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    secondary_phone text,
    city text,
    state text,
    country text,
    last_contacted_at timestamp with time zone,
    secondary_email text,
    website text,
    linkedin_url text,
    instagram_url text,
    tiktok_url text,
    facebook_url text,
    call_status text,
    notes text,
    description text,
    additional_phones jsonb DEFAULT '[]'::jsonb,
    primary_email text,
    primary_phone text,
    website_url text,
    x_url text,
    address text,
    zip_code text
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    last_read_at timestamp with time zone,
    unread_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    archived boolean DEFAULT false,
    archived_at timestamp with time zone,
    archived_by uuid
);

CREATE TABLE IF NOT EXISTS public.deals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    stage public.deal_stage_enum DEFAULT 'not contacted'::public.deal_stage_enum,
    owner_id uuid,
    amount numeric(15,2),
    close_date date,
    company_id uuid,
    primary_contact_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    pipeline_id uuid,
    priority public.priority_enum DEFAULT 'medium'::public.priority_enum NOT NULL,
    deal_status public.deal_status_enum DEFAULT 'open'::public.deal_status_enum NOT NULL,
    description text,
    income_amount numeric(15,2),
    currency text DEFAULT 'USD'::text,
    timezone text DEFAULT 'UTC'::text,
    account_manager uuid,
    account_executive uuid,
    appointment_setter uuid,
    referral text,
    contact_attempts integer DEFAULT 0,
    last_contact_date timestamp with time zone,
    source text,
    qualification_status public.qualification_status_enum,
    proposal_sent_at timestamp with time zone,
    business_audit_booked_at timestamp with time zone,
    business_audit_attended_at timestamp with time zone,
    invoice_agreement_sent_at timestamp with time zone,
    primary_product_category public.product_category_enum,
    vertical public.deal_vertical_enum,
    notes text,
    country text,
    state text,
    city text,
    deal_owner_id uuid,
    setter_id uuid,
    account_manager_id uuid,
    industry text,
    annual_revenue text,
    product_segment text,
    lead_source text,
    referral_source text,
    last_activity_date timestamp with time zone,
    assigned_operator uuid
);

CREATE TABLE IF NOT EXISTS public.dialpad_tokens (
    user_id uuid NOT NULL,
    dialpad_user_id text,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    token_type text,
    scope text,
    expires_at timestamp with time zone NOT NULL,
    from_number text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.dialpad_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    event_id text NOT NULL,
    payload jsonb NOT NULL,
    processed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.emails (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid,
    contact_id uuid,
    company_id uuid,
    sent_by uuid,
    subject text NOT NULL,
    body text NOT NULL,
    to_email text NOT NULL,
    from_email text NOT NULL,
    status public.email_status_enum DEFAULT 'sent'::public.email_status_enum NOT NULL,
    sent_at timestamp with time zone DEFAULT now(),
    opened_at timestamp with time zone,
    clicked_at timestamp with time zone,
    bounced_at timestamp with time zone,
    email_provider_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.energy_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    energy_level text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT energy_entries_energy_level_check CHECK ((energy_level = ANY (ARRAY['High'::text, 'Medium'::text, 'Low'::text, 'Drained'::text, 'Recharging'::text])))
);

CREATE TABLE IF NOT EXISTS public.eod_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_id uuid,
    clocked_in_at timestamp with time zone,
    clocked_out_at timestamp with time zone,
    total_hours numeric(5,2),
    summary text,
    submitted_at timestamp with time zone DEFAULT now(),
    email_sent boolean DEFAULT false,
    email_sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    actual_hours numeric(10,2),
    rounded_hours integer,
    planned_shift_minutes integer,
    daily_task_goal integer,
    total_active_seconds integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    first_name text,
    last_name text,
    email text,
    phone text,
    role text DEFAULT 'rep'::text,
    timezone text DEFAULT 'UTC'::text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    full_name text GENERATED ALWAYS AS (
CASE
    WHEN ((first_name IS NOT NULL) AND (last_name IS NOT NULL)) THEN ((first_name || ' '::text) || last_name)
    WHEN (first_name IS NOT NULL) THEN first_name
    WHEN (last_name IS NOT NULL) THEN last_name
    ELSE email
END) STORED,
    current_streak_days integer DEFAULT 0,
    longest_streak_days integer DEFAULT 0,
    last_active_date date,
    streak_last_updated timestamp with time zone DEFAULT now(),
    total_points integer DEFAULT 0 NOT NULL,
    weekly_points integer DEFAULT 0 NOT NULL,
    monthly_points integer DEFAULT 0 NOT NULL,
    last_weekly_reset date,
    last_monthly_reset date,
    weekday_streak integer DEFAULT 0 NOT NULL,
    longest_weekday_streak integer DEFAULT 0 NOT NULL,
    weekend_bonus_streak integer DEFAULT 0 NOT NULL,
    last_submission_date date,
    streak_last_updated_at timestamp with time zone,
    survey_answered_count integer DEFAULT 0,
    survey_missed_count integer DEFAULT 0,
    last_survey_reset_date date DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS public.eod_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eod_clock_ins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    clocked_in_at timestamp with time zone NOT NULL,
    clocked_out_at timestamp with time zone,
    date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    client_name text,
    planned_shift_minutes integer DEFAULT 0,
    planned_tasks integer DEFAULT 0,
    actual_hours numeric(10,2),
    rounded_hours integer,
    daily_task_goal integer,
    CONSTRAINT check_daily_task_goal_range CHECK (((daily_task_goal IS NULL) OR ((daily_task_goal >= 1) AND (daily_task_goal <= 50))))
);

CREATE TABLE IF NOT EXISTS public.eod_queue_tasks (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    client_name text NOT NULL,
    task_description text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eod_report_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eod_id uuid NOT NULL,
    user_id uuid NOT NULL,
    path text NOT NULL,
    public_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.eod_report_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shareable_report_id uuid,
    conversation_id uuid,
    group_id uuid,
    shared_at timestamp with time zone DEFAULT now(),
    shared_by uuid
);

CREATE TABLE IF NOT EXISTS public.eod_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_date date DEFAULT CURRENT_DATE NOT NULL,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    total_minutes integer,
    summary text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    clocked_in_at timestamp with time zone,
    clocked_out_at timestamp with time zone,
    submitted_at timestamp with time zone,
    share_token text,
    submitted boolean DEFAULT false,
    actual_hours numeric(10,2),
    rounded_hours integer
);

CREATE TABLE IF NOT EXISTS public.eod_shareable_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid,
    share_token text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    view_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.eod_submission_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eod_submission_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    submission_id uuid NOT NULL,
    client_name text NOT NULL,
    task_description text NOT NULL,
    duration_minutes integer NOT NULL,
    comments text,
    task_link text,
    created_at timestamp with time zone DEFAULT now(),
    client_email text,
    comment_images text[],
    status text DEFAULT 'completed'::text
);

CREATE TABLE IF NOT EXISTS public.eod_task_comment_images (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eod_time_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    eod_id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_name text NOT NULL,
    task_description text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_minutes integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    task_link text,
    comments text,
    client_email text,
    status text DEFAULT 'in_progress'::text,
    client_timezone text DEFAULT 'America/Los_Angeles'::text,
    paused_at timestamp with time zone,
    comment_images text[],
    accumulated_seconds integer DEFAULT 0,
    task_type text,
    goal_duration_minutes integer,
    task_intent text,
    task_categories text[],
    task_enjoyment integer,
    task_priority text,
    completed_at timestamp with time zone,
    pause_count integer DEFAULT 0,
    points_awarded integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.group_chat_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text,
    joined_at timestamp with time zone DEFAULT now(),
    last_read_at timestamp with time zone,
    group_chat_id uuid,
    unread_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.group_chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    image_url text
);

CREATE TABLE IF NOT EXISTS public.group_chats (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean DEFAULT true,
    deleted_at timestamp with time zone,
    deleted_by uuid
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    invoice_id uuid NOT NULL,
    task_date date NOT NULL,
    task_description text NOT NULL,
    hours numeric(10,2) NOT NULL,
    rate numeric(10,2),
    amount numeric(10,2),
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    invoice_number text NOT NULL,
    user_id uuid NOT NULL,
    client_name text NOT NULL,
    client_email text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    total_hours numeric(10,2) NOT NULL,
    total_amount numeric(10,2),
    currency text DEFAULT 'USD'::text,
    status text DEFAULT 'pending'::text,
    approved_at timestamp with time zone,
    approved_by_email text,
    pdf_url text,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

CREATE TABLE IF NOT EXISTS public.line_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid NOT NULL,
    product_name text NOT NULL,
    description text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    total_price numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    scheduled_at timestamp with time zone NOT NULL,
    duration_minutes integer DEFAULT 30,
    meeting_type text DEFAULT 'consultation'::text,
    is_booked boolean DEFAULT false,
    is_attended boolean DEFAULT false,
    meeting_link text,
    notes text,
    related_deal_id uuid,
    related_contact_id uuid,
    related_company_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_edited boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    image_url text
);

CREATE TABLE IF NOT EXISTS public.monthly_growth_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    month_start_date date NOT NULL,
    month_end_date date NOT NULL,
    total_tasks integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    efficiency_score integer DEFAULT 0,
    completion_rate integer DEFAULT 0,
    focus_score integer DEFAULT 0,
    task_velocity integer DEFAULT 0,
    work_rhythm integer DEFAULT 0,
    energy_level integer DEFAULT 0,
    time_utilization integer DEFAULT 0,
    productivity_momentum integer DEFAULT 0,
    consistency_score integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mood_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    mood_level text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT mood_entries_mood_check CHECK ((mood_level = ANY (ARRAY['😊'::text, '😐'::text, '😣'::text, '🥱'::text, '🔥'::text])))
);

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deal_id uuid,
    contact_id uuid,
    company_id uuid,
    content text NOT NULL,
    note_type text DEFAULT 'manual'::text NOT NULL,
    source_call_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    type text NOT NULL,
    category text,
    related_id uuid,
    metadata jsonb,
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pipelines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    stages jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    stage_order jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.points_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    points integer NOT NULL,
    reason text NOT NULL,
    task_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    email text NOT NULL,
    full_name text,
    avatar_url text,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text, 'superadmin'::text])))
);

CREATE TABLE IF NOT EXISTS public.progress_trends (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start_date date NOT NULL,
    trend_type text NOT NULL,
    trend_title text NOT NULL,
    trend_description text NOT NULL,
    trend_status text NOT NULL,
    current_week_value numeric,
    previous_week_value numeric,
    change_amount numeric,
    change_percentage numeric,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.recurring_task_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    template_name text NOT NULL,
    description text NOT NULL,
    default_client text,
    default_task_type text,
    default_categories text[],
    default_priority text,
    auto_queue_enabled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scheduled_date date
);

CREATE TABLE IF NOT EXISTS public.smart_dar_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    submission_id uuid,
    snapshot_date date NOT NULL,
    efficiency_score integer DEFAULT 0,
    completion_rate integer DEFAULT 0,
    priority_completion integer DEFAULT 0,
    estimation_accuracy integer DEFAULT 0,
    focus_index integer DEFAULT 0,
    task_velocity integer DEFAULT 0,
    work_rhythm integer DEFAULT 0,
    energy_level integer DEFAULT 0,
    time_utilization integer DEFAULT 0,
    productivity_momentum integer DEFAULT 0,
    consistency_score integer DEFAULT 0,
    total_tasks integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    active_tasks integer DEFAULT 0,
    paused_tasks integer DEFAULT 0,
    delayed_tasks integer DEFAULT 0,
    total_active_time integer DEFAULT 0,
    total_paused_time integer DEFAULT 0,
    avg_time_per_task integer DEFAULT 0,
    total_shift_hours numeric(5,2) DEFAULT 0,
    clocked_in_at timestamp with time zone,
    clocked_out_at timestamp with time zone,
    planned_shift_minutes integer,
    daily_task_goal integer,
    peak_hour integer,
    points_earned integer DEFAULT 0,
    weekday_streak integer DEFAULT 0,
    weekend_bonus_streak integer DEFAULT 0,
    tasks_by_type jsonb DEFAULT '{}'::jsonb,
    tasks_by_priority jsonb DEFAULT '{}'::jsonb,
    tasks_by_category jsonb DEFAULT '{}'::jsonb,
    deep_work_blocks integer DEFAULT 0,
    deep_work_minutes integer DEFAULT 0,
    quick_task_count integer DEFAULT 0,
    mood_entries_count integer DEFAULT 0,
    energy_entries_count integer DEFAULT 0,
    avg_mood text,
    avg_energy text,
    mood_distribution jsonb DEFAULT '{}'::jsonb,
    energy_distribution jsonb DEFAULT '{}'::jsonb,
    behavior_insights jsonb DEFAULT '[]'::jsonb,
    expert_insight text,
    daily_goal_met boolean DEFAULT false,
    shift_plan_met boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    completed_tasks_details jsonb DEFAULT '[]'::jsonb,
    productivity_data jsonb DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.sms_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dialpad_message_id text,
    contact_id uuid,
    deal_id uuid,
    company_id uuid,
    direction text,
    from_number text NOT NULL,
    to_number text NOT NULL,
    message_body text NOT NULL,
    status text DEFAULT 'sent'::text,
    sent_at timestamp with time zone DEFAULT now(),
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT sms_messages_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text])))
);

CREATE TABLE IF NOT EXISTS public.streak_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    weekday_streak integer DEFAULT 0 NOT NULL,
    weekend_bonus_streak integer DEFAULT 0 NOT NULL,
    is_weekday boolean NOT NULL,
    dar_submitted boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.survey_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    value text,
    responded boolean DEFAULT false NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT survey_events_type_check CHECK ((type = ANY (ARRAY['mood'::text, 'energy'::text])))
);

CREATE TABLE IF NOT EXISTS public.task_queues (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    assigned_to uuid,
    task_ids uuid[] DEFAULT '{}'::uuid[],
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    deal_id uuid,
    contact_id uuid,
    company_id uuid,
    assigned_to uuid,
    created_by uuid,
    status public.task_status_enum DEFAULT 'pending'::public.task_status_enum NOT NULL,
    priority public.priority_enum DEFAULT 'medium'::public.priority_enum NOT NULL,
    due_date timestamp with time zone,
    completed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_client_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    client_name text NOT NULL,
    client_email text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    client_timezone text DEFAULT 'America/Los_Angeles'::text,
    assigned_by uuid,
    client_phone text
);

CREATE TABLE IF NOT EXISTS public.user_feedback (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    subject text NOT NULL,
    message text NOT NULL,
    images text[],
    status text DEFAULT 'new'::text,
    admin_response text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    resolved_at timestamp with time zone,
    CONSTRAINT user_feedback_status_check CHECK ((status = ANY (ARRAY['new'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text])))
);

CREATE TABLE IF NOT EXISTS public.weekly_metrics_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start_date date NOT NULL,
    week_end_date date NOT NULL,
    total_tasks integer DEFAULT 0,
    completed_tasks integer DEFAULT 0,
    efficiency_score integer DEFAULT 0,
    completion_rate integer DEFAULT 0,
    focus_index integer DEFAULT 0,
    task_velocity integer DEFAULT 0,
    work_rhythm integer DEFAULT 0,
    energy_level integer DEFAULT 0,
    time_utilization integer DEFAULT 0,
    productivity_momentum integer DEFAULT 0,
    consistency_score integer DEFAULT 0,
    peak_hour text,
    total_active_minutes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_progress_insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    week_start_date date NOT NULL,
    insight_type text NOT NULL,
    insight_title text NOT NULL,
    insight_description text NOT NULL,
    trend_status text NOT NULL,
    trend_badge text,
    current_week_value numeric,
    previous_week_value numeric,
    change_amount numeric,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.work_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    analysis_date date DEFAULT CURRENT_DATE NOT NULL,
    best_task_type text,
    most_productive_day text,
    avg_mood_level numeric(3,1),
    avg_energy_level numeric(3,1),
    peak_hour text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.companies (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  name TEXT NOT NULL,\n  website TEXT,\n  phone TEXT,\n  address TEXT,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);

CREATE TABLE IF NOT EXISTS public.contacts (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  first_name TEXT NOT NULL,\n  last_name TEXT NOT NULL,\n  email TEXT,\n  phone TEXT,\n  mobile TEXT,\n  company_id UUID REFERENCES public.companies(id),\n  owner_id UUID,\n  timezone TEXT DEFAULT 'UTC',\n  lifecycle_stage lifecycle_stage_enum DEFAULT 'lead',\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);

CREATE TABLE IF NOT EXISTS public.deals (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  name TEXT NOT NULL,\n  stage deal_stage_enum DEFAULT 'not contacted',\n  owner_id UUID,\n  amount DECIMAL(15,2),\n  close_date DATE,\n  company_id UUID REFERENCES public.companies(id),\n  primary_contact_id UUID REFERENCES public.contacts(id),\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);

CREATE TABLE IF NOT EXISTS public.calls (\n  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n  related_deal_id UUID REFERENCES public.deals(id),\n  related_contact_id UUID REFERENCES public.contacts(id),\n  related_company_id UUID REFERENCES public.companies(id),\n  outbound_type outbound_type_enum NOT NULL,\n  call_outcome call_outcome_enum NOT NULL,\n  duration_seconds INTEGER DEFAULT 0,\n  notes TEXT,\n  call_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  rep_id UUID,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);

CREATE TABLE IF NOT EXISTS public.pipelines (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT,\n  stages JSONB NOT NULL DEFAULT '[]', -- Array of stage objects {name, position, color}\n  is_active BOOLEAN NOT NULL DEFAULT true,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

CREATE TABLE IF NOT EXISTS public.user_profiles (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  user_id UUID NOT NULL UNIQUE, -- References auth.users\n  first_name TEXT,\n  last_name TEXT,\n  email TEXT,\n  phone TEXT,\n  role TEXT DEFAULT 'rep',\n  timezone TEXT DEFAULT 'UTC',\n  is_active BOOLEAN NOT NULL DEFAULT true,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

CREATE TABLE IF NOT EXISTS public.tasks (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  title TEXT NOT NULL,\n  description TEXT,\n  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,\n  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,\n  assigned_to UUID REFERENCES public.user_profiles(id),\n  created_by UUID REFERENCES public.user_profiles(id),\n  status public.task_status_enum NOT NULL DEFAULT 'pending',\n  priority public.priority_enum NOT NULL DEFAULT 'medium',\n  due_date TIMESTAMP WITH TIME ZONE,\n  completed_at TIMESTAMP WITH TIME ZONE,\n  notes TEXT,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

CREATE TABLE IF NOT EXISTS public.task_queues (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  name TEXT NOT NULL,\n  description TEXT,\n  assigned_to UUID REFERENCES public.user_profiles(id),\n  task_ids UUID[] DEFAULT '{}',\n  is_active BOOLEAN NOT NULL DEFAULT true,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

CREATE TABLE IF NOT EXISTS public.emails (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,\n  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,\n  sent_by UUID REFERENCES public.user_profiles(id),\n  subject TEXT NOT NULL,\n  body TEXT NOT NULL,\n  to_email TEXT NOT NULL,\n  from_email TEXT NOT NULL,\n  status public.email_status_enum NOT NULL DEFAULT 'sent',\n  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),\n  opened_at TIMESTAMP WITH TIME ZONE,\n  clicked_at TIMESTAMP WITH TIME ZONE,\n  bounced_at TIMESTAMP WITH TIME ZONE,\n  email_provider_id TEXT, -- For tracking with Gmail/other providers\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

CREATE TABLE IF NOT EXISTS public.meetings (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  title TEXT NOT NULL,\n  description TEXT,\n  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,\n  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,\n  scheduled_by UUID REFERENCES public.user_profiles(id),\n  meeting_type public.meeting_type_enum NOT NULL DEFAULT 'consultation',\n  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,\n  duration_minutes INTEGER DEFAULT 30,\n  is_booked BOOLEAN NOT NULL DEFAULT true,\n  is_attended BOOLEAN DEFAULT false,\n  meeting_link TEXT,\n  location TEXT,\n  notes TEXT,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

CREATE TABLE IF NOT EXISTS public.attachments (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE,\n  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,\n  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,\n  uploaded_by UUID REFERENCES public.user_profiles(id),\n  file_name TEXT NOT NULL,\n  file_url TEXT NOT NULL,\n  file_size INTEGER,\n  file_type public.attachment_type_enum NOT NULL DEFAULT 'other',\n  mime_type TEXT,\n  description TEXT,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

CREATE TABLE IF NOT EXISTS public.line_items (\n  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,\n  deal_id UUID REFERENCES public.deals(id) ON DELETE CASCADE NOT NULL,\n  product_name TEXT NOT NULL,\n  description TEXT,\n  quantity INTEGER NOT NULL DEFAULT 1,\n  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,\n  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,\n  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),\n  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()\n);

