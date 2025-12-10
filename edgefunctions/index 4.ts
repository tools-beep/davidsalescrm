import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dialpadApiKey = Deno.env.get('DIALPAD_API_KEY');
    if (!dialpadApiKey) {
      throw new Error('DIALPAD_API_KEY not configured');
    }

    const { to_number, from_number, contact_id, deal_id } = await req.json();

    if (!to_number) {
      throw new Error('to_number is required');
    }

    console.log('Initiating call to:', to_number);

    let callData;
    let lastError;

    // Method 1: Try user-specific endpoint with 'me' (works with user-level API keys)
    try {
      console.log('Attempting call via /users/me/initiate_call endpoint...');
      const dialpadResponse = await fetch('https://dialpad.com/api/v2/users/me/initiate_call', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dialpadApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone_number: to_number,
          outbound_caller_id: from_number,
        }),
      });

      if (dialpadResponse.ok) {
        callData = await dialpadResponse.json();
        console.log('Call initiated successfully via /users/me endpoint');
      } else {
        const errorText = await dialpadResponse.text();
        console.error('Users/me endpoint failed:', errorText);
        lastError = `Users/me endpoint failed: ${dialpadResponse.status} - ${errorText}`;
      }
    } catch (error) {
      console.error('Error with users/me endpoint:', error);
      lastError = error.message;
    }

    // Method 2: Try to fetch user ID and use generic call endpoint
    if (!callData) {
      try {
        console.log('Fetching user ID from /users/me...');
        const userResponse = await fetch('https://dialpad.com/api/v2/users/me', {
          headers: {
            'Authorization': `Bearer ${dialpadApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          const userId = userData?.id;
          
          if (userId) {
            console.log('User ID fetched:', userId);
            console.log('Attempting call via /call endpoint...');
            
            const dialpadResponse = await fetch('https://dialpad.com/api/v2/call', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${dialpadApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                phone_number: to_number,
                user_id: userId,
                outbound_caller_id: from_number,
              }),
            });

            if (dialpadResponse.ok) {
              callData = await dialpadResponse.json();
              console.log('Call initiated successfully via /call endpoint');
            } else {
              const errorText = await dialpadResponse.text();
              console.error('Call endpoint failed:', errorText);
              lastError = `Call endpoint failed: ${dialpadResponse.status} - ${errorText}`;
            }
          }
        } else {
          console.error('Failed to fetch user ID:', userResponse.status);
          lastError = `Failed to fetch user ID: ${userResponse.status}`;
        }
      } catch (error) {
        console.error('Error with call endpoint:', error);
        lastError = error.message;
      }
    }

    if (!callData) {
      throw new Error(`Failed to initiate call. Last error: ${lastError}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        call: callData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Make call error:', error);
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