# 📊 CALL REPORTING ACCURACY - IMPLEMENTATION PLAN

## Current State Analysis

### ✅ What's Already Working

1. **Call Initiation Logging** (Lines 240-252 in `DialpadCTI.tsx`):
   - When a call is made via Dialpad CTI, it's logged to the database
   - Includes: `dialpad_call_id`, `caller_number`, `callee_number`, `rep_id`, contact/deal associations

2. **Dialpad API Integration**:
   - `dialpad-sync` edge function exists to fetch calls from Dialpad API
   - `dialpad-webhook` edge function for real-time updates
   - `dialpad_tokens` table stores user OAuth tokens

3. **Call Analytics**:
   - Reports pull from `calls` table
   - Multiple report components: `Reports.tsx`, `DetailedCallReports.tsx`, `InteractiveDashboard.tsx`

### ❌ What's Missing/Broken

1. **Incomplete Call Data**:
   - Calls are logged when initiated but NOT updated when completed
   - Missing: actual duration, final outcome, recording URL, transcript
   - No automatic sync from Dialpad after call ends

2. **Manual Call Logs vs. Actual Calls**:
   - Manual call logs (via `CallLogForm`) are separate from Dialpad calls
   - No reconciliation between the two
   - Duplicate entries possible

3. **Webhook Processing**:
   - Webhook exists but may not be properly updating existing call records
   - Need to verify webhook is configured in Dialpad portal

4. **Analytics Data Source**:
   - Reports only pull from local `calls` table
   - Not pulling fresh data from Dialpad API
   - Missing calls that weren't logged locally

---

## 🎯 Solution: Comprehensive Call Tracking System

### Phase 1: Enhance Call Lifecycle Tracking

#### A. Update Call Record When Call Ends

**File:** `src/components/calls/DialpadCTI.tsx`

Add a function to update call records when call completes:

