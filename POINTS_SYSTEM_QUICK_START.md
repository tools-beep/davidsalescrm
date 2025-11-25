# 🎯 Smart DAR Points System - Quick Start Guide

## ⚡ 5-Minute Integration Guide

### Step 1: Run Database Migration (1 min)
```sql
-- In Supabase SQL Editor, run:
\i supabase/migrations/20251124_add_points_system.sql
```

### Step 2: Add Points Badge to Header (1 min)
```typescript
// In your header/navigation component
import { PointsBadge } from '@/components/points/PointsBadge';

// Add to JSX
<PointsBadge userId={user.id} size="medium" showLabel={true} />
```

### Step 3: Add Points to Dashboard (1 min)
```typescript
// At top of Smart DAR Dashboard
import { PointsDashboardSection } from '@/components/points/PointsDashboardSection';

// Add to JSX (before metrics)
<PointsDashboardSection userId={selectedUserId} />
```

### Step 4: Add Notifications to EOD Portal (2 min)
```typescript
// In EODPortal.tsx
import { PointsNotificationContainer } from '@/components/points/PointsNotification';
import { PointNotification } from '@/utils/pointsEngine';

// Add state
const [pointNotifications, setPointNotifications] = useState<PointNotification[]>([]);

// Add to JSX (at root level)
<PointsNotificationContainer
  notifications={pointNotifications}
  onDismiss={(index) => {
    setPointNotifications(prev => prev.filter((_, i) => i !== index));
  }}
/>

// On task completion, add notifications:
// (Points are auto-awarded by database trigger)
// Just show the notifications from pointsEngine
```

---

## 🎯 Point Values Quick Reference

| Category | Points |
|----------|--------|
| **Quick Task** | +3 |
| **Standard Task** | +5 |
| **Deep Work Task** | +10 |
| **Long Task** | +12 |
| **Very Long Task** | +15 |
| **Immediate Impact Priority** | +5 |
| **Daily Task Priority** | +3 |
| **High Focus (≥90)** | +5 |
| **Good Focus (≥75)** | +3 |
| **Accurate Estimate (±20%)** | +3 |
| **Mood Survey** | +2 |
| **Energy Survey** | +2 |
| **Enjoyment Survey** | +1 |
| **Quick Burst (2+ tasks)** | +3 |
| **Uninterrupted Deep Work** | +4 |
| **High Enjoyment (≥4)** | +2 |
| **Priority Complete (Immediate)** | +4 |
| **Priority Complete (Daily)** | +2 |
| **Daily Goal Achieved** | +10 |
| **Daily Goal Exceeded** | +15 |
| **Daily Streak** | +5 |
| **Weekly Streak** | +20 |

---

## 📊 Example: Typical Task Points

**Quick Daily Task (Well Done):**
```
Base: 3 + Priority: 3 + Focus: 3 + Surveys: 4 = 13 points
```

**Deep Work Immediate Impact:**
```
Base: 10 + Priority: 5 + Focus: 5 + Accuracy: 3 + Uninterrupted: 4 = 27 points
```

**Daily Goal Achievement:**
```
All task points + Daily Goal: +10 = Varies
```

---

## 🔔 Notification Colors

| Type | Color | Icon |
|------|-------|------|
| Completion | Lavender | 🎉 |
| Focus | Blue | 💡 |
| Accuracy | Mint | ⏱️ |
| Survey | Pink | 😊 |
| Momentum | Yellow | ⚡ |
| Deep Work | Lavender | 🧠 |
| Priority | Peach | 🔥 |
| Goal | Mint | ✨ |
| Exceeded | Yellow | 🏆 |
| Streak | Peach | 🔥 |
| Weekly | Lavender | 🌟 |

---

## ✅ Files Created

1. `supabase/migrations/20251124_add_points_system.sql` - Database
2. `src/utils/pointsEngine.ts` - Calculation logic
3. `src/components/points/PointsNotification.tsx` - Notifications
4. `src/components/points/PointsBadge.tsx` - Badge component
5. `src/components/points/PointsDashboardSection.tsx` - Dashboard
6. `SMART_DAR_POINTS_SYSTEM.md` - Full documentation

---

## 🚀 Status

✅ **Core System:** Complete  
✅ **Build:** Successful  
⏳ **Integration:** Pending (add to EOD Portal & Dashboard)  
⏳ **Testing:** Pending  

**Ready to integrate!** 🎯

