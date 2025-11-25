# 🔔 EOD Portal Notification System Guide

## Overview
The EOD Portal includes a comprehensive notification system that tracks user mood, energy levels, task enjoyment, and task progress. All notifications include **both sound and visual popups** with the **Smart Macaroon Theme**.

---

## 🎨 Smart Macaroon Theme
All notification popups use the luxury macaroon color palette:
- **Background**: `#FFFCF9` (Cream)
- **Borders**: Pastel colors (Pink, Mint, Lavender, etc.)
- **Shadows**: Soft, elevated shadows with color tints
- **Border Radius**: `rounded-3xl` (28px)
- **Typography**: Dark gray (`#4B4B4B`) for text

---

## 📋 Notification Types

### 1. **Mood Check-In** 🎭
**When it triggers:**
- Immediately after clocking in (2 seconds delay)
- Every 30 minutes while clocked in

**What it does:**
- Plays notification sound
- Shows popup at bottom-right corner
- Asks: "How are you feeling?"
- Options: Happy 😊, Neutral 😐, Stressed 😣, Tired 🥱, Energized 🔥
- Auto-dismisses after 30 seconds
- Saves to `mood_entries` table

**UI Theme:**
- Border color: `#F7C9D4` (Blush Pink)
- Shadow: Pink tint
- Grid layout with emoji buttons

**Code Location:** `src/components/checkins/MoodCheckPopup.tsx`

---

### 2. **Energy Level Check** ⚡
**When it triggers:**
- 30 minutes after clocking in (first check)
- Every 30 minutes thereafter

**What it does:**
- Plays notification sound
- Shows popup at bottom-right corner
- Asks: "How's your energy level?"
- Options: High ⚡, Medium 🔋, Low 🪫, Drained 🔴, Recharging 🔵
- Auto-dismisses after 30 seconds
- Saves to `energy_entries` table

**UI Theme:**
- Border color: `#B8EBD0` (Pistachio Cream)
- Shadow: Mint tint
- Vertical list with icon buttons
- Hover effects change background to level color

**Code Location:** `src/components/checkins/EnergyCheckPopup.tsx`

---

### 3. **Task Enjoyment Survey** ❤️
**When it triggers:**
- Immediately after completing a task (1 second delay)

**What it does:**
- Plays notification sound
- Shows popup at bottom-right corner
- Asks: "How did you enjoy this task?"
- Shows task description
- Options: Loved it ❤️, Liked it 👍, Neutral 😐, Didn't enjoy 👎, Hated it 😞
- Auto-dismisses after 30 seconds
- Saves `task_enjoyment` to `eod_time_entries` table

**UI Theme:**
- Border color: `#C7B8EA` (Lavender Cloud)
- Shadow: Purple tint
- Grid layout with icon + label buttons

**Code Location:** `src/components/checkins/TaskEnjoymentPopup.tsx`

---

### 4. **Task Goal Progress Notifications** 🎯
**When it triggers:**
- Every 2 minutes while a task is active
- Checks progress against goal duration

**Milestone Notifications:**
- **50%**: "Halfway there! Keep going!" 🎯
- **75%**: "Almost done! 75% complete" 🎯
- **100%**: "Goal reached! You've hit your target time" ✅
- **125%**: "You're 25% over your goal time" ⏰
- **150%**: "You're 50% over your goal time" ⚠️
- **200%**: "You're 100% over your goal time" 🚨

**What it does:**
- Plays notification sound
- Shows **toast notification** (not popup)
- Displays progress percentage, time elapsed, and task description
- Each milestone triggers only once per task
- Does NOT count toward notification cap (unlimited)

**UI Theme:**
- Background: Changes based on progress
  - Before 100%: `#A7C7E7` (Blueberry Milk)
  - At/After 100%: `#B8EBD0` (Pistachio Cream)
- Border color matches background
- Duration: 5 seconds

**Code Location:** `src/pages/EODPortal.tsx` (lines 366-410)

---

## 🔊 Notification Sound System

### Audio Initialization
- Audio is initialized when user clocks in
- Uses `initializeAudio()` from `src/utils/notificationSound.ts`
- Ensures sound can play on user interaction

### Sound Playback
- All notifications call `playNotificationSound()`
- Plays before showing popup/toast
- Gentle, non-intrusive sound

**Code Location:** `src/utils/notificationSound.ts`

---

## 🚦 Notification Cap System

### Purpose
Prevents notification overload by limiting non-critical notifications.

### Rules
- **Cap**: 5 notifications per hour
- **Resets**: Every hour
- **Counted notifications**:
  - Mood check-ins
  - Energy check-ins
- **Unlimited notifications** (not counted):
  - Task goal progress
  - Task completion/enjoyment
  - Clock-in/clock-out

### How it works
```typescript
const canSendNotification = (): boolean => {
  // Reset counter if an hour has passed
  if (now - lastHourReset >= 60 * 60 * 1000) {
    setNotificationCount(0);
    setLastHourReset(now);
    return true;
  }
  
  // Check if we've hit the cap
  if (notificationCount >= 5) {
    return false; // Block notification
  }
  
  return true;
};
```

**Code Location:** `src/pages/EODPortal.tsx` (lines 337-363)

---

## ⚙️ Notification Engine

### How it runs
- Runs every **2 minutes** (120 seconds)
- Only active when user is clocked in
- Checks all conditions in parallel

