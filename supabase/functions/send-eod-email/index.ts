import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// CORS headers for all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { submission_id, user_email, user_name } = await req.json()

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch submission data
    const { data: submission, error: submissionError } = await supabase
      .from('eod_submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (submissionError) throw submissionError

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('eod_submission_tasks')
      .select('*')
      .eq('submission_id', submission_id)

    if (tasksError) throw tasksError

    // Fetch images
    const { data: images, error: imagesError } = await supabase
      .from('eod_submission_images')
      .select('*')
      .eq('submission_id', submission_id)

    if (imagesError) throw imagesError

    // Format date
    const submittedDate = new Date(submission.submitted_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Format times
    const clockInTime = submission.clocked_in_at 
      ? new Date(submission.clocked_in_at).toLocaleTimeString('en-US')
      : 'N/A'
    
    const clockOutTime = submission.clocked_out_at
      ? new Date(submission.clocked_out_at).toLocaleTimeString('en-US')
      : 'N/A'

    // Collect unique client emails
    const clientEmails = new Set<string>()
    
    // Build tasks HTML
    let tasksHtml = ''
    tasks?.forEach((task: any) => {
      // Collect client email if present
      if (task.client_email && task.client_email.includes('@')) {
        clientEmails.add(task.client_email)
      }
      
      const hours = Math.floor(task.duration_minutes / 60)
      const mins = task.duration_minutes % 60
      const durationText = hours > 0 
        ? `${hours}h ${mins}m` 
        : `${mins}m`

      // Build screenshots HTML for this task
      let taskScreenshotsHtml = ''
      if (task.comment_images && Array.isArray(task.comment_images) && task.comment_images.length > 0) {
        taskScreenshotsHtml = '<div style="margin-top: 12px;"><div style="color: #6b7280; font-size: 14px; margin-bottom: 8px;"><strong>Screenshots:</strong></div>'
        task.comment_images.forEach((imgUrl: string) => {
          taskScreenshotsHtml += `<div style="margin-bottom: 8px;"><img src="${imgUrl}" alt="Task Screenshot" style="max-width: 500px; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"/></div>`
        })
        taskScreenshotsHtml += '</div>'
      }

      tasksHtml += `
        <div style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 8px;">Client: ${task.client_name}</div>
          <div style="color: #374151; margin-bottom: 4px;"><strong>Task:</strong> ${task.task_description}</div>
          <div style="color: #6b7280; margin-bottom: 4px;"><strong>Time Spent:</strong> ${durationText}</div>
          ${task.status ? `<div style="color: #6b7280; margin-bottom: 4px;"><strong>Status:</strong> <span style="padding: 2px 8px; border-radius: 4px; font-size: 12px; ${task.status === 'completed' ? 'background-color: #d1fae5; color: #065f46;' : task.status === 'in_progress' ? 'background-color: #dbeafe; color: #1e40af;' : task.status === 'blocked' ? 'background-color: #fee2e2; color: #991b1b;' : 'background-color: #fef3c7; color: #92400e;'}">${task.status.replace('_', ' ').toUpperCase()}</span></div>` : ''}
          ${task.comments ? `<div style="color: #6b7280; margin-bottom: 4px;"><strong>Comments:</strong> ${task.comments}</div>` : ''}
          ${task.task_link ? `<div style="color: #3b82f6; margin-bottom: 4px;"><strong>Link:</strong> <a href="${task.task_link}" style="color: #3b82f6;">${task.task_link}</a></div>` : ''}
          ${taskScreenshotsHtml}
        </div>
      `
    })

    // Note: Screenshots are now displayed inline with each task (see taskScreenshotsHtml above)
    // No need for a separate overall images section

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>EOD Report - ${user_name}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">📊 End of Day Report</h1>
          <p style="margin: 10px 0 0; opacity: 0.9;">${user_name}</p>
          <p style="margin: 5px 0 0; opacity: 0.8; font-size: 14px;">${submittedDate}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <!-- Work Hours Section -->
          <div style="background-color: #f0f9ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="color: #1e40af; margin: 0 0 16px 0; font-size: 18px;">⏰ Work Hours</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #374151;"><strong>Clocked In:</strong></td>
                <td style="padding: 8px 0; color: #111827; text-align: right;">${clockInTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151;"><strong>Clocked Out:</strong></td>
                <td style="padding: 8px 0; color: #111827; text-align: right;">${clockOutTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #374151; border-top: 2px solid #bfdbfe; padding-top: 12px;"><strong>Total Hours:</strong></td>
                <td style="padding: 8px 0; color: #1e40af; text-align: right; font-size: 20px; font-weight: 700; border-top: 2px solid #bfdbfe; padding-top: 12px;">${submission.total_hours || '0.00'} hours</td>
              </tr>
            </table>
          </div>

          <!-- Tasks Section -->
          <div style="margin-bottom: 24px;">
            <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">✅ Tasks Completed</h2>
            ${tasksHtml || '<p style="color: #6b7280; font-style: italic;">No tasks recorded.</p>'}
          </div>

          <!-- Summary Section -->
          ${submission.summary ? `
          <div style="margin-bottom: 24px;">
            <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">📝 Daily Summary</h2>
            <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; color: #374151; white-space: pre-wrap;">${submission.summary}</div>
          </div>
          ` : ''}
        </div>

        <div style="text-align: center; margin-top: 24px; padding: 20px; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">StafflyFolder EOD System</p>
          <p style="margin: 8px 0 0;">Automated Report Generation</p>
        </div>
      </body>
      </html>
    `

    // Send email using Resend
    if (RESEND_API_KEY) {
      // Build recipient list: always include miguel@migueldiaz.ca, plus any client emails
      const recipients = ['miguel@migueldiaz.ca', ...Array.from(clientEmails)]
      
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'EOD Reports <eod@admin.stafflyhq.ai>',
          to: recipients,
          subject: `EOD Report - ${user_name} - ${submittedDate}`,
          html: emailHtml,
        }),
      })

      const emailResult = await res.json()

      if (!res.ok) {
        console.error('Resend error:', emailResult)
        throw new Error(`Email failed: ${JSON.stringify(emailResult)}`)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Email sent successfully', emailId: emailResult.id }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )
    } else {
      console.log('RESEND_API_KEY not set, skipping email send')
      return new Response(
        JSON.stringify({ success: true, message: 'Email skipped (no API key)' }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})

