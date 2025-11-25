# 🎯 New Consistency Metric — Fair Stability-Based System

## 📋 Overview

The Consistency metric has been completely redesigned as a **fair, stability-based metric** that measures day-to-day reliability and stability WITHOUT penalizing productivity, mood levels, or work styles.

**Key Improvements:**
- ✅ Does NOT penalize low productivity
- ✅ Does NOT penalize low mood or negative emotions
- ✅ Does NOT penalize low energy levels
- ✅ Does NOT penalize flexible schedules
- ✅ Does NOT penalize task difficulty or priority choices
- ✅ ONLY measures day-to-day stability and reliability

---

## ✨ What Changed

### **Old System (6 Factors with Penalties):**
```
❌ Daily active time variance (penalized short/long days)
❌ Mood stability (penalized low mood)
❌ Energy stability (penalized low energy)
❌ Start time stability (penalized late starts)
❌ Task type balance (penalized imbalance)
❌ Priority consistency (penalized avoiding long-term tasks)
```

### **New System (6 Pure Stability Factors):**
```
✅ Start-Time Reliability (variance only, no "good time" judgment)
✅ Active Time Stability (variance only, no productivity judgment)
✅ Task Mix Stability (variance only, no "correct mix" judgment)
✅ Priority Mix Stability (variance only, no "correct priorities" judgment)
✅ Mood Stability (variance only, no positivity judgment)
✅ Energy Stability (variance only, no high-energy judgment)
```

---

## 🧮 Complete Formula

```typescript
Consistency = (
  startTimeConsistency +
  activeTimeStability +
  taskMixConsistency +
  priorityStability +
  moodStability +
  energyStability
) ÷ 6 × 100

Where each factor ranges from 0 to 1.0
```

---

## ⭐ **FACTOR 1: Start-Time Reliability**

### **What It Measures**
How consistent your start times are (NOT whether the time is "good").

### **Calculation:**
```typescript
// Step 1: Extract first task start hour per day
const dailyStartTimes: Record<string, number> = {};
entries.forEach(e => {
  const date = e.started_at.split('T')[0];
  const hour = new Date(e.started_at).getHours();
  if (!dailyStartTimes[date]) {
    dailyStartTimes[date] = hour; // Only first task per day
  }
});

// Step 2: Calculate variance
const startHours = Object.values(dailyStartTimes);
const variance = calculateVariance(startHours);

// Step 3: Convert to consistency score
startTimeConsistency = max(0, 1 - (variance ÷ 20));
// 20 is the sensitivity constant (acceptable variance threshold)
```

### **Example:**
```
Day 1: First task at 9 AM
Day 2: First task at 9 AM
Day 3: First task at 10 AM
Day 4: First task at 9 AM
Day 5: First task at 8 AM

startHours = [9, 9, 10, 9, 8]
Average = 9
Variance = ((9-9)² + (9-9)² + (10-9)² + (9-9)² + (8-9)²) ÷ 5
         = (0 + 0 + 1 + 0 + 1) ÷ 5
         = 0.4

startTimeConsistency = max(0, 1 - (0.4 ÷ 20))
                     = max(0, 1 - 0.02)
                     = 0.98 (98%)
```

### **Why It's Fair:**
- ✅ No penalty for starting late (11 AM) vs early (7 AM)
- ✅ Only variance matters
- ✅ Consistent late starts = high score
- ✅ Consistent early starts = high score
- ✅ Inconsistent starts = low score

---

## ⭐ **FACTOR 2: Active Time Stability**

### **What It Measures**
How consistent your total active time per day is.

### **Calculation:**
```typescript
// Step 1: Sum accumulated seconds per day
const dailyActiveTime: Record<string, number> = {};
entries.forEach(e => {
  const date = e.started_at.split('T')[0];
  if (!dailyActiveTime[date]) dailyActiveTime[date] = 0;
  dailyActiveTime[date] += e.accumulated_seconds || 0;
});

// Step 2: Calculate variance
const dailyTimes = Object.values(dailyActiveTime);
const variance = calculateVariance(dailyTimes);

// Step 3: Convert to stability score
activeTimeStability = max(0, 1 - (variance ÷ 100000));
// 100000 is the sensitivity constant
```

