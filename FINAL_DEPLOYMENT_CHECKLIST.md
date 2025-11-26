# ✅ Final Deployment Checklist - Dialpad Stats API

## 🎯 What's Been Fixed

Based on [Dialpad's Stats API documentation](https://developers.dialpad.com/docs/stats-api-dialpad-analytics), I've completely rewritten the sync function to use the correct API.

### ✅ Code Changes Complete:

1. **Edge Function** - `supabase/functions/dialpad-sync/index.ts`
   - ✅ Uses correct Stats API (POST → Poll → Download CSV)
   - ✅ Handles two-step process
   - ✅ Parses CSV data
   - ✅ Inserts into database

2. **Frontend Hook** - `src/hooks/useDialpadAutoSync.ts`
   - ✅ Updated parameters for Stats API
   - ✅ Uses `days_ago_start/end` instead of `start_time`

3. **App.tsx** - Still disabled (will re-enable after testing)

---

## 📋 Deployment Steps

### Step 1: Deploy Edge Function (5 minutes)

**Go to Supabase Dashboard**:
1. https://supabase.com/dashboard
2. Select your project
3. Click **Edge Functions** → **dialpad-sync**
4. Click **Edit** or **Code Editor**
5. Copy ALL contents from `supabase/functions/dialpad-sync/index.ts`
6. Paste and click **Deploy**
7. Wait for "Deployed successfully"

### Step 2: Test Manually First (2 minutes)

Before enabling auto-sync, test the API manually:

```bash
# Test the Stats API
curl -X POST https://dialpad.com/api/v2/stats \
  -H "Authorization: Bearer YOUR_DIALPAD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "records",
    "stat_type": "calls",
    "days_ago_start": 0,
    "days_ago_end": 0,
    "timezone": "America/Los_Angeles"
  }'
```

**Expected Response**:
```json
{
  "id": "some-id-123",
  "state": "pending"
}
```

**If you get 404 or error**: Your API key might not have access to Stats API. Contact Dialpad support.

### Step 3: Check CSV Structure (Optional but Recommended)

1. Use the ID from Step 2
2. Wait 20 seconds
3. Check status:
```bash
curl https://dialpad.com/api/v2/stats/some-id-123 \
  -H "Authorization: Bearer YOUR_DIALPAD_API_KEY"
```

4. If `state: "done"`, download the CSV:
```bash
curl {download_url} > sample_calls.csv
```

5. Open `sample_calls.csv` and check the column order
6. Update the CSV parsing in the edge function if needed

### Step 4: Re-enable Auto-Sync (1 minute)

**File**: `src/App.tsx`

Change:
```typescript
// FROM:
useDialpadAutoSync(15, false);

// TO:
useDialpadAutoSync(15, true);
```

Save the file.

### Step 5: Test in CRM (2 minutes)

1. Refresh browser (Cmd+Shift+R)
2. Open Console (F12)
3. Wait ~1 minute for sync to trigger
4. Look for logs:
   ```
   🔄 Starting Dialpad auto-sync...
   ✅ Initiating Dialpad Stats API report...
   ✅ Stats API report initiated: abc123
   ✅ Report status: done
   ✅ Downloading report CSV...
   ✅ Syncing X calls from Dialpad Stats API
   ✅ Dialpad sync completed
   ```

### Step 6: Verify Database (1 minute)

Run in Supabase SQL Editor:
```sql
-- Check if new calls were synced
SELECT 
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE dialpad_metadata IS NOT NULL) as synced_calls,
    MAX(call_timestamp) as latest_call
FROM public.calls
WHERE call_timestamp >= NOW() - INTERVAL '24 hours';
```

**Expected**: `synced_calls` should be > 0

### Step 7: Check Reports (1 minute)

1. Go to **Reports** page in CRM
2. Check **Call Source Breakdown**
3. Should show accurate Dialpad vs Manual split

---

## ⚠️ Troubleshooting

### Issue: "API key doesn't have access to Stats API"

**Solution**: 
- Contact Dialpad support
- Ask to enable Stats API access for your API key
- Or use OAuth tokens instead of API key

### Issue: CSV columns don't match

**Symptoms**: Calls synced but data is wrong (wrong numbers, durations, etc.)

**Solution**:
1. Download a sample CSV manually (Step 3 above)
2. Check the actual column order
3. Update this section in the edge function:
```typescript
calls.push({
  id: row[0],           // Adjust index
  direction: row[1],    // Adjust index
  duration: row[2],     // Adjust index
  from_number: row[3],  // Adjust index
  to_number: row[4],    // Adjust index
  state: row[5],        // Adjust index
  started_at: row[6],   // Adjust index
});
```

### Issue: "Office ID required"

**Symptoms**: Error says office_id is required

**Solution**: Add your office ID to the hook:

**File**: `src/hooks/useDialpadAutoSync.ts`
```typescript
body: {
  days_ago_start: 0,
  days_ago_end: 0,
  office_id: 'YOUR_OFFICE_ID',  // Add this line
}
```

### Issue: Report takes too long

**Symptoms**: "Report not ready after 30 seconds"

**Solution**: The edge function times out. This is normal for large date ranges. Stick to `days_ago_start: 0, days_ago_end: 0` (today only).

---

## 🎯 Success Criteria

After deployment, you should see:

- ✅ No console errors
- ✅ Sync logs appear every 15 minutes
- ✅ New calls appear in database
- ✅ Reports show accurate data
- ✅ Call Source Breakdown is correct

---

## 📊 Current Status

### ✅ Completed:
- [x] Understood Dialpad Stats API structure
- [x] Rewrote edge function for Stats API
- [x] Updated frontend hook parameters
- [x] Created deployment documentation

### 🔲 To Do:
- [ ] Deploy edge function to Supabase
- [ ] Test Stats API manually
- [ ] Verify CSV structure
- [ ] Re-enable auto-sync
- [ ] Test in CRM
- [ ] Verify database
- [ ] Check reports

---

## 📁 Files Modified

1. ✅ `supabase/functions/dialpad-sync/index.ts` - Complete rewrite for Stats API
2. ✅ `src/hooks/useDialpadAutoSync.ts` - Updated parameters
3. ⏸️ `src/App.tsx` - Auto-sync still disabled (re-enable after testing)

---

## 🚀 Quick Start

**If you just want to get it working fast**:

1. Deploy edge function via Supabase Dashboard
2. Test manually with curl (Step 2 above)
3. If successful, re-enable in `App.tsx`
4. Refresh CRM and check console

**Total Time**: ~10-15 minutes

---

**Reference**: [Dialpad Stats API Documentation](https://developers.dialpad.com/docs/stats-api-dialpad-analytics)

**Status**: ✅ **READY TO DEPLOY**

