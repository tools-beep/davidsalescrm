# EOD Portal Improvements Plan

## Requirements

### 1. Clock-In Function ⏰
- **Separate from timer**: Clock-in tracks when the user starts their workday
- **Records timestamp**: When user clocks in
- **Display**: Show clock-in status and time

### 2. Button Label Change 🔄
- Change "Save & Submit Report" → "Submit EOD"

### 3. Task Comments 💬
- When starting a task timer, allow user to add comments
- Comments stored with the time entry

### 4. Email Function 📧
- Sends EOD report to: `miguel@migueldiaz.ca`
- Email format includes:
  - Clock-in time
  - All tasks completed with:
    - Client name
    - Task description
    - Time spent
    - Comments (if any)
  - Total hours worked
  - Summary/notes
  - Screenshots (if any)

### 5. EOD History 📚
- Store each submitted EOD report
- Allow users to view their previous EOD reports
- Searchable/filterable by date

## Database Changes Needed

### New Table: `eod_clock_ins`
```sql
CREATE TABLE eod_clock_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  clocked_in_at TIMESTAMPTZ NOT NULL,
  clocked_out_at TIMESTAMPTZ,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Update Table: `eod_time_entries`
```sql
ALTER TABLE eod_time_entries 
ADD COLUMN comments TEXT;
```

### New Table: `eod_submissions`
```sql
CREATE TABLE eod_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  report_id UUID REFERENCES eod_reports(id),
  clocked_in_at TIMESTAMPTZ,
  clocked_out_at TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  summary TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Table: `eod_submission_tasks`
```sql
CREATE TABLE eod_submission_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES eod_submissions(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  task_description TEXT NOT NULL,
  duration_minutes INT NOT NULL,
  comments TEXT,
  task_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Implementation Steps

1. ✅ Create database migration
2. ✅ Add clock-in UI component
3. ✅ Update task start dialog to include comments
4. ✅ Change button label
5. ✅ Create email sending function (Edge Function)
6. ✅ Store EOD history on submission
7. ✅ Create EOD history view page

## Email Template

```
Subject: EOD Report - [User Name] - [Date]

Hi Miguel,

Here's the End of Day report for [User Name] on [Date]:

WORK HOURS:
- Clocked In: [Time]
- Clocked Out: [Time]  
- Total Hours: [X.XX hours]

TASKS COMPLETED:
[For each task]
━━━━━━━━━━━━━━━━━━━━━
Client: [Client Name]
Task: [Description]
Time Spent: [XX minutes / X.XX hours]
Comments: [Comments if any]
Link: [Task link if any]

SUMMARY:
[User's summary notes]

SCREENSHOTS:
[List of screenshot URLs if any]

Best regards,
StafflyFolder EOD System
```