### **Example:**
```
Day 1: 7200 seconds (2 hours)
Day 2: 7500 seconds (2.08 hours)
Day 3: 7000 seconds (1.94 hours)
Day 4: 7300 seconds (2.03 hours)
Day 5: 7100 seconds (1.97 hours)

Average = 7220 seconds
Variance = 28400

activeTimeStability = max(0, 1 - (28400 ÷ 100000))
                    = max(0, 1 - 0.284)
                    = 0.716 (71.6%)
```

### **Why It's Fair:**
- ✅ No penalty for short workdays (2 hours)
- ✅ No penalty for long workdays (8 hours)
- ✅ Only day-to-day stability matters
- ✅ Consistent 2-hour days = high score
- ✅ Consistent 8-hour days = high score
- ✅ Wildly varying days = low score

---

## ⭐ **FACTOR 3: Task Mix Stability (Type Consistency)**

### **What It Measures**
Stability of task type proportions across days.

### **Calculation:**
```typescript
// Step 1: Group tasks by day and count types
const dailyTaskTypes: Record<string, Record<string, number>> = {};

entries.forEach(e => {
  const date = e.started_at.split('T')[0];
  const type = e.task_type || 'Standard Task';
  
  if (!dailyTaskTypes[date]) dailyTaskTypes[date] = {};
  dailyTaskTypes[date][type] = (dailyTaskTypes[date][type] || 0) + 1;
});

// Step 2: Calculate daily percentages for each type
const allTypes = ['Quick Task', 'Standard Task', 'Deep Work Task', 'Long Task', 'Very Long Task'];
const typePercentages: number[] = [];

Object.values(dailyTaskTypes).forEach(dayTypes => {
  const dayTotal = Object.values(dayTypes).reduce((a, b) => a + b, 0);
  allTypes.forEach(type => {
    const count = dayTypes[type] || 0;
    typePercentages.push(count / dayTotal);
  });
});

// Step 3: Calculate variance and convert to consistency
const variance = calculateVariance(typePercentages);
taskMixConsistency = max(0, 1 - (variance ÷ 0.20));
// 0.20 is the sensitivity constant
```

### **Example:**
```
Day 1: 60% Quick, 40% Standard
Day 2: 50% Quick, 50% Standard
Day 3: 70% Quick, 30% Standard

Percentages: [0.6, 0.4, 0.5, 0.5, 0.7, 0.3]
Variance = 0.0133

taskMixConsistency = max(0, 1 - (0.0133 ÷ 0.20))
                   = max(0, 1 - 0.0665)
                   = 0.9335 (93.35%)
```

### **Why It's Fair:**
- ✅ No penalty for "wrong" task mix
- ✅ Only variance matters
- ✅ Consistent 100% Quick Tasks = high score
- ✅ Consistent 100% Deep Work = high score
- ✅ Chaotic daily shifts = low score

---

## ⭐ **FACTOR 4: Priority Mix Stability**

### **What It Measures**
Stability in priority distribution across days.

### **Calculation:**
```typescript
// Step 1: Group tasks by day and count priorities
const dailyPriorities: Record<string, Record<string, number>> = {};

entries.forEach(e => {
  const date = e.started_at.split('T')[0];
  const priority = e.task_priority || 'Weekly Task';
  
  if (!dailyPriorities[date]) dailyPriorities[date] = {};
  dailyPriorities[date][priority] = (dailyPriorities[date][priority] || 0) + 1;
});

// Step 2: Calculate daily percentages for each priority
const allPriorities = ['Immediate Impact Task', 'Daily Task', 'Weekly Task', 'Monthly Task', 'Evergreen Task', 'Trigger Task'];
const priorityPercentages: number[] = [];

Object.values(dailyPriorities).forEach(dayPriorities => {
  const dayTotal = Object.values(dayPriorities).reduce((a, b) => a + b, 0);
  allPriorities.forEach(priority => {
    const count = dayPriorities[priority] || 0;
    priorityPercentages.push(count / dayTotal);
  });
});

// Step 3: Calculate variance and convert to stability
const variance = calculateVariance(priorityPercentages);
priorityStability = max(0, 1 - (variance ÷ 0.25));
// 0.25 is the sensitivity constant
```

