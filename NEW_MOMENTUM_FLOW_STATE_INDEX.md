# 🚀 New Momentum Metric — Flow State Momentum Index

## 📋 Overview

The Momentum metric has been completely redesigned as a **simple, fair, 4-factor "Flow State Momentum Index"** that accurately captures how quickly a user enters flow, how long they sustain it, how enjoyable the work is, and how smoothly they transition between tasks.

**Key Improvements:**
- ✅ Does NOT penalize long tasks
- ✅ Does NOT penalize pauses
- ✅ Does NOT penalize prioritization patterns
- ✅ Does NOT penalize schedule variability
- ✅ Rewards early engagement
- ✅ Rewards sustained focus
- ✅ Rewards enjoyment
- ✅ Rewards smooth transitions

---

## ✨ What Changed

### **Old System (5 Factors):**
```
❌ Quick task bursts (favored quick tasks over deep work)
❌ Deep work stability (penalized pauses)
❌ Enjoyment bonus (only 50% cap)
❌ Low idle time (penalized pauses)
❌ Priority momentum (favored urgent tasks)
```

### **New System (4 Factors):**
```
✅ Entry Momentum (early activation signals)
✅ Deep Engagement Score (sustained focus blocks)
✅ Enjoyment Score (flow satisfaction)
✅ Flow Continuity (smooth transitions)
```

---

## 🧮 Complete Formula

```typescript
Momentum = (
  entryMomentum +
  deepEngagementScore +
  enjoymentScore +
  flowContinuity
) ÷ 4 × 100

Where each factor ranges from 0 to 1.0
```

---

## ⭐ **FACTOR 1: Entry Momentum (Early Activation)**

### **What It Measures**
How quickly you enter flow after clocking in. Measures **activation signals**, not task completions.

### **Activation Signals (within first 90 minutes after clock-in):**

1. **Started any task** → +0.4 points
2. **Reached ≥ 20 minutes accumulated active time** → +0.4 points
3. **Responded to ANY survey (mood/energy popup)** → +0.2 points

### **Calculation:**
```typescript
const clockInTime = new Date(clockInData.clocked_in_at).getTime();
const first90MinWindow = clockInTime + (90 * 60 * 1000);

// Signal 1: Started any task within first 90 min
const startedTaskIn90 = entries.some(e => {
  const startTime = new Date(e.started_at).getTime();
  return startTime >= clockInTime && startTime <= first90MinWindow;
});

// Signal 2: Reached ≥ 20 minutes accumulated active time
const activeTimeIn90 = entries
  .filter(e => startTime within first 90 min)
  .reduce((sum, e) => sum + e.accumulated_seconds, 0);
const active20minIn90 = activeTimeIn90 >= (20 * 60);

// Signal 3: Responded to survey
const surveyResponseIn90 = (moodEntries or energyEntries)
  .some(timestamp within first 90 min);

// Calculate entry momentum
entryMomentum = 
  (startedTaskIn90 ? 0.4 : 0) +
  (active20minIn90 ? 0.4 : 0) +
  (surveyResponseIn90 ? 0.2 : 0);

entryMomentum = min(entryMomentum, 1.0);
```

### **Example:**
```
Clock-in: 9:00 AM
First 90 minutes: 9:00 AM - 10:30 AM

User actions:
- 9:05 AM: Started Deep Work task ✅ (+0.4)
- 9:30 AM: Accumulated 25 minutes active time ✅ (+0.4)
- 9:45 AM: Responded to mood survey ✅ (+0.2)

entryMomentum = 0.4 + 0.4 + 0.2 = 1.0 (100%)
```

### **Why It's Fair:**
- ✅ Does NOT require completing tasks
- ✅ Fair for deep work starters
- ✅ Fair for quick task starters
- ✅ Works for any workflow style

---

## ⭐ **FACTOR 2: Deep Engagement Score (Flow Sustain)**

### **What It Measures**
Sustained focus blocks — NOT long tasks, NOT perfect blocks, NOT pause-free work.

### **Engagement Block Definition:**
A task earns 1 "engagement block" if:
```
accumulated_seconds ≥ 1500  // 25 minutes
```

**This counts regardless of pauses!**

### **Calculation:**
```typescript
const deepEngagementCount = entries.filter(e => 
  (e.accumulated_seconds || 0) >= 1500 // 25 minutes
).length;

deepEngagementScore = min(deepEngagementCount ÷ 2, 1.0);
// Maximum = 2 blocks = 100%
```

