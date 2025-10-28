# Deploy Email Function - Quick Guide

## ⚠️ Important: Email Function Update Required

The email report format has been updated to show screenshots inline with each task. To activate this change, you need to redeploy the Edge Function.

## Deployment Steps

### Option 1: Using Supabase CLI (Recommended)

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
supabase functions deploy send-eod-email
```

### Option 2: Via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to: **Edge Functions**
3. Find: `send-eod-email`
4. Click **Deploy New Version**
5. Upload the file: `supabase/functions/send-eod-email/index.ts`
6. Click **Deploy**

## Verify Deployment

After deployment, test by:

1. Log in to DAR Portal
2. Complete some tasks with screenshots
3. Submit the DAR report
4. Check the email received
5. Verify screenshots appear with each task (not at the bottom)

## What Changed

**Before**: All screenshots appeared in a separate section at the bottom of the email

**After**: Screenshots now appear directly below each task they belong to

## Email Format Example

```
✅ Tasks Completed

Client: ABC Company
Task: Updated website homepage
Time Spent: 2h 30m
Status: COMPLETED
Comments: Fixed responsive issues
Screenshots:
  [Image 1: Homepage before]
  [Image 2: Homepage after]

Client: XYZ Corp
Task: Database optimization
Time Spent: 1h 15m
Status: COMPLETED
Comments: Improved query performance
Screenshots:
  [Image 3: Performance metrics]
```

## Troubleshooting

### Error: "Function not found"
**Solution**: Make sure you're in the correct directory and the function exists in `supabase/functions/send-eod-email/`

### Error: "Permission denied"
**Solution**: Make sure you're logged in to Supabase CLI:
```bash
supabase login
```

### Emails still showing old format
**Solution**: 
1. Verify deployment was successful
2. Clear any cached Edge Function responses
3. Try submitting a new report (old emails won't change)

## Environment Variables

The function requires these environment variables (should already be set):
- `RESEND_API_KEY` - For sending emails
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

## Testing

To test without sending real emails:
1. Comment out the Resend API call temporarily
2. Deploy the function
3. Check the console logs for the generated HTML
4. Verify the HTML structure is correct

---

**Deployment Time**: ~1-2 minutes
**Downtime**: None (seamless deployment)
**Risk Level**: Low (only affects new emails)

