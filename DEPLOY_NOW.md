# 🚀 DEPLOY NOW - Quick Fix

## ❌ Current Error
```
404 - Requested URL /api/v2/calls not found
```

## ✅ The Fix
Change ONE line in the edge function:

**Line 50 - Change from**:
```typescript
`https://dialpad.com/api/v2/calls?${params}`
```

**To**:
```typescript
`https://dialpad.com/api/v2/stats/calls?${params}`
```

---

## 📋 Steps (3 minutes)

1. **Open Supabase Dashboard**
   - https://supabase.com/dashboard
   - Your project

2. **Go to Edge Functions**
   - Click "Edge Functions" in left sidebar
   - Click "dialpad-sync"

3. **Edit Function**
   - Click "Edit" or "Code Editor"
   - Find line 50 (around line 50)
   - Change `/api/v2/calls` to `/api/v2/stats/calls`
   - Click "Deploy"

4. **Test**
   - Refresh CRM (Cmd+Shift+R)
   - Open Console (F12)
   - Wait for sync log
   - Should see: ✅ "Dialpad sync completed"

---

## 🎯 Or Copy Full Code

See `FIXED_DIALPAD_API_ENDPOINT.md` for the complete corrected code.

---

**That's it!** Just change `/api/v2/calls` to `/api/v2/stats/calls` and deploy. 🎉

