# Deploy Invoice Edge Functions - Quick Guide 🚀

## The Error You're Seeing

```
Access to fetch at 'https://gzxuhefnyskdtdifccr...' from origin 'http://localhost:8080' 
has been blocked by CORS policy
```

**This means:** The Edge Function hasn't been deployed to Supabase yet.

---

## Quick Fix (5 minutes)

### Step 1: Deploy the Edge Functions

Open your terminal and run:

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai

# Deploy the invoice email function
supabase functions deploy send-invoice-email

# Deploy the webhook function
supabase functions deploy invoice-webhook
```

### Step 2: Set Environment Variables

The functions need the `RESEND_API_KEY` to send emails.

**Option A: Via Supabase Dashboard**
1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Add environment variable:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key

**Option B: Via CLI**
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

### Step 3: Test Again

1. Refresh your app
2. Try sending an invoice again
3. Should work now! ✅

---

## If You Don't Have Supabase CLI Linked

If you get an error like "project not linked", run:

```bash
supabase link --project-ref your-project-ref
```

Your project ref is in your Supabase dashboard URL:
`https://app.supabase.com/project/YOUR-PROJECT-REF/...`

---

## Alternative: Manual Deployment via Dashboard

If CLI doesn't work, you can deploy via the Supabase Dashboard:

1. **Go to Supabase Dashboard** → **Edge Functions**
2. **Click "Create Function"**
3. **Name:** `send-invoice-email`
4. **Copy the code** from: `supabase/functions/send-invoice-email/index.ts`
5. **Paste and Deploy**
6. **Repeat for** `invoice-webhook`

---

## Verify Deployment

Check if functions are deployed:

```bash
supabase functions list
```

You should see:
```
send-invoice-email
invoice-webhook
```

---

## Test the Function

You can test directly via CLI:

```bash
supabase functions invoke send-invoice-email --body '{
  "invoice_id": "test-id",
  "user_id": "test-user",
  "client_name": "Test Client",
  "client_email": "test@example.com",
  "start_date": "2024-10-14",
  "end_date": "2024-10-28"
}'
```

---

## Common Issues

### "RESEND_API_KEY is not defined"

**Solution:** Set the environment variable (see Step 2 above)

### "Project not linked"

**Solution:** Run `supabase link --project-ref YOUR_PROJECT_REF`

### "Permission denied"

**Solution:** Make sure you're logged in: `supabase login`

### Function deploys but still errors

**Solution:** 
1. Check Supabase logs: Dashboard → Edge Functions → Logs
2. Verify RESEND_API_KEY is set correctly
3. Check if Resend API key is valid

---

## What These Functions Do

### send-invoice-email
- Generates invoice PDF
- Sends email to client + miguel@migueldiaz.ca
- Includes approve/reject buttons
- Returns success/error

### invoice-webhook
- Handles approve/reject button clicks
- Updates database
- Shows success page to client

---

## After Deployment

Once deployed, invoices will:
1. ✅ Generate successfully
2. ✅ Send emails to clients
3. ✅ Include PDF attachments
4. ✅ Have working approve/reject buttons
5. ✅ Update status in real-time

---

## Need Help?

1. Check Supabase Edge Function logs
2. Check Resend dashboard for email delivery
3. Verify environment variables are set
4. Test with `supabase functions invoke`

---

**Quick Command Summary:**

```bash
# Link project (if needed)
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy send-invoice-email
supabase functions deploy invoice-webhook

# Set API key
supabase secrets set RESEND_API_KEY=your_key_here

# Verify
supabase functions list
```

That's it! Your invoice system should now work. 🎉

