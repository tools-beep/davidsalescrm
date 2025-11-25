# 🎯 New Utilization Metric — Shift-Based System

## 📋 Overview

The Utilization metric has been redesigned to become a **clean, fair measure of how effectively a user uses their planned shift time**. It now incorporates a "Shift Length Estimate at Clock-In" field and avoids overlapping with Efficiency or Momentum.

**Key Improvements:**
- ✅ Based on planned shift time (user estimates at clock-in)
- ✅ Does NOT overlap with Efficiency
- ✅ Does NOT overlap with Momentum
- ✅ Measures shift planning accuracy
- ✅ Capped at 100% (no penalty for working more)
- ✅ Optional micro-bonus for survey responsiveness

---

## ✨ What Changed

### **Old System:**
```
❌ Utilization = Active Time ÷ Elapsed Task Time
❌ Overlapped with Efficiency
❌ Ignored shift planning
❌ No connection to user's actual work plan
```

### **New System:**
```
✅ Utilization = Active Task Time ÷ Planned Shift Time × 100
✅ Separate from Efficiency
✅ Based on user's shift estimate
✅ Measures planning accuracy
✅ Capped at 100% (no over-work penalty)
```

---

## 🧮 Complete Formula

```typescript
totalActiveTime = sum(eod_time_entries.accumulated_seconds)
plannedShiftSeconds = planned_shift_minutes × 60

utilization = totalActiveTime ÷ plannedShiftSeconds
utilization = min(utilization, 1.0) // Cap at 100%

utilizationScore = utilization × 100

// Optional micro-bonus for survey responsiveness
if (surveyResponseRate > 0.6) {
  utilizationScore += 5 // Subtle presence signal
}

utilizationScore = min(utilizationScore, 100) // Final cap

return round(utilizationScore)
```

---

## 📊 **Calculation Steps**

### **Step 1: Calculate Total Active Time**
```typescript
const totalActiveTime = entries.reduce((sum, e) => 
  sum + (e.accumulated_seconds || 0), 0
);
```

**What counts:**
- ✅ Accumulated active work time
- ❌ Pauses (excluded)
- ❌ Idle time (excluded)
- ❌ Clock-in time with no tasks (excluded)

---

### **Step 2: Get Planned Shift Time**
```typescript
let plannedShiftSeconds = 0;

if (clockInData && clockInData.planned_shift_minutes) {
  plannedShiftSeconds = clockInData.planned_shift_minutes * 60;
}
```

**Source:** User's estimate at clock-in (e.g., 4h, 8h, 10h)

---

### **Step 3: Calculate Base Utilization**
```typescript
let utilization = totalActiveTime / plannedShiftSeconds;

// Cap at 1.0 (100%) - no punishment for working more
utilization = Math.min(utilization, 1.0);

let utilizationScore = utilization * 100;
```

---

### **Step 4: Optional Micro-Bonus (Survey Responsiveness)**
```typescript
if (surveyData && surveyData.sent > 0) {
  const responseRate = surveyData.responses / surveyData.sent;
  
  if (responseRate > 0.6) {
    utilizationScore += 5; // Subtle presence signal
  }
}

// Final cap
utilizationScore = Math.min(utilizationScore, 100);
```

**Why?** Survey responses = presence signal. This does NOT dominate the score, only provides subtle fairness.

---

## 📋 **Example Calculations**

### **Example 1: Perfect Utilization**
```
Planned Shift: 8 hours (480 minutes)
Active Time: 8 hours (28,800 seconds)

utilization = 28,800 ÷ 28,800 = 1.0
utilizationScore = 1.0 × 100 = 100%

Result: Perfect! You used your shift exactly as planned.
```

---

### **Example 2: Under-Utilization**
```
Planned Shift: 8 hours (480 minutes)
Active Time: 4 hours (14,400 seconds)

utilization = 14,400 ÷ 28,800 = 0.5
utilizationScore = 0.5 × 100 = 50%

Result: You used only half your planned shift. Consider lowering your shift estimate.
```

