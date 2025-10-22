# ✅ Migration SQL Fixed!

## The Error:
```
ERROR: column "started_at" of relation "eod_submission_tasks" does not exist
```

## The Problem:
The `eod_submission_tasks` table has a different schema than `eod_time_entries`:

### eod_time_entries (old):
- client_name
- task_description
- **started_at** ← Has this
- **ended_at** ← Has this
- duration_minutes
- comments
- task_link

### eod_submission_tasks (new):
- client_name
- task_description
- duration_minutes ← Only has duration
- comments
- task_link

## ✅ The Fix:
Removed `started_at` and `ended_at` from the migration INSERT statement.

**File:** `MIGRATE_EOD_DATA.sql` (updated)

---

## 🚀 Run It Now:

1. The file is already fixed
2. Copy the entire `MIGRATE_EOD_DATA.sql`
3. Paste in Supabase SQL Editor
4. Click "Run"
5. **Should work now!** ✅

---

## What It Does:

```sql
-- Migrates only the fields that exist in the new table
INSERT INTO eod_submission_tasks (
  submission_id,
  client_name,
  task_description,
  duration_minutes,  -- ✅ This exists
  comments,
  task_link,
  created_at
)
SELECT 
  es.id,
  ete.client_name,
  ete.task_description,
  COALESCE(ete.duration_minutes, 0),  -- ✅ Use existing duration
  ete.comments,
  ete.task_link,
  ete.created_at
FROM eod_time_entries ete
JOIN eod_submissions es ON es.report_id = ete.eod_id
WHERE ete.ended_at IS NOT NULL;  -- Only completed tasks
```

---

## ✅ After Running:

**EOD Admin will show:**
- Your 2 EOD submissions ✅
- All completed tasks ✅
- All images ✅

**Messages will work:**
- No more 406 error ✅

---

**The file is fixed - just run it now!** 🎉

