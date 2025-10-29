# Dialpad OAuth Setup - Complete Guide 🔧

## The Problem

When trying to connect Dialpad, you got:
```
404 NotFound
Error: User attempted to access non-existent route: /oauth/dialpad/authorize
```

## The Root Cause

The app was trying to redirect to a local route `/oauth/dialpad/authorize` instead of Dialpad's OAuth server.

## The Fix ✅

Updated `DialpadIframeCTI.tsx` to:
1. Use proper OAuth flow with PKCE
2. Redirect to `https://dialpad.com/oauth2/authorize`
3. Handle callback at `https://app.stafflyhq.ai/oauth/dialpad/callback`

---

## Required Setup

### 1. Get Dialpad OAuth Credentials

You mentioned you already contacted Dialpad developers and authorized `https://app.stafflyhq.ai`. You should have received:

- **Client ID**: Your Dialpad OAuth Client ID
- **Client Secret**: Your Dialpad OAuth Client Secret
- **Redirect URI**: Should be `https://app.stafflyhq.ai/oauth/dialpad/callback`

### 2. Set Environment Variables

You need to set these environment variables in your app:

#### For Local Development (.env.local):
```bash
VITE_DIALPAD_CLIENT_ID=your_dialpad_client_id_here
VITE_DIALPAD_REDIRECT_URL=http://localhost:5173/oauth/dialpad/callback
```

#### For Production (Netlify):
```bash
VITE_DIALPAD_CLIENT_ID=your_dialpad_client_id_here
VITE_DIALPAD_REDIRECT_URL=https://app.stafflyhq.ai/oauth/dialpad/callback
```

#### For Supabase Edge Functions:
```bash
supabase secrets set DIALPAD_CLIENT_ID=your_dialpad_client_id_here
supabase secrets set DIALPAD_CLIENT_SECRET=your_dialpad_client_secret_here
supabase secrets set DIALPAD_REDIRECT_URL=https://app.stafflyhq.ai/oauth/dialpad/callback
```

---

## How to Set Up

### Step 1: Add Environment Variables to Netlify

1. Go to **Netlify Dashboard** → Your Site → **Site Settings** → **Environment Variables**
2. Add these variables:
   ```
   VITE_DIALPAD_CLIENT_ID = your_client_id
   VITE_DIALPAD_REDIRECT_URL = https://app.stafflyhq.ai/oauth/dialpad/callback
   ```
3. Click **Save**

### Step 2: Set Supabase Secrets

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai

# Set Dialpad credentials
supabase secrets set DIALPAD_CLIENT_ID=your_client_id_here
supabase secrets set DIALPAD_CLIENT_SECRET=your_client_secret_here
supabase secrets set DIALPAD_REDIRECT_URL=https://app.stafflyhq.ai/oauth/dialpad/callback

# Verify secrets are set
supabase secrets list
```

### Step 3: Deploy Edge Function

```bash
# Deploy the OAuth exchange function



# Verify deployment
supabase functions list
```

### Step 4: Rebuild and Deploy

```bash
# Build the app
npm run build

# Deploy to Netlify (if using Netlify CLI)
netlify deploy --prod

# Or push to Git (if auto-deploy is enabled)
git add .
git commit -m "Fix Dialpad OAuth flow"
git push
```

---

## How It Works Now

```
┌─────────────────────────────────────────┐
│  User clicks "Connect Dialpad"          │
│  in CTI widget                          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Generate PKCE Challenge                │
│  - Create random verifier               │
│  - Generate SHA-256 challenge           │
│  - Store in localStorage                │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Redirect to Dialpad OAuth              │
│  https://dialpad.com/oauth2/authorize   │
│  ?client_id=...                         │
│  &redirect_uri=app.stafflyhq.ai/oauth...│
│  &code_challenge=...                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  User Authorizes on Dialpad             │
│  (Dialpad login page)                   │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Dialpad Redirects Back                 │
│  app.stafflyhq.ai/oauth/dialpad/callback│
│  ?code=...&state=...                    │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  OAuthDialpadCallback Component         │
│  - Validates state                      │
│  - Calls Edge Function                  │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Supabase Edge Function                 │
│  dialpad-oauth-exchange                 │
│  - Exchanges code for token             │
│  - Stores token in database             │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  ✅ Success!                            │
│  User redirected to dashboard           │
│  Dialpad CTI now works                  │
└─────────────────────────────────────────┘
```

---

## Testing

### 1. Test Locally (Optional)

```bash
# Start dev server
npm run dev

