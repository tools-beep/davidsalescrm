# 🗄️ EOD Portal & Smart DAR Dashboard - Complete Database Documentation

**Version:** 2.0  
**Last Updated:** November 20, 2024  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Database Overview](#database-overview)
2. [Complete Table Schemas](#complete-table-schemas)
3. [Task Modal System](#task-modal-system)
4. [Notification System Database](#notification-system-database)
5. [Smart DAR Dashboard Metrics Logic](#smart-dar-dashboard-metrics-logic)
6. [UI Features & Database Mapping](#ui-features--database-mapping)
7. [Row Level Security (RLS) Policies](#row-level-security-rls-policies)
8. [Indexes & Performance Optimization](#indexes--performance-optimization)
9. [Migration History](#migration-history)

---

## 🎯 Database Overview

### Technology Stack
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Realtime:** Supabase Realtime subscriptions
- **Storage:** Supabase Storage for screenshots
- **Timezone:** All timestamps stored in UTC, converted to EST on client

### Core Architecture Principles
1. **User Isolation:** Each user can only see their own data (except admins)
2. **Audit Trail:** All records include `created_at` and `updated_at`
3. **Soft Deletes:** No hard deletion of time entries or reports
4. **Idempotency:** All migrations are safe to re-run
5. **Foreign Keys:** Strict referential integrity

---

## 📊 Complete Table Schemas

### 1. `profiles` (User Information)

**Purpose:** Stores user profile data and permissions

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id` - User UUID from Supabase Auth
- `email` - User's email address
- `full_name` - Display name
- `avatar_url` - Profile picture URL
- `role` - Permission level (user/admin/superadmin)

**RLS:** Users can read their own profile, admins can read all profiles

---

### 2. `eod_clients` (Client Management)

**Purpose:** Stores client information for time tracking

```sql
CREATE TABLE IF NOT EXISTS eod_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `id` - Unique client identifier
- `name` - Client display name
- `description` - Optional client details
- `is_active` - Whether client is currently active

**RLS:** All authenticated users can read all clients

---

### 3. `eod_clock_ins` (Clock-In/Out Sessions)

**Purpose:** Tracks when users clock in and out for each client

```sql
CREATE TABLE IF NOT EXISTS eod_clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES eod_clients(id) ON DELETE CASCADE,
  clock_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_time TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_clock_times CHECK (clock_out_time IS NULL OR clock_out_time > clock_in_time)
);
```

**Fields:**
- `user_id` - Who clocked in
- `client_id` - Which client they're working for
- `clock_in_time` - When they started (EST converted to UTC)
- `clock_out_time` - When they finished (NULL if still clocked in)
- `is_active` - Whether this session is currently active

**Business Logic:**
- Auto clock-out after 12 hours
- Can be clocked in to multiple clients simultaneously
- One active clock-in per client per user at a time

**RLS:** Users can only see/modify their own clock-ins, admins can see all

---

### 4. `eod_time_entries` (Task Tracking Core)

**Purpose:** The heart of the system - tracks every task worked on

```sql
CREATE TABLE IF NOT EXISTS eod_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES eod_clients(id) ON DELETE CASCADE,
  report_id UUID REFERENCES eod_reports(id) ON DELETE SET NULL,
  
  -- Task Description
  task_description TEXT NOT NULL,
  task_comments TEXT,
  task_link TEXT,
  
  -- Time Tracking
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  accumulated_seconds INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT FALSE,
  is_paused BOOLEAN DEFAULT FALSE,
  
  -- Task Settings (from Task Modal)
  task_type TEXT CHECK (task_type IN ('quick', 'standard', 'deep_work')),
  task_intent TEXT,
  task_categories TEXT[], -- Array of category tags
  goal_duration_minutes INTEGER,
  
  -- Task Priority (REQUIRED on completion)
  task_priority TEXT CHECK (task_priority IN (
    'immediate_impact',
    'daily',
    'weekly', 
    'monthly',
    'evergreen',
    'trigger_based'
  )),
  
  -- Task Status
  task_status TEXT DEFAULT 'in_progress' CHECK (task_status IN (
    'in_progress',
    'completed',
    'blocked',
    'on_hold'
  )),
  
  -- Task Enjoyment (rated after completion)
  enjoyment_rating INTEGER CHECK (enjoyment_rating >= 1 AND enjoyment_rating <= 5),
  
  -- Screenshots
  screenshot_urls TEXT[], -- Array of URLs from Supabase Storage
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Critical Fields Explained:**

**Time Tracking:**
- `started_at` - When task was first started (used for metrics)
- `completed_at` - When task was completed (NULL if paused/active)
- `accumulated_seconds` - Total seconds worked (accounts for pauses)
- `is_active` - TRUE if currently working on this task
- `is_paused` - TRUE if paused, FALSE if active or completed

**Task Settings Modal Fields:**
- `task_type` - Quick (15-30m), Standard (30-90m), Deep Work (90m+)
- `task_intent` - Build, Fix, Learn, Research, etc.
- `task_categories` - Array like ['Design', 'Frontend', 'Bug Fix']
- `goal_duration_minutes` - Target time for milestone notifications

**Task Priority (Required for Completion):**
- `immediate_impact` - 🔴 Urgent critical work
- `daily` - 🟢 Daily recurring tasks
- `weekly` - 🔵 Weekly recurring tasks
- `monthly` - 🟣 Monthly tasks
- `evergreen` - 🌿 Ongoing work
- `trigger_based` - 🔶 Reactive work (emails, bug fixes)

**Business Logic:**
- Cannot have 2+ active tasks for same user simultaneously
- Must have `task_comments` and `task_priority` before `completed_at` is set
- `accumulated_seconds` increments while active, freezes when paused
- `started_at` never changes (used for streak/consistency calculations)

**RLS:** Users can only see/modify their own entries, admins can see all

---

### 5. `eod_queue_tasks` (Task Queue)

**Purpose:** Pre-staged tasks ready to be started

```sql
CREATE TABLE IF NOT EXISTS eod_queue_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES eod_clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES recurring_task_templates(id) ON DELETE SET NULL,
  
  -- Task Details (pre-filled if from template)
  task_description TEXT NOT NULL,
  default_task_type TEXT CHECK (default_task_type IN ('quick', 'standard', 'deep_work')),
  default_categories TEXT[],
  default_priority TEXT CHECK (default_priority IN (
    'immediate_impact',
    'daily',
    'weekly',
    'monthly',
    'evergreen',
    'trigger_based'
  )),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `template_id` - If created from a template (NULL if manually added)
- `default_*` - Pre-filled values that populate Task Modal when started

**Business Logic:**
- When "Start Task" clicked, create `eod_time_entries` with defaults
- Delete queue entry after task started
- Queue persists across days

**RLS:** Users can only see/modify their own queue tasks

---

### 6. `recurring_task_templates` (Task Templates)

**Purpose:** Saved templates for recurring tasks

```sql
CREATE TABLE IF NOT EXISTS recurring_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Template Details
  template_name TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Defaults (Optional)
  default_client UUID REFERENCES eod_clients(id) ON DELETE SET NULL,
  default_task_type TEXT CHECK (default_task_type IN ('quick', 'standard', 'deep_work')),
  default_categories TEXT[],
  default_priority TEXT CHECK (default_priority IN (
    'immediate_impact',
    'daily',
    'weekly',
    'monthly',
    'evergreen',
    'trigger_based'
  )),
  
  -- Future Feature
  auto_queue_enabled BOOLEAN DEFAULT FALSE,
  auto_queue_time TIME, -- e.g., 09:00:00 for 9 AM daily
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `template_name` - Display name (e.g., "Daily Email Check")
- `description` - Task description that gets copied to queue
- `default_*` - Values that pre-populate the task

**Business Logic:**
- Click "Add to Queue" → Creates entry in `eod_queue_tasks`
- All defaults are copied to queue task
- Future: `auto_queue_enabled` will auto-create queue tasks daily

**RLS:** Users can only see/modify their own templates

---

### 7. `mood_entries` (Mood Check-Ins)

**Purpose:** Tracks user mood throughout the day

```sql
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  mood_level TEXT NOT NULL CHECK (mood_level IN (
    'happy',
    'neutral', 
    'stressed',
    'anxious',
    'tired',
    'energized',
    'frustrated',
    'content'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mood_entries_user_timestamp ON mood_entries(user_id, timestamp DESC);
```

**Fields:**
- `timestamp` - When mood was recorded
- `mood_level` - Selected mood state

**Business Logic:**
- Triggered 2 seconds after clock-in
- Re-triggered every 30 minutes (max 5/hour)
- Used for Focus Score and Energy Level calculations

**RLS:** Users can only see/modify their own mood entries, admins can see all (for dashboard)

---

### 8. `energy_entries` (Energy Check-Ins)

**Purpose:** Tracks user energy levels throughout the day

```sql
CREATE TABLE IF NOT EXISTS energy_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  energy_level TEXT NOT NULL CHECK (energy_level IN (
    'high',
    'medium',
    'low'
  )),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_energy_entries_user_timestamp ON energy_entries(user_id, timestamp DESC);
```

**Fields:**
- `timestamp` - When energy was recorded
- `energy_level` - Self-reported energy state

**Business Logic:**
- Shown alongside mood check (same popup)
- Every 30 minutes while clocked in
- Used for Energy Level metric and Work Rhythm analysis

**RLS:** Users can only see/modify their own energy entries, admins can see all

---

### 9. `eod_reports` (Daily Reports)

**Purpose:** Container for daily work submissions

```sql
CREATE TABLE IF NOT EXISTS eod_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  
  -- Submission Status
  submitted BOOLEAN DEFAULT FALSE,
  submitted_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_report_date UNIQUE (user_id, report_date)
);
```

**Fields:**
- `report_date` - The date this report covers (EST date)
- `submitted` - Whether user has submitted DAR (prevents deletion)
- `submitted_at` - Timestamp of submission

**Business Logic:**
- One report per user per day
- All completed `eod_time_entries` reference this via `report_id`
- When "Submit DAR" clicked, sets `submitted = TRUE` (no longer deletes report)
- Prevents foreign key violations on `eod_submissions`

**RLS:** Users can only see/modify their own reports

---

### 10. `eod_submissions` (Report Archive)

**Purpose:** Permanent record of submitted daily reports

```sql
CREATE TABLE IF NOT EXISTS eod_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES eod_reports(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Snapshot of work (JSON for flexibility)
  summary_data JSONB,
  total_hours DECIMAL(10,2),
  
  -- Email tracking
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Fields:**
- `report_id` - Links to `eod_reports`
- `summary_data` - JSON snapshot of all tasks, times, comments
- `total_hours` - Calculated total hours for the day
- `email_sent` - Whether notification email was sent to manager

**Business Logic:**
- Created when user clicks "Submit DAR"
- `ON DELETE RESTRICT` prevents deletion of referenced reports
- Email automatically sent to managers/admins

**RLS:** Users can see their own submissions, admins can see all

---

## 🎨 Task Modal System

### What Is the Task Modal?

The **Task Settings Modal** appears when:
1. User starts a new task
2. User starts a task from queue
3. User resumes a paused task

### Database Fields Used

| Modal Field | Database Column | Required | Notes |
|-------------|----------------|----------|-------|
| Task Type | `task_type` | No | Quick/Standard/Deep Work |
| Goal Duration | `goal_duration_minutes` | No | For milestone notifications |
| Task Intent | `task_intent` | No | Build/Fix/Learn/etc. |
| Task Categories | `task_categories` | No | Array of tags |
| Task Priority | `task_priority` | **YES** | Required before completion |
| Task Status | `task_status` | No | Defaults to 'in_progress' |

### Task Priority - REQUIRED Logic

**Database Enforcement:**
```sql
-- In application code (EODPortal.tsx):
// Cannot complete task without priority
if (!activeTaskPriority) {
  toast.error("Please select a task priority before completing");
  return;
}
```

**Why It's Critical:**
- Used for Smart DAR Dashboard insights
- Helps managers understand work distribution
- Identifies reactive vs. proactive work patterns

---

## 🔔 Notification System Database

### Overview

The notification system has 3 types:
1. **Mood/Energy Check-Ins** (5 per hour limit)
2. **Task Milestone Reminders** (UNLIMITED)
3. **Paused Task Alerts** (UI-only, no database)

### Notification State (Stored in React State, Not DB)

```typescript
// In EODPortal.tsx
const [triggeredMilestones, setTriggeredMilestones] = useState<{
  [taskId: string]: Set<number>
}>({});

const [notificationCount, setNotificationCount] = useState(0);
const [notificationWindowStart, setNotificationWindowStart] = useState(Date.now());
```

### Task Milestone Notification Logic

**Triggered at these percentages:**
- 20%, 40%, 50%, 60%, 75%, 80%, 90%, 100%, 110%, 120%

**Database Query:**
```typescript
// Calculate progress
const progressPercent = (entry.accumulated_seconds / 60) / entry.goal_duration_minutes * 100;

// Check if milestone reached and not yet triggered
if (progressPercent >= 50 && !triggeredMilestones[entry.id]?.has(50)) {
  // Play sound
  playNotificationSound();
  
  // Show toast popup
  toast({
    title: "🎯 Task Progress: 50%",
    description: `Halfway there!\n${currentMinutes} of ${goalMinutes} minutes`,
    duration: 5000,
    style: { background: PASTEL_COLORS.blueberryMilk }
  });
  
  // Mark milestone as triggered (prevents duplicates)
  setTriggeredMilestones(prev => ({
    ...prev,
    [entry.id]: prev[entry.id].add(50)
  }));
}
```

**Key Points:**
- Uses `accumulated_seconds` (current work time)
- Compares to `goal_duration_minutes` (target time)
- Stored per-task to prevent duplicate notifications
- NO DATABASE WRITES (performance optimization)

### Mood/Energy Check-In Logic

**Frequency:**
- First check: 2 seconds after clock-in
- Subsequent: Every 30 minutes

**Rate Limiting:**
```typescript
const NOTIFICATION_LIMIT = 5; // Max per hour
const NOTIFICATION_WINDOW = 60 * 60 * 1000; // 1 hour in ms

// Check if we've hit the limit
if (notificationCount >= NOTIFICATION_LIMIT) {
  const timeElapsed = Date.now() - notificationWindowStart;
  if (timeElapsed < NOTIFICATION_WINDOW) {
    return; // Suppress notification
  }
  // Reset counter after window expires
  setNotificationCount(0);
  setNotificationWindowStart(Date.now());
}
```

**Database Writes:**
```sql
-- When user completes mood check
INSERT INTO mood_entries (user_id, mood_level, timestamp)
VALUES ($1, $2, NOW());

INSERT INTO energy_entries (user_id, energy_level, timestamp)
VALUES ($1, $2, NOW());
```

### Notification Sound

**File:** `/public/notification.mp3`

**Implementation:**
```typescript
// utils/notificationSound.ts
let audioContext: AudioContext | null = null;

export const initializeAudio = () => {
  if (typeof window !== 'undefined' && !audioContext) {
    audioContext = new AudioContext();
  }
};

export const playNotificationSound = async () => {
  const audio = new Audio('/notification.mp3');
  audio.volume = 0.3; // 30% volume
  await audio.play();
};
```

**Triggered For:**
- ✅ Task milestone reached
- ✅ Mood/energy check-in popup
- ✅ DAR submission success
- ❌ NOT for paused task alerts (silent)

---

## 📊 Smart DAR Dashboard Metrics Logic

### Overview

All metrics are calculated client-side from database queries. No pre-computed metrics stored in database.

---

### 1. Efficiency Score

**What It Measures:** Ratio of active work time to total clocked-in time

**Database Query:**
```sql
-- Get all time entries for user in date range
SELECT 
  SUM(accumulated_seconds) as total_active_seconds
FROM eod_time_entries
WHERE user_id = $1
  AND started_at >= $2
  AND started_at <= $3;

-- Get all clock-in sessions
SELECT 
  clock_in_time,
  clock_out_time
FROM eod_clock_ins
WHERE user_id = $1
  AND clock_in_time >= $2
  AND clock_in_time <= $3;
```

**Calculation Logic:**
```typescript
const calculateEfficiency = (entries, clockIns) => {
  // Total active work time
  const totalActiveSeconds = entries.reduce((sum, e) => sum + (e.accumulated_seconds || 0), 0);
  
  // Total clocked-in time
  const totalClockedSeconds = clockIns.reduce((sum, c) => {
    const end = c.clock_out_time ? new Date(c.clock_out_time) : new Date();
    const start = new Date(c.clock_in_time);
    return sum + (end - start) / 1000;
  }, 0);
  
  // Efficiency = (active / clocked) * 100
  const efficiency = totalClockedSeconds > 0 
    ? (totalActiveSeconds / totalClockedSeconds) * 100 
    : 0;
  
  return Math.round(efficiency);
};
```

**Score Interpretation:**
- 80-100% = Excellent (Green)
- 60-79% = Good (Blue)
- 40-59% = Needs Improvement (Yellow)
- 0-39% = Poor (Red)

---

### 2. Focus Score

**What It Measures:** Work concentration based on task types, mood, energy, and enjoyment

**Database Query:**
```sql
SELECT 
  e.task_type,
  e.enjoyment_rating,
  e.accumulated_seconds,
  m.mood_level,
  en.energy_level
FROM eod_time_entries e
LEFT JOIN mood_entries m ON m.user_id = e.user_id 
  AND m.timestamp BETWEEN e.started_at AND COALESCE(e.completed_at, NOW())
LEFT JOIN energy_entries en ON en.user_id = e.user_id
  AND en.timestamp BETWEEN e.started_at AND COALESCE(e.completed_at, NOW())
WHERE e.user_id = $1
  AND e.started_at >= $2
  AND e.started_at <= $3;
```

**Calculation Logic:**
```typescript
const calculateFocusScore = (entries) => {
  let totalScore = 0;
  let maxScore = 0;
  
  entries.forEach(entry => {
    // Base score from task type
    let score = 0;
    if (entry.task_type === 'deep_work') score = 100;
    else if (entry.task_type === 'standard') score = 70;
    else if (entry.task_type === 'quick') score = 50;
    
    // Boost for high enjoyment
    if (entry.enjoyment_rating >= 4) score += 20;
    
    // Reduce for negative mood
    if (entry.mood_level === 'stressed' || entry.mood_level === 'anxious') {
      score -= 10;
    }
    
    // Reduce for low energy
    if (entry.energy_level === 'low') {
      score -= 10;
    }
    
    // Weight by time spent
    const weight = entry.accumulated_seconds || 0;
    totalScore += score * weight;
    maxScore += 100 * weight;
  });
  
  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
};
```

**Score Interpretation:**
- 80-100% = Excellent Focus
- 60-79% = Good Focus
- 40-59% = Scattered
- 0-39% = Very Distracted

---

### 3. Completion Rate

**What It Measures:** Percentage of tasks actually completed vs. started

**Database Query:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_count,
  COUNT(*) as total_count
FROM eod_time_entries
WHERE user_id = $1
  AND started_at >= $2
  AND started_at <= $3;
```

**Calculation Logic:**
```typescript
const calculateCompletionRate = (entries) => {
  const total = entries.length;
  const completed = entries.filter(e => e.completed_at !== null).length;
  
  return total > 0 ? Math.round((completed / total) * 100) : 0;
};
```

---

### 4. Task Velocity

**What It Measures:** Productivity points earned based on task complexity

**Point System:**
- Quick Task = 1 point
- Standard Task = 2 points
- Deep Work = 3 points

**Database Query:**
```sql
SELECT 
  task_type,
  COUNT(*) as count
FROM eod_time_entries
WHERE user_id = $1
  AND completed_at IS NOT NULL
  AND started_at >= $2
  AND started_at <= $3
GROUP BY task_type;
```

**Calculation Logic:**
```typescript
const calculateVelocity = (entries) => {
  return entries.reduce((total, entry) => {
    if (!entry.completed_at) return total; // Only count completed tasks
    
    switch (entry.task_type) {
      case 'deep_work': return total + 3;
      case 'standard': return total + 2;
      case 'quick': return total + 1;
      default: return total;
    }
  }, 0);
};
```

---

### 5. Work Rhythm

**What It Measures:** Consistency of work patterns throughout the day

**Database Query:**
```sql
SELECT 
  started_at,
  completed_at,
  accumulated_seconds,
  is_paused
FROM eod_time_entries
WHERE user_id = $1
  AND started_at >= $2
  AND started_at <= $3
ORDER BY started_at ASC;
```

**Calculation Logic:**
```typescript
const calculateWorkRhythm = (entries) => {
  // Group tasks by hour of day
  const hourlyWork = new Map<number, number>();
  
  entries.forEach(entry => {
    const hour = new Date(entry.started_at).getHours();
    const minutes = (entry.accumulated_seconds || 0) / 60;
    hourlyWork.set(hour, (hourlyWork.get(hour) || 0) + minutes);
  });
  
  // Calculate consistency (lower variance = more rhythmic)
  const hours = Array.from(hourlyWork.values());
  const avg = hours.reduce((sum, h) => sum + h, 0) / hours.length;
  const variance = hours.reduce((sum, h) => sum + Math.pow(h - avg, 2), 0) / hours.length;
  const stdDev = Math.sqrt(variance);
  
  // Convert to 0-100 score (lower deviation = higher score)
  const rhythmScore = Math.max(0, 100 - (stdDev / avg) * 100);
  
  return Math.round(rhythmScore);
};
```

**Score Interpretation:**
- 80-100% = Highly consistent rhythm
- 60-79% = Moderate consistency
- 40-59% = Irregular patterns
- 0-39% = Chaotic work schedule

---

### 6. Energy Level

**What It Measures:** Average energy based on self-reported check-ins

**Database Query:**
```sql
SELECT 
  energy_level,
  timestamp
FROM energy_entries
WHERE user_id = $1
  AND timestamp >= $2
  AND timestamp <= $3
ORDER BY timestamp DESC;
```

**Calculation Logic:**
```typescript
const calculateEnergyLevel = (energyEntries) => {
  if (energyEntries.length === 0) return 0;
  
  // Convert to numeric
  const scores = energyEntries.map(e => {
    switch (e.energy_level) {
      case 'high': return 100;
      case 'medium': return 60;
      case 'low': return 20;
      default: return 0;
    }
  });
  
  // Average
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  
  return Math.round(avg);
};
```

---

### 7. Estimation Accuracy

**What It Measures:** How accurate users are at predicting task duration

**Database Query:**
```sql
SELECT 
  goal_duration_minutes,
  accumulated_seconds
FROM eod_time_entries
WHERE user_id = $1
  AND goal_duration_minutes IS NOT NULL
  AND completed_at IS NOT NULL
  AND started_at >= $2
  AND started_at <= $3;
```

**Calculation Logic:**
```typescript
const calculateEstimationAccuracy = (goalMinutes, actualSeconds) => {
  if (!goalMinutes || !actualSeconds) {
    return { accuracy: 0, color: COLORS.softGray, label: 'N/A' };
  }
  
  const actualMinutes = actualSeconds / 60; // Convert seconds to minutes
  const accuracy = (goalMinutes / actualMinutes) * 100;
  const difference = Math.abs(100 - accuracy);
  
  if (difference <= 20) {
    return { 
      accuracy: Math.round(accuracy), 
      color: COLORS.pastelMint, 
      label: 'Accurate' 
    };
  } else if (difference <= 50) {
    return { 
      accuracy: Math.round(accuracy), 
      color: COLORS.pastelYellow, 
      label: 'Slightly Off' 
    };
  } else {
    return { 
      accuracy: Math.round(accuracy), 
      color: COLORS.pastelPeach, 
      label: 'Far Off' 
    };
  }
};
```

**Labels:**
- **Accurate** - Within 20% of goal (±12 minutes for 1 hour task)
- **Slightly Off** - 21-50% difference
- **Far Off** - More than 50% difference

---

### 8. Consistency Score (Streak Tracking)

**What It Measures:** How many consecutive days user has been active

**Database Query:**
```sql
SELECT DISTINCT
  DATE(started_at AT TIME ZONE 'America/New_York') as work_date,
  SUM(accumulated_seconds) OVER (PARTITION BY DATE(started_at AT TIME ZONE 'America/New_York')) as daily_seconds
FROM eod_time_entries
WHERE user_id = $1
  AND started_at >= $2
ORDER BY work_date DESC;
```

**Calculation Logic:**
```typescript
const calculateConsistencyScore = (entries) => {
  // Group by EST date
  const dailyWork = new Map<string, number>();
  
  entries.forEach(entry => {
    const dateKey = getDateKeyEST(new Date(entry.started_at || entry.created_at));
    const minutes = (entry.accumulated_seconds || 0) / 60;
    dailyWork.set(dateKey, (dailyWork.get(dateKey) || 0) + minutes);
  });
  
  // Find longest streak
  const dates = Array.from(dailyWork.keys()).sort();
  let currentStreak = 0;
  let longestStreak = 0;
  
  for (let i = 0; i < dates.length; i++) {
    if (i === 0 || isConsecutiveDay(dates[i-1], dates[i])) {
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  
  return {
    currentStreak,
    longestStreak,
    totalActiveDays: dailyWork.size
  };
};
```

**Key Points:**
- ✅ Uses `started_at` for accuracy (not `created_at`)
- ✅ Timezone-aware (EST conversion)
- ✅ Only counts days with actual work (>0 minutes)

---

### 9. Task Priority Distribution

**What It Measures:** Percentage breakdown of task types

**Database Query:**
```sql
SELECT 
  task_priority,
  COUNT(*) as count,
  SUM(accumulated_seconds) as total_seconds
FROM eod_time_entries
WHERE user_id = $1
  AND completed_at IS NOT NULL
  AND started_at >= $2
  AND started_at <= $3
GROUP BY task_priority;
```

**Visualization:**
```typescript
const priorityColors = {
  immediate_impact: '#FF6B6B', // Red
  daily: '#4ECDC4',           // Teal
  weekly: '#95E1D3',          // Mint
  monthly: '#C7CEEA',         // Lavender
  evergreen: '#FFDAB9',       // Peach
  trigger_based: '#FFE66D'    // Yellow
};

// Render as donut chart or bar chart
```

---

## 🎨 UI Features & Database Mapping

### Luxury Macaroon Theme Colors

**Defined in:** `src/pages/EODPortal.tsx`

```typescript
const PASTEL_COLORS = {
  // Primary Pastels
  lavenderCloud: '#D8C8FF',
  blushPink: '#F8D6E0',
  honeyButter: '#FFE9B5',
  pistachioCream: '#CFF5D6',
  blueberryMilk: '#BFD9FF',
  
  // Accents
  peachSouffle: '#FFE5D9',
  mintMatcha: '#D4F4E7',
  
  // Text
  darkText: '#2D3748',
  softGray: '#718096',
  
  // Buttons
  submitButtonGradient: 'linear-gradient(135deg, #8E7AB5, #A08CD9)', // Darker muted purple
};
```

**Applied To:**
- Clock-In buttons
- Active task card headers
- Pause/Complete buttons
- Task status badges
- Template cards
- Toast notifications
- Submit DAR button

---

### Active Task Card UI

**Database Fields Displayed:**

```typescript
// Active Task Card shows:
{
  task_description,           // Main heading
  client_name,                // Subheading
  accumulated_seconds,        // Live timer (MM:SS)
  task_type,                  // Badge (Quick/Standard/Deep Work)
  task_priority,              // Dropdown (must select before complete)
  task_comments,              // Textarea (required for completion)
  task_link,                  // Input field (optional)
  screenshot_urls,            // File upload + preview grid
  goal_duration_minutes       // Progress bar if set
}
```

**Buttons:**
- **Pause** - Sets `is_paused = TRUE`, stops timer
- **Complete** - Validates comments + priority, sets `completed_at`, shows enjoyment popup

---

### Paused Tasks List UI

**Query:**
```sql
SELECT * FROM eod_time_entries
WHERE user_id = $1
  AND is_paused = TRUE
  AND completed_at IS NULL
ORDER BY updated_at DESC;
```

**Displayed Data:**
- Task description
- Time spent so far (`accumulated_seconds` → formatted as "Xh Ym")
- "Resume" button → Sets `is_paused = FALSE`, `is_active = TRUE`
- "Delete" button → Soft delete (sets `deleted_at` if column exists, or hard delete)

---

### Queue Tasks UI

**Query:**
```sql
SELECT 
  q.*,
  c.name as client_name,
  t.template_name
FROM eod_queue_tasks q
LEFT JOIN eod_clients c ON c.id = q.client_id
LEFT JOIN recurring_task_templates t ON t.id = q.template_id
WHERE q.user_id = $1
ORDER BY q.created_at ASC;
```

**Displayed Data:**
- Task description
- Client name (if set)
- Template name (if created from template)
- "▶️ Start" button → Opens Task Modal with defaults
- "🗑 Delete" button → Removes from queue

---

### Recurring Task Templates UI

**Query:**
```sql
SELECT 
  t.*,
  c.name as default_client_name
FROM recurring_task_templates t
LEFT JOIN eod_clients c ON c.id = t.default_client
WHERE t.user_id = $1
ORDER BY t.created_at DESC;
```

**Template Card Shows:**
- Template name (large heading)
- Description
- Default settings (type, categories, priority) as badges
- "➕ Add to Queue" → Creates `eod_queue_tasks` entry
- "✏️ Edit" → Opens edit modal
- "🗑 Delete" → Removes template

---

### History Tab UI

**Query:**
```sql
SELECT 
  e.*,
  c.name as client_name
FROM eod_time_entries e
JOIN eod_clients c ON c.id = e.client_id
WHERE e.user_id = $1
  AND e.completed_at IS NOT NULL
  AND DATE(e.started_at AT TIME ZONE 'America/New_York') = $2
ORDER BY e.completed_at DESC;
```

**Table Columns:**
- Task Description
- Client
- Duration (formatted from `accumulated_seconds`)
- Priority (colored badge)
- Status (colored badge)
- Enjoyment (star rating)
- Link (clickable if present)
- Screenshots (thumbnail grid)

---

## 🔒 Row Level Security (RLS) Policies

### Policy Philosophy

1. **Users can only see their own data** (except admins)
2. **Admins can see all users' data** (for dashboard analytics)
3. **No user can modify another user's data**
4. **Clients are public** (all authenticated users can see all clients)

---

### Full RLS Policy SQL

```sql
-- =====================================================
-- PROFILES
-- =====================================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- CLIENTS
-- =====================================================

-- All authenticated users can view all clients
CREATE POLICY "Authenticated users can view clients"
  ON eod_clients FOR SELECT
  TO authenticated
  USING (true);

-- Admins can insert/update/delete clients
CREATE POLICY "Admins can manage clients"
  ON eod_clients FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- CLOCK-INS
-- =====================================================

-- Users can view their own clock-ins
CREATE POLICY "Users can view own clock-ins"
  ON eod_clock_ins FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own clock-ins
CREATE POLICY "Users can insert own clock-ins"
  ON eod_clock_ins FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own clock-ins
CREATE POLICY "Users can update own clock-ins"
  ON eod_clock_ins FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all clock-ins
CREATE POLICY "Admins can view all clock-ins"
  ON eod_clock_ins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- TIME ENTRIES (Tasks)
-- =====================================================

-- Users can view their own time entries
CREATE POLICY "Users can view own time entries"
  ON eod_time_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own time entries
CREATE POLICY "Users can insert own time entries"
  ON eod_time_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own time entries
CREATE POLICY "Users can update own time entries"
  ON eod_time_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own time entries
CREATE POLICY "Users can delete own time entries"
  ON eod_time_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all time entries
CREATE POLICY "Admins can view all time entries"
  ON eod_time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- QUEUE TASKS
-- =====================================================

-- Users can manage their own queue tasks
CREATE POLICY "Users can manage own queue tasks"
  ON eod_queue_tasks FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- RECURRING TASK TEMPLATES
-- =====================================================

-- Users can manage their own templates
CREATE POLICY "Users can manage own templates"
  ON recurring_task_templates FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- MOOD ENTRIES
-- =====================================================

-- Users can manage their own mood entries
CREATE POLICY "Users can manage own mood entries"
  ON mood_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all mood entries (for dashboard)
CREATE POLICY "Admins can view all mood entries"
  ON mood_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- ENERGY ENTRIES
-- =====================================================

-- Users can manage their own energy entries
CREATE POLICY "Users can manage own energy entries"
  ON energy_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all energy entries (for dashboard)
CREATE POLICY "Admins can view all energy entries"
  ON energy_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- EOD REPORTS
-- =====================================================

-- Users can manage their own reports
CREATE POLICY "Users can manage own reports"
  ON eod_reports FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON eod_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );

-- =====================================================
-- EOD SUBMISSIONS
-- =====================================================

-- Users can view their own submissions
CREATE POLICY "Users can view own submissions"
  ON eod_submissions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
  ON eod_submissions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON eod_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
    )
  );
```

---

## ⚡ Indexes & Performance Optimization

### Critical Indexes

```sql
-- Time entries - most queried table
CREATE INDEX idx_time_entries_user_started ON eod_time_entries(user_id, started_at DESC);
CREATE INDEX idx_time_entries_user_completed ON eod_time_entries(user_id, completed_at DESC);
CREATE INDEX idx_time_entries_active ON eod_time_entries(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_time_entries_paused ON eod_time_entries(user_id, is_paused) WHERE is_paused = TRUE;
CREATE INDEX idx_time_entries_report ON eod_time_entries(report_id);

-- Clock-ins
CREATE INDEX idx_clock_ins_user_time ON eod_clock_ins(user_id, clock_in_time DESC);
CREATE INDEX idx_clock_ins_active ON eod_clock_ins(user_id, is_active) WHERE is_active = TRUE;

-- Queue tasks
CREATE INDEX idx_queue_tasks_user ON eod_queue_tasks(user_id, created_at DESC);

-- Templates
CREATE INDEX idx_templates_user ON recurring_task_templates(user_id, created_at DESC);

-- Mood/Energy
CREATE INDEX idx_mood_entries_user_timestamp ON mood_entries(user_id, timestamp DESC);
CREATE INDEX idx_energy_entries_user_timestamp ON energy_entries(user_id, timestamp DESC);

-- Reports
CREATE INDEX idx_reports_user_date ON eod_reports(user_id, report_date DESC);
CREATE INDEX idx_reports_submitted ON eod_reports(user_id, submitted) WHERE submitted = FALSE;

-- Submissions
CREATE INDEX idx_submissions_user ON eod_submissions(user_id, submitted_at DESC);
CREATE INDEX idx_submissions_report ON eod_submissions(report_id);
```

### Query Optimization Tips

**❌ BAD - Sequential scan:**
```sql
SELECT * FROM eod_time_entries WHERE task_description ILIKE '%bug%';
```

**✅ GOOD - Uses index:**
```sql
SELECT * FROM eod_time_entries 
WHERE user_id = $1 
  AND started_at >= $2 
  AND started_at <= $3;
```

**✅ GOOD - Partial index for active tasks:**
```sql
SELECT * FROM eod_time_entries 
WHERE user_id = $1 
  AND is_active = TRUE;
-- Uses idx_time_entries_active
```

---

## 📜 Migration History

### Applied Migrations (Chronological)

1. **Initial Schema** - Created base tables
2. **RLS Policies** - Added row-level security
3. **Recurring Task Templates** - `20251120_create_recurring_task_templates.sql`
4. **Mood/Energy Tables** - `20251120_create_mood_energy_tables.sql`
5. **EOD Reports Submitted Fields** - `20251120_add_eod_reports_submitted_fields.sql`
6. **Admin Dashboard Access** - `20251120_fix_admin_dashboard_access.sql`
7. **Comprehensive Fix** - `20251120_fix_all_database_issues.sql`

### Latest Migration: `20251120_fix_all_database_issues.sql`

**What It Does:**

1. ✅ Adds `submitted` and `submitted_at` to `eod_reports`
2. ✅ Creates `mood_entries` table with RLS policies
3. ✅ Creates `energy_entries` table with RLS policies
4. ✅ Creates indexes for mood/energy queries
5. ✅ Fixes `eod_submissions` RLS policies (allows inserts)
6. ✅ Adds admin view access to all tables

**Safety:**
- ✅ Idempotent (safe to re-run)
- ✅ No data deletion
- ✅ Only additive changes
- ✅ Uses `IF NOT EXISTS` and `DROP IF EXISTS` safely

---

## 🔍 Common Queries Reference

### Get User's Active Task
```sql
SELECT * FROM eod_time_entries
WHERE user_id = $1
  AND is_active = TRUE
LIMIT 1;
```

### Get User's Paused Tasks
```sql
SELECT * FROM eod_time_entries
WHERE user_id = $1
  AND is_paused = TRUE
  AND completed_at IS NULL
ORDER BY updated_at DESC;
```

### Get Today's Completed Tasks (EST)
```sql
SELECT * FROM eod_time_entries
WHERE user_id = $1
  AND completed_at IS NOT NULL
  AND DATE(started_at AT TIME ZONE 'America/New_York') = CURRENT_DATE
ORDER BY completed_at DESC;
```

### Get User's Current Clock-In Status
```sql
SELECT c.*, cl.name as client_name
FROM eod_clock_ins c
JOIN eod_clients cl ON cl.id = c.client_id
WHERE c.user_id = $1
  AND c.is_active = TRUE
ORDER BY c.clock_in_time DESC;
```

### Get User's Queue Tasks
```sql
SELECT q.*, c.name as client_name
FROM eod_queue_tasks q
LEFT JOIN eod_clients c ON c.id = q.client_id
WHERE q.user_id = $1
ORDER BY q.created_at ASC;
```

### Get User's Templates
```sql
SELECT t.*, c.name as default_client_name
FROM recurring_task_templates t
LEFT JOIN eod_clients c ON c.id = t.default_client
WHERE t.user_id = $1
ORDER BY t.created_at DESC;
```

### Get Dashboard Data (Last 7 Days)
```sql
SELECT 
  e.*,
  m.mood_level,
  m.timestamp as mood_timestamp,
  en.energy_level,
  en.timestamp as energy_timestamp
FROM eod_time_entries e
LEFT JOIN mood_entries m ON m.user_id = e.user_id
  AND m.timestamp BETWEEN e.started_at AND COALESCE(e.completed_at, NOW())
LEFT JOIN energy_entries en ON en.user_id = e.user_id
  AND en.timestamp BETWEEN e.started_at AND COALESCE(e.completed_at, NOW())
WHERE e.user_id = $1
  AND e.started_at >= NOW() - INTERVAL '7 days'
ORDER BY e.started_at DESC;
```

---

## 🎯 Key Takeaways

### Critical Database Design Decisions

1. **`started_at` vs `created_at`**
   - ✅ Use `started_at` for all time-based metrics
   - ✅ Use `started_at || created_at` for backwards compatibility
   - ❌ Do NOT use `created_at` for streak/consistency calculations

2. **Task Priority is REQUIRED**
   - ✅ Enforced in UI (cannot complete without selecting)
   - ✅ Critical for dashboard insights
   - ✅ Helps identify work patterns

3. **Report Deletion vs. Submission Flag**
   - ✅ `eod_reports.submitted = TRUE` preserves foreign keys
   - ❌ DO NOT delete `eod_reports` after submission
   - ✅ Prevents `eod_submissions` foreign key violations

4. **Notification State vs. Database**
   - ✅ Milestone notifications stored in React state (performance)
   - ✅ Mood/energy entries stored in database (analytics)
   - ✅ 5/hour limit prevents notification fatigue

5. **Admin Access Pattern**
   - ✅ Separate RLS policies for users vs. admins
   - ✅ Admins can view all data for dashboard
   - ❌ Admins cannot modify other users' data

---

## 📞 Support & Maintenance

### For Database Changes

1. Always create a new migration file
2. Use `IF NOT EXISTS` for idempotency
3. Test on local Supabase instance first
4. Run migration in production SQL Editor
5. Verify with `COUNT(*)` queries
6. Update this documentation

### For Schema Questions

Contact: Developer Team  
Reference: This document + User Guide

---

**Document End**

*For user-facing documentation, see: `EOD_PORTAL_USER_GUIDE.md`*  
*For deployment instructions, see: `DEPLOYMENT.md` (if exists)*