### What it checks
1. **Mood check** - Every 30 minutes
2. **Energy check** - Every 30 minutes
3. **Task progress** - For ALL active tasks across clients
4. **Notification cap** - Before sending mood/energy checks

### Multi-Client Support
- Tracks active tasks per client
- Checks progress for all active tasks simultaneously
- Each client's tasks are monitored independently

**Code Location:** `src/pages/EODPortal.tsx` (lines 514-603)

---

## 📊 Data Storage

### Tables Used
1. **`mood_entries`**
   - `user_id`: UUID
   - `timestamp`: TIMESTAMPTZ
   - `mood_level`: TEXT (happy, neutral, stressed, tired, energized)

2. **`energy_entries`**
   - `user_id`: UUID
   - `timestamp`: TIMESTAMPTZ
   - `energy_level`: TEXT (high, medium, low, drained, recharging)

3. **`eod_time_entries`**
   - `task_enjoyment`: INTEGER (1-5)
   - Stored when task is completed

---

## 🎯 Task Settings Modal (Survey)

### When it appears
- **After clicking "Start Task"** button
- Before the task timer actually starts

### What it asks
1. **Task Type** (Required)
   - Quick (5-15 min)
   - Standard (20-45 min)
   - Deep Work (1-2 hours)
   - Long (2-4 hours)
   - Very Long (4+ hours)

2. **Goal Duration** (Required)
   - Preset options: 10, 15, 20, 25, 30, 45, 60, 90 minutes
   - Custom input available

3. **Task Categories** (Optional, Multi-Select)
   - Creative, Admin, Research, Repetitive, Communication, Coordination, Organizational, Learning, Technical, Sales, Follow-up, Client Management, QA

4. **Task Intent** (Optional)
   - Complete the task
   - Make progress
   - Draft / outline
   - Review / clean up
   - Finish hardest part

### UI Theme
- Fully styled with Smart Macaroon theme
- Pastel color-coded buttons
- Rounded corners and soft shadows
- Interactive hover effects

**Code Location:** `src/components/tasks/TaskSettingsModal.tsx`

---

## 🐛 Recent Fixes

### Issue: Task Modal Not Appearing
**Problem:** Task settings modal wasn't showing after clicking "Start Task"

**Root Cause:** Task description wasn't being passed to `startTimer()` function

**Fix:** Updated line 3479 in `EODPortal.tsx`:
```typescript
// Before
startTimer(selectedClient, currentClient.email || "");

// After
startTimer(selectedClient, currentClient.email || "", taskDescription);
```

**Status:** ✅ Fixed

---

## 🧪 Testing Checklist

### To verify notifications are working:

1. **Clock In**
   - [ ] Notification sound plays
   - [ ] Mood check popup appears after 2 seconds
   - [ ] Popup has macaroon theme styling

2. **Start a Task**
   - [ ] Task settings modal appears
   - [ ] Modal has macaroon theme styling
   - [ ] Can select task type, duration, categories, intent
   - [ ] Task starts after clicking "Start Task"

3. **Wait 30 Minutes**
   - [ ] Mood check popup appears
   - [ ] Notification sound plays

4. **Wait Another 30 Minutes**
   - [ ] Energy check popup appears
   - [ ] Notification sound plays

5. **Task Progress (with goal set)**
   - [ ] 50% notification appears (toast)
   - [ ] 75% notification appears
   - [ ] 100% notification appears
   - [ ] Over-time notifications appear (125%, 150%, 200%)

6. **Complete Task**
   - [ ] Task enjoyment popup appears after 1 second
   - [ ] Notification sound plays
   - [ ] Can select enjoyment level

---

## 🎨 Theme Consistency

All notification components use the **same color palette**:

```typescript
const PASTEL_COLORS = {
  lavenderCloud: '#C7B8EA',
  blushPink: '#F7C9D4',
  honeyButter: '#FAE8A4',
  pistachioCream: '#B8EBD0',
  blueberryMilk: '#A7C7E7',
  peachSouffle: '#F8D4C7',
  mintMatcha: '#B8EBD0',
  cream: '#FFFCF9',
  darkText: '#4B4B4B',
  mutedText: '#6F6F6F',
  border: '#EDEDED',
  shadowSoft: '0 4px 12px rgba(0, 0, 0, 0.04)',
};
```

---

## 📝 Console Logs

The notification system includes extensive logging for debugging:

- `[Notification Engine]` - Main engine status
- `[MoodCheckPopup]` - Mood popup events
- `[EnergyCheckPopup]` - Energy popup events
- `[TaskEnjoymentPopup]` - Task enjoyment events
- `[Notification]` - Task progress notifications
- `[Notification Cap]` - Cap system status
- `[Clock-in]` - Clock-in related notifications

Open browser console to see real-time notification activity.

---

## 🚀 Summary

**All notification systems are fully implemented and themed:**
- ✅ Mood check-ins (sound + popup)
- ✅ Energy check-ins (sound + popup)
- ✅ Task enjoyment survey (sound + popup)
- ✅ Task goal progress (sound + toast)
- ✅ Task settings modal (before task start)
- ✅ Smart Macaroon theme on all components
- ✅ Notification cap system (5/hour for mood/energy)
- ✅ Multi-client support
- ✅ Auto-dismiss timers (30 seconds)
- ✅ Console logging for debugging

**The system is production-ready and fully functional!** 🎉

