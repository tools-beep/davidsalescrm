# 🔧 Fix Infinite Recursion Error

## 🐛 The Error:
```
Error creating group:
code: '42P17'
message: 'infinite recursion detected in policy for relation "group_chat_members"'
```

## ✅ The Problem:
The RLS policy for `group_chat_members` is checking itself, causing infinite recursion.

## 🚀 The Solution:

### Run This SQL:
**File:** `FIX_GROUP_CHAT_RLS.sql`

Open Supabase SQL Editor and run it.

This will:
1. Drop the problematic recursive policies
2. Create simple, non-recursive policies
3. Allow all authenticated users to create/read group chats

---

## 📋 Steps:

1. **Open Supabase SQL Editor**
2. **Copy `FIX_GROUP_CHAT_RLS.sql`**
3. **Paste and RUN**
4. **Refresh browser**
5. **Try creating group again**

---

## ✅ After Running:

You'll see:
```
✅ Group chat RLS policies fixed!
```

Then try creating the group again - it should work!

---

**Run the SQL now!** 🎉

