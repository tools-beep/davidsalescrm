# 🧪 TEST ENERGY SURVEY MANUALLY

## 🔍 WHY ENERGY SURVEYS AREN'T SHOWING

Based on the code, energy surveys trigger:
- **First time:** 30 minutes after clock-in
- **After that:** Every 30 minutes

**If you just clocked in recently, you won't see energy surveys yet!**

---

## ⚡ QUICK TEST - Trigger Energy Survey Manually

### **Option 1: Wait for Natural Trigger**
- Clock in
- Wait 30 minutes
- Energy survey should pop up automatically

### **Option 2: Test Manually (Recommended)**

Open browser console (`Cmd + Option + J`) and paste this:

```javascript
// Manually trigger energy survey popup
const energyButton = document.querySelector('[data-testid="energy-check"]');
if (energyButton) {
  energyButton.click();
} else {
  console.log('Energy check button not found - survey might already be open');
}
```

---

## 🐛 POTENTIAL ISSUES

### **Issue #1: 30-Minute Interval Too Long**
Users might not stay clocked in for 30 minutes, so they never see energy surveys.

**Suggested Fix:** Reduce to 15 minutes or add a manual trigger button.

### **Issue #2: `lastEnergyCheckTime` Not Initialized**
If `lastEnergyCheckTime` is 0, the first check waits for 30 minutes after clock-in.

**Current Logic:**
```javascript
if (lastEnergyCheckTime > 0) {
  // Recurring checks every 30 min
} else {
  // First check: 30 min after clock-in
}
```

### **Issue #3: Notification Engine Not Running**
The energy check is part of the notification engine, which only runs when:
- User is clocked in
- A task is active
- Notification engine interval fires (every 60 seconds)

---

## 🔧 RECOMMENDED FIXES

### **Fix #1: Reduce Energy Check Interval**
Change from 30 minutes to 15 minutes:

```javascript
// BEFORE
const energyInterval = 30 * 60 * 1000; // 30 minutes

// AFTER
const energyInterval = 15 * 60 * 1000; // 15 minutes
```

### **Fix #2: Add Manual Energy Check Button**
Add a button in the UI to manually trigger energy survey:

```jsx
<Button onClick={() => setEnergyCheckOpen(true)}>
  ⚡ Check Energy
</Button>
```

### **Fix #3: Trigger First Energy Check Earlier**
Change first check to 5 minutes instead of 30:

```javascript
// First energy check after 5 minutes
const firstEnergyInterval = 5 * 60 * 1000; // 5 minutes
```

---

## 🧪 TESTING CHECKLIST

- [ ] Clock in to a client
- [ ] Wait 30 minutes (or use manual trigger)
- [ ] Energy survey popup appears
- [ ] Select an energy level
- [ ] Check console for "✅ Energy entry saved to database"
- [ ] Check notification bell for "Energy check completed" message
- [ ] Run SQL to verify `energy_entries` has a row
- [ ] Run SQL to verify `notification_log` has energy notification

---

## 📊 VERIFY IN DATABASE

After completing an energy survey, run:

```sql
-- Should show 1 row
SELECT * FROM energy_entries 
WHERE user_id = auth.uid()
ORDER BY timestamp DESC LIMIT 1;

-- Should show 1 notification
SELECT * FROM notification_log 
WHERE user_id = auth.uid()
  AND category = 'energy'
ORDER BY created_at DESC LIMIT 1;
```

---

**Next Steps:**
1. Try waiting 30 minutes after clock-in
2. Or use the manual trigger in console
3. Or I can reduce the interval to 15 minutes for faster testing

**Which would you prefer?** 🎯

