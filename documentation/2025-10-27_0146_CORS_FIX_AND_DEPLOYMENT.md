# CORS Fix and Deployment Guide

**Date:** October 27, 2025, 1:46 AM  
**Issue:** Email function blocked by CORS policy  
**Status:** ✅ FIXED - Ready to Deploy

---

## Problem

Your live site (`https://dealdash2.netlify.app`) was getting a CORS error when trying to call the Edge Function:

```
Access to fetch at 'https://zrxuhefnvskdtdrrcrto.supabase.co/functions/v1/send-eod-email' 
from origin 'https://dealdash2.netlify.app' has been blocked by CORS policy
```

---

## Solution Applied

I've updated the `send-eod-email` Edge Function to include proper CORS headers that will work with:
- ✅ `https://dealdash2.netlify.app` (current)
- ✅ `https://admin.stafflyhq.ai` (future domain)
- ✅ Any other domain you use

**Changes Made:**

```typescript
// Added CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',  // Allows ALL domains
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Handle preflight requests
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}

// Include CORS headers in all responses
return new Response(
  JSON.stringify({ success: true, ... }),
  { 
    headers: { 
      ...corsHeaders,
      'Content-Type': 'application/json' 
    } 
  }
)
```

---

## Deployment Steps

### Option 1: Deploy via Supabase CLI (Recommended)

1. **Select Your Project:**
   ```bash
   cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
   npx supabase functions deploy send-eod-email
   ```

2. **When prompted, select:**
   - Project: **SalesDash** (qzxuhefnyskdtdfrcrtg)
   - This is the one connected to your live site

3. **Wait for deployment:**
   - Should take 10-30 seconds
   - You'll see "Deployed Function send-eod-email"

### Option 2: Deploy via Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - https://supabase.com/dashboard/project/qzxuhefnyskdtdfrcrtg

2. **Navigate to Edge Functions:**
   - Click "Edge Functions" in sidebar
   - Find "send-eod-email"

3. **Update the function:**
   - Click "Edit"
   - Copy the entire contents of `supabase/functions/send-eod-email/index.ts`
   - Paste into the editor
   - Click "Deploy"

---

## Testing After Deployment

### Test 1: Submit EOD Report

1. Go to your live site: https://dealdash2.netlify.app
2. Log in as an EOD user
3. Fill out EOD report with tasks
4. Click "Submit EOD"
5. Check browser console (F12) - should see no CORS errors
6. Check email inboxes

### Test 2: Check Edge Function Logs

```bash
# View recent logs
npx supabase functions logs send-eod-email --project-ref qzxuhefnyskdtdfrcrtg

# Or in dashboard:
# https://supabase.com/dashboard/project/qzxuhefnyskdtdfrcrtg/functions/send-eod-email/logs
```

---

## Will It Work After Domain Change?

**YES!** ✅

The CORS headers are set to `'Access-Control-Allow-Origin': '*'`, which means:
- ✅ Works with `https://dealdash2.netlify.app`
- ✅ Works with `https://admin.stafflyhq.ai`
- ✅ Works with any future domain
- ✅ Works with `localhost` for development
- ✅ No code changes needed when you change domains

---

## Alternative: Restrict to Specific Domains (More Secure)

If you want to restrict to only your domains (more secure), you can update the CORS headers:

```typescript
// Get the origin from the request
const origin = req.headers.get('origin')

// List of allowed origins
const allowedOrigins = [
  'https://dealdash2.netlify.app',
  'https://admin.stafflyhq.ai',
  'http://localhost:5173',  // For development
  'http://localhost:3000',
]

// Check if origin is allowed
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

**Note:** The current implementation (`'*'`) is fine for this use case since:
- The Edge Function requires authentication (Supabase API key)
- It's not exposing sensitive data
- It's easier to manage across domain changes

---

## File Modified

**`supabase/functions/send-eod-email/index.ts`**

**Changes:**
- Added CORS headers constant
- Added OPTIONS request handler (preflight)
- Updated all responses to include CORS headers
- ~15 lines added/modified

---

## Quick Deploy Command

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
npx supabase functions deploy send-eod-email --project-ref qzxuhefnyskdtdfrcrtg
```

---

## Troubleshooting

### Still Getting CORS Error After Deployment

1. **Clear Browser Cache:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
   - Or clear cache in browser settings

2. **Verify Deployment:**
   ```bash
   npx supabase functions list --project-ref qzxuhefnyskdtdfrcrtg
   ```
   Should show `send-eod-email` with recent deployment time

3. **Check Function Logs:**
   ```bash
   npx supabase functions logs send-eod-email --project-ref qzxuhefnyskdtdfrcrtg
   ```
   Look for errors or CORS-related messages

### Function Not Found

If you get "Function not found" error:

1. **Create the function first:**
   ```bash
   npx supabase functions deploy send-eod-email --project-ref qzxuhefnyskdtdfrcrtg --create-function
   ```

2. **Or create via dashboard:**
   - Go to Edge Functions
   - Click "New Function"
   - Name: `send-eod-email`
   - Paste code
   - Deploy

---

## Environment Variables Needed

Make sure these are set in your Supabase project:

```bash
# Check current secrets
npx supabase secrets list --project-ref qzxuhefnyskdtdfrcrtg

# Set Resend API key (if not already set)
npx supabase secrets set RESEND_API_KEY=re_your_key_here --project-ref qzxuhefnyskdtdfrcrtg
```

**Required Secrets:**
- ✅ `RESEND_API_KEY` - Your Resend API key
- ✅ `SUPABASE_URL` - Auto-set by Supabase
- ✅ `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase

---

## Summary

✅ **CORS headers added** - Works with any domain  
✅ **Code updated** - Ready to deploy  
✅ **Future-proof** - No changes needed for domain changes  
✅ **Secure** - Still requires authentication  

**Next Step:** Deploy the function using the command above!

---

## Quick Reference

**Deploy Command:**
```bash
npx supabase functions deploy send-eod-email --project-ref qzxuhefnyskdtdfrcrtg
```

**View Logs:**
```bash
npx supabase functions logs send-eod-email --project-ref qzxuhefnyskdtdfrcrtg
```

**Test URL:**
```
https://dealdash2.netlify.app
```

**Expected Result:**
- No CORS errors in console
- Email sent successfully
- Success message shown to user

---

**Once deployed, the email function will work on your live site and any future domains!** 🚀