### **Example:**
```
Day 1: 50% Immediate, 50% Daily
Day 2: 60% Immediate, 40% Daily
Day 3: 40% Immediate, 60% Daily

Percentages: [0.5, 0.5, 0.6, 0.4, 0.4, 0.6]
Variance = 0.0067

priorityStability = max(0, 1 - (0.0067 ÷ 0.25))
                  = max(0, 1 - 0.0268)
                  = 0.9732 (97.32%)
```

### **Why It's Fair:**
- ✅ No penalty for "wrong" priorities
- ✅ Only variance matters
- ✅ Consistent 100% Urgent = high score
- ✅ Consistent 100% Evergreen = high score
- ✅ Wildly shifting priorities = low score

---

## ⭐ **FACTOR 5: Mood Stability**

### **What It Measures**
Variability in mood, NOT positivity or negativity.

### **Calculation:**
```typescript
// Step 1: Convert moods to numeric values
const moodValues: Record<string, number> = {
  '🔥': 1.0,   // Energized
  '😊': 0.8,   // Happy
  '😐': 0.5,   // Neutral
  '🥱': 0.3,   // Tired
  '😣': 0.1    // Stressed
};

const numericMoods = moodEntries.map(m => moodValues[m.mood] || 0.5);

// Step 2: Calculate variance
const variance = calculateVariance(numericMoods);

// Step 3: Convert to stability (×5 amplification)
moodStability = max(0, 1 - (variance × 5));
```

### **Example:**
```
Mood entries: [😊, 😊, 😐, 😊, 😊]
Numeric: [0.8, 0.8, 0.5, 0.8, 0.8]

Average = 0.74
Variance = ((0.8-0.74)² + (0.8-0.74)² + (0.5-0.74)² + (0.8-0.74)² + (0.8-0.74)²) ÷ 5
         = (0.0036 + 0.0036 + 0.0576 + 0.0036 + 0.0036) ÷ 5
         = 0.0144

moodStability = max(0, 1 - (0.0144 × 5))
              = max(0, 1 - 0.072)
              = 0.928 (92.8%)
```

### **Why It's Fair:**
- ✅ No penalty for low mood (😣 consistently = high score)
- ✅ No penalty for high mood (🔥 consistently = high score)
- ✅ Only emotional swings matter
- ✅ Consistent 😣 = high score
- ✅ Consistent 🔥 = high score
- ✅ Wild swings (🔥 → 😣 → 🔥) = low score

---

## ⭐ **FACTOR 6: Energy Stability**

### **What It Measures**
Stability of reported physical energy.

### **Calculation:**
```typescript
// Step 1: Convert energy to numeric values
const energyValues: Record<string, number> = {
  'High': 1.0,
  'Medium': 0.7,
  'Recharging': 0.6,
  'Low': 0.4,
  'Drained': 0.2
};

const numericEnergy = energyEntries.map(e => energyValues[e.energy_level] || 0.5);

// Step 2: Calculate variance
const variance = calculateVariance(numericEnergy);

// Step 3: Convert to stability (×5 amplification)
energyStability = max(0, 1 - (variance × 5));
```

### **Example:**
```
Energy entries: [Medium, Medium, Low, Medium, Medium]
Numeric: [0.7, 0.7, 0.4, 0.7, 0.7]

Average = 0.64
Variance = ((0.7-0.64)² + (0.7-0.64)² + (0.4-0.64)² + (0.7-0.64)² + (0.7-0.64)²) ÷ 5
         = (0.0036 + 0.0036 + 0.0576 + 0.0036 + 0.0036) ÷ 5
         = 0.0144

energyStability = max(0, 1 - (0.0144 × 5))
                = max(0, 1 - 0.072)
                = 0.928 (92.8%)
```

### **Why It's Fair:**
- ✅ No penalty for low energy (Drained consistently = high score)
- ✅ No penalty for high energy (High consistently = high score)
- ✅ Only energy swings matter
- ✅ Consistent Drained = high score
- ✅ Consistent High = high score
- ✅ Wild swings (High → Drained → High) = low score

---

## 📊 **Complete Example Calculation**

