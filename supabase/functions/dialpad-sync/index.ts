import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { parse } from "https://deno.land/std@0.168.0/encoding/csv.ts";

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

interface StatsAPIResponse {
  id: string;
  state: 'pending' | 'processing' | 'done' | 'failed';
  download_url?: string;
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

    // Fetch calls from Dialpad Stats API (two-step process)
    let requestBody: any = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('No request body provided, using defaults');
    }
    
    const { days_ago_start = 0, days_ago_end = 0, office_id } = requestBody;

    // Step 1: POST to initiate report generation
    console.log('Initiating Dialpad Stats API report...');
    const postBody = {
      export_type: 'records',
      stat_type: 'calls',
      days_ago_start,
      days_ago_end,
      ...(office_id && { office_id }),
      timezone: 'America/Los_Angeles', // Adjust as needed
    };

    const postResponse = await fetch(
      'https://dialpad.com/api/v2/stats',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dialpadApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      }
    );

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      console.error('Dialpad Stats API POST error:', errorText);
      throw new Error(`Dialpad Stats API POST error: ${postResponse.status} - ${errorText}`);
    }

    const statsResponse: StatsAPIResponse = await postResponse.json();
    console.log('Stats API report initiated:', statsResponse.id);

    // Step 2: Poll for report completion (wait up to 30 seconds)
    let attempts = 0;
    const maxAttempts = 6; // 6 attempts x 5 seconds = 30 seconds max
    let reportData: StatsAPIResponse | null = null;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const getResponse = await fetch(
        `https://dialpad.com/api/v2/stats/${statsResponse.id}`,
        {
          headers: {
            'Authorization': `Bearer ${dialpadApiKey}`,
          },
        }
      );

      if (!getResponse.ok) {
        console.error('Failed to check report status');
        attempts++;
        continue;
      }

      reportData = await getResponse.json();
      console.log(`Report status: ${reportData.state}`);

      if (reportData.state === 'done' && reportData.download_url) {
        break;
      } else if (reportData.state === 'failed') {
        throw new Error('Dialpad report generation failed');
      }

      attempts++;
    }

    if (!reportData || reportData.state !== 'done' || !reportData.download_url) {
      throw new Error('Report not ready after 30 seconds. Try again later.');
    }

    // Step 3: Download and parse CSV
    console.log('Downloading report CSV...');
    const csvResponse = await fetch(reportData.download_url);
    if (!csvResponse.ok) {
      throw new Error('Failed to download CSV report');
    }

    const csvText = await csvResponse.text();
    const parsedData = parse(csvText, { skipFirstRow: true });
    
    // Convert CSV rows to call objects (adjust field mapping based on actual CSV structure)
    const calls: any[] = [];
    
    // Parse CSV and extract call data
    // Note: CSV structure needs to be mapped based on actual Dialpad export format
    for (const row of parsedData) {
      if (Array.isArray(row) && row.length > 0) {
        // Map CSV columns to call data (adjust indices based on actual CSV structure)
        calls.push({
          id: row[0], // Call ID
          direction: row[1], // Direction
          duration: parseInt(row[2]) || 0, // Duration
          from_number: row[3], // From number
          to_number: row[4], // To number
          state: row[5] || 'completed', // State
          started_at: row[6], // Start time
          // Add more fields as needed
        });
      }
    }

    console.log(`Syncing ${calls.length} calls from Dialpad Stats API`);

    // Process and insert/update calls
    const processedCalls = [];
    for (const call of calls) {
      // Skip if no call ID
      if (!call.id) continue;

      // Check if call already exists
      const { data: existing } = await supabase
        .from('calls')
        .select('id')
        .eq('dialpad_call_id', call.id)
        .maybeSingle();

      const callData = {
        dialpad_call_id: call.id,
        call_direction: call.direction === 'outbound' ? 'outbound' : 'inbound',
        duration_seconds: Math.floor(call.duration || 0),
        caller_number: call.from_number || null,
        callee_number: call.to_number || null,
        call_status: call.state || 'completed',
        recording_url: null, // Not available in Stats API
        transcript: null, // Not available in Stats API
        dialpad_contact_id: null,
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