# 🔍 PRE-PRODUCTION DATABASE CHECK GUIDE

## Before You Push to Production - Database Verification

Follow these 3 simple steps to verify everything exists in Supabase:

---

## 📋 **STEP 1: Run Verification Script**

1. Open **Supabase Dashboard** → SQL Editor
2. Copy and paste the entire contents of: `SUPABASE_VERIFICATION_AND_FIX.sql`
3. Click **Run**
4. Read the output in the "Results" panel

**What to look for:**
- ✅ Green checkmarks = Item exists
- ❌ Red X marks = Item is missing

**Example Output:**
```
✅ eod_time_entries exists
✅ mood_entries exists
❌ points_history MISSING
✅ user_profiles exists
```

---

## 📋 **STEP 2: Create Missing Items (if any)**

If you see any ❌ red marks:

1. Open the file: `CREATE_MISSING_DATABASE_ITEMS.sql`
2. Find the section for the missing item (e.g., "SECTION 3: POINTS_HISTORY TABLE")
3. Copy ONLY that section
4. Paste into Supabase SQL Editor
5. Click **Run**
6. Repeat for each missing item

**OR** (if many items are missing):

Just run the entire `CREATE_MISSING_DATABASE_ITEMS.sql` file at once. It uses `IF NOT EXISTS` so it won't break anything that already exists.

---

## 📋 **STEP 3: Verify Again**

1. Run `SUPABASE_VERIFICATION_AND_FIX.sql` again
2. Confirm all items show ✅ green checkmarks
3. You're ready for production! 🚀

---

## 🎯 **WHAT WE'RE CHECKING**

### **Tables (10 total):**
1. `eod_time_entries` - Task tracking
2. `mood_entries` - Mood check-ins
3. `energy_entries` - Energy check-ins
4. `eod_clock_ins` - Clock in/out + shift planning
5. `user_profiles` - User data + points + streaks
6. `points_history` - Points activity log
7. `streak_history` - Streak tracking
8. `recurring_task_templates` - Task templates
9. `eod_reports` - Daily reports
10. `eod_submissions` - Submitted reports

### **Functions (5 total):**
1. `award_points()` - Awards points to users
2. `calculate_task_points()` - Calculates task points
3. `get_user_points_summary()` - Gets points summary
4. `calculate_shift_hours()` - Auto-calculates hours
5. `update_eod_report_hours()` - Auto-populates hours

### **Key Columns:**
- `eod_time_entries`: task_type, task_priority, task_intent, task_categories, task_enjoyment, points_awarded
- `user_profiles`: total_points, weekly_points, monthly_points, weekday_streak, weekend_bonus_streak
- `eod_clock_ins`: planned_shift_minutes, planned_tasks, actual_hours, rounded_hours

### **Triggers (2 total):**
1. `trg_calculate_shift_hours` - On clock-out
2. `trg_update_eod_report_hours` - On EOD submission

---

## ⚠️ **COMMON SCENARIOS**

### **Scenario A: Everything Already Exists** ✅
- You'll see all green checkmarks
- Skip Step 2
- You're ready for production!

### **Scenario B: A Few Items Missing** ⚠️
- Run only the specific sections from `CREATE_MISSING_DATABASE_ITEMS.sql`
- Verify again
- Ready for production!

### **Scenario C: Many Items Missing** 🔧
- Run the entire `CREATE_MISSING_DATABASE_ITEMS.sql` file
- It's safe - uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`
- Verify again
- Ready for production!

### **Scenario D: Tables Exist But Columns Missing** 🔧
- Run Sections 6-10 from `CREATE_MISSING_DATABASE_ITEMS.sql`
- These add columns to existing tables safely
- Verify again
- Ready for production!

---

## 🚨 **TROUBLESHOOTING**

### **Error: "relation already exists"**
- ✅ This is fine! It means the table already exists
- The script will skip creating it

### **Error: "column already exists"**
- ✅ This is fine! It means the column already exists
- The script will skip adding it

### **Error: "permission denied"**
- ❌ You need admin access to the Supabase project
- Ask project owner to run the scripts

### **Error: "foreign key constraint"**
- ⚠️ Run the scripts in order (tables before functions)
- Or run the entire `CREATE_MISSING_DATABASE_ITEMS.sql` at once

---

## ✅ **FINAL CHECKLIST**

Before pushing to production, confirm:

- [ ] Ran `SUPABASE_VERIFICATION_AND_FIX.sql`
- [ ] All items show ✅ green checkmarks
- [ ] No ❌ red marks in verification output
- [ ] All 10 tables exist
- [ ] All 5 functions exist
- [ ] All key columns exist
- [ ] Build is successful locally (`npm run build`)
- [ ] No console errors in local testing

**If all checked:** 🎉 **YOU'RE READY FOR PRODUCTION!**

---

## 📞 **NEED HELP?**

If you encounter any issues:

1. Check the error message in Supabase SQL Editor
2. Look for the section in `CREATE_MISSING_DATABASE_ITEMS.sql` that matches the error
3. Run that specific section
4. Verify again

**Still stuck?** Share the error message and we'll fix it!

---

## 🎯 **SUMMARY**

**3 Simple Steps:**
1. ✅ Run verification script
2. 🔧 Create missing items (if any)
3. ✅ Verify again

**Time Required:** 2-5 minutes

**Risk Level:** ✅ Zero risk (all scripts use safe `IF NOT EXISTS` checks)

**Ready to deploy!** 🚀