### **Scenario:**
```
5 days of work:

Day 1:
- Start: 9 AM
- Active: 7200 seconds (2 hours)
- Tasks: 60% Quick, 40% Standard
- Priorities: 50% Immediate, 50% Daily
- Mood: 😊 (0.8)
- Energy: Medium (0.7)

Day 2:
- Start: 9 AM
- Active: 7500 seconds (2.08 hours)
- Tasks: 50% Quick, 50% Standard
- Priorities: 60% Immediate, 40% Daily
- Mood: 😊 (0.8)
- Energy: Medium (0.7)

Day 3:
- Start: 10 AM
- Active: 7000 seconds (1.94 hours)
- Tasks: 70% Quick, 30% Standard
- Priorities: 40% Immediate, 60% Daily
- Mood: 😐 (0.5)
- Energy: Low (0.4)

Day 4:
- Start: 9 AM
- Active: 7300 seconds (2.03 hours)
- Tasks: 60% Quick, 40% Standard
- Priorities: 50% Immediate, 50% Daily
- Mood: 😊 (0.8)
- Energy: Medium (0.7)

Day 5:
- Start: 8 AM
- Active: 7100 seconds (1.97 hours)
- Tasks: 50% Quick, 50% Standard
- Priorities: 50% Immediate, 50% Daily
- Mood: 😊 (0.8)
- Energy: Medium (0.7)
```

### **Factor 1: Start-Time Reliability**
```
startHours = [9, 9, 10, 9, 8]
Variance = 0.4

startTimeConsistency = max(0, 1 - (0.4 ÷ 20))
                     = 0.98 (98%)
```

### **Factor 2: Active Time Stability**
```
dailyTimes = [7200, 7500, 7000, 7300, 7100]
Variance = 28400

activeTimeStability = max(0, 1 - (28400 ÷ 100000))
                    = 0.716 (71.6%)
```

### **Factor 3: Task Mix Stability**
```
Type percentages: [0.6, 0.4, 0.5, 0.5, 0.7, 0.3, 0.6, 0.4, 0.5, 0.5]
Variance = 0.0133

taskMixConsistency = max(0, 1 - (0.0133 ÷ 0.20))
                   = 0.9335 (93.35%)
```

### **Factor 4: Priority Mix Stability**
```
Priority percentages: [0.5, 0.5, 0.6, 0.4, 0.4, 0.6, 0.5, 0.5, 0.5, 0.5]
Variance = 0.0067

priorityStability = max(0, 1 - (0.0067 ÷ 0.25))
                  = 0.9732 (97.32%)
```

### **Factor 5: Mood Stability**
```
numericMoods = [0.8, 0.8, 0.5, 0.8, 0.8]
Variance = 0.0144

moodStability = max(0, 1 - (0.0144 × 5))
              = 0.928 (92.8%)
```

### **Factor 6: Energy Stability**
```
numericEnergy = [0.7, 0.7, 0.4, 0.7, 0.7]
Variance = 0.0144

energyStability = max(0, 1 - (0.0144 × 5))
                = 0.928 (92.8%)
```

### **Final Consistency Score:**
```
Consistency = (0.98 + 0.716 + 0.9335 + 0.9732 + 0.928 + 0.928) ÷ 6 × 100
            = 5.4587 ÷ 6 × 100
            = 90.98%
            ≈ 91%
```

**Result:** Excellent consistency! User maintains stable patterns across all dimensions.

---

## 📈 **What Each Consistency Score Means**

| Score | Label | What It Means |
|-------|-------|---------------|
| **90-100%** | Exceptional | Rock-solid routine, highly reliable, very stable patterns |
| **70-89%** | Excellent | Strong consistency, reliable patterns, good stability |
| **50-69%** | Good | Decent consistency, some variability, room for improvement |
| **30-49%** | Fair | Inconsistent patterns, high variability, unstable |
| **Below 30%** | Needs Work | Chaotic patterns, very high variability, unreliable |

---

## 🎯 **Key Improvements Over Old System**

### **1. No Productivity Penalties**

**Old System:**
```
❌ Short workdays penalized
❌ Long workdays penalized
❌ "Correct" task mix expected
❌ "Correct" priorities expected
```

**New System:**
```
✅ Short workdays OK if consistent
✅ Long workdays OK if consistent
✅ Any task mix OK if consistent
✅ Any priorities OK if consistent
```

---

### **2. No Emotional Penalties**

**Old System:**
```
❌ Low mood penalized
❌ Low energy penalized
❌ Negative emotions hurt score
```

**New System:**
```
✅ Low mood OK if consistent
✅ Low energy OK if consistent
✅ Only swings matter, not levels
```

---

### **3. Pure Stability Measurement**

