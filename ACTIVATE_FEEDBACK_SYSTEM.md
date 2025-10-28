# Activate Feedback System - Action Required

## ⚠️ Important: Run Migration First!

Before the feedback system will work, you **MUST** run the database migration to create the `user_feedback` table.

## Step 1: Run the Migration

### Option A: Using Supabase CLI (Recommended)
```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
supabase db push
```

### Option B: Manual SQL Execution
1. Go to your Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Open the file: `supabase/migrations/20251028_create_feedback_table.sql`
4. Copy all the SQL content
5. Paste into the SQL Editor
6. Click **Run**

## Step 2: Verify Migration

Run this query in Supabase SQL Editor to verify:
```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_feedback'
);

-- Should return: true
```

## Step 3: Test the System

### Test as DAR User:
1. Log in to DAR Portal
2. Click "Feedback" in sidebar
3. Submit a test feedback with an image
4. Verify success message appears

### Test as Admin:
1. Log in to Admin Dashboard
2. Click "Feedback" tab
3. Verify you can see the test feedback
4. Click "View Details"
5. Change status and add a response
6. Click "Save Response"
7. Verify success message appears

## What the Migration Creates

### Table: `user_feedback`
- Stores all user feedback submissions
- Includes subject, message, images, status, admin responses
- Automatically tracks creation and update timestamps

### Row Level Security (RLS)
- Users can only see their own feedback
- Admins can see all feedback
- Proper access controls enforced

### Policies Created:
1. Users can insert their own feedback
2. Users can view their own feedback
3. Users can update their own feedback
4. Admins can view all feedback
5. Admins can update any feedback
6. Admins can delete feedback

## Troubleshooting

### Error: "relation 'user_feedback' does not exist"
**Solution**: You haven't run the migration yet. Follow Step 1 above.

### Error: "permission denied for table user_feedback"
**Solution**: RLS policies might not be set up. Re-run the migration.

### Can't see feedback tab
**Solution**: 
1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check if you're on the latest build

### Images not uploading
**Solution**: 
1. Verify `eod-images` storage bucket exists in Supabase
2. Check bucket permissions allow uploads
3. Verify user is authenticated

## Storage Bucket Requirements

The feedback system uses the existing `eod-images` storage bucket. If it doesn't exist:

1. Go to Supabase Dashboard → Storage
2. Create bucket named: `eod-images`
3. Set as **Public** bucket
4. Enable RLS policies for uploads

## Migration File Location
```
/Users/jeladiaz/Documents/StafflyFolder/dealdashai/supabase/migrations/20251028_create_feedback_table.sql
```

## After Migration is Complete

✅ DAR users will see "Feedback" tab in sidebar
✅ Admins will see "Feedback" tab in dashboard
✅ All features will work immediately
✅ No code changes needed

---

## Quick Checklist

- [ ] Run migration (Step 1)
- [ ] Verify table exists (Step 2)
- [ ] Test as DAR user (Step 3)
- [ ] Test as Admin (Step 3)
- [ ] Verify images upload correctly
- [ ] Verify admin can respond
- [ ] Deploy to production

---

**Status**: Migration ready to run
**Priority**: Medium (feature is complete, just needs database setup)
**Time Required**: 2-3 minutes