### **Example:**
```
Tasks:
1. Deep Work: 45 min accumulated ✅ (1 block)
2. Standard: 30 min accumulated ✅ (1 block)
3. Quick: 10 min accumulated ❌ (no block)
4. Long: 90 min accumulated ✅ (1 block, but capped at 2)

deepEngagementCount = 3 blocks
deepEngagementScore = min(3 ÷ 2, 1.0) = 1.0 (100%)
```

### **Why It's Fair:**
- ✅ Long tasks = valid flow
- ✅ Deep work = valid flow
- ✅ Standard tasks over 25 min = valid flow
- ✅ Does NOT punish pause/resume
- ✅ Pauses < 3 minutes do NOT break engagement

---

## ⭐ **FACTOR 3: Enjoyment Score (Flow Satisfaction)**

### **What It Measures**
How much you enjoy your work. The more you enjoy tasks, the more natural momentum you experience.

### **Enjoyment Definition:**
Tasks where:
```
task_enjoyment >= 4  // 4-5 stars
```

### **Calculation:**
```typescript
const completedTasks = entries.filter(e => e.ended_at);
const enjoyedTasks = completedTasks.filter(e => 
  e.task_enjoyment && e.task_enjoyment >= 4
);

enjoymentScore = enjoyedTasks.length ÷ completedTasks.length;
enjoymentScore = min(enjoymentScore, 0.7);  // Capped at 70%
```

### **Example:**
```
Completed tasks: 10
Enjoyed (4-5 stars): 8

enjoymentScore = 8 ÷ 10 = 0.80
enjoymentScore = min(0.80, 0.7) = 0.7 (70%)
```

### **Why It's Fair:**
- ✅ Enjoyment is a boost, not the foundation
- ✅ Capped at 70% so enjoyment cannot overpower flow patterns
- ✅ Recognizes that enjoying work creates natural momentum

---

## ⭐ **FACTOR 4: Flow Continuity (Task-to-Task Transitions)**

### **What It Measures**
Smooth transitions between tasks. Momentum is strongest when you naturally continue from one task to the next.

### **Flow Transition Definition:**
Completing a task → starting the next task within 10 minutes.

**Conditions:**
- Previous task must be completed (`ended_at` exists)
- Next task must start within 600 seconds (10 minutes)
- Work category/type/priority does NOT matter

### **Calculation:**
```typescript
const sortedEntries = entries
  .filter(e => e.ended_at) // Only completed tasks
  .sort(by end time);

let flowTransitions = 0;

for (let i = 0; i < sortedEntries.length - 1; i++) {
  const currentEndTime = sortedEntries[i].ended_at;
  const nextStartTime = sortedEntries[i + 1].started_at;
  const timeBetween = (nextStartTime - currentEndTime) / 1000; // seconds
  
  // Flow transition = next task starts within 10 minutes
  if (timeBetween >= 0 && timeBetween <= 600) {
    flowTransitions++;
  }
}

flowContinuity = min(flowTransitions ÷ 3, 1.0);
// Maximum = 3 transitions = 100%
```

### **Daily Task Goal Bonus (Light Influence):**
```typescript
if (completedTasks >= plannedTasks) {
  flowContinuity = min(flowContinuity + 0.2, 1.0); // Exceeded goal
} else if (completedTasks >= plannedTasks * 0.8) {
  flowContinuity = min(flowContinuity + 0.1, 1.0); // 80%+ of goal
}
```

### **Example:**
```
Tasks:
1. Task A: Ended at 10:00 AM
2. Task B: Started at 10:05 AM (5 min gap) ✅ (1 transition)
3. Task C: Started at 10:35 AM (30 min gap) ❌ (no transition)
4. Task D: Started at 11:05 AM (30 min gap) ❌ (no transition)

flowTransitions = 1
flowContinuity = min(1 ÷ 3, 1.0) = 0.33 (33%)

Daily Goal: 5 tasks
Completed: 4 tasks (80%)
Bonus: +0.1

flowContinuity = min(0.33 + 0.1, 1.0) = 0.43 (43%)
```

### **Why It's Fair:**
- ✅ Does NOT punish pauses
- ✅ Does NOT punish long tasks
- ✅ Does NOT require high task volume
- ✅ Just measures whether user maintains flow after completing tasks
- ✅ Rewards meeting daily goals

