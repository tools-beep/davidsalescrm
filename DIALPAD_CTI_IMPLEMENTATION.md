# Dialpad Mini Dialer (CTI) Implementation Guide

Based on: https://developers.dialpad.com/docs/dialpad-mini-dialer#

## Overview

The Dialpad Mini Dialer (CTI) is an iframe-based solution that provides calling and messaging features directly in your app, without requiring OAuth authentication.

## Key Differences from OAuth Approach

### CTI Approach (Recommended):
- ✅ Loads Dialpad in an iframe
- ✅ No OAuth required
- ✅ User logs in directly in the iframe
- ✅ Simpler setup
- ✅ Full Dialpad UI available

### OAuth API Approach (What we built):
- ❌ More complex
- ❌ Requires OAuth flow
- ❌ Requires token management
- ❌ API-based calling only

## Implementation Steps

### Step 1: Get Client ID from Dialpad

You need to submit a form to Dialpad with:

1. **Allowed Origins**: Your domains that will embed the CTI
   - `https://app.stafflyhq.ai`
   - `http://localhost:5173` (for development)

2. **Additional Headers**: Any custom headers (optional)

Once approved, Dialpad will provide you with a **Client ID**.

### Step 2: Update the CTI Component

I'll create a new component that properly implements the CTI based on the documentation.

---

## Implementation Code

### 1. New CTI Component (Proper Implementation)

This will replace the existing OAuth-based approach with the iframe CTI method.

### 2. Required Iframe Attributes

According to the documentation, the iframe **MUST** include:

```html
<iframe 
  src="https://dialpad.com/apps/{CLIENT_ID}"
  title="Dialpad"
  allow="microphone; speaker-selection; autoplay; camera; display-capture; hid"
  sandbox="allow-popups allow-scripts allow-same-origin allow-forms"
  frameborder="0"
  style="width:400px; height:520px;"
></iframe>
```

### 3. JavaScript Communication

The CTI uses `window.postMessage()` for communication:

#### Messages FROM your app TO Dialpad:
- `enable_current_tab` - Enable this tab for calling
- `initiate_call` - Start a call with a phone number
- `hang_up_all_calls` - End all active calls

#### Messages FROM Dialpad TO your app:
- `user_authentication` - User logged in/out
- `call_ringing` - Incoming call notification

---

## What You Need to Do

### 1. Submit CTI Setup Form to Dialpad

Contact Dialpad at `[email protected]` with:

```
Subject: CTI Setup Request for Staffly HQ

Allowed Origins:
- https://app.stafflyhq.ai
- http://localhost:5173

Additional Headers: (none required)

Use Case: Internal calling for CRM system
```

### 2. Wait for Client ID

Dialpad will review and provide you with a Client ID (e.g., `abc123xyz`)

### 3. Add Client ID to Environment

Once you receive it:

**Netlify:**
```
VITE_DIALPAD_CTI_CLIENT_ID = abc123xyz
```

**Local (.env.local):**
```
VITE_DIALPAD_CTI_CLIENT_ID=abc123xyz
```

---

## Comparison: OAuth vs CTI

### Current OAuth Implementation (Complex):
```
User clicks Connect
  ↓
Redirect to Dialpad OAuth
  ↓
User authorizes
  ↓
Exchange code for token
  ↓
Store token in database
  ↓
Use token for API calls
```

### CTI Implementation (Simple):
```
Load iframe with Client ID
  ↓
User logs in directly in iframe
  ↓
Use postMessage() to make calls
  ↓
Done!
```

---

## Benefits of CTI Approach

✅ **Simpler Setup** - No OAuth flow needed  
✅ **Faster Integration** - Just embed an iframe  
✅ **Full UI** - Users see complete Dialpad interface  
✅ **No Token Management** - Dialpad handles authentication  
✅ **More Features** - Access to messaging, call history, etc.  
✅ **Better UX** - Users can use familiar Dialpad interface  

---

## Next Steps

1. **Contact Dialpad** - Submit CTI setup request
2. **Receive Client ID** - Wait for approval
3. **I'll implement** - I'll create the proper CTI component
4. **Test** - Verify calling works
5. **Deploy** - Push to production

---

## Status

- ⏳ Waiting for Client ID from Dialpad
- ✅ Documentation reviewed
- ✅ Implementation plan ready
- ⏳ Code to be written after Client ID received

---

Would you like me to:
1. Create the CTI component now (it will need the Client ID later)?
2. Update the existing components to support both OAuth and CTI?
3. Remove the OAuth implementation and use only CTI?

Let me know once you receive the Client ID from Dialpad!