```typescript
const updateCallOnEnd = async (callId: string, callData: any) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get call details from Dialpad API
    const { data: tokenData } = await supabase
      .from('dialpad_tokens')
      .select('access_token')
      .eq('user_id', user.id)
      .single();

    if (!tokenData?.access_token) return;

    const response = await fetch(`https://dialpad.com/api/v2/calls/${callId}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (response.ok) {
      const dialpadCall = await response.json();
      
      // Update the call record with complete data
      await supabase
        .from('calls')
        .update({
          duration_seconds: dialpadCall.duration,
          call_status: 'completed',
          recording_url: dialpadCall.recording?.url || null,
          transcript: dialpadCall.transcript || null,
          dialpad_metadata: dialpadCall,
          // Keep existing call_outcome unless it needs to be updated
        })
        .eq('dialpad_call_id', callId);
    }
  } catch (error) {
    console.error('Error updating call on end:', error);
  }
};
```

#### B. Add Real-Time Call Status Monitoring

Use Dialpad CTI events to track call lifecycle:

```typescript
// Listen for call end events
useEffect(() => {
  const handleCallEnd = (event: any) => {
    if (event.data?.call_id) {
      updateCallOnEnd(event.data.call_id, event.data);
    }
  };

  window.addEventListener('dialpad_call_ended', handleCallEnd);
  return () => window.removeEventListener('dialpad_call_ended', handleCallEnd);
}, []);
```

### Phase 2: Automatic Dialpad Sync

#### A. Create Scheduled Sync Job

**New File:** `src/hooks/useDialpadAutoSync.ts`

```typescript
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDialpadAutoSync(intervalMinutes: number = 15) {
  useEffect(() => {
    const syncCalls = async () => {
      try {
        // Get last sync time
        const lastSync = localStorage.getItem('last_dialpad_sync');
        const startTime = lastSync || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        // Call sync edge function
        const { data, error } = await supabase.functions.invoke('dialpad-sync', {
          body: {
            start_time: startTime,
            limit: 100,
          },
        });

        if (!error) {
          localStorage.setItem('last_dialpad_sync', new Date().toISOString());
          console.log('Dialpad sync completed:', data);
        }
      } catch (error) {
        console.error('Auto-sync error:', error);
      }
    };

    // Initial sync
    syncCalls();

    // Set up interval
    const interval = setInterval(syncCalls, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes]);
}
```

#### B. Integrate Auto-Sync in Main App

**File:** `src/App.tsx` or main layout component

```typescript
import { useDialpadAutoSync } from '@/hooks/useDialpadAutoSync';

function App() {
  // Auto-sync every 15 minutes
  useDialpadAutoSync(15);
  
  // ... rest of app
}
```

### Phase 3: Enhanced Dialpad Sync Edge Function

#### A. Improve `dialpad-sync` to Handle Updates

**File:** `supabase/functions/dialpad-sync/index.ts`

Enhance to:
1. Check for existing calls by `dialpad_call_id`
2. Update existing records instead of creating duplicates
3. Preserve manual call_outcome if set
4. Add recording URLs and transcripts

```typescript
for (const call of calls) {
  // Check if call already exists
  const { data: existing } = await supabase
    .from('calls')
    .select('id, call_outcome')
    .eq('dialpad_call_id', call.id)
    .maybeSingle();

  const callData = {
    dialpad_call_id: call.id,
    call_direction: call.direction,
    caller_number: call.from_number,
    callee_number: call.to_number,
    call_timestamp: call.started_at,
    duration_seconds: call.duration,
    call_status: call.state,
    recording_url: call.recording?.url || null,
    transcript: call.transcript || null,
    dialpad_metadata: call,
  };

  if (existing) {
    // Update existing call, but preserve manual call_outcome if set
    await supabase
      .from('calls')
      .update({
        ...callData,
        // Only update call_outcome if it's still the default
        ...(existing.call_outcome === 'introduction' && {
          call_outcome: mapDialpadOutcome(call.disposition),
        }),
      })
      .eq('id', existing.id);
  } else {
    // Insert new call
    await supabase
      .from('calls')
      .insert({
        ...callData,
        call_outcome: mapDialpadOutcome(call.disposition),
        outbound_type: call.direction === 'outbound' ? 'outbound call' : null,
      });
  }
}
```

### Phase 4: Webhook Enhancement

#### A. Update Webhook to Handle All Call Events

**File:** `supabase/functions/dialpad-webhook/index.ts`

Ensure webhook handles:
- `call.created` - Log new call
- `call.updated` - Update call status
- `call.completed` - Add duration, recording, transcript
- `call.recording_ready` - Add recording URL

```typescript
const handleWebhook = async (event: any) => {
  const { type, data } = event;
  
  switch (type) {
    case 'call.created':
      await handleCallCreated(data);
      break;
    case 'call.updated':
    case 'call.completed':
      await handleCallUpdated(data);
      break;
    case 'call.recording_ready':
      await handleRecordingReady(data);
      break;
  }
};

const handleCallUpdated = async (callData: any) => {
  const { data: existing } = await supabase
    .from('calls')
    .select('id, call_outcome')
    .eq('dialpad_call_id', callData.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('calls')
      .update({
        duration_seconds: callData.duration,
        call_status: callData.state,
        recording_url: callData.recording?.url || null,
        transcript: callData.transcript || null,
        dialpad_metadata: callData,
      })
      .eq('id', existing.id);
  }
};
```

### Phase 5: Analytics Enhancement

#### A. Add "Sync from Dialpad" Button to Reports

**File:** `src/pages/Reports.tsx`

```typescript
const syncFromDialpad = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke('dialpad-sync', {
      body: {
        start_time: filters.dateRange.from?.toISOString(),
        end_time: filters.dateRange.to?.toISOString(),
        limit: 500,
      },
    });

    if (error) throw error;

    toast({
      title: "Sync Complete",
      description: `Synced ${data.synced_count} calls from Dialpad`,
    });

    // Refresh metrics
    await fetchMetrics();
  } catch (error) {
    toast({
      title: "Sync Failed",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

// Add button in UI
<Button onClick={syncFromDialpad} variant="outline">
  <RefreshCw className="mr-2 h-4 w-4" />
  Sync from Dialpad
</Button>
```

#### B. Show Dialpad Data Quality Indicator

Add indicator showing:
- Total calls in database
- Calls with Dialpad data
- Calls missing Dialpad data
- Last sync time

```typescript
<Card>
  <CardHeader>
    <CardTitle>Data Quality</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span>Total Calls:</span>
        <span className="font-bold">{metrics.totalCalls}</span>
      </div>
      <div className="flex justify-between">
        <span>With Dialpad Data:</span>
        <span className="font-bold text-green-600">
          {metrics.callsWithDialpadId}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Manual Only:</span>
        <span className="font-bold text-yellow-600">
          {metrics.totalCalls - metrics.callsWithDialpadId}
        </span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Last Sync:</span>
        <span>{lastSyncTime}</span>
      </div>
    </div>
  </CardContent>
</Card>
```

---

## 📋 Implementation Checklist

### Immediate (High Priority)

- [ ] **Update `DialpadCTI.tsx`** - Add `updateCallOnEnd` function
- [ ] **Add call end event listener** - Track when calls complete
- [ ] **Create `useDialpadAutoSync` hook** - Auto-sync every 15 minutes
- [ ] **Integrate auto-sync in App** - Add to main layout

### Short Term (Medium Priority)

- [ ] **Enhance `dialpad-sync` edge function** - Handle updates, not just inserts
- [ ] **Add outcome mapping** - Map Dialpad dispositions to CRM outcomes
- [ ] **Update webhook handler** - Process all call lifecycle events
- [ ] **Configure Dialpad webhook** - Ensure webhook URL is set in Dialpad portal

### Long Term (Nice to Have)

- [ ] **Add "Sync from Dialpad" button** - Manual sync in Reports
- [ ] **Add data quality indicators** - Show sync status
- [ ] **Add call recording player** - Play recordings inline
- [ ] **Add transcript viewer** - Display AI transcripts
- [ ] **Reconciliation UI** - Match manual logs with Dialpad calls

---

## 🧪 Testing Plan

### Test 1: Call Initiation Tracking
1. Make a call via Dialpad CTI
2. Verify call is logged to database immediately
3. Check `dialpad_call_id` is populated

### Test 2: Call Completion Update
1. Complete a call
2. Wait 30 seconds
3. Verify call record is updated with duration
4. Check recording URL is added (if available)

### Test 3: Auto-Sync
1. Make calls directly in Dialpad (not via CRM)
2. Wait 15 minutes for auto-sync
3. Verify calls appear in CRM
4. Check all data is accurate

### Test 4: Manual Sync
1. Click "Sync from Dialpad" button
2. Verify sync completes without errors
3. Check call count increases
4. Verify no duplicates created

### Test 5: Analytics Accuracy
1. Navigate to Reports
2. Compare call counts with Dialpad dashboard
3. Verify durations match
4. Check all calls are included

---

## 🔧 Configuration Required

### 1. Dialpad Webhook Setup

In Dialpad Admin Portal:
1. Go to Settings → Integrations → Webhooks
2. Add webhook URL: `https://[your-project].supabase.co/functions/v1/dialpad-webhook`
3. Subscribe to events:
   - `call.created`
   - `call.updated`
   - `call.completed`
   - `call.recording_ready`

### 2. Environment Variables

Ensure these are set in Supabase:
- `DIALPAD_API_KEY` - For edge functions
- `SUPABASE_URL` - Auto-configured
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-configured

### 3. OAuth Scopes

Verify Dialpad OAuth app has:
- `calls.read` - Read call history
- `calls.write` - Initiate calls
- `recordings.read` - Access recordings (optional)

---

## 📊 Expected Improvements

### Before
- ❌ Calls logged only when initiated
- ❌ Missing duration, recordings, transcripts
- ❌ Manual logs separate from actual calls
- ❌ Analytics incomplete
- ❌ No automatic sync

### After
- ✅ Complete call lifecycle tracking
- ✅ Automatic updates with duration, recordings, transcripts
- ✅ Unified call data (manual + Dialpad)
- ✅ Accurate analytics
- ✅ Auto-sync every 15 minutes
- ✅ Manual sync option
- ✅ Data quality indicators

---

## 🚀 Next Steps

1. **Review this plan** with the team
2. **Prioritize** which features to implement first
3. **Test** Dialpad API access and webhook configuration
4. **Implement** Phase 1 (call lifecycle tracking)
5. **Deploy** and monitor
6. **Iterate** based on results

---

**Status:** Ready for implementation
**Estimated Time:** 4-6 hours for Phases 1-3
**Dependencies:** Dialpad API access, webhook configuration

