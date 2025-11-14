import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser } } = await supabase.auth.getUser(jwt);
    if (!requestingUser) throw new Error('Unauthorized');

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can update user passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      throw new Error('user_id and new_password are required');
    }

    if (new_password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Update the user's password using admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) throw updateError;

    console.log(`Password updated for user ${user_id} by admin ${requestingUser.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Update password error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing Authorization header');
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser } } = await supabase.auth.getUser(jwt);
    if (!requestingUser) throw new Error('Unauthorized');

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can update user passwords' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) {
      throw new Error('user_id and new_password are required');
    }

    if (new_password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Update the user's password using admin API
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      { password: new_password }
    );

    if (updateError) throw updateError;

    console.log(`Password updated for user ${user_id} by admin ${requestingUser.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password updated successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Update password error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

