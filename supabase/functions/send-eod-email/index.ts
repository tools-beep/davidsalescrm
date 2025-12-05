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

// 🌈 Helper functions for EOD calculations
function roundHours(hours: number): number {
  return Math.round(hours)
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins}m`
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

function calculateShiftDuration(clockedInAt: string | null, clockedOutAt: string | null): number {
  if (!clockedInAt || !clockedOutAt) return 0
  const start = new Date(clockedInAt)
  const end = new Date(clockedOutAt)
  const diffMs = end.getTime() - start.getTime()
  return Math.max(0, diffMs / (1000 * 60 * 60))
}

function calculateActiveTaskHours(accumulatedSeconds: number): number {
  return accumulatedSeconds / 3600
}

// 🔥 FIX: Convert UTC timestamp to EST date key (YYYY-MM-DD)
function getDateKeyEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = formatter.formatToParts(d)
  const year = parts.find(p => p.type === 'year')?.value
  const month = parts.find(p => p.type === 'month')?.value
  const day = parts.find(p => p.type === 'day')?.value
  
  return `${year}-${month}-${day}`
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

    // Fetch submission data (including shift goals and active seconds)
    const { data: submission, error: submissionError } = await supabase
      .from('eod_submissions')
      .select('*')
      .eq('id', submission_id)
      .single()

    if (submissionError) throw submissionError
    
    // Fetch clock-in data for shift goals
    // 🔥 FIX: Use EST timezone for date key to match how clock-ins are stored
    const submissionDateEST = getDateKeyEST(new Date(submission.submitted_at))
    console.log('📅 Looking for clock-in with date:', submissionDateEST, 'for user:', submission.user_id)
    
    const { data: clockInData, error: clockInError } = await supabase
      .from('eod_clock_ins')
      .select('planned_shift_minutes, daily_task_goal')
      .eq('user_id', submission.user_id)
      .eq('date', submissionDateEST)
      .order('clocked_in_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (clockInError) {
      console.error('Error fetching clock-in data:', clockInError)
    }
    console.log('📊 Clock-in data found:', clockInData)
    
    // 🔥 FIX: Use submission's stored values as fallback (they're copied during EOD submission)
    const plannedShiftMinutes = clockInData?.planned_shift_minutes || submission.planned_shift_minutes || null
    const dailyTaskGoal = clockInData?.daily_task_goal || submission.daily_task_goal || null
    
    console.log('📊 Shift goals resolved:', { plannedShiftMinutes, dailyTaskGoal })

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

    // Collect unique client emails and names
    const clientEmails = new Set<string>()
    const clientNames = new Set<string>()
    
    // Build tasks HTML
    let tasksHtml = ''
    tasks?.forEach((task: any) => {
      // Collect client email and name if present
      if (task.client_email && task.client_email.includes('@')) {
        clientEmails.add(task.client_email)
      }
      if (task.client_name) {
        clientNames.add(task.client_name)
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

      const taskIndex = tasks.indexOf(task) + 1
      tasksHtml += `
        <div style="background: rgba(255,255,255,0.8); border-radius: 20px; padding: 20px; margin-bottom: 16px; border: 2px solid rgba(255,255,255,0.5); box-shadow: 0px 2px 8px rgba(0,0,0,0.04);">
          <div style="display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;">${taskIndex}</div>
                <strong style="color: #111827; font-size: 16px;">${task.client_name}</strong>
              </div>
              <div style="color: #374151; font-size: 14px; line-height: 1.6;">${task.task_description}</div>
            </div>
            <div style="margin-left: 16px; padding: 6px 12px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e; border: 2px solid #fbbf24; border-radius: 12px; font-weight: 700; white-space: nowrap;">⏱ ${durationText}</div>
          </div>
          ${task.comments ? `<div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 12px; border-radius: 12px; margin-top: 12px;"><div style="color: #92400e; font-size: 14px; font-style: italic;">💬 ${task.comments}</div></div>` : ''}
          ${task.task_link ? `<div style="margin-top: 12px;"><a href="${task.task_link}" style="color: #3b82f6; text-decoration: none; font-weight: 600; font-size: 14px;">🔗 ${task.task_link}</a></div>` : ''}
          ${taskScreenshotsHtml}
        </div>
      `
    })
    
    // Get primary client name (first one or "Multiple Clients")
    const primaryClientName = clientNames.size === 1 
      ? Array.from(clientNames)[0] 
      : clientNames.size > 1 
        ? Array.from(clientNames).join(', ')
        : 'Client'

    // Extract client first name only
    const clientFirstName = primaryClientName.split(' ')[0]

    // Calculate shift metrics for email
    const actualShiftHours = calculateShiftDuration(submission.clocked_in_at, submission.clocked_out_at)
    const roundedShiftHours = roundHours(actualShiftHours)
    
    const activeTaskHours = calculateActiveTaskHours(submission.total_active_seconds || 0)
    const roundedActiveTaskHours = roundHours(activeTaskHours)
    
    const plannedShiftHours = plannedShiftMinutes ? Math.round(plannedShiftMinutes / 60) : null
    
    const tasksCompleted = tasks?.length || 0
    const goalAchieved = dailyTaskGoal && tasksCompleted >= dailyTaskGoal
    
    // Calculate total points earned today
    const { data: pointsData } = await supabase
      .from('points_history')
      .select('points')
      .eq('user_id', submission.user_id)
      .gte('created_at', new Date(submission.submitted_at).toISOString().split('T')[0])
      .lt('created_at', new Date(new Date(submission.submitted_at).setDate(new Date(submission.submitted_at).getDate() + 1)).toISOString().split('T')[0])
    
    const totalPointsToday = pointsData?.reduce((sum, p) => sum + p.points, 0) || 0

    // Note: Screenshots are now displayed inline with each task (see taskScreenshotsHtml above)
    // No need for a separate overall images section

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Activity Report - ${user_name}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">Daily Activity Report</h1>
          <p style="margin: 16px 0 4px; opacity: 0.9; font-size: 16px; font-weight: 600;">${clientFirstName}</p>
          <p style="margin: 4px 0; opacity: 0.9; font-size: 16px;">${user_name}</p>
          <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">${submittedDate}</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          
          <!-- 🎯 SECTION A: SHIFT GOALS (NEW) -->
          <div style="background: linear-gradient(135deg, #E8D9FF 0%, #FFDDEA 100%); border-radius: 20px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0px 4px 12px rgba(0,0,0,0.06);">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🎯 Today's Shift Goals</h2>
            ${plannedShiftMinutes || dailyTaskGoal ? `
              <div style="background: rgba(255,255,255,0.7); border-radius: 16px; padding: 20px;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                  <tr>
                    <td style="padding: 12px 0; color: #7c3aed; font-weight: 600;">Planned Shift Length:</td>
                    <td style="padding: 12px 0; color: #581c87; font-size: 18px; font-weight: 700; text-align: right;">${plannedShiftMinutes ? formatDuration(plannedShiftMinutes) : '—'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #7c3aed; font-weight: 600;">Planned Task Goal:</td>
                    <td style="padding: 12px 0; color: #581c87; font-size: 18px; font-weight: 700; text-align: right;">${dailyTaskGoal ? dailyTaskGoal + ' tasks' : '—'}</td>
                  </tr>
                </table>
                <div style="border-top: 2px solid #e9d5ff; padding-top: 16px; margin-bottom: 16px;">
                  <div style="color: #7c3aed; font-weight: 600; margin-bottom: 8px;">Daily Goal Outcome:</div>
                  <div style="display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: 700; ${goalAchieved ? 'background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46;' : 'background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e;'}">
                    ${goalAchieved ? '✅' : '⏳'} ${tasksCompleted}/${dailyTaskGoal || 0} tasks completed
                  </div>
                </div>
                <div style="border-top: 2px solid #e9d5ff; padding-top: 16px;">
                  <div style="color: #7c3aed; font-weight: 600; margin-bottom: 8px;">Shift Plan Accuracy:</div>
                  <div style="color: #581c87; font-size: 15px;">
                    ${plannedShiftHours && actualShiftHours > 0
                      ? plannedShiftHours === roundedShiftHours
                        ? `You planned ${plannedShiftHours}h and worked exactly ${roundedShiftHours}h. Perfect! ✨`
                        : roundedShiftHours > plannedShiftHours
                          ? `You planned ${plannedShiftHours}h, you worked ${roundedShiftHours}h. Great dedication! 💪`
                          : `You planned ${plannedShiftHours}h, you worked ${roundedShiftHours}h.`
                      : 'No shift goal was set.'}
                  </div>
                </div>
              </div>
            ` : `
              <div style="background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-radius: 16px; padding: 20px; text-align: center;">
                <p style="color: #6b7280; font-weight: 500; margin: 0;">No shift goals were set during clock-in.</p>
                <p style="color: #9ca3af; font-size: 13px; margin: 8px 0 0;">Set your planned shift length and task goal when you clock in to track progress.</p>
              </div>
            `}
          </div>

          <!-- 🕒 SECTION B: ACTUAL SHIFT SUMMARY (NEW) -->
          <div style="background: linear-gradient(135deg, #DDEBFF 0%, #D9FFF0 100%); border-radius: 20px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0px 4px 12px rgba(0,0,0,0.06);">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🕒 Actual Shift Breakdown</h2>
            <div style="background: rgba(255,255,255,0.7); border-radius: 16px; padding: 20px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <tr>
                  <td style="padding: 12px 0; color: #1e40af; font-weight: 600;">Clock-in:</td>
                  <td style="padding: 12px 0; color: #1e3a8a; font-size: 16px; font-weight: 700; text-align: right;">${clockInTime}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; color: #1e40af; font-weight: 600;">Clock-out:</td>
                  <td style="padding: 12px 0; color: #1e3a8a; font-size: 16px; font-weight: 700; text-align: right;">${clockOutTime}</td>
                </tr>
              </table>
              <div style="border-top: 2px solid #bfdbfe; padding-top: 16px; margin-bottom: 16px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; color: #1e40af; font-weight: 600;">Total Shift Hours:</td>
                    <td style="padding: 12px 0; text-align: right;">
                      <div style="color: #1e3a8a; font-size: 24px; font-weight: 700;">${roundedShiftHours}h</div>
                      <div style="color: #3b82f6; font-size: 12px; opacity: 0.75;">Precise: ${actualShiftHours.toFixed(2)}h</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; color: #0d9488; font-weight: 600;">Total Active Task Hours:</td>
                    <td style="padding: 12px 0; text-align: right;">
                      <div style="color: #134e4a; font-size: 24px; font-weight: 700;">${roundedActiveTaskHours}h</div>
                      <div style="color: #14b8a6; font-size: 12px; opacity: 0.75;">Precise: ${activeTaskHours.toFixed(2)}h</div>
                    </td>
                  </tr>
                </table>
              </div>
              <div style="border-top: 2px solid #bfdbfe; padding-top: 16px;">
                <div style="color: #1e40af; font-weight: 600; margin-bottom: 8px;">Utilization Summary:</div>
                <div style="color: #1e3a8a; font-size: 15px; font-weight: 600;">
                  ${actualShiftHours > 0
                    ? roundedActiveTaskHours === roundedShiftHours
                      ? `You spent all ${roundedShiftHours}h actively working on tasks. 🎯`
                      : `You spent ${roundedActiveTaskHours}h out of ${roundedShiftHours}h actively working.`
                    : 'No shift data available.'}
                </div>
              </div>
            </div>
          </div>

          <!-- 🟢 SECTION C: TASK SUMMARY -->
          <div style="background: linear-gradient(135deg, #FAE8A4 0%, #FFDDEA 100%); border-radius: 20px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0px 4px 12px rgba(0,0,0,0.06);">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
              ✅ Tasks Completed
              <span style="display: inline-block; margin-left: 12px; padding: 6px 14px; background: white; color: #d97706; border: 2px solid #fbbf24; border-radius: 12px; font-size: 14px;">${tasksCompleted} ${tasksCompleted === 1 ? 'task' : 'tasks'}</span>
            </h2>
            ${tasksHtml || '<p style="color: #92400e; font-style: italic; background: rgba(255,255,255,0.7); padding: 16px; border-radius: 12px;">No tasks recorded.</p>'}
          </div>

          <!-- 🟠 SECTION D: POINTS SUMMARY -->
          <div style="background: linear-gradient(135deg, #C7B8EA 0%, #DDEBFF 100%); border-radius: 20px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.5); box-shadow: 0px 4px 12px rgba(0,0,0,0.06);">
            <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">🏆 Points Earned Today</h2>
            <div style="background: rgba(255,255,255,0.7); border-radius: 16px; padding: 20px; text-align: center;">
              <div style="color: #5b21b6; font-weight: 600; margin-bottom: 8px; font-size: 14px;">Total Points Today</div>
              <div style="font-size: 48px; font-weight: 700; background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                +${totalPointsToday}
              </div>
            </div>
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
      
      // Format date for subject (e.g., "Oct 29, 2025")
      const subjectDate = new Date(submission.submitted_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
      
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Staffly DAR Report <dar@admin.stafflyhq.ai>',
          to: recipients,
          subject: 'Staffly Daily Activity Reports',
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

