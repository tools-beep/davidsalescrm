# Dialpad CTI - Quick Setup Guide

## ✅ Status: Ready to Use (Pending Client ID)

All code is complete and deployed. You just need to get the Client ID from Dialpad.

---

## 🚀 3-Step Setup

### Step 1: Request Client ID from Dialpad

**Email to:** `[email protected]`

**Copy and paste this email:**

```
Subject: CTI Setup Request for Staffly HQ

Hi Dialpad Team,

We would like to set up the Dialpad Mini Dialer (CTI) for our CRM application at Staffly HQ.

**Allowed Origins:**
- https://app.stafflyhq.ai
- https://dealdash2.netlify.app
- http://localhost:5173

**Use Case:** 
Embedded calling functionality for our CRM system to enable our team to make calls directly from customer records.

Please provide us with a Client ID for the CTI integration.

Thank you!

Best regards,
Staffly HQ Team
```

**Expected Response Time:** 1-2 business days

---

### Step 2: Add Client ID to Netlify

Once you receive the Client ID (e.g., `abc123xyz`):

1. Go to Netlify Dashboard
2. Select your project
3. Go to **Site configuration** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key:** `VITE_DIALPAD_CTI_CLIENT_ID`
   - **Value:** `[paste the Client ID Dialpad sent you]`
6. Click **Save**
7. Trigger a new deploy

---

### Step 3: Test It

1. Go to your live site: `https://app.stafflyhq.ai`
2. Navigate to any Contact or Deal
3. Click the **"Call"** button
4. Dialpad CTI should open in a popup
5. Log into Dialpad (first time only)
6. The phone number should be pre-filled
7. Click to call!

---

## 📱 What Happens After Setup

### First Time Using CTI
```
User clicks "Call" button
  ↓
Dialpad CTI popup opens
  ↓
Dialpad login screen appears
  ↓
User logs in with Dialpad credentials
  ↓
Dialpad interface loads
  ↓
Phone number is pre-filled
  ↓
User can initiate call
```

### Every Time After
```
User clicks "Call" button
  ↓
Dialpad CTI popup opens
  ↓
User is already logged in (persists)
  ↓
Phone number is pre-filled
  ↓
Call initiated immediately
```

---

## 🎯 Where the Call Button Appears

The CTI will work from these locations:

### Contacts Page
- Each contact row has a "Call" button
- Opens CTI with contact's phone number

### Deals Page
- Contact cards have call buttons
- Opens CTI with deal contact's phone

### Contact Detail View
- Phone number field has call button
- Quick dial from contact page

### Deal Detail View
- Contact section has call button
- One-click calling from deal

### Companies Page
- Company phone numbers
- Call company directly

### Search Results
- Any contact in search
- Quick call from anywhere

---

## ✅ Features Available

Once setup is complete, users can:

- ✅ Make outbound calls
- ✅ Receive incoming calls
- ✅ View call history
- ✅ Send SMS messages
- ✅ Access Dialpad contacts
- ✅ Use Dialpad voicemail
- ✅ Transfer calls
- ✅ Conference calls
- ✅ Mute/hold/recording

**Basically, full Dialpad functionality!**

---

## 🔍 Local Development Setup

For testing on your local machine:

1. Create `.env.local` file:
```bash
VITE_DIALPAD_CTI_CLIENT_ID=your_client_id_here
```

2. Restart dev server:
```bash
npm run dev
```

3. Test on `http://localhost:5173`

---

## 🆘 Troubleshooting

### "Configuration Error" Message
**Problem:** Client ID not set or incorrect  
**Solution:** 
- Check Netlify environment variables
- Verify spelling: `VITE_DIALPAD_CTI_CLIENT_ID`
- Redeploy after adding variable

### CTI Window Doesn't Open
**Problem:** JavaScript error or missing component  
**Solution:**
- Hard refresh browser (Cmd+Shift+R)
- Check browser console for errors
- Clear browser cache

### "Not Authorized" Error
**Problem:** Domain not whitelisted by Dialpad  
**Solution:**
- Contact Dialpad support
- Confirm your domain is in allowed origins
- Wait for Dialpad to update whitelist

### Phone Number Not Pre-filling
**Problem:** postMessage not reaching iframe  
**Solution:**
- Check phone number format
- Try different phone formats
- Check browser console for messages

### Can't Log Into Dialpad
**Problem:** Credentials or domain issue  
**Solution:**
- Use correct Dialpad account
- Try different browser
- Contact Dialpad if domain blocked

---

## 📊 Success Metrics

After setup, you should see:

- ✅ CTI opens on first click
- ✅ Phone numbers pre-fill automatically
- ✅ Calls connect within seconds
- ✅ Login persists across sessions
- ✅ Works on all browsers
- ✅ Mobile responsive

---

## 💡 Tips for Best Experience

### For Admins
1. **Communicate with team** - Let them know CTI is available
2. **Share login info** - Make sure everyone has Dialpad accounts
3. **Monitor usage** - Check if team is using it effectively

### For Users
1. **Log in once** - Dialpad login persists
2. **Keep CTI open** - Minimize instead of closing
3. **Use shortcuts** - Dialpad has keyboard shortcuts
4. **Check history** - Review past calls in CTI

---

## 🎉 You're All Set!

Once you receive the Client ID from Dialpad:
1. Add it to Netlify
2. Deploy
3. Test
4. Start calling!

**Estimated Total Setup Time:** 15 minutes (after receiving Client ID)

---

## 📞 Need Help?

- **Dialpad Support:** [email protected]
- **CTI Documentation:** https://developers.dialpad.com/docs/dialpad-mini-dialer
- **Your Implementation:** Check `DIALPAD_CTI_DIRECT_CALLING_COMPLETE.md`

---

## ✉️ Email Template for Your Team

Once setup is complete, send this to your team:

```
Subject: 📞 New Feature: Click-to-Call with Dialpad

Hi Team,

We've just launched a new calling feature in our CRM!

What's New:
• Click any "Call" button in the CRM
• Dialpad window pops up
• Phone number is pre-filled
• Make calls directly from the CRM

How to Use:
1. Click "Call" button on any contact
2. Log into Dialpad (first time only)
3. Your phone number will be pre-filled
4. Click to call!

The Dialpad window will remember your login, so you only need to 
log in once.

This works on:
✓ Contacts page
✓ Deals page
✓ Companies page
✓ Contact details
✓ Deal details

Let me know if you have any questions!

Happy calling! 📞
```

---

🎊 **Everything is ready - just waiting for that Client ID!** 🎊