**Old System:**
```
❌ Mixed stability with correctness
❌ Judged "good" vs "bad" patterns
❌ Penalized flexible schedules
```

**New System:**
```
✅ Pure variance measurement
✅ No judgment of patterns
✅ Flexible schedules OK if consistent
```

---

## 💡 **How to Improve Consistency**

### **Improve Start-Time Reliability:**
1. **Pick a consistent start time** (doesn't matter if it's 7 AM or 11 AM)
2. **Start first task at similar time each day**
3. **Variance matters, not the actual time**

### **Improve Active Time Stability:**
1. **Work similar amounts each day** (doesn't matter if it's 2 hours or 8 hours)
2. **Avoid wild swings** (2 hours one day, 8 hours the next)
3. **Consistency matters, not total time**

### **Improve Task Mix Stability:**
1. **Maintain similar task type proportions**
2. **If you do 60% Quick Tasks, keep it around 60% daily**
3. **Avoid chaotic shifts** (100% Quick one day, 100% Deep Work the next)

### **Improve Priority Stability:**
1. **Maintain similar priority distributions**
2. **If you do 50% Urgent, keep it around 50% daily**
3. **Avoid wild priority swings**

### **Improve Mood Stability:**
1. **Track mood honestly**
2. **Work on emotional regulation**
3. **Consistent mood (even if low) = high score**

### **Improve Energy Stability:**
1. **Track energy honestly**
2. **Work on sleep, nutrition, exercise**
3. **Consistent energy (even if low) = high score**

---

## 📊 **Data Sources**

### **Consistency uses:**
- `eod_time_entries` (started_at, accumulated_seconds, task_type, task_priority)
- `mood_entries` (mood, timestamp)
- `energy_entries` (energy_level, timestamp)

---

## ✅ **Zero Disruption Rule**

This update **ONLY** modifies:
- ✅ Consistency calculation logic
- ✅ Consistency UI description

It **DOES NOT** break:
- ✅ Focus Index
- ✅ Velocity
- ✅ Momentum
- ✅ Rhythm
- ✅ Efficiency
- ✅ Utilization
- ✅ Task flow (start/pause/resume/complete)
- ✅ Dashboard structure
- ✅ Notifications
- ✅ Admin view
- ✅ User isolation

---

## 🎉 **Expected Outcomes**

After this implementation, the Consistency metric will:

✅ **Be fair to all users** — No productivity or mood penalties  
✅ **Not punish long tasks** — Only variance matters  
✅ **Not punish flexible schedules** — Consistency at any level = high score  
✅ **Not penalize low mood** — Emotional swings matter, not levels  
✅ **Not penalize low energy** — Energy swings matter, not levels  
✅ **Only measure stability** — Pure day-to-day reliability  
✅ **Integrate with mood/energy** — Without affecting other metrics  
✅ **Produce clearer insights** — "You're inconsistent" vs "You're unproductive"  

---

## 📝 **Files Modified**

1. **`src/utils/enhancedMetrics.ts`** (lines 695-860)
   - Completely rewrote `calculateEnhancedConsistency()`
   - Implemented 6 new pure stability factors
   - Added helper function for variance calculation

2. **`src/components/dashboard/SmartDARHowItWorks.tsx`** (lines 93-101)
   - Updated Consistency description with new formula

---

## 🎯 **Summary**

### **New Consistency Formula:**
```
Consistency = (
  Start-Time Reliability +
  Active Time Stability +
  Task Mix Stability +
  Priority Mix Stability +
  Mood Stability +
  Energy Stability
) ÷ 6 × 100
```

**Key Factors:**
- ✅ Start-Time Reliability (0-1.0): Variance in daily start hours
- ✅ Active Time Stability (0-1.0): Variance in daily active time
- ✅ Task Mix Stability (0-1.0): Variance in task type proportions
- ✅ Priority Mix Stability (0-1.0): Variance in priority distributions
- ✅ Mood Stability (0-1.0): Variance in mood check-ins
- ✅ Energy Stability (0-1.0): Variance in energy levels

**Result:** A fair, pure stability metric that measures day-to-day reliability without any productivity, mood, or work style penalties! 🎯✨

---

**Implementation Date:** November 24, 2025  
**Status:** ✅ **COMPLETE & READY FOR DEPLOYMENT**

