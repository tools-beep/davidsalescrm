# Smart DAR Snapshot Debugging Guide

## Issue: Historical data not showing after DAR submission

### Step 1: Check if migration was run

Run this SQL in Supabase SQL Editor:

```sql
-- Check if the table exists and has the new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'smart_dar_snapshots'
ORDER BY ordinal_position;
```

**Expected columns:**
- `completed_tasks_details` (jsonb)
- `productivity_data` (jsonb)
- `behavior_insights` (jsonb)

If these columns are missing, run the migration:

```sql
-- Add completed tasks details (for Task Analysis section)
ALTER TABLE public.smart_dar_snapshots 
ADD COLUMN IF NOT EXISTS completed_tasks_details JSONB DEFAULT '[]';

COMMENT ON COLUMN public.smart_dar_snapshots.completed_tasks_details IS 
  'Array of completed task objects with full details for Task Analysis section';

-- Add productivity data (for 9 metrics bar chart)
ALTER TABLE public.smart_dar_snapshots 
ADD COLUMN IF NOT EXISTS productivity_data JSONB DEFAULT '[]';

COMMENT ON COLUMN public.smart_dar_snapshots.productivity_data IS 
  'Array of productivity metrics for bar chart';

-- Add behavior insights (for Behavior Insights section)
ALTER TABLE public.smart_dar_snapshots 
ADD COLUMN IF NOT EXISTS behavior_insights JSONB DEFAULT '[]';

COMMENT ON COLUMN public.smart_dar_snapshots.behavior_insights IS 
  'Array of behavior insight objects';
```

### Step 2: Check if snapshot was saved

After submitting DAR for December 1st, run:

```sql
-- Check for December 1st snapshot
SELECT 
  id,
  user_id,
  snapshot_date,
  efficiency_score,
  completion_rate,
  total_tasks,
  completed_tasks,
  points_earned,
  created_at
FROM smart_dar_snapshots
WHERE snapshot_date = '2025-12-01'
ORDER BY created_at DESC;
```

### Step 3: Check browser console logs

After submitting DAR, check for these logs:
- `📊 COMPREHENSIVE Smart DAR Snapshot:` - Should show the snapshot data being saved
- `✅ COMPREHENSIVE Smart DAR metrics snapshot saved successfully!` - Confirms save succeeded
- `⚠️ Failed to save Smart DAR snapshot:` - Shows if there was an error

### Step 4: Check RLS policies

Run this to verify RLS policies allow inserts:

```sql
-- Check RLS policies on smart_dar_snapshots
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'smart_dar_snapshots';
```

Expected policies:
- Users can INSERT their own snapshots
- Users can SELECT their own snapshots
- Admins can SELECT all snapshots

### Step 5: Manual test insert

Try inserting a test snapshot manually:

```sql
-- Replace YOUR_USER_ID with your actual user ID
INSERT INTO smart_dar_snapshots (
  user_id,
  snapshot_date,
  efficiency_score,
  completion_rate,
  total_tasks,
  completed_tasks,
  completed_tasks_details,
  productivity_data,
  behavior_insights
) VALUES (
  'YOUR_USER_ID',
  '2025-12-01',
  75.5,
  80.0,
  10,
  8,
  '[]'::jsonb,
  '[{"name":"Efficiency","value":75.5}]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (user_id, snapshot_date) 
DO UPDATE SET
  efficiency_score = EXCLUDED.efficiency_score,
  updated_at = now();
```

### Step 6: Check date format

The system uses EST dates in format `YYYY-MM-DD`. Verify:

```sql
-- Check what date format is being saved
SELECT 
  snapshot_date,
  to_char(snapshot_date, 'YYYY-MM-DD') as formatted_date,
  user_id
FROM smart_dar_snapshots
ORDER BY created_at DESC
LIMIT 5;
```

### Common Issues:

1. **Migration not run**: New columns don't exist → Run migration SQL
2. **RLS blocking**: User can't insert → Check RLS policies
3. **Date mismatch**: Saved as '2025-12-01' but querying '2025-12-02' → Check timezone
4. **Snapshot save failed silently**: Check browser console for errors
5. **Table doesn't exist**: Run the main migration first (`20251201_smart_dar_snapshots.sql`)

### Quick Fix Commands:

```sql
-- Drop and recreate the table if needed (CAUTION: deletes all data)
DROP TABLE IF EXISTS smart_dar_snapshots CASCADE;

-- Then run the full migration from 20251201_smart_dar_snapshots.sql
-- Then run the additional columns migration from 20251201_add_snapshot_details.sql
```

