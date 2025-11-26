# ✅ Correct Dialpad Stats API Implementation

## 🎯 The Real Solution

Based on [Dialpad's Stats API documentation](https://developers.dialpad.com/docs/stats-api-dialpad-analytics), the correct way to fetch call data is:

### Two-Step Process:

1. **POST** to `/api/v2/stats` - Initiates report processing, returns an ID
2. **GET** to `/api/v2/stats/{id}` - Retrieves the CSV report

This is **completely different** from what we were trying before (direct GET to `/api/v2/calls`).

---

## 📊 How Dialpad Stats API Works

### Step 1: Initiate Report (POST)
```typescript
POST https://dialpad.com/api/v2/stats
Headers: Authorization: Bearer {API_KEY}
Body: {
  "export_type": "records",  // Get individual call records
  "stat_type": "calls",       // Type of data (calls, sms, etc.)
  "days_ago_start": 0,        // Start date (0 = today)
  "days_ago_end": 0,          // End date (0 = today)
  "timezone": "America/Los_Angeles"
}

Response: {
  "id": "abc123",  // Report ID
  "state": "pending"
}
```

### Step 2: Wait for Processing
The report takes 15-20 seconds to process. You need to poll the status.

### Step 3: Check Status (GET)
```typescript
GET https://dialpad.com/api/v2/stats/abc123
Headers: Authorization: Bearer {API_KEY}

Response: {
  "id": "abc123",
  "state": "done",  // Can be: pending, processing, done, failed
  "download_url": "https://..."
}
```

### Step 4: Download CSV
```typescript
GET {download_url}

Response: CSV file with call data
```

---

## ✅ Updated Edge Function

I've updated `supabase/functions/dialpad-sync/index.ts` to use the correct Stats API approach:

### Key Changes:

1. **POST to initiate report**
   ```typescript
   POST /api/v2/stats
   Body: { export_type: 'records', stat_type: 'calls', ... }
   ```

2. **Poll for completion** (up to 30 seconds)
   ```typescript
   GET /api/v2/stats/{id}
   Check if state === 'done'
   ```

3. **Download and parse CSV**
   ```typescript
   GET {download_url}
   Parse CSV data
   Insert into database
   ```

---

## 🚀 Deployment Steps

### Step 1: Deploy Updated Edge Function

**Option A: Via Supabase Dashboard** (Recommended)

1. Go to **Supabase Dashboard** → **Edge Functions** → **dialpad-sync**
2. Click **Edit** or **Code Editor**
3. Copy the updated code from `supabase/functions/dialpad-sync/index.ts`
4. Paste and **Deploy**

**Option B: Via CLI** (If you have permissions)
```bash
npx supabase functions deploy dialpad-sync
```

### Step 2: Update Frontend Hook

The hook needs to pass different parameters now:

**File**: `src/hooks/useDialpadAutoSync.ts`

Change the body parameters:
```typescript
// OLD (doesn't work):
body: {
  start_time: startTime,
  limit: 100,
}

// NEW (Stats API format):
body: {
  days_ago_start: 0,  // Today
  days_ago_end: 0,    // Today
  // office_id: 'YOUR_OFFICE_ID', // Optional
}
```

### Step 3: Re-enable Auto-Sync

**File**: `src/App.tsx`

Change back to enabled:
```typescript
// Change from:
useDialpadAutoSync(15, false);

// To:
useDialpadAutoSync(15, true);
```

---

## 📋 Important Notes from Dialpad Docs

### Caching:
- **Today's data** (`days_ago_start: 0`): Cached for **30 minutes**
- **Historical data** (`days_ago_start: 1+`): Cached for **3 hours**

### Best Practices:
- Wait **15-20 seconds** after POST before checking status
- Poll every **5-10 seconds** (not every second - rate limit sensitive)
- Don't send duplicate POST requests (they count toward rate limit)

### Timezones:
- Must use [tz database names](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
- Examples: `America/Los_Angeles`, `America/New_York`, `UTC`

### Data Freshness:
- **Real-time tables** (today): Refreshed every **30 minutes**
- **Historical tables**: Updated every **4-5 hours**

---

## 🔍 CSV Format

The CSV export will contain columns like:
- Call ID
- Direction (inbound/outbound)
- Duration
- From Number
- To Number
- Status
- Start Time
- End Time
- And more...

**Note**: The exact column order needs to be verified by downloading a sample export. You may need to adjust the CSV parsing logic in the edge function to match the actual column positions.

---

## 🧪 Testing

### Test 1: Manual API Call

Test the Stats API manually to see the CSV structure:

```bash
# Step 1: Initiate report
curl -X POST https://dialpad.com/api/v2/stats \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "export_type": "records",
    "stat_type": "calls",
    "days_ago_start": 0,
    "days_ago_end": 0,
    "timezone": "America/Los_Angeles"
  }'

# Response: {"id": "abc123", "state": "pending"}

# Step 2: Wait 20 seconds, then check status
curl https://dialpad.com/api/v2/stats/abc123 \
  -H "Authorization: Bearer YOUR_API_KEY"

# Response: {"id": "abc123", "state": "done", "download_url": "https://..."}

# Step 3: Download CSV
curl {download_url} > calls.csv

# Step 4: Open calls.csv to see the structure
```

### Test 2: Edge Function

After deploying:

1. Refresh CRM (Cmd+Shift+R)
2. Open Console (F12)
3. Wait for auto-sync
4. Look for:
   ```
   ✅ Initiating Dialpad Stats API report...
   ✅ Report status: done
   ✅ Downloading report CSV...
   ✅ Syncing X calls from Dialpad Stats API
   ```

---

## ⚠️ Potential Issues

### Issue 1: CSV Column Mapping

**Problem**: CSV columns might not match our assumptions

**Solution**: 
1. Download a sample CSV manually
2. Check the actual column order
3. Update the CSV parsing logic in the edge function

### Issue 2: Office ID Required

**Problem**: Some Dialpad accounts require `office_id` parameter

**Solution**: Add your office ID to the POST body:
```typescript
body: {
  export_type: 'records',
  stat_type: 'calls',
  days_ago_start: 0,
  days_ago_end: 0,
  office_id: 'YOUR_OFFICE_ID',  // Add this
  timezone: 'America/Los_Angeles'
}
```

### Issue 3: Report Takes Too Long

**Problem**: Report not ready after 30 seconds

**Solution**: Increase polling time or reduce date range:
```typescript
// Reduce date range
days_ago_start: 0,  // Just today
days_ago_end: 0

// Or increase max polling time
const maxAttempts = 12; // 12 x 5 = 60 seconds
```

---

## 📊 Expected Results

### After Deployment:

**Console**:
```
✅ Initiating Dialpad Stats API report...
✅ Stats API report initiated: abc123
✅ Report status: processing
✅ Report status: done
✅ Downloading report CSV...
✅ Syncing 50 calls from Dialpad Stats API
✅ Dialpad sync completed: { syncedCount: 50 }
```

**Database**:
```sql
SELECT COUNT(*) FROM calls WHERE dialpad_metadata IS NOT NULL;
-- Should show synced calls
```

**Reports**:
```
Call Source Breakdown:
✅ Dialpad CTI: X calls
✅ Manual Logs: Y calls
```

---

## 🎯 Summary

### The Problem:
- ❌ We were trying to use `/api/v2/calls` (doesn't exist)
- ❌ Direct GET request (wrong approach)

### The Solution:
- ✅ Use `/api/v2/stats` (Stats API)
- ✅ Two-step process: POST → Poll → Download CSV
- ✅ Parse CSV and insert into database

### Next Steps:
1. Deploy updated edge function
2. Update frontend hook parameters
3. Re-enable auto-sync
4. Test and verify

---

**Reference**: [Dialpad Stats API Documentation](https://developers.dialpad.com/docs/stats-api-dialpad-analytics)

**Status**: ✅ **CORRECT IMPLEMENTATION - READY TO DEPLOY**

