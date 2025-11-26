# 🚀 Deploy Dialpad Sync Fix - Manual Steps

## ❌ Current Error

```
Dialpad sync error:
FunctionsHttpError: Edge Function returned a non-2xx status code
500 (Internal Server Error)
```

---

## ✅ How to Fix (Manual Deployment)

Since CLI deployment requires special permissions, deploy manually through Supabase Dashboard:

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: **huqmqtilymjtstzxbuww**
3. Click **Edge Functions** in the left sidebar

### Step 2: Find dialpad-sync Function

1. Look for `dialpad-sync` in the list of functions
2. Click on it to open

### Step 3: Update the Function Code

1. Click **Edit Function** or **Code Editor**
2. Replace the entire contents with the fixed code below
3. Click **Deploy** or **Save**

### Step 4: Copy This Fixed Code

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DialpadCall {
  id: string;
  direction: 'inbound' | 'outbound';
  duration: number;
  from_number: string;
  to_number: string;
  state: string;
  recording_url?: string;
  transcript?: string;
  contact_id?: string;
  started_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dialpadApiKey = Deno.env.get('DIALPAD_API_KEY');
    if (!dialpadApiKey) {
      throw new Error('DIALPAD_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch calls from Dialpad API
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('No request body provided, using defaults');
    }
    
    const { start_time, end_time, limit = 100 } = requestBody;
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      ...(start_time && { start_time }),
      ...(end_time && { end_time }),
    });

    console.log('Fetching calls from Dialpad API...');
    const dialpadResponse = await fetch(
      `https://dialpad.com/api/v2/calls?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${dialpadApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!dialpadResponse.ok) {
      const errorText = await dialpadResponse.text();
      console.error('Dialpad API error:', errorText);
      throw new Error(`Dialpad API error: ${dialpadResponse.status} - ${errorText}`);
    }

    const dialpadData = await dialpadResponse.json();
    const calls: DialpadCall[] = dialpadData.items || [];
    
    console.log(`Syncing ${calls.length} calls from Dialpad`);

    // Process and insert/update calls
    const processedCalls = [];
    for (const call of calls) {
      // Check if call already exists
      const { data: existing } = await supabase
        .from('calls')
        .select('id')
        .eq('dialpad_call_id', call.id)
        .maybeSingle();

      const callData = {
        dialpad_call_id: call.id,
        call_direction: call.direction,
        duration_seconds: Math.floor(call.duration / 1000),
        caller_number: call.from_number,
        callee_number: call.to_number,
        call_status: call.state,
        recording_url: call.recording_url || null,
        transcript: call.transcript || null,
        dialpad_contact_id: call.contact_id || null,
        call_timestamp: call.started_at,
        outbound_type: (call.direction === 'outbound' ? 'outbound call' : 'inbound call') as any,
        call_outcome: (call.state === 'completed' ? 'introduction' : 'no answer') as any,
        dialpad_metadata: call,
      };

      if (existing) {
        const { error } = await supabase
          .from('calls')
          .update(callData)
          .eq('id', existing.id);
        
        if (error) {
          console.error('Error updating call:', error);
        } else {
          processedCalls.push({ ...callData, action: 'updated' });
        }
      } else {
        const { error } = await supabase
          .from('calls')
          .insert([callData]);
        
        if (error) {
          console.error('Error inserting call:', error);
        } else {
          processedCalls.push({ ...callData, action: 'created' });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        synced: processedCalls.length,
        total: calls.length,
        calls: processedCalls,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
```

### Step 5: Verify Environment Variables

1. In the same Edge Function page, look for **Settings** or **Environment Variables**
2. Make sure `DIALPAD_API_KEY` is set
3. If not, add it:
   - Key: `DIALPAD_API_KEY`
   - Value: Your Dialpad API key from https://dialpad.com/settings/api

### Step 6: Test the Fix

1. Refresh your CRM page
2. Open browser console (F12)
3. Wait for auto-sync (runs every 15 minutes)
4. Look for:
   ```
   🔄 Starting Dialpad auto-sync...
   ✅ Dialpad sync completed
   ```

---

## 🔍 Alternative: Check if DIALPAD_API_KEY is Missing

The error might be because `DIALPAD_API_KEY` is not set. To check:

1. Go to Supabase Dashboard → Edge Functions → dialpad-sync
2. Click **Logs**
3. Look for recent errors
4. If you see: `DIALPAD_API_KEY not configured`
   - Go to **Settings** → **Environment Variables**
   - Add `DIALPAD_API_KEY` with your Dialpad API key

---

## 🎯 Quick Fix Option

If you don't have a Dialpad API key yet, you can temporarily disable auto-sync:

**File**: `src/App.tsx`

Find this line:
```typescript
useDialpadAutoSync(15, true);
```

Change to:
```typescript
useDialpadAutoSync(15, false);  // Disabled
```

This will stop the sync errors while you set up the Dialpad API key.

---

## ✅ Expected Result After Fix

**Before**:
- ❌ Console error: "Dialpad sync error: 500"
- ❌ No calls syncing from Dialpad

**After**:
- ✅ No console errors
- ✅ Logs show: "🔄 Starting Dialpad auto-sync..."
- ✅ Logs show: "✅ Dialpad sync completed: { syncedCount: X }"
- ✅ Calls appear in database with `dialpad_metadata`

---

## 📋 Summary

**The fix is already in your local code** (`supabase/functions/dialpad-sync/index.ts`).

**You just need to deploy it** by either:
1. ✅ **Manual**: Copy the code into Supabase Dashboard (recommended)
2. ⚠️ **CLI**: Requires special permissions (not working for you)

**After deployment**, verify `DIALPAD_API_KEY` is set in environment variables.

---

**Need Help?** If you're still stuck, share:
1. Screenshot of Edge Functions page in Supabase Dashboard
2. Recent logs from dialpad-sync function
3. Whether DIALPAD_API_KEY environment variable is set

