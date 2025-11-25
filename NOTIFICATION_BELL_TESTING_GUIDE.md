# 🔔 NOTIFICATION BELL - TESTING GUIDE

## ✅ WHAT WAS DEPLOYED

### Phase 2: Notification Bell UI (COMPLETE)

**Database Infrastructure (Already Created):**
- ✅ `notification_log` table
- ✅ Survey tracking columns (`survey_answered_count`, `survey_missed_count`)
- ✅ Helper functions (`log_notification()`, `update_survey_count()`)

**Frontend Components (Just Deployed):**
- ✅ Notification Bell Icon in sidebar header
- ✅ Notification Center drawer (right-side slide-out)
- ✅ Real-time notification system
- ✅ Survey completion logging

---

## 🎯 HOW TO TEST THE NOTIFICATION BELL

### 1. **Find the Bell Icon**

**Location:** Top-right of the DAR Portal sidebar header (next to your email)

**What to Look For:**
- 🔔 Bell icon
- Red badge with number (if you have unread notifications)

---

### 2. **Test Survey Notifications**

#### Step 1: Clock In
1. Go to DAR Portal
2. Select a client
3. Click **"Clock In"**
4. Fill in planned shift duration and daily task goal
5. Click **"Start My Shift"**

#### Step 2: Complete Mood Survey
- After 2 seconds, a mood survey will appear
- Select a mood (e.g., "😊 Good")
- **EXPECTED:** A notification is logged to the database

#### Step 3: Complete Energy Survey
- After 30 seconds, an energy survey will appear
- Select an energy level (e.g., "⚡ High")
- **EXPECTED:** Another notification is logged

#### Step 4: Check the Bell
1. Click the 🔔 bell icon
2. **EXPECTED:**
   - Notification drawer opens from the right
   - You see 2 notifications:
     - "Mood check completed: Good" (green icon)
     - "Energy check completed: High" (green icon)
   - Badge shows "2" unread notifications

---

### 3. **Test Mark as Read**

#### Option A: Individual Notification
1. Click on any unread notification (blue background)
2. **EXPECTED:**
   - Background turns white
   - Badge count decreases by 1

#### Option B: Mark All as Read
1. Click **"Mark all as read"** button at the top
2. **EXPECTED:**
   - All notifications turn white
   - Badge disappears (count = 0)

---

### 4. **Test Real-Time Updates**

#### If You Have Multiple Devices/Tabs:
1. Open DAR Portal in 2 browser tabs
2. In Tab 1: Complete a survey
3. In Tab 2: **EXPECTED:**
   - Bell badge updates automatically
   - New notification appears in the drawer (if open)

---

## 🎨 NOTIFICATION TYPES & COLORS

| Type | Icon | Color | When It Appears |
|------|------|-------|-----------------|
| `survey_completed` | ✅ CheckCircle | Green | Mood/Energy survey answered |
| `survey_missed` | ❌ XCircle | Red | Survey timeout (not yet implemented) |
| `task_progress` | 📈 TrendingUp | Blue | Task milestones (not yet implemented) |
| `goal_alert` | 🎯 Target | Purple | Goal warnings (not yet implemented) |
| `points_earned` | 🏆 Award | Yellow | Points system (not yet implemented) |
| `streak_milestone` | 🔥 Flame | Orange | Streak achievements (not yet implemented) |
| `idle_reminder` | ⚠️ AlertCircle | Gray | Idle time alerts (not yet implemented) |
| `deep_work_alert` | ⚡ Zap | Indigo | Deep work sessions (not yet implemented) |

---

## 🐛 TROUBLESHOOTING

### Bell Icon Not Showing
- **Check:** Is the page fully loaded?
- **Check:** Are you on the DAR Portal page (not Admin)?
- **Solution:** Refresh the page

### Badge Count Wrong
- **Check:** Are there old notifications from previous days?
- **Note:** Badge only shows TODAY's unread notifications
- **Solution:** Click "Mark all as read"

### Notifications Not Appearing
1. **Check Database:**
   ```sql
   SELECT * FROM notification_log
   WHERE user_id = 'YOUR_USER_ID'
   AND created_at >= CURRENT_DATE
   ORDER BY created_at DESC;
   ```

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

3. **Check RLS Policies:**
   ```sql
   SELECT * FROM pg_policies
   WHERE tablename = 'notification_log';
   ```

### Drawer Not Opening
- **Check:** Click directly on the bell icon (not the badge)
- **Solution:** Try clicking again, check browser console for errors

---

## 📊 WHAT'S NEXT (Phase 3)

### Survey Responsiveness Tracking
- Track answered vs missed surveys
- Feed into Energy metric calculation
- Feed into Consistency metric
- Feed into Momentum metric
- Feed into Points system

### Additional Notification Types
- Task progress alerts (50% over goal time)
- Idle time reminders
- Streak milestones
- Points earned notifications
- Deep work session alerts

### Energy Metric Integration
The notification system is now ready to track survey responsiveness, which will feed into the Energy metric calculation:

```typescript
// Factor 2: Survey Responsiveness (0-40 points)
const totalSurveys = answeredCount + missedCount;
const responsiveness = totalSurveys > 0
  ? (answeredCount / totalSurveys) * 40
  : 0;
```

---

## ✅ SUCCESS CRITERIA

You'll know it's working when:
1. ✅ Bell icon visible in sidebar header
2. ✅ Badge shows unread count
3. ✅ Clicking bell opens drawer from right
4. ✅ Mood/energy surveys create notifications
5. ✅ Notifications show correct icon/color
6. ✅ Mark as read works (individual & all)
7. ✅ Real-time updates work across tabs
8. ✅ Empty state shows when no notifications

---

## 🎯 CURRENT STATUS

| Feature | Status |
|---------|--------|
| Database Infrastructure | ✅ COMPLETE |
| Notification Bell UI | ✅ COMPLETE |
| Notification Center Drawer | ✅ COMPLETE |
| Survey Completion Logging | ✅ COMPLETE |
| Real-time Updates | ✅ COMPLETE |
| Mark as Read | ✅ COMPLETE |
| Survey Responsiveness Tracking | 🚧 IN PROGRESS |
| Additional Notification Types | ⏳ PENDING |
| Energy Metric Integration | ⏳ PENDING |

---

## 📝 TESTING CHECKLIST

- [ ] Bell icon visible in sidebar
- [ ] Badge shows correct unread count
- [ ] Clicking bell opens drawer
- [ ] Mood survey creates notification
- [ ] Energy survey creates notification
- [ ] Notifications show correct colors/icons
- [ ] Mark individual as read works
- [ ] Mark all as read works
- [ ] Badge updates after marking as read
- [ ] Real-time updates work
- [ ] Empty state shows correctly
- [ ] Drawer closes when clicking outside

---

**Ready to test? Start with Step 1: Clock In and complete a survey!** 🚀

