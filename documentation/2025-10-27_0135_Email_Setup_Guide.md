# EOD Email Setup Guide

**Date:** October 27, 2025, 1:35 AM  
**Domain:** admin.stafflyhq.ai  
**Status:** Ready to Configure

---

## Overview

The EOD email system is **fully implemented** and ready to use. It will automatically send formatted EOD reports via email when users submit their EOD.

**Email will be sent to:**
- ✅ miguel@migueldiaz.ca (always)
- ✅ Client emails (from each task, if provided)

**Email will come from:**
- `EOD Reports <eod@admin.stafflyhq.ai>`

---

## Setup Instructions

### Step 1: Get Resend API Key (5 minutes)

1. Go to https://resend.com/
2. Sign up or log in
3. Click **"API Keys"** in the sidebar
4. Click **"Create API Key"**
5. Give it a name (e.g., "Staffly EOD")
6. Copy the API key (starts with `re_`)

### Step 2: Add Domain to Resend (10 minutes)

1. In Resend dashboard, click **"Domains"**
2. Click **"Add Domain"**
3. Enter: `admin.stafflyhq.ai`
4. Resend will show you DNS records to add

**DNS Records to Add:**

You'll need to add these records to your DNS provider (where you manage `stafflyhq.ai`):

```
Type: TXT
Name: admin.stafflyhq.ai
Value: [Resend will provide this]

Type: MX
Name: admin.stafflyhq.ai
Value: [Resend will provide this]
Priority: 10

Type: TXT
Name: resend._domainkey.admin.stafflyhq.ai
Value: [Resend will provide this - DKIM key]
```

**Important:** The exact values will be shown in your Resend dashboard. Copy them exactly as shown.

### Step 3: Wait for Verification (5-30 minutes)

1. After adding DNS records, wait 5-30 minutes
2. Go back to Resend dashboard
3. Click **"Verify"** next to your domain
4. Once verified, you'll see a green checkmark ✅

### Step 4: Set Supabase Secret (2 minutes)

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai

# Set the Resend API key
npx supabase secrets set RESEND_API_KEY=re_your_api_key_here
```

### Step 5: Test Email Sending (5 minutes)

1. Log into EOD Portal as a user
2. Add a task with a client email
3. Click **"Submit EOD"**
4. Check:
   - miguel@migueldiaz.ca inbox
   - Client email inbox
   - Spam folders (first time might go to spam)

---

## Email Format

**Subject:**
```
EOD Report - [User Name] - [Date]
```

**From:**
```
EOD Reports <eod@admin.stafflyhq.ai>
```

**To:**
```
miguel@migueldiaz.ca
client@example.com (if client email was provided)
```

**Content:**
- Beautiful HTML email with gradient header
- Work hours (clock in/out times, total hours)
- All tasks completed with:
  - Client name
  - Task description
  - Time spent
  - Comments
  - Task links
- Screenshots (if uploaded)
- Daily summary (if provided)

---

## DNS Setup Example

If you're using **Cloudflare**, **GoDaddy**, or another DNS provider:

### Cloudflare:
1. Log into Cloudflare
2. Select `stafflyhq.ai` domain
3. Go to **DNS** → **Records**
4. Click **"Add record"**
5. Add each record from Resend

### GoDaddy:
1. Log into GoDaddy
2. Go to **My Products** → **Domains**
3. Click **DNS** next to `stafflyhq.ai`
4. Click **"Add"** for each record
5. Add each record from Resend

### Other Providers:
- Look for "DNS Management" or "DNS Records"
- Add the records provided by Resend
- Save changes

---

## Troubleshooting

### Email Not Sending

**Issue:** EOD submitted but no email received

**Possible Causes:**
1. ❌ Resend API key not set
2. ❌ Domain not verified
3. ❌ Email in spam folder
4. ❌ Invalid client email

**Solutions:**

1. **Check API Key:**
   ```bash
   npx supabase secrets list
   ```
   Should show `RESEND_API_KEY`

2. **Check Domain Verification:**
   - Go to Resend dashboard
   - Check if domain has green checkmark
   - If not, verify DNS records are correct

3. **Check Spam Folder:**
   - First emails often go to spam
   - Mark as "Not Spam"
   - Future emails will go to inbox

4. **Check Client Email:**
   - Make sure client email is valid
   - Format: `name@domain.com`

### Domain Not Verifying

**Issue:** DNS records added but domain still not verified

**Possible Causes:**
1. ❌ DNS propagation delay (can take up to 48 hours)
2. ❌ Incorrect DNS records
3. ❌ Records added to wrong subdomain

**Solutions:**

1. **Wait for DNS Propagation:**
   - Usually takes 5-30 minutes
   - Can take up to 48 hours
   - Check status: https://dnschecker.org/

2. **Verify DNS Records:**
   ```bash
   # Check TXT record
   dig TXT admin.stafflyhq.ai
   
   # Check MX record
   dig MX admin.stafflyhq.ai
   
   # Check DKIM
   dig TXT resend._domainkey.admin.stafflyhq.ai
   ```

3. **Double-Check Records:**
   - Copy exact values from Resend
   - No extra spaces
   - Correct subdomain (`admin.stafflyhq.ai`)

### Email Goes to Spam

**Issue:** Emails are received but in spam folder

**Solutions:**

1. **Mark as Not Spam:**
   - Open email in spam folder
   - Click "Not Spam" or "Move to Inbox"
   - This trains the spam filter

2. **Add to Contacts:**
   - Add `eod@admin.stafflyhq.ai` to contacts
   - Future emails will go to inbox

3. **Wait for Reputation:**
   - New domains have low reputation
   - As you send more emails, reputation improves
   - After 1-2 weeks, should go to inbox automatically

---

## Testing Checklist

- [ ] Resend account created
- [ ] API key generated and copied
- [ ] Domain `admin.stafflyhq.ai` added to Resend
- [ ] DNS records added to DNS provider
- [ ] Domain verified in Resend (green checkmark)
- [ ] API key set in Supabase secrets
- [ ] Test EOD submitted
- [ ] Email received at miguel@migueldiaz.ca
- [ ] Email received at client email
- [ ] Email format looks correct
- [ ] All task details included
- [ ] Screenshots displayed correctly

---

## Quick Reference

### Important URLs:
- **Resend Dashboard:** https://resend.com/
- **DNS Checker:** https://dnschecker.org/
- **Email Test:** https://www.mail-tester.com/

### Important Commands:
```bash
# Set API key
npx supabase secrets set RESEND_API_KEY=re_your_key

