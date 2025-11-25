# ✅ FIXED: Dashboard Time Calculation Logic

## **The Problem:**

You were **clocked in for 7h 12m** since 9:07 PM yesterday, but the dashboard only showed **2h 9m** of active time.

### **Why This Happened:**

The dashboard was fetching tasks for **"today only"** (midnight to now), missing all your tasks from **yesterday evening** when you actually started working.

**Your actual work session:**
- Clocked in: 9:07 PM (yesterday)
- Task 1: 1h 13m (9:28 PM yesterday)
- Task 2: 2h 1m (10:42 PM yesterday)
- Task 3: 0h 33m (12:46 AM today)
- Task 4: 1h 50m (2:51 AM today)
- Current task: 0h 49m (active now)

**Total work time: ~6h 26m**

But the dashboard was only counting tasks 3 & 4 (from midnight onwards), showing only **2h 9m**.

---

## **The Fix:**

### **New Logic:**

```typescript
// 1. Check if user is currently clocked in
const { data: clockInData } = await supabase
  .from('eod_clock_ins')
  .select('*')
  .eq('user_id', userId)
  .eq('date', today)
  .is('clocked_out_at', null)
  .single();

// 2. If clocked in: fetch ALL tasks since clock-in time
if (clockInData && clockInData.clocked_in_at) {
  queryStartTime = new Date(clockInData.clocked_in_at);  // 9:07 PM yesterday
  queryEndTime = new Date();  // Now
}
// 3. If NOT clocked in: fetch tasks for selected date only
else {
  queryStartTime = new Date(date at midnight);
  queryEndTime = new Date(date at 23:59:59);
}
```

### **What Changed:**

**BEFORE:**
- ❌ Always fetched tasks from selected date (midnight to 23:59)
- ❌ Missed tasks from previous day if still clocked in
- ❌ Card title: "Tasks Today" / "Time Today"

**AFTER:**
- ✅ If clocked in: Fetches ALL tasks since clock-in time (across days)
- ✅ If not clocked in: Fetches tasks for selected date only
- ✅ Card title updates: "Tasks (Since Clock-In)" / "Time (Since Clock-In)"

---

## **How It Works Now:**

### **Scenario 1: User is Clocked In**
- Dashboard checks for active clock-in
- Fetches all tasks since `clocked_in_at` timestamp
- Shows total time across multiple days if needed
- Card labels say "Since Clock-In"

**Example:**
- Clocked in: 9:07 PM Nov 19
- Current time: 4:20 AM Nov 20
- Fetches: All tasks from 9:07 PM onwards
- Shows: Total 6h+ of work

### **Scenario 2: User is NOT Clocked In**
- No active clock-in found
- Fetches tasks for selected date only (00:00 to 23:59)
- Shows daily summary
- Card labels say "Today"

**Example:**
- User clocked out yesterday
- Viewing yesterday's date
- Fetches: Only tasks from that day
- Shows: Daily total

---

## **UI Updates:**

### **Card Titles Now Change Dynamically:**

```typescript
// Tasks Card
{clockIn && !clockIn.clocked_out_at ? 'Tasks (Since Clock-In)' : 'Tasks Today'}

// Time Card  
{clockIn && !clockIn.clocked_out_at ? 'Time (Since Clock-In)' : 'Time Today'}
```

**When Clocked In:**
- "Tasks (Since Clock-In): 5"
- "Time (Since Clock-In): 6h 26m"

**When NOT Clocked In:**
- "Tasks Today: 3"
- "Time Today: 2h 15m"

---

## **Console Logs Added:**

You'll now see clearer logs:

**When Clocked In:**
```
🕐 User is clocked in - fetching tasks since: 11/19/2025, 9:07:33 PM
Fetching data for: [userId] From: [clock-in time] To: [now]
```

**When NOT Clocked In:**
```
📅 User not clocked in - fetching tasks for selected date: 11/20/2025
Fetching data for: [userId] From: [midnight] To: [23:59:59]
```

---

## **Files Modified:**

✅ `src/pages/SmartDARDashboard.tsx`
- Added clock-in check before fetching tasks
- Dynamic query time range based on clock-in status
- Dynamic card labels
- Added `clockIn` state variable

---

## **Test It Now:**

1. **Refresh your dashboard** (Cmd+Shift+R)
2. **Check the console** - you should see: 
   ```
   🕐 User is clocked in - fetching tasks since: [your clock-in time]
   ```
3. **Check the cards:**
   - "Tasks (Since Clock-In)" should show **5** (or total tasks since clock-in)
   - "Time (Since Clock-In)" should show **~6h 26m** (or your actual total time)
4. **Verify** the time matches your clock-in total: **7h 12m** clocked in minus breaks = **~6h 26m** active

---

## **Why the Math:**

- **Clocked in time**: 7h 12m (9:07 PM to 4:20 AM)
- **Idle/break time**: ~45m (7h 12m - 6h 26m = 46m)
- **Active time**: ~6h 26m (sum of all task durations)
- **Dashboard should now show**: 6h 26m ✅

This makes sense because:
- You had breaks between tasks
- You might have paused tasks
- Total clock-in time ≠ active work time

---

**Status**: ✅ **FIXED** - Dashboard now shows cumulative time since clock-in, not just today's tasks!

Test it and let me know if the numbers are correct now! 🚀


