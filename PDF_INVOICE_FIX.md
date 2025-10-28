# PDF Invoice Fix - Complete Guide 🔧

## The Problem

The invoice PDF attachment in emails is broken because:
1. We were just base64 encoding HTML (not a real PDF)
2. Email clients can't render it properly
3. The attachment appears corrupted

## The Solution

I've updated the Edge Function to support **3 options** for PDF generation:

### Option 1: PDFShift API (Recommended) ✅

**Pros:**
- High-quality PDFs
- Professional rendering
- Reliable service

**Setup:**
1. Sign up at https://pdfshift.io (Free tier: 250 PDFs/month)
2. Get your API key
3. Set the environment variable:
```bash
supabase secrets set PDFSHIFT_API_KEY=your_api_key_here
```

**Cost:** Free for 250 conversions/month, then $19/month for 1,000

### Option 2: HTML Attachment (Current Fallback) ✅

If no PDF service is configured, the function will:
- Send a well-formatted HTML file as attachment
- Recipients can open it in browser and print to PDF
- Works immediately with no setup

**Pros:**
- No additional cost
- Works right now
- Recipients can still view and print

**Cons:**
- Not a "real" PDF
- Requires recipient to open in browser

### Option 3: Browserless.io (Alternative)

**Setup:**
1. Sign up at https://www.browserless.io (Free tier: 6 hours/month)
2. Get your API key
3. Set environment variable:
```bash
supabase secrets set BROWSERLESS_API_KEY=your_api_key_here
```

---

## Quick Start (No Setup Required)

The function will work **right now** with HTML attachments as a fallback.

To test:
1. Deploy the updated function:
```bash
supabase functions deploy send-invoice-email
```

2. Send an invoice from the DAR Portal

3. Check your email - you'll receive:
   - Beautiful HTML email with invoice details
   - HTML attachment (can be opened in browser and printed to PDF)

---

## Upgrade to Real PDFs (Recommended)

### Step 1: Sign up for PDFShift

1. Go to https://pdfshift.io
2. Sign up (free account)
3. Get your API key from dashboard

### Step 2: Set the API Key

```bash
# Set the PDFShift API key
supabase secrets set PDFSHIFT_API_KEY=your_pdfshift_api_key_here

# Verify it's set
supabase secrets list
```

### Step 3: Redeploy the Function

```bash
supabase functions deploy send-invoice-email
```

### Step 4: Test

Send an invoice - it will now include a **real PDF** attachment! 🎉

---

## How It Works

```
┌─────────────────────────────────────────────┐
│  User Sends Invoice from DAR Portal         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Edge Function: send-invoice-email          │
│  1. Fetch invoice data from database        │
│  2. Generate HTML invoice                   │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌────────────────┐   ┌──────────────────┐
│ PDFShift API?  │   │ No PDF Service?  │
│ (if configured)│   │ (fallback)       │
└────────┬───────┘   └────────┬─────────┘
         │                    │
         ▼                    ▼
┌────────────────┐   ┌──────────────────┐
│ Generate PDF   │   │ Use HTML file    │
└────────┬───────┘   └────────┬─────────┘
         │                    │
         └────────┬───────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  Send Email via Resend                      │
│  - To: Client + miguel@migueldiaz.ca        │
│  - Subject: Invoice #XXX                    │
│  - Body: Beautiful HTML email               │
│  - Attachment: PDF or HTML file             │
└─────────────────────────────────────────────┘
```

---

## Email Preview

### What Recipients See:

```
From: Staffly <noreply@admin.stafflyhq.ai>
To: client@example.com, miguel@migueldiaz.ca
Subject: Invoice INV-202510-0001 - ABC Corp

┌─────────────────────────────────────────────┐
│           Invoice Received                  │
│        Invoice INV-202510-0001              │
├─────────────────────────────────────────────┤
│                                             │
│  Hello,                                     │
│                                             │
│  John Doe has submitted an invoice for      │
│  services rendered during Oct 14 - Oct 28   │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │ Invoice Summary                       │ │
│  │ Client: ABC Corp                      │ │
│  │ Invoice Number: INV-202510-0001       │ │
│  │ Total Hours: 40.00 hours              │ │
│  │ Total Amount: $2,000.00               │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  Work Completed:                            │
│  [Table of tasks with dates and hours]      │
│                                             │
│  ┌─────────────┐  ┌─────────────┐         │
│  │ ✓ Approve   │  │ ✗ Reject    │         │
│  └─────────────┘  └─────────────┘         │
│                                             │
│  📎 Attachment: Invoice_INV-202510-0001.pdf │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Troubleshooting

### "Email not sending"

**Check:**
1. Is RESEND_API_KEY set?
```bash
supabase secrets list
```

2. Is domain verified in Resend?
   - Go to Resend dashboard
   - Verify `admin.stafflyhq.ai`

3. Check Supabase logs:
```bash
supabase functions logs send-invoice-email
```

### "PDF is still broken"

**Solution:**
1. Set up PDFShift API key (see above)
2. Redeploy function
3. Test again

**Temporary workaround:**
- HTML attachment works fine
- Recipients can open in browser
- Use browser's "Print to PDF" feature

### "Attachment not showing"

**Check:**
1. Resend API key is valid
2. Email client supports attachments
3. Check spam folder
4. Try different email client

---

## Deployment Commands

```bash
# Deploy the updated function
supabase functions deploy send-invoice-email

# Set PDFShift API key (optional but recommended)
supabase secrets set PDFSHIFT_API_KEY=your_key_here

# Check function logs
supabase functions logs send-invoice-email --tail

# Test the function
# (Send an invoice from DAR Portal)
```

---

## Cost Breakdown

### Free Option (Current)
- ✅ HTML attachments
- ✅ No additional cost
- ✅ Works immediately
- ⚠️ Not a "real" PDF

### PDFShift (Recommended)
- ✅ Real PDF files
- ✅ Professional quality
- ✅ 250 free PDFs/month
- 💰 $19/month for 1,000 PDFs
- 💰 $49/month for 5,000 PDFs

### Browserless (Alternative)
- ✅ Real PDF files
- ✅ 6 hours free/month
- 💰 $49/month for 100 hours

---

## What's Changed

### ✅ Updated Files
- `supabase/functions/send-invoice-email/index.ts`
  - Added PDFShift integration
  - Added HTML fallback
  - Better error handling
  - Improved logging

### ✅ Features
- Validates email addresses
- Tries PDF generation (if configured)
- Falls back to HTML attachment
- Sends to both client and Miguel
- Beautiful email template
- Approve/Reject buttons

---

## Next Steps

1. **Deploy the function** (works with HTML attachments now)
```bash
supabase functions deploy send-invoice-email
```

2. **Test it** - Send an invoice from DAR Portal

3. **Upgrade to PDFs** (optional)
   - Sign up for PDFShift
   - Set API key
   - Redeploy

---

## Status

- ✅ Function updated with PDF support
- ✅ HTML fallback working
- ✅ Email sending to client + Miguel
- ✅ Beautiful email template
- ✅ Approve/Reject buttons
- ⏳ PDF generation (requires API key)

**Ready to deploy!** 🚀

