# 🐛 DEBUG: Calendar Scheduling Feature

## ❓ WHAT DIDN'T WORK?

Please identify which step failed:

### 1️⃣ **Calendar Button Not Showing?**
- Check: Did you hard refresh? (Cmd + Shift + R)
- Check: Are you looking at a NON-DAILY task priority?
  - ✅ Should show: Immediate Impact, Weekly, Monthly, Evergreen, Trigger
  - ❌ Should NOT show: Daily Tasks

### 2️⃣ **Schedule Dialog Not Opening?**
- Check browser console for errors (F12 or Cmd+Option+I)
- Look for JavaScript errors

### 3️⃣ **Schedule Button Not Working?**
- Check: Did you run the SQL migration?
- Check browser console for database errors

### 4️⃣ **Template Not Auto-Adding on Clock-In?**
- Check: Did you schedule for TODAY's date?
- Check browser console for `[Scheduled Templates]` logs

---

## 🔍 DEBUGGING STEPS:

### **Step 1: Verify SQL Migration**

Run this in Supabase SQL Editor to check if column exists:

```sql
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'recurring_task_templates' 
  AND column_name = 'scheduled_date';
```

**Expected Result:**
```
column_name     | data_type
----------------|----------
scheduled_date  | date
```

If this returns **no rows**, the migration wasn't run!

---

### **Step 2: Check Browser Console**

1. Open Developer Tools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Look for errors when:
   - Clicking calendar button
   - Scheduling a template
   - Clocking in

**Look for:**
- `[Scheduled Templates]` logs
- Red error messages
- Database errors

---

### **Step 3: Manual Test Schedule**

Run this in Supabase SQL Editor to manually schedule a template:

```sql
-- First, find your template ID
SELECT id, template_name, user_id 
FROM recurring_task_templates 
WHERE user_id = 'YOUR_USER_ID_HERE'
LIMIT 5;

-- Then, manually schedule one for today
UPDATE recurring_task_templates
SET scheduled_date = CURRENT_DATE
WHERE id = 'TEMPLATE_ID_HERE';

-- Verify it was set
SELECT id, template_name, scheduled_date
FROM recurring_task_templates
WHERE scheduled_date = CURRENT_DATE;
```

Now try clocking in and see if it auto-adds.

---

### **Step 4: Check Date Format**

The system uses EST dates. Run this to check:

```sql
-- Check what date format is being used
SELECT 
  id,
  template_name,
  scheduled_date,
  scheduled_date::text as date_text
FROM recurring_task_templates
WHERE scheduled_date IS NOT NULL;
```

---

## 🔧 COMMON ISSUES:

### **Issue 1: Column doesn't exist**
**Error:** `column "scheduled_date" does not exist`

**Fix:** Run the SQL migration:
```sql
ALTER TABLE recurring_task_templates 
ADD COLUMN IF NOT EXISTS scheduled_date DATE;

CREATE INDEX IF NOT EXISTS idx_recurring_task_templates_scheduled_date 
ON recurring_task_templates(scheduled_date);
```

---

### **Issue 2: Calendar button not visible**
**Cause:** Looking at Daily Tasks section

**Fix:** Expand a different priority section:
- Immediate Impact Tasks
- Weekly Tasks
- Monthly Tasks
- Evergreen Tasks
- Trigger Tasks

---

### **Issue 3: Template not auto-adding**
**Possible causes:**
1. Scheduled for wrong date
2. Already clocked in (clock out first, then clock in again)
3. Template belongs to different client
4. Console errors blocking execution

**Debug:**
```javascript
// In browser console, check:
localStorage.getItem('selectedClient')
```

---

## 📊 EXPECTED BEHAVIOR:

### **When Scheduling:**
1. Click calendar icon 📅
2. Dialog opens
3. Select date
4. Click "Schedule"
5. Toast: "📅 Template Scheduled"
6. Dialog closes

### **When Clocking In:**
1. Click "Clock In"
2. System checks for scheduled templates
3. If found:
   - Adds to queue
   - Shows toast: "📅 1 Scheduled Task Added"
   - Logs to notification center
   - Clears scheduled_date

---

## 🚨 EMERGENCY FIX:

If nothing works, try this complete reset:

```sql
-- 1. Drop and recreate the column
ALTER TABLE recurring_task_templates DROP COLUMN IF EXISTS scheduled_date;
ALTER TABLE recurring_task_templates ADD COLUMN scheduled_date DATE;

-- 2. Create index
DROP INDEX IF EXISTS idx_recurring_task_templates_scheduled_date;
CREATE INDEX idx_recurring_task_templates_scheduled_date 
ON recurring_task_templates(scheduled_date);

-- 3. Verify
SELECT COUNT(*) as total_templates,
       COUNT(scheduled_date) as scheduled_count
FROM recurring_task_templates;
```

Then:
1. Hard refresh browser (Cmd + Shift + R)
2. Clear site data (Dev Tools > Application > Clear Storage)
3. Reload page
4. Try again

---

## 📝 REPORT BACK:

Please provide:
1. ✅ Did you run the SQL migration?
2. ✅ What happens when you click the calendar button?
3. ✅ Any error messages in console?
4. ✅ Screenshot of the template card (showing buttons)
5. ✅ Result of the SQL verification query above