---

### **Example 3: Over-Work (Capped)**
```
Planned Shift: 4 hours (240 minutes)
Active Time: 6 hours (21,600 seconds)

utilization = 21,600 ÷ 14,400 = 1.5
utilization = min(1.5, 1.0) = 1.0 (capped)
utilizationScore = 1.0 × 100 = 100%

Result: You exceeded your plan! No penalty. Score capped at 100%.
```

---

### **Example 4: With Survey Bonus**
```
Planned Shift: 6 hours (360 minutes)
Active Time: 5 hours (18,000 seconds)
Survey Response Rate: 8/10 = 80%

utilization = 18,000 ÷ 21,600 = 0.833
utilizationScore = 0.833 × 100 = 83.3%

Survey bonus: 80% > 60% → +5%
utilizationScore = 83.3 + 5 = 88.3%

Result: Good utilization with presence bonus!
```

---

## 📈 **What Each Utilization Score Means**

| Score | Color | Label | What It Means |
|-------|-------|-------|---------------|
| **85-100%** | 🟢 Green | Excellent | You used your shift time effectively |
| **70-84%** | 🔵 Blue | Good | Solid utilization, minor gaps |
| **50-69%** | 🟡 Yellow | Fair | Under-utilized shift, room for improvement |
| **30-49%** | 🟠 Orange | Needs Work | Significant under-utilization |
| **Below 30%** | 🔴 Red | Poor | Major under-utilization or poor planning |

---

## 🆚 **Utilization vs Efficiency vs Momentum**

### **Clear Separation:**

| Metric | What It Measures | Formula |
|--------|------------------|---------|
| **Utilization** | How well you use **planned shift time** | `Active Time ÷ Planned Shift` |
| **Efficiency** | How well you use **clocked-in time** | `Active Time ÷ (Active + True Idle)` |
| **Momentum** | How well you **enter and sustain flow** | `(Entry + Engagement + Enjoyment + Continuity) ÷ 4` |

### **Example Scenario:**
```
Planned Shift: 8 hours
Clocked In: 9 AM - 6 PM (9 hours)
Active Time: 6 hours
Idle Time: 3 hours

Utilization = 6h ÷ 8h = 75% (used 75% of planned shift)
Efficiency = 6h ÷ (6h + 3h) = 67% (67% of clocked-in time was active)
Momentum = Separate calculation based on flow factors

All three metrics tell different stories!
```

---

## 🎯 **Required Database Changes**

### **Add to `eod_clock_ins` table:**
```sql
ALTER TABLE eod_clock_ins 
ADD COLUMN planned_shift_minutes INTEGER;

ALTER TABLE eod_clock_ins 
ADD COLUMN planned_tasks INTEGER;

COMMENT ON COLUMN eod_clock_ins.planned_shift_minutes IS 
'User estimate of shift length at clock-in (e.g., 240 for 4 hours)';

COMMENT ON COLUMN eod_clock_ins.planned_tasks IS 
'Optional: User estimate of tasks to complete (used by Momentum, not Utilization)';
```

---

## 🎨 **Required UI Changes**

### **1. Clock-In Modal (EODPortal.tsx)**

When user clicks "Clock In", show a required modal:

