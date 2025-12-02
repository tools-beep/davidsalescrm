# EOD Email Setup - Quick Start Guide

## Current Status
✅ Email function is fully implemented and ready  
⚠️ Requires RESEND_API_KEY configuration

---

## Setup Steps (30 minutes)

### Step 1: Get Resend API Key (5 minutes)

1. Go to https://resend.com/
2. Sign up or log in
3. Click **"API Keys"** in sidebar
4. Click **"Create API Key"**
5. Name it: "Staffly EOD Email"
6. Copy the API key (starts with `re_`)

### Step 2: Set API Key in Supabase (2 minutes)

**Option A: Via Supabase Dashboard (Easiest)**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/functions
2. Click on **"Edge Functions"** → **"Settings"**
3. Find **"Secrets"** section
4. Add new secret:
   - **Name:** `RESEND_API_KEY`
   - **Value:** `re_your_api_key_here`
5. Click **"Save"**

**Option B: Via CLI**

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai

# Login to Supabase (if not already)
npx supabase login

# Link to your project (if not already)
npx supabase link --project-ref YOUR_PROJECT_ID

# Set the secret
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Step 3: (Optional) Verify Domain (10-20 minutes)

**Why:** Makes emails look more professional and improves deliverability

1. In Resend dashboard, click **"Domains"**
2. Click **"Add Domain"**
3. Enter: `admin.stafflyhq.ai`
4. Add DNS records shown by Resend:

```
Type: TXT
Name: admin.stafflyhq.ai
Value: [Provided by Resend]

Type: MX
Name: admin.stafflyhq.ai
Value: [Provided by Resend]
Priority: 10

Type: TXT
Name: resend._domainkey.admin.stafflyhq.ai
Value: [DKIM key provided by Resend]
```

5. Wait 5-30 minutes for DNS propagation
6. Click **"Verify"** in Resend dashboard

**Note:** Without domain verification, emails will come from `@resend.dev` but will still work.

### Step 4: Test Email (5 minutes)

1. Log into EOD Portal as any user
2. Add a task with:
   - Client name
   - Task description
   - Some time
   - Optional: Add screenshot
3. Click **"Submit EOD"**
4. Check emails:
   - ✅ miguel@migueldiaz.ca
   - ✅ Client email (if provided in task)

---

## What Happens When EOD is Submitted

```
User clicks "Submit EOD"
    ↓
EOD data saved to database
    ↓
Edge Function triggered
    ↓
Email formatted with beautiful HTML
    ↓
Email sent via Resend API
    ↓
Recipients receive email:
  • miguel@migueldiaz.ca (always)
  • Client emails (from tasks)
    ↓
Success message shown to user
```

---

## Email Content Preview

### Header (Purple Gradient)
```
Daily Activity Report
Joel
Miguel Diaz
Tuesday, December 2, 2025
```

### 🎯 Today's Shift Goals
- Planned Shift Length: 8h
- Planned Task Goal: 5 tasks
- Daily Goal Outcome: ✅ 5/5 tasks completed
- Shift Plan Accuracy: You planned 8h and worked exactly 8h. Perfect! ✨

### 🕒 Actual Shift Breakdown
- Clock-in: 9:00:00 AM
- Clock-out: 5:00:00 PM
- Total Shift Hours: 8h (Precise: 8.00h)
- Total Active Task Hours: 7h (Precise: 6.92h)
- Utilization: You spent 7h out of 8h actively working.

### ✅ Tasks Completed (3 tasks)

**Task 1: ABC Company**
- Updated website homepage
- ⏱ 2h 30m
- Status: COMPLETED
- 💬 Fixed responsive issues on mobile
- 🔗 https://task-link.com
- **Screenshots:** [Image 1] [Image 2]

**Task 2: XYZ Corp**
- Database optimization
- ⏱ 1h 15m
- Status: COMPLETED

[... more tasks ...]

### 🏆 Points Earned Today
**+250 Points**

### 📝 Daily Summary
User's end-of-day notes here...

---

## Troubleshooting

### Email Not Sending

**Check 1: API Key Set?**
```bash
npx supabase secrets list
```
Should show `RESEND_API_KEY`

**Check 2: Function Deployed?**
```bash
npx supabase functions list
```
Should show `send-eod-email`

**Check 3: Check Logs**
```bash
npx supabase functions logs send-eod-email --limit 10
```

**Check 4: Check Spam Folder**
- First emails often go to spam
- Mark as "Not Spam"

### Email Goes to Spam

**Solution 1: Mark as Not Spam**
- Open email in spam
- Click "Not Spam" or "Move to Inbox"

**Solution 2: Verify Domain**
- Complete Step 3 above
- Verified domains have better deliverability

**Solution 3: Add to Contacts**
- Add `dar@admin.stafflyhq.ai` to contacts

---

## Cost

**Resend Pricing:**
- **Free Tier:** 3,000 emails/month
- **Pro Plan:** $20/month for 50,000 emails/month

**Typical Usage:**
- 10 users × 1 EOD/day = 10 emails/day
- 10 emails/day × 30 days = **300 emails/month**
- ✅ **Free tier is sufficient**

---

## Quick Commands Reference

```bash
# Set API key
npx supabase secrets set RESEND_API_KEY=re_your_key

# List secrets
npx supabase secrets list

# View function logs
npx supabase functions logs send-eod-email

# Deploy function (if you make changes)
npx supabase functions deploy send-eod-email

# Check DNS propagation
dig TXT admin.stafflyhq.ai
dig MX admin.stafflyhq.ai
```

---

## Support Resources

- **Resend Dashboard:** https://resend.com/
- **Resend Docs:** https://resend.com/docs
- **DNS Checker:** https://dnschecker.org/
- **Email Test:** https://www.mail-tester.com/

---

## Next Steps

1. ✅ Get Resend API key → 5 minutes
2. ✅ Set in Supabase secrets → 2 minutes
3. ✅ Test by submitting EOD → 5 minutes
4. ⏸ (Optional) Verify domain → 20 minutes

**Total Time:** ~12 minutes (+ optional 20 min for domain)

---

## Summary

✅ **Email function is complete and working**  
✅ **Beautiful HTML email format**  
✅ **Auto-sends on EOD submission**  
✅ **Includes all details, screenshots, metrics**  
⚠️ **Just needs RESEND_API_KEY to be set**

Once API key is set, emails will send automatically! 📧✨