---

## 📊 **Complete Example Calculation**

### **Scenario:**
```
Clock-in: 9:00 AM
Daily Goal: 5 tasks

Tasks:
1. 9:10 AM - 9:45 AM: Deep Work (35 min accumulated) ✅
2. 9:50 AM - 10:20 AM: Standard (30 min accumulated) ✅
3. 10:25 AM - 10:40 AM: Quick (15 min accumulated) ❌
4. 11:00 AM - 12:00 PM: Long (60 min accumulated) ✅
5. 12:10 PM - 12:30 PM: Standard (20 min accumulated) ❌

Enjoyment ratings: [5, 4, 3, 5, 4]
Mood survey: 9:15 AM ✅
```

### **Factor 1: Entry Momentum**
```
Started task at 9:10 AM (within 90 min) ✅ → +0.4
Accumulated 20+ min by 9:45 AM ✅ → +0.4
Responded to survey at 9:15 AM ✅ → +0.2

entryMomentum = 0.4 + 0.4 + 0.2 = 1.0 (100%)
```

### **Factor 2: Deep Engagement Score**
```
Task 1: 35 min ≥ 25 min ✅ (1 block)
Task 2: 30 min ≥ 25 min ✅ (1 block)
Task 3: 15 min < 25 min ❌
Task 4: 60 min ≥ 25 min ✅ (1 block, but capped at 2)
Task 5: 20 min < 25 min ❌

deepEngagementCount = 3 blocks
deepEngagementScore = min(3 ÷ 2, 1.0) = 1.0 (100%)
```

### **Factor 3: Enjoyment Score**
```
Completed: 5 tasks
Enjoyed (4-5 stars): 4 tasks

enjoymentScore = 4 ÷ 5 = 0.80
enjoymentScore = min(0.80, 0.7) = 0.7 (70%)
```

### **Factor 4: Flow Continuity**
```
Task 1 → Task 2: 5 min gap ✅ (1 transition)
Task 2 → Task 3: 5 min gap ✅ (1 transition)
Task 3 → Task 4: 20 min gap ❌
Task 4 → Task 5: 10 min gap ✅ (1 transition, but capped at 3)

flowTransitions = 3
flowContinuity = min(3 ÷ 3, 1.0) = 1.0 (100%)

Daily Goal: 5 tasks
Completed: 5 tasks (100%)
Bonus: +0.2

flowContinuity = min(1.0 + 0.2, 1.0) = 1.0 (100%, already capped)
```

### **Final Momentum Score:**
```
Momentum = (1.0 + 1.0 + 0.7 + 1.0) ÷ 4 × 100
         = 3.7 ÷ 4 × 100
         = 92.5%
         ≈ 93%
```

**Result:** Excellent momentum! User entered flow quickly, sustained focus, enjoyed work, and maintained smooth transitions.

---

## 📈 **What Each Momentum Score Means**

| Score | Label | What It Means |
|-------|-------|---------------|
| **90-100%** | Exceptional | Perfect flow state — quick entry, sustained focus, high enjoyment, smooth transitions |
| **70-89%** | Excellent | Strong momentum — good activation, decent engagement, positive experience |
| **50-69%** | Good | Moderate flow — some activation, some engagement, room for improvement |
| **30-49%** | Fair | Low momentum — slow start, limited engagement, choppy transitions |
| **Below 30%** | Needs Work | Struggling to build flow — late start, minimal engagement, poor continuity |

---

## 🎯 **Key Improvements Over Old System**

### **1. Fair to All Work Styles**

**Old System:**
```
❌ Favored quick task completions
❌ Penalized deep work sessions
❌ Penalized pauses
❌ Favored urgent tasks
```

**New System:**
```
✅ Fair to quick task starters
✅ Fair to deep work starters
✅ Does NOT penalize pauses
✅ Does NOT favor any priority
```

---

### **2. Measures True Flow State**

**Old System:**
```
❌ Measured task completion speed
❌ Measured pause-free work
❌ Measured priority patterns
```

**New System:**
```
✅ Measures early activation
✅ Measures sustained focus
✅ Measures enjoyment
✅ Measures smooth transitions
```

---

### **3. Simple & Understandable**

**Old System:**
```
❌ 5 complex factors
❌ Priority multipliers
❌ Quick task burst detection
❌ Pause penalties
```