```typescript
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Clock In</DialogTitle>
      <DialogDescription>
        Plan your shift to help track utilization
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4">
      {/* REQUIRED: Shift Length */}
      <div>
        <Label>How long is your shift today? *</Label>
        <Select required>
          <SelectTrigger>
            <SelectValue placeholder="Select shift length" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="120">2 hours</SelectItem>
            <SelectItem value="180">3 hours</SelectItem>
            <SelectItem value="240">4 hours</SelectItem>
            <SelectItem value="300">5 hours</SelectItem>
            <SelectItem value="360">6 hours</SelectItem>
            <SelectItem value="420">7 hours</SelectItem>
            <SelectItem value="480">8 hours</SelectItem>
            <SelectItem value="540">9 hours</SelectItem>
            <SelectItem value="600">10 hours</SelectItem>
            <SelectItem value="720">12 hours</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* OPTIONAL: Task Goal */}
      <div>
        <Label>How many tasks do you plan to finish? (optional)</Label>
        <Input 
          type="number" 
          min="1" 
          max="50" 
          placeholder="e.g., 5"
        />
      </div>
    </div>
    
    <DialogFooter>
      <Button onClick={handleClockIn}>Clock In</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Save to database:**
```typescript
const { error } = await supabase
  .from('eod_clock_ins')
  .insert({
    user_id: userId,
    client_name: selectedClient,
    clocked_in_at: new Date().toISOString(),
    planned_shift_minutes: shiftLength, // Required
    planned_tasks: taskGoal || null // Optional
  });
```

---

### **2. Utilization Card (SmartDARDashboard.tsx)**

Update the card to show:

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      <span>Utilization</span>
      <PieChart className="h-5 w-5" />
    </CardTitle>
  </CardHeader>
  
  <CardContent>
    {/* Score Badge */}
    <div className={`text-4xl font-bold ${getUtilizationColor(score)}`}>
      {score}%
    </div>
    
    {/* Details */}
    <div className="mt-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <span>Active Time:</span>
        <span className="font-semibold">{formatTime(activeTime)}</span>
      </div>
      <div className="flex justify-between">
        <span>Planned Shift:</span>
        <span className="font-semibold">{formatTime(plannedShift)}</span>
      </div>
      <div className="flex justify-between">
        <span>Trend:</span>
        <span>{getTrendArrow(trend)}</span>
      </div>
    </div>
    
    {/* Tooltip */}
    <Tooltip>
      <TooltipTrigger>
        <Info className="h-4 w-4 mt-2" />
      </TooltipTrigger>
      <TooltipContent>
        Utilization measures how well you used the shift time you planned
        when you clocked in. It reflects how much active work you completed
        during that planned time. It does not penalize breaks or long tasks.
      </TooltipContent>
    </Tooltip>
  </CardContent>
</Card>
```

**Color Logic:**
```typescript
const getUtilizationColor = (score: number): string => {
  if (score >= 85) return 'text-green-500'; // Pastel green
  if (score >= 70) return 'text-blue-500';  // Pastel blue
  if (score >= 50) return 'text-yellow-500'; // Pastel yellow
  if (score >= 30) return 'text-orange-500'; // Pastel orange
  return 'text-red-500'; // Pastel red
};
```

---

## 📊 **Weekly & Monthly Integration**

### **Weekly Summary:**
```typescript
{
  avgUtilization: 87,
  bestDay: { date: '2025-11-20', score: 95 },
  plannedVsActual: {
    totalPlannedHours: 40,
    totalActiveHours: 35
  },
  insights: [
    "You used 92% of your planned shift time this week. Great follow-through!",
    "You under-used your shift on Monday—consider lowering shift estimates.",
    "Excellent consistency: 4 days above 80% Utilization."
  ]
}
```

### **Monthly Summary:**
```typescript
{
  avgUtilization: 84,
  totalPlannedHours: 160,
  totalActiveHours: 134,
  sustainabilityPattern: "Consistent",
  insights: [
    "Month utilization average: 84%",
    "You're planning shifts realistically—keep it up!",
    "3 weeks above 80% utilization shows strong consistency."
  ]
}
```

---

## 💡 **How to Improve Utilization**

### **1. Plan Realistically**
```
❌ Don't overestimate: "I'll work 10 hours today!"
✅ Be realistic: "I'll work 6 hours today."

Overestimating → Low utilization score
Realistic planning → High utilization score
```

### **2. Adjust Estimates Based on History**
```
If you consistently get 60% utilization:
→ You're planning 8-hour shifts but working 5 hours
→ Solution: Plan 5-hour shifts instead

Result: 5h ÷ 5h = 100% utilization!
```

