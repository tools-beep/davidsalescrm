# 🔧 Fix "sent_at" Error - Database Migration Required

## ⚠️ **The Problem**

Error: `record "new" has no field "sent_at"`

**Root Cause:** The database trigger function `update_contact_last_contacted()` tries to access both:
- `NEW.call_timestamp` (from calls table) ✅
- `NEW.sent_at` (from emails table) ❌

When inserting into the **calls** table, there is no `sent_at` field, so it crashes!

---

## ✅ **The Solution**

I've created a migration that:
1. **Drops** the old shared function that was causing the error
2. **Creates** two separate functions:
   - `update_contact_last_contacted_from_call()` - for calls (uses `call_timestamp`)
   - `update_contact_last_contacted_from_email()` - for emails (uses `sent_at`)
3. **Updates** the triggers to use the correct function

---

## 🚀 **How to Apply the Fix**

### **Option 1: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **+ New Query**
5. Copy the entire contents of this file:
   `/Users/jeladiaz/Documents/StafflyFolder/dealdashai/supabase/migrations/20251119_fix_last_contacted_trigger.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. You should see: "Success. No rows returned"

### **Option 2: Via Supabase CLI (If Linked)**

```bash
cd /Users/jeladiaz/Documents/StafflyFolder/dealdashai
supabase db push
```

---

## 📋 **SQL to Run**

```sql
-- Fix the update_contact_last_contacted function to handle calls and emails separately
-- The issue was that it tried to access NEW.sent_at on the calls table, which doesn't have that field

-- Drop the old shared function and triggers
DROP TRIGGER IF EXISTS trigger_update_contact_last_contacted_calls ON calls;
DROP TRIGGER IF EXISTS trigger_update_contact_last_contacted_emails ON emails;
DROP FUNCTION IF EXISTS update_contact_last_contacted();

-- Create separate function for calls
CREATE OR REPLACE FUNCTION update_contact_last_contacted_from_call()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contact's last_contacted_at if the call has a related contact
  IF NEW.related_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_contacted_at = COALESCE(NEW.call_timestamp, NOW())
    WHERE id = NEW.related_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create separate function for emails
CREATE OR REPLACE FUNCTION update_contact_last_contacted_from_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the contact's last_contacted_at if the email has a related contact
  IF NEW.related_contact_id IS NOT NULL THEN
    UPDATE contacts 
    SET last_contacted_at = COALESCE(NEW.sent_at, NOW())
    WHERE id = NEW.related_contact_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calls table
CREATE TRIGGER trigger_update_contact_last_contacted_calls
AFTER INSERT ON calls
FOR EACH ROW
EXECUTE FUNCTION update_contact_last_contacted_from_call();

-- Create trigger for emails table (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emails') THEN
    CREATE TRIGGER trigger_update_contact_last_contacted_emails
    AFTER INSERT ON emails
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_last_contacted_from_email();
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION update_contact_last_contacted_from_call() IS 'Automatically updates contact last_contacted_at when a call is logged';
COMMENT ON FUNCTION update_contact_last_contacted_from_email() IS 'Automatically updates contact last_contacted_at when an email is logged';
```

---

## ✅ **After Running**

Once you run this migration, the call logging will work perfectly! The trigger will:
- ✅ Use `call_timestamp` for calls
- ✅ Use `sent_at` for emails
- ✅ No more "field does not exist" errors

---

## 🎯 **What This Fixes**

**Before:**
```
Insert call → Trigger runs → Tries to access sent_at → ERROR ❌
```

**After:**
```
Insert call → Calls trigger runs → Uses call_timestamp → SUCCESS ✅
Insert email → Emails trigger runs → Uses sent_at → SUCCESS ✅
```

---

## 📞 **Need Help?**

If you encounter any issues running this migration, let me know!