**New System:**
```
✅ 4 simple factors
✅ Clear activation signals
✅ Simple time thresholds
✅ No penalties
```

---

## 💡 **How to Improve Momentum**

### **Improve Entry Momentum:**
1. **Start work within 90 minutes of clock-in**
2. **Accumulate 20+ minutes of active time early**
3. **Respond to mood/energy surveys promptly**

### **Improve Deep Engagement:**
1. **Complete tasks with 25+ minutes accumulated time**
2. **Aim for 2+ engagement blocks per day**
3. **Don't worry about pauses — they don't hurt this metric!**

### **Improve Enjoyment:**
1. **Rate tasks honestly (4-5 stars for enjoyed work)**
2. **Identify and do more of what you enjoy**
3. **Remember: enjoyment is capped at 70%, so it's a boost, not the foundation**

### **Improve Flow Continuity:**
1. **Start next task within 10 minutes of completing previous one**
2. **Aim for 3+ smooth transitions per day**
3. **Set and meet daily task goals for bonus points**

---

## 📊 **Data Sources**

### **Momentum uses:**
- `eod_time_entries` (started_at, ended_at, accumulated_seconds, task_enjoyment)
- `eod_clock_ins` (clocked_in_at, daily_task_goal)
- `mood_entries` (timestamp)
- `energy_entries` (timestamp)

---

## 🚀 **Dashboard Integration**

### **Metric Card:**
- **Title:** Momentum
- **Value:** 0-100%
- **Description:** "Flow State Momentum Index"
- **Tooltip:** "Momentum measures how quickly you enter flow, how long you stay engaged, how enjoyable your tasks are, and how smoothly you transition between tasks."

### **Sub-Scores (Optional Enhancement):**
Could display 4 sub-scores under main Momentum card:
- Entry: 100%
- Engagement: 100%
- Enjoyment: 70%
- Continuity: 43%

---

## ✅ **Zero Disruption Rule**

This update **ONLY** modifies:
- ✅ Momentum calculation logic
- ✅ Momentum UI description

It **DOES NOT** break:
- ✅ Time tracking
- ✅ Task flow (start/pause/resume/complete)
- ✅ Focus Index
- ✅ Velocity
- ✅ Notifications
- ✅ User isolation
- ✅ Admin analytics
- ✅ Dashboard layout

---

## 🎉 **Expected Outcomes**

After this implementation, the Momentum metric will:

✅ **Calculate momentum fairly** — No bias toward any work style  
✅ **Treat long tasks fairly** — 25+ min = engagement block  
✅ **Not punish pauses** — Pauses don't affect any factor  
✅ **Reward early engagement** — Activation signals within 90 min  
✅ **Reward deep work** — Sustained focus blocks count  
✅ **Reward enjoyment** — 4-5 star tasks boost score  
✅ **Reward smooth transitions** — 10-min windows between tasks  
✅ **Integrate daily task goals naturally** — Bonus for meeting goals  
✅ **Include survey responsiveness** — Counts as activation signal  
✅ **Produce more accurate behavior insights** — True flow state detection  

---

## 📝 **Files Modified**

1. **`src/utils/enhancedMetrics.ts`** (lines 579-700)
   - Completely rewrote `calculateEnhancedMomentum()`
   - Added 3 new parameters: `moodEntries`, `energyEntries`, `clockInData`
   - Implemented 4 new factors with fair, simple logic

2. **`src/pages/SmartDARDashboard.tsx`** (line 628)
   - Updated function call to pass new parameters

3. **`src/components/dashboard/SmartDARHowItWorks.tsx`** (lines 84-92)
   - Updated Momentum description with new formula and logic

---

## 🎯 **Summary**

### **New Momentum Formula:**
```
Momentum = (Entry + Deep Engagement + Enjoyment + Flow Continuity) ÷ 4 × 100
```

**Key Factors:**
- ✅ Entry Momentum (0-1.0): Early activation signals
- ✅ Deep Engagement (0-1.0): Sustained focus blocks (25+ min)
- ✅ Enjoyment (0-0.7): Tasks rated 4-5 stars
- ✅ Flow Continuity (0-1.0): Smooth transitions (10 min windows)

**Result:** A fair, simple, accurate measure of true flow state momentum that works for all users, all work styles, and all task types! 🚀✨

---

**Implementation Date:** November 24, 2025  
**Status:** ✅ **COMPLETE & READY FOR DEPLOYMENT**