### **3. Minimize Idle Time**
```
Active work counts toward utilization
Idle time does NOT count

More active work = higher utilization
```

### **4. Answer Surveys**
```
>60% survey response rate = +5% bonus

This is a subtle presence signal
Not required, but helpful
```

---

## 🎯 **Behavioral Insights**

### **High Utilization (85-100%):**
```
"Excellent shift planning! You used 92% of your planned time effectively."
"Your utilization has been above 85% for 5 days straight—impressive consistency."
```

### **Medium Utilization (50-84%):**
```
"You used 72% of your planned shift. Consider lowering your estimate by 1-2 hours."
"Your Monday utilization was low (58%). What happened? Adjust future plans accordingly."
```

### **Low Utilization (<50%):**
```
"You planned an 8-hour shift but only worked 3 hours (38% utilization). Plan shorter shifts."
"Consistent low utilization suggests you're overestimating. Try planning 4-hour shifts instead."
```

---

## ✅ **Zero Disruption Rule**

This update **ONLY** modifies:
- ✅ Utilization calculation logic
- ✅ Utilization UI description
- ✅ Clock-In modal (adds shift planning fields)

It **DOES NOT** affect:
- ✅ Efficiency
- ✅ Momentum
- ✅ Rhythm
- ✅ Energy
- ✅ Focus Index
- ✅ Velocity
- ✅ Priority Completion
- ✅ Estimation Accuracy
- ✅ Task flow (start/pause/resume/complete)
- ✅ Dashboard layout
- ✅ Admin view

---

## 📝 **Files Modified**

### **Backend (✅ COMPLETE):**
1. **`src/utils/enhancedMetrics.ts`** (lines 557-615)
   - Completely rewrote `calculateEnhancedUtilization()`
   - Added 2 new parameters: `clockInData`, `surveyData`
   - Implemented shift-based calculation with fallback

2. **`src/pages/SmartDARDashboard.tsx`** (lines 627-637)
   - Updated function call to pass new parameters
   - Added survey responsiveness calculation

3. **`src/components/dashboard/SmartDARHowItWorks.tsx`** (lines 75-83)
   - Updated Utilization description with new formula

### **Frontend (⏳ TO BE IMPLEMENTED):**
1. **`src/pages/EODPortal.tsx`**
   - Add Clock-In modal with shift planning fields
   - Save `planned_shift_minutes` and `planned_tasks` to database

2. **Database Migration**
   - Add `planned_shift_minutes` column to `eod_clock_ins`
   - Add `planned_tasks` column to `eod_clock_ins`

---

## 🎉 **Expected Outcomes**

After full implementation:

✅ **Utilization becomes meaningful** — Based on user's actual plan  
✅ **Users understand shift planning accuracy** — Clear feedback loop  
✅ **System avoids double-penalizing** — No overlap with Efficiency  
✅ **Efficiency & Utilization clearly separate** — Different purposes  
✅ **Behavioral insights actionable** — "Plan shorter shifts" vs "Work more actively"  
✅ **Survey responsiveness enhances fairness** — Subtle presence signal  
✅ **Weekly/monthly analytics improve** — Trend tracking and insights  
✅ **UI remains consistent** — Pastel macaroon theme throughout  

---

## 🎯 **Summary**

### **New Utilization Formula:**
```
Utilization = (Active Task Time ÷ Planned Shift Time) × 100

Where:
- Active Task Time = sum(accumulated_seconds)
- Planned Shift Time = user's estimate at clock-in
- Capped at 100% (no over-work penalty)
- Optional +5% bonus for >60% survey response rate
```

**Result:** A clean, fair measure of shift planning accuracy that doesn't overlap with Efficiency or Momentum! 🎯✨

---

**Implementation Date:** November 24, 2025  
**Backend Status:** ✅ **COMPLETE**  
**Frontend Status:** ⏳ **PENDING** (Clock-In modal + database migration)