# List secrets
npx supabase secrets list

# Remove secret (if needed)
npx supabase secrets unset RESEND_API_KEY

# Check DNS
dig TXT admin.stafflyhq.ai
dig MX admin.stafflyhq.ai
dig TXT resend._domainkey.admin.stafflyhq.ai
```

### Important Files:
- **Edge Function:** `supabase/functions/send-eod-email/index.ts`
- **Email Template:** Inside Edge Function (HTML)

---

## What Happens When EOD is Submitted

1. **User clicks "Submit EOD"**
   - EOD data saved to database
   - `eod_submissions` table
   - `eod_submission_tasks` table
   - `eod_submission_images` table

2. **Email function triggered**
   - Fetches submission data
   - Fetches all tasks
   - Fetches all images
   - Collects client emails from tasks

3. **Email formatted**
   - Builds HTML email
   - Includes all task details
   - Adds screenshots
   - Professional design

4. **Email sent**
   - To: miguel@migueldiaz.ca
   - To: All client emails
   - From: eod@admin.stafflyhq.ai
   - Subject: EOD Report - [Name] - [Date]

5. **User notified**
   - Success message shown
   - EOD form cleared
   - Ready for next day

---

## Cost Estimate

**Resend Pricing:**
- **Free Tier:** 100 emails/day, 3,000 emails/month
- **Pro Plan:** $20/month for 50,000 emails/month

**For typical usage:**
- 10 users × 1 EOD/day = 10 emails/day
- 10 emails/day × 30 days = 300 emails/month
- **Free tier is sufficient** ✅

---

## Security Notes

1. **API Key Security:**
   - Never commit API key to git
   - Store only in Supabase secrets
   - Rotate key if compromised

2. **Email Security:**
   - DKIM signing (automatic with Resend)
   - SPF records (set via DNS)
   - DMARC policy (optional, recommended)

3. **Client Email Privacy:**
   - Client emails not shared between clients
   - Each client only sees their own tasks
   - miguel@migueldiaz.ca sees all tasks

---

## Next Steps

1. ✅ **Get Resend API Key** → 5 minutes
2. ✅ **Add Domain to Resend** → 10 minutes
3. ✅ **Add DNS Records** → 10 minutes
4. ⏳ **Wait for Verification** → 5-30 minutes
5. ✅ **Set Supabase Secret** → 2 minutes
6. ✅ **Test Email** → 5 minutes

**Total Time:** ~40 minutes (plus DNS propagation wait)

---

## Support

If you encounter any issues:

1. **Check Resend Dashboard:**
   - Look for error messages
   - Check domain verification status
   - View email logs

2. **Check Supabase Logs:**
   ```bash
   npx supabase functions logs send-eod-email
   ```

3. **Test Email Deliverability:**
   - Use https://www.mail-tester.com/
   - Send test email
   - Check spam score

4. **Contact Resend Support:**
   - Very responsive
   - Help with DNS issues
   - Email deliverability advice

---

**Once set up, emails will send automatically every time an EOD is submitted!** 📧✨

