# 🚀 Quick Start - Deploy in 3 Steps

## Step 1: Database Migration (2 minutes)

1. Open https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Open file: `supabase/migrations/20251126_create_manual_call_logs_table.sql`
6. Copy ALL contents
7. Paste into SQL Editor
8. Click **Run** (or press Cmd+Enter)
9. Wait for "Success" message

**Verify**:
```sql
SELECT COUNT(*) FROM manual_call_logs;
-- Should return 0 (new table is empty)

SELECT COUNT(*) FROM calls WHERE dialpad_metadata IS NOT NULL;
-- Should return 174 (Dialpad calls)
```

---

## Step 2: Fix Edge Function (3 minutes)

1. In Supabase Dashboard, click **Edge Functions** (left sidebar)
2. Find and click **dialpad-sync**
3. Click **Edit Function** or similar
4. Open file: `supabase/functions/dialpad-sync/index.ts`
5. Copy ALL contents
6. Paste into editor (replace everything)
7. Click **Deploy** or **Save**
8. Wait for deployment to complete

**Verify**:
- Look for "Deployed successfully" message
- Check **Logs** tab for any errors

---

## Step 3: Set Environment Variable (1 minute)

1. Still in **dialpad-sync** function page
2. Click **Settings** or **Environment Variables**
3. Check if `DIALPAD_API_KEY` exists
4. **If missing**:
   - Click **Add Variable**
   - Name: `DIALPAD_API_KEY`
   - Value: Your Dialpad API key (get from https://dialpad.com/settings/api)
   - Click **Save**

**Verify**:
- Variable shows in list
- No errors when saving

---

## ✅ Test It Works

1. Go back to your CRM
2. Press **Cmd+Shift+R** (hard refresh)
3. Open Console (F12)
4. Look for:
   ```
   ✅ Starting Dialpad auto-sync...
   ✅ Dialpad sync completed
   ```
5. Go to **Reports** page
6. Check **Call Source Breakdown**:
   - Should show: Dialpad CTI: 174 (100%)
   - Should show: Manual Logs: 0 (0%)

---

## 🎯 Done!

**If you see**:
- ✅ No console errors
- ✅ Sync logs appear
- ✅ Reports show 174 Dialpad calls

**You're all set!** 🎉

---

## ⚠️ If Something Goes Wrong

### Console still shows error?
→ Check Edge Function **Logs** tab for error details

### Reports still show wrong data?
→ Hard refresh browser (Cmd+Shift+R)

### Migration failed?
→ Share the error message

---

**Need Help?** Check `COMPLETE_SOLUTION_SUMMARY.md` for detailed troubleshooting.

