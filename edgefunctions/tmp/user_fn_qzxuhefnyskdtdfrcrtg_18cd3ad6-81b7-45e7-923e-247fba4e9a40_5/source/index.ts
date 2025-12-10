import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    if (!resendApiKey) {
      console.log('RESEND_API_KEY not configured, skipping email notification');
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { eod_id, user_email, user_name } = await req.json();

    if (!eod_id) {
      throw new Error('eod_id is required');
    }

    // Fetch EOD report details
    const { data: report, error: reportError } = await supabase
      .from('eod_reports')
      .select('*')
      .eq('id', eod_id)
      .single();

    if (reportError || !report) {
      console.error('Report fetch error:', reportError);
      throw new Error(`Report not found: ${reportError?.message || 'Unknown error'}`);
    }

    // Fetch user profile separately
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('user_id', report.user_id)
      .single();

    // Fetch time entries for this report
    const { data: timeEntries } = await supabase
      .from('eod_time_entries')
      .select('*')
      .eq('eod_id', eod_id)
      .order('started_at', { ascending: true });

    // Fetch images for this report
    const { data: images } = await supabase
      .from('eod_report_images')
      .select('id, public_url')
      .eq('eod_id', eod_id);

    const userName = user_name || (userProfile ? `${userProfile.first_name} ${userProfile.last_name}` : 'Unknown User');
    const userEmail = user_email || userProfile?.email || 'no-email@example.com';

    // Build a map of client emails to their tasks
    const clientTasksMap = new Map<string, any[]>();
    
    for (const entry of (timeEntries || [])) {
      if (entry.client_name) {
        // Try to find the deal by company name
        const { data: deals } = await supabase
          .from('deals')
          .select('contact_id')
          .ilike('company_name', entry.client_name)
          .limit(1);
        
        if (deals && deals.length > 0 && deals[0].contact_id) {
          // Get the contact email
          const { data: contact } = await supabase
            .from('contacts')
            .select('email')
            .eq('id', deals[0].contact_id)
            .single();
          
          if (contact?.email) {
            if (!clientTasksMap.has(contact.email)) {
              clientTasksMap.set(contact.email, []);
            }
            clientTasksMap.get(contact.email)!.push(entry);
          }
        }
      }
    }

    // Helper function to generate task rows HTML
    const generateTaskRows = (entries: any[]) => {
      let totalMinutes = 0;
      const rows = entries.map((entry: any) => {
        let duration = entry.duration_minutes || 0;
        if (!duration && entry.started_at && entry.ended_at) {
          const start = new Date(entry.started_at).getTime();
          const end = new Date(entry.ended_at).getTime();
          duration = Math.floor((end - start) / (1000 * 60));
        }
        totalMinutes += duration;
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        const taskLink = entry.task_link ? `<br><a href="${entry.task_link}" style="color: #2563eb; text-decoration: none; font-size: 12px;">🔗 Link</a>` : '';
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${entry.client_name}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${entry.task_description}${taskLink}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${entry.comments || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${hours}h ${mins}m</td>
          </tr>
        `;
      }).join('');
      return { rows, totalMinutes };
    };

    // Format clock in/out times
    const clockedIn = report.clocked_in_at ? new Date(report.clocked_in_at).toLocaleString() : 'Not clocked in';
    const clockedOut = report.clocked_out_at ? new Date(report.clocked_out_at).toLocaleString() : 'Not clocked out';

    // 1. Send FULL report to miguel@migueldiaz.ca with ALL tasks
    const fullReport = generateTaskRows(timeEntries || []);
    const fullReportHours = Math.floor(fullReport.totalMinutes / 60);
    const fullReportMins = fullReport.totalMinutes % 60;

    const imagesHtml = (images && images.length > 0) ? `
      <h3 style="color: #2563eb;">📷 Attached Images</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 20px;">
        ${images.map(img => `
          <img src="${img.public_url}" alt="EOD Image" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />
        `).join('')}
      </div>
    ` : '';

    // Send to Miguel with ALL tasks
    const miguelEmailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'StafflyHub EOD <eod@admin.stafflyhq.ai>',
        to: ['miguel@migueldiaz.ca'],
        subject: `EOD Report - ${userName} - ${new Date().toLocaleDateString()}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
            <h2 style="color: #2563eb;">End of Day Report</h2>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 5px 0;"><strong>Team Member:</strong> ${userName}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${userEmail}</p>
              <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin-top: 0; color: #0369a1;">⏰ Clock In/Out</h3>
              <p style="margin: 5px 0;"><strong>Clocked In:</strong> ${clockedIn}</p>
              <p style="margin: 5px 0;"><strong>Clocked Out:</strong> ${clockedOut}</p>
              <p style="margin: 5px 0;"><strong>Total Time:</strong> ${fullReportHours}h ${fullReportMins}m</p>
            </div>

            <h3 style="color: #2563eb;">📋 Tasks Completed (All Clients)</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #e5e7eb;">
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Client</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Task</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Comments</th>
                  <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Duration</th>
                </tr>
              </thead>
              <tbody>
                ${fullReport.rows || '<tr><td colspan="4" style="padding: 10px; text-align: center;">No tasks logged</td></tr>'}
              </tbody>
            </table>

            ${imagesHtml}

            <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
              This is an automated report from StafflyHub EOD Portal
            </p>
          </div>
        `,
      }),
    });

    if (!miguelEmailRes.ok) {
      const errText = await miguelEmailRes.text();
      console.error('Miguel email error:', errText);
      throw new Error(`Failed to send email to Miguel: ${errText}`);
    }

    // 2. Send INDIVIDUAL emails to each client with ONLY their tasks
    for (const [clientEmail, clientTasks] of clientTasksMap.entries()) {
      const clientName = clientTasks[0]?.client_name || 'Valued Client';
      
      // Generate task rows for client (without client name column)
      let clientTotalMinutes = 0;
      const clientTaskRows = clientTasks.map((entry: any) => {
        let duration = entry.duration_minutes || 0;
        if (!duration && entry.started_at && entry.ended_at) {
          const start = new Date(entry.started_at).getTime();
          const end = new Date(entry.ended_at).getTime();
          duration = Math.floor((end - start) / (1000 * 60));
        }
        clientTotalMinutes += duration;
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        const taskLink = entry.task_link ? `<br><a href="${entry.task_link}" style="color: #2563eb; text-decoration: none; font-size: 12px;">🔗 Link</a>` : '';
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${entry.task_description}${taskLink}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${entry.comments || '-'}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${hours}h ${mins}m</td>
          </tr>
        `;
      }).join('');

      const clientHours = Math.floor(clientTotalMinutes / 60);
      const clientMins = clientTotalMinutes % 60;

      const clientEmailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'StafflyHub <hello@admin.stafflyhq.ai>',
          to: [clientEmail],
          subject: `Work Update from ${userName} - ${new Date().toLocaleDateString()}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Work Update for ${clientName}</h2>
              
              <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 5px 0;"><strong>Team Member:</strong> ${userName}</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p style="margin: 5px 0;"><strong>Total Time on Your Project:</strong> ${clientHours}h ${clientMins}m</p>
              </div>

              <h3 style="color: #2563eb;">📋 Tasks Completed for You</h3>
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr style="background: #e5e7eb;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Task</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Comments</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  ${clientTaskRows || '<tr><td colspan="3" style="padding: 10px; text-align: center;">No tasks logged</td></tr>'}
                </tbody>
              </table>

              <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
                This is an automated update from StafflyHub
              </p>
            </div>
          `,
        }),
      });

      if (!clientEmailRes.ok) {
        console.error(`Failed to send email to ${clientEmail}:`, await clientEmailRes.text());
        // Don't throw error for client emails, just log it
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('EOD notify error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

