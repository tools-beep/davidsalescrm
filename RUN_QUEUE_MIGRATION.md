# Run Queue Tasks Migration - Quick Guide

## ⚠️ Important: Database Migration Required

The queue tasks persistence feature requires a new database table. You must run this migration before the feature will work.

## Quick Start

### Option 1: Supabase CLI (Recommended - 30 seconds)

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
supabase db push
```

That's it! ✅

### Option 2: Manual SQL (2 minutes)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the SQL below
5. Paste and click **Run**

```sql
-- Create table for persisting queue tasks
CREATE TABLE IF NOT EXISTS eod_queue_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    client_name TEXT NOT NULL,
    task_description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE eod_queue_tasks ENABLE ROW LEVEL SECURITY;

-- Policy for users to manage their own queue tasks
CREATE POLICY "Users can insert their own queue tasks." ON eod_queue_tasks
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own queue tasks." ON eod_queue_tasks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own queue tasks." ON eod_queue_tasks
FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own queue tasks." ON eod_queue_tasks
FOR DELETE USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_eod_queue_tasks_user_client 
ON eod_queue_tasks(user_id, client_name);

-- Set up trigger for updated_at
CREATE TRIGGER update_eod_queue_tasks_updated_at
BEFORE UPDATE ON eod_queue_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE eod_queue_tasks IS 'Stores queued tasks for DAR users per client';
COMMENT ON COLUMN eod_queue_tasks.user_id IS 'User who created the queue task';
COMMENT ON COLUMN eod_queue_tasks.client_name IS 'Client the task is for';
COMMENT ON COLUMN eod_queue_tasks.task_description IS 'Description of the queued task';
```

## Verify Migration

Run this query to confirm the table was created:

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'eod_queue_tasks'
);
```

**Expected Result**: `true`

## Test the Feature

1. Log in to DAR Portal
2. Select a client
3. Add a task to the queue
4. Log out
5. Log back in
6. **Verify**: Queue task is still there ✅

## What This Migration Does

### Creates Table
- Stores queue tasks permanently in database
- Organized by user and client
- Includes timestamps for tracking

### Sets Up Security
- Row Level Security (RLS) enabled
- Users can only see their own tasks
- Automatic user isolation

### Optimizes Performance
- Index on user_id and client_name
- Fast queries for large datasets
- Efficient data retrieval

### Adds Automation
- Auto-update timestamps
- UUID generation
- Cascade deletes (cleanup on user deletion)

## Troubleshooting

### Error: "function update_updated_at_column() does not exist"

This function should already exist from previous migrations. If not, run this first:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Error: "relation 'eod_queue_tasks' already exists"

The table already exists! You're good to go. ✅

### Error: "permission denied"

Make sure you're using the service role key or have admin access to the database.

## After Migration

### What Works Immediately
- ✅ Queue tasks persist across sessions
- ✅ Tasks saved to database
- ✅ No data loss on logout
- ✅ Sync across devices

### No Code Changes Needed
- Frontend code already updated
- No environment variables required
- No additional configuration

## Rollback (If Needed)

To remove the table and start over:

```sql
DROP TABLE IF EXISTS eod_queue_tasks CASCADE;
```

⚠️ **Warning**: This will delete all existing queue tasks!

---

**Migration File**: `supabase/migrations/20251028_create_queue_tasks_table.sql`
**Time Required**: 30 seconds - 2 minutes
**Downtime**: None
**Risk Level**: Low (new feature, no existing data affected)