# Open browser
open http://localhost:5173

# Click on Dialpad CTI widget
# Click "Connect Dialpad"
# Should redirect to Dialpad OAuth page
```

### 2. Test on Production

1. Go to `https://app.stafflyhq.ai`
2. Click on **Dialpad CTI** widget (bottom right)
3. Click **"Connect Dialpad"** button
4. Should redirect to Dialpad's login page
5. Log in with your Dialpad account
6. Authorize the app
7. Should redirect back to your app
8. CTI should now show as connected

---

## Troubleshooting

### "Missing Dialpad Client ID"

**Solution:**
1. Add `VITE_DIALPAD_CLIENT_ID` to Netlify environment variables
2. Rebuild and redeploy the app

### "Invalid redirect_uri"

**Solution:**
1. Verify in Dialpad Developer Portal that `https://app.stafflyhq.ai/oauth/dialpad/callback` is in the list of authorized redirect URIs
2. Make sure there are no trailing slashes or typos

### "Token exchange failed"

**Solution:**
1. Check Supabase Edge Function logs:
   ```bash
   supabase functions logs dialpad-oauth-exchange --tail
   ```
2. Verify `DIALPAD_CLIENT_SECRET` is set correctly
3. Check that the redirect URI matches exactly

### "404 on callback"

**Solution:**
1. Verify the route exists in `App.tsx`:
   ```tsx
   <Route path="/oauth/dialpad/callback" element={<OAuthDialpadCallback />} />
   ```
2. Clear browser cache and try again

---

## Database Setup

The Dialpad tokens are stored in the `dialpad_tokens` table:

```sql
CREATE TABLE IF NOT EXISTS dialpad_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

If this table doesn't exist, create it in Supabase SQL Editor.

---

## Required Dialpad Scopes

Make sure your Dialpad OAuth app has these scopes:
- `calls:write` - To initiate calls
- `users:read` - To read user information

---

## Verification Checklist

After setup, verify:

- [ ] Environment variables set in Netlify
- [ ] Supabase secrets set
- [ ] Edge function deployed
- [ ] App rebuilt and deployed
- [ ] Redirect URI matches in Dialpad Developer Portal
- [ ] `dialpad_tokens` table exists in database
- [ ] Can click "Connect Dialpad" without 404 error
- [ ] Redirects to Dialpad OAuth page
- [ ] Can authorize and redirect back
- [ ] Token is stored in database
- [ ] CTI shows as connected

---

## Files Changed

- ✅ `src/components/calls/DialpadIframeCTI.tsx`
  - Fixed `handleConnect` to use proper OAuth flow
  - Added PKCE generation
  - Redirects to Dialpad OAuth server
  - Fallback redirect URI to `app.stafflyhq.ai`

---

## Next Steps

1. **Get your Dialpad credentials** (Client ID and Secret)
2. **Set environment variables** in Netlify and Supabase
3. **Deploy Edge Function**: `supabase functions deploy dialpad-oauth-exchange`
4. **Rebuild and deploy** your app
5. **Test the connection** on `https://app.stafflyhq.ai`

---

## Support

If you're still having issues:
1. Check Supabase Edge Function logs
2. Check browser console for errors
3. Verify Dialpad Developer Portal settings
4. Contact Dialpad support to confirm redirect URI is authorized

---

**Status:** ✅ Code Fixed - Needs Environment Variables

The OAuth flow is now correctly implemented. You just need to set up the environment variables and deploy!

