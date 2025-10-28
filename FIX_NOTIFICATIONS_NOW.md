# Fix Notifications - Quick Setup Guide

## Problem
User started a task but you didn't receive a notification.

## Root Cause
The notification system requires a database migration that hasn't been run yet.

---

## SOLUTION: Run the Migration (Choose One Method)

### Method 1: Supabase CLI (Fastest - 30 seconds)

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
supabase db push
```

That's it! ✅

---

### Method 2: Manual SQL (2 minutes)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click **SQL Editor** in the left sidebar

2. **Run the Diagnostic Check First**
   - Copy the contents of `CHECK_NOTIFICATIONS_SETUP.sql`
   - Paste into SQL Editor
   - Click **Run**
   - If table_exists = `false`, continue to step 3
   - If table_exists = `true`, skip to "Troubleshooting" section

3. **Run the Migration**
   - Open file: `supabase/migrations/20251028_create_notifications_system.sql`
   - Copy ALL the SQL content (199 lines)
   - Paste into SQL Editor
   - Click **Run**
   - Wait for "Success" message

4. **Verify Installation**
   - Run the diagnostic check again (step 2)
   - Verify:
     - `table_exists` = `true` ✅
     - 3 triggers listed ✅

---

## After Running Migration

### Test Immediately

1. **Open Admin Portal** (keep it open)
2. **Open DAR Portal** (in another browser/tab)
3. **As DAR User**:
   - Select a client
   - Start a new task
4. **Check Admin Portal**:
   - Should see notification bell with red badge ✅
   - Should see toast notification pop up ✅
   - Click bell to see notification ✅

---

## What the Migration Creates

### 1. Notifications Table
Stores all admin notifications with:
- Type (task_started, clock_in, feedback)
- Title and message
- User who triggered it
- Redirect URL
- Read status
- Timestamp

### 2. Three Database Triggers

**Trigger 1: Task Started**
- Fires when: User starts a new task
- Creates notification with: User name, task description, client
- Redirects to: DAR Live tab

**Trigger 2: Clock In**
- Fires when: User clocks in
- Creates notification with: User name, client
- Redirects to: DAR Live tab

**Trigger 3: Feedback**
- Fires when: User submits feedback
- Creates notification with: User name, feedback subject
- Redirects to: Feedback tab

### 3. Security Policies
- Only admins can see notifications
- Automatic user isolation
- Secure by default

---

## Troubleshooting

### "Table already exists" Error
**Meaning**: Migration was already run
**Action**: Skip to "Notifications Still Not Working" section

### "Function does not exist" Error
**Meaning**: Missing prerequisite function
**Solution**: Run this first:
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
Then run the main migration again.

### Notifications Still Not Working

**Check 1: Verify Triggers Are Installed**
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers
WHERE trigger_name LIKE 'trigger_notify%';
```
Should return 3 rows. If not, re-run migration.

**Check 2: Test Trigger Manually**
```sql
-- This should create a test notification
SELECT create_admin_notification(
    'task_started',
    'Test Notification',
    'This is a test',
    auth.uid(),
    'Test User',
    NULL,
    '/admin?tab=live'
);

-- Check if it was created
SELECT * FROM admin_notifications ORDER BY created_at DESC LIMIT 1;
```

**Check 3: Verify You're Logged in as Admin**
```sql
SELECT role FROM user_profiles WHERE user_id = auth.uid();
```
Should return: `admin`

**Check 4: Check Browser Console**
- Open Admin Portal
- Press F12 (Developer Tools)
- Go to Console tab
- Look for errors
- Look for "New notification:" logs

**Check 5: Verify Real-Time is Working**
- In Supabase Dashboard
- Go to Database → Replication
- Verify `admin_notifications` table is enabled for real-time

---

## Quick Verification Script

Run this in Supabase SQL Editor to verify everything:

```sql
-- 1. Check table exists
SELECT 'Table exists: ' || EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'admin_notifications'
)::text;

-- 2. Check triggers exist
SELECT 'Triggers installed: ' || COUNT(*)::text || '/3'
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_notify_task_started',
  'trigger_notify_clock_in',
  'trigger_notify_new_feedback'
);

-- 3. Check RLS is enabled
SELECT 'RLS enabled: ' || relrowsecurity::text
FROM pg_class
WHERE relname = 'admin_notifications';

-- 4. Check policies exist
SELECT 'Policies: ' || COUNT(*)::text
FROM pg_policies
WHERE tablename = 'admin_notifications';

-- 5. Test notification creation
SELECT 'Creating test notification...';
SELECT create_admin_notification(
    'task_started',
    'Test Notification',
    'If you see this in admin portal, notifications are working!',
    auth.uid(),
    'System Test',
    NULL,
    '/admin?tab=live'
);

-- 6. Check if test notification was created
SELECT 'Test notification created: ' || EXISTS (
  SELECT FROM admin_notifications 
  WHERE title = 'Test Notification'
)::text;
```

**Expected Output**:
```
Table exists: true
Triggers installed: 3/3
RLS enabled: true
Policies: 4
Creating test notification...
Test notification created: true
```

---

## Common Issues

### Issue: "No notifications appear in admin portal"
**Solutions**:
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Log out and log back in
4. Check you're logged in as admin user
5. Check browser console for errors

### Issue: "Toast notification doesn't appear"
**Solutions**:
1. Check browser notification permissions
2. Verify real-time subscription is connected
3. Check browser console for WebSocket errors
4. Try in incognito/private mode

### Issue: "Trigger fires but notification not created"
**Solutions**:
1. Check trigger function for errors:
   ```sql
   SELECT * FROM pg_stat_user_functions 
   WHERE funcname LIKE 'notify_%';
   ```
2. Check PostgreSQL logs in Supabase Dashboard
3. Verify RLS policies allow insertion

---

## Need More Help?

### Check Logs
1. Supabase Dashboard → Logs → Postgres Logs
2. Look for errors related to triggers or notifications
3. Filter by time when task was started

### Manual Test
Create a notification manually to test the UI:
```sql
INSERT INTO admin_notifications (
    type, title, message, user_id, user_name, redirect_url
) VALUES (
    'task_started',
    'Manual Test',
    'This is a manual test notification',
    auth.uid(),
    'Test User',
    '/admin?tab=live'
);
```

Then check admin portal - should see this notification immediately.

---

## Success Checklist

After running migration, verify:
- [ ] Table `admin_notifications` exists ✅
- [ ] 3 triggers installed ✅
- [ ] 4 RLS policies created ✅
- [ ] Test notification appears in admin portal ✅
- [ ] Bell icon shows red badge ✅
- [ ] Clicking notification navigates correctly ✅
- [ ] Real-time updates work ✅

---

**Status**: Waiting for migration
**Time Required**: 30 seconds - 2 minutes
**Risk**: None (new feature, no existing data affected)

