# 🔋 New Energy Metric — Pure Self-Reported System

## 📋 Overview

The Energy metric has been **completely redesigned** to measure REAL energy levels based purely on user's self-reported check-ins. It now focuses on three core factors:

1. **Average Energy Level** — How energized the user actually felt
2. **Survey Responsiveness** — How engaged they are with check-ins
3. **Energy Stability** — How consistent their energy levels are

**Key Improvements:**
- ✅ Based ONLY on self-reported energy check-ins
- ✅ NO task-based penalties (no late work, no priority costs, no heavy-work penalties)
- ✅ Energy is STATE, not PERFORMANCE
- ✅ Includes rich behavioral insights (peak hours, dip hours, stability)
- ✅ Survey responsiveness bonus for engagement

---

## ✨ What Changed

### **Old System:**
```
❌ Energy = (Avg Energy + Late Work Penalty + High-Energy Tasks + Priority Costs) ÷ 4
❌ Task-based penalties (late deep work, urgent tasks)
❌ Performance-based scoring
❌ Confused energy with productivity
```

### **New System:**
```
✅ Energy = (Avg Energy + Survey Responsiveness + Energy Stability) ÷ 3 × 100
✅ Pure self-reported data
✅ NO task penalties
✅ Energy is your state, not your output
✅ Rich insights (peak hours, dip hours, stability)
```

---

## 🧮 Complete Formula

```typescript
EnergyScore = ((avgEnergy + responsiveness + stability) / 3) × 100

Where:
- avgEnergy: 0-1 scale (average of all energy check-ins)
- responsiveness: 0-1 scale (check-ins answered vs expected)
- stability: 0-1 scale (1 - variance, normalized)

All factors weighted equally (33% each)
```

---

## 🔋 **FACTOR 1 — Average Energy Level (33%)**

### **Purpose:**
Measures how energized the user actually felt based on check-ins.

### **Energy Value Mapping:**
```typescript
const energyValues = {
  'High': 1.0,        // Fully energized
  'Medium': 0.7,      // Solid energy
  'Recharging': 0.6,  // Recovering
  'Low': 0.4,         // Tired
  'Drained': 0.2      // Exhausted
};
```

### **Calculation:**
```typescript
if (energyEntries && energyEntries.length > 0) {
  avgEnergy = energyEntries.reduce((sum, e) => 
    sum + (energyValues[e.energy_level] || 0.5), 0
  ) / energyEntries.length;
} else {
  avgEnergy = 0; // No data
}
```

### **Example:**
```
Energy Check-ins:
- 9:00 AM: High (1.0)
- 11:00 AM: Medium (0.7)
- 1:00 PM: Medium (0.7)
- 3:00 PM: Low (0.4)
- 5:00 PM: Recharging (0.6)

avgEnergy = (1.0 + 0.7 + 0.7 + 0.4 + 0.6) / 5 = 0.68
```

---

## 📲 **FACTOR 2 — Survey Responsiveness (33%)**

### **Purpose:**
Measures engagement, presence, and self-awareness through check-in participation.

### **Expected Check-ins:**
```
Energy check-ins: Every 2 hours
Mood check-ins: Every 90 minutes

For 8-hour shift:
- Energy: floor(8 / 2) = 4 check-ins
- Mood: floor(8 / 1.5) = 5 check-ins
- Total expected: 9 check-ins
```

### **Calculation:**
```typescript
// Calculate shift hours
const shiftHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);

// Expected check-ins
const expectedCheckins = Math.floor(shiftHours / 1.5) + Math.floor(shiftHours / 2);

// Actual check-ins
const actualCheckins = (energyEntries?.length || 0) + (moodEntries?.length || 0);

// Calculate responsiveness (capped at 1.0)
responsiveness = Math.min(actualCheckins / expectedCheckins, 1.0);
```

### **Example:**
```
8-hour shift:
- Expected: 9 check-ins
- Actual: 7 check-ins (4 energy + 3 mood)

responsiveness = min(7 / 9, 1.0) = 0.78 (78%)
```

### **What It Means:**
- **100%** = Answered all expected check-ins (excellent engagement)
- **78%** = Answered most check-ins (good engagement)
- **50%** = Answered half (low engagement, insights less accurate)
- **<30%** = Poor engagement (insights unreliable)

---

## 📈 **FACTOR 3 — Energy Stability (33%)**

### **Purpose:**
Measures how stable energy levels are throughout the day. High stability ≠ high energy. It means **predictable patterns**, not erratic swings.

### **Calculation:**
```typescript
if (energyEntries && energyEntries.length > 1) {
  // Convert to numeric values
  const numericEnergy = energyEntries.map(e => energyValues[e.energy_level] || 0.5);
  
  // Calculate mean
  const mean = numericEnergy.reduce((sum, v) => sum + v, 0) / numericEnergy.length;
  
  // Calculate variance
  const variance = numericEnergy.reduce((sum, v) => 
    sum + Math.pow(v - mean, 2), 0
  ) / numericEnergy.length;
  
  // Normalize (max expected variance ≈ 0.4)
  stability = Math.max(0, 1 - (variance / 0.4));
} else {
  stability = 0; // Insufficient data
}
```

### **Example 1: Stable Energy**
```
Energy Check-ins:
- 9:00 AM: Medium (0.7)
- 11:00 AM: Medium (0.7)
- 1:00 PM: High (1.0)
- 3:00 PM: Medium (0.7)
- 5:00 PM: Medium (0.7)

mean = 0.76
variance = 0.0144
stability = max(0, 1 - (0.0144 / 0.4)) = 0.964 (96.4%)

Result: Very stable energy throughout the day!
```

### **Example 2: Erratic Energy**
```
Energy Check-ins:
- 9:00 AM: High (1.0)
- 11:00 AM: Drained (0.2)
- 1:00 PM: High (1.0)
- 3:00 PM: Low (0.4)
- 5:00 PM: High (1.0)

mean = 0.72
variance = 0.1376
stability = max(0, 1 - (0.1376 / 0.4)) = 0.656 (65.6%)

Result: Energy fluctuated significantly.
```

---

## ⭐ **FINAL ENERGY SCORE**

```typescript
energyScore = ((avgEnergy + responsiveness + stability) / 3) * 100

energyScore = Math.round(energyScore)
```

### **Complete Example:**
```
Factor 1 (Avg Energy): 0.68
Factor 2 (Responsiveness): 0.78
Factor 3 (Stability): 0.96

energyScore = ((0.68 + 0.78 + 0.96) / 3) * 100
energyScore = (2.42 / 3) * 100
energyScore = 80.67 → 81%

Result: Good energy day with excellent stability!
```

---

## 🌈 **ENERGY INSIGHTS GENERATOR**

Every time the Energy metric is computed, the system generates **3-5 behavioral insights**.

### **✔ Insight 1 — Overall Energy Summary**

Based on `avgEnergyValue`:

```typescript
if (avgEnergyValue >= 0.8) {
  "Your energy levels were strong today — great stamina!"
} else if (avgEnergyValue >= 0.6) {
  "Solid energy levels today. You maintained good momentum."
} else if (avgEnergyValue >= 0.4) {
  "Energy dipped today; try taking short breaks earlier."
} else {
  "Low energy day. Consider lighter tasks or more frequent breaks."
}
```

---

### **✔ Insight 2 — Peak Energy Window**

Finds the 2-hour block with highest average energy:

```typescript
// Group energy by hour
const hourlyEnergy = {};
energyEntries.forEach(e => {
  const hour = new Date(e.timestamp).getHours();
  hourlyEnergy[hour] = { total: 0, count: 0 };
  hourlyEnergy[hour].total += energyValues[e.energy_level];
  hourlyEnergy[hour].count++;
});

// Find peak hour
let maxAvg = -1;
let peakHour = null;
Object.entries(hourlyEnergy).forEach(([hour, data]) => {
  const avg = data.total / data.count;
  if (avg > maxAvg) {
    maxAvg = avg;
    peakHour = parseInt(hour);
  }
});

insight = `Your strongest energy window is around ${peakHour}:00 EST.`
```

**Example Output:**
```
"Your strongest energy window is around 10:00 EST."
```

---

### **✔ Insight 3 — Lowest Energy Window**

Finds the hour with lowest average energy:

```typescript
let minAvg = 2;
let lowestHour = null;
Object.entries(hourlyEnergy).forEach(([hour, data]) => {
  const avg = data.total / data.count;
  if (avg < minAvg) {
    minAvg = avg;
    lowestHour = parseInt(hour);
  }
});

insight = `Your energy tends to dip around ${lowestHour}:00 EST.`
```

**Example Output:**
```
"Your energy tends to dip around 15:00 EST."
```

---

### **✔ Insight 4 — Stability Commentary**

Based on `energyStabilityValue`:

```typescript
if (energyStabilityValue < 0.5) {
  "Your energy fluctuated a lot today — try pacing tasks with breaks."
} else if (energyStabilityValue > 0.8) {
  "You maintained steady energy through your shift — amazing consistency!"
}
```

---

### **✔ Insight 5 — Survey Responsiveness**

Based on `energyResponsivenessValue`:

```typescript
if (energyResponsivenessValue < 0.5) {
  "Low check-in rate — energy insights may be less accurate."
} else if (energyResponsivenessValue > 0.9) {
  "Great check-in consistency! Your energy trends are very accurate."
}
```

---

## 🎨 **FRONTEND UI REQUIREMENTS**

### **Energy Metric Card Must Show:**

1. **Large Score Badge** (0-100) in pastel macaroon color
2. **Mini Bar Graph** of energy check-ins over the day
3. **Peak Energy Window Chip** (e.g., "Peak: 10:00 AM")
4. **Lowest Energy Window Chip** (e.g., "Dip: 3:00 PM")
5. **Insights List** (soft pastel cards)
6. **Check-in Responsiveness Indicator** (e.g., "7/9 check-ins")

### **Color Palette:**

```typescript
const getEnergyColor = (avgEnergy: number): string => {
  if (avgEnergy >= 0.8) return '#FFD59E'; // Pastel yellow (high energy)
  if (avgEnergy >= 0.6) return '#CFF5D6'; // Pastel mint (medium)
  if (avgEnergy >= 0.4) return '#E3C4F5'; // Pastel lavender (low)
  return '#FBC7A7'; // Pastel peach (drained)
};
```

### **Example UI Mockup:**

```typescript
<Card>
  <CardHeader>
    <CardTitle className="flex items-center justify-between">
      <span>Energy</span>
      <BatteryCharging className="h-5 w-5" />
    </CardTitle>
  </CardHeader>
  
  <CardContent>
    {/* Score Badge */}
    <div className={`text-4xl font-bold`} style={{ color: getEnergyColor(avgEnergy) }}>
      {energyScore}%
    </div>
    
    {/* Mini Bar Graph */}
    <div className="mt-4 flex gap-1 h-12">
      {energyEntries.map((entry, i) => (
        <div 
          key={i}
          className="flex-1 rounded-t"
          style={{ 
            height: `${energyValues[entry.energy_level] * 100}%`,
            backgroundColor: getEnergyColor(energyValues[entry.energy_level])
          }}
        />
      ))}
    </div>
    
    {/* Peak & Dip Chips */}
    <div className="mt-4 flex gap-2">
      {peakEnergyHour && (
        <Badge variant="outline" className="bg-yellow-50">
          Peak: {peakEnergyHour}:00
        </Badge>
      )}
      {lowestEnergyHour && (
        <Badge variant="outline" className="bg-purple-50">
          Dip: {lowestEnergyHour}:00
        </Badge>
      )}
    </div>
    
    {/* Check-in Responsiveness */}
    <div className="mt-4 text-sm">
      <span className="text-gray-500">Check-ins: </span>
      <span className="font-semibold">{actualCheckins}/{expectedCheckins}</span>
      <span className="ml-2">({Math.round(responsiveness * 100)}%)</span>
    </div>
    
    {/* Insights */}
    <div className="mt-4 space-y-2">
      {energyInsights.map((insight, i) => (
        <div key={i} className="text-sm p-2 rounded bg-blue-50">
          {insight}
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

---

## 🧪 **BACKEND REQUIREMENTS**

### **New Fields to Store:**

```typescript
interface EnergyMetrics {
  energy_score: number;                    // 0-100
  energy_insights: string[];               // Array of insights
  peak_energy_hour: number | null;         // Hour (0-23)
  lowest_energy_hour: number | null;       // Hour (0-23)
  avg_energy_value: number;                // 0-1
  energy_stability_value: number;          // 0-1
  energy_responsiveness_value: number;     // 0-1
}
```

### **Where to Store:**

1. **Real-time:** `time_entry_metrics` table
2. **Weekly:** `weekly_summary` table
3. **Monthly:** `monthly_summary` table

---

## 🆚 **Old vs New Energy System**

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Data Source** | Tasks + Energy check-ins | Energy check-ins ONLY |
| **Task Penalties** | ✅ Late work, priority costs | ❌ NONE |
| **Performance Link** | ✅ Tied to productivity | ❌ NONE |
| **Factors** | 4 (avg energy, late work, high-energy tasks, priority costs) | 3 (avg energy, responsiveness, stability) |
| **Philosophy** | Energy = Performance | Energy = State |
| **Insights** | Generic | Rich (peak hours, dip hours, stability) |
| **Survey Bonus** | ❌ None | ✅ Responsiveness factor |

---

## 📊 **Example Scenarios**

### **Scenario 1: High Energy, High Engagement**
```
Energy Check-ins:
- 9:00 AM: High (1.0)
- 11:00 AM: High (1.0)
- 1:00 PM: Medium (0.7)
- 3:00 PM: Medium (0.7)
- 5:00 PM: High (1.0)

Check-ins: 8/9 (89%)

avgEnergy = 0.88
responsiveness = 0.89
stability = 0.92

energyScore = ((0.88 + 0.89 + 0.92) / 3) * 100 = 90%

Insights:
- "Your energy levels were strong today — great stamina!"
- "Your strongest energy window is around 9:00 EST."
- "You maintained steady energy through your shift — amazing consistency!"
- "Great check-in consistency! Your energy trends are very accurate."
```

---

### **Scenario 2: Low Energy, Poor Engagement**
```
Energy Check-ins:
- 11:00 AM: Low (0.4)
- 3:00 PM: Drained (0.2)

Check-ins: 2/9 (22%)

avgEnergy = 0.30
responsiveness = 0.22
stability = 0 (insufficient data)

energyScore = ((0.30 + 0.22 + 0) / 3) * 100 = 17%

Insights:
- "Low energy day. Consider lighter tasks or more frequent breaks."
- "Low check-in rate — energy insights may be less accurate."
```

---

### **Scenario 3: Erratic Energy, Good Engagement**
```
Energy Check-ins:
- 9:00 AM: High (1.0)
- 10:30 AM: Drained (0.2)
- 12:00 PM: High (1.0)
- 1:30 PM: Low (0.4)
- 3:00 PM: Medium (0.7)
- 4:30 PM: High (1.0)
- 6:00 PM: Drained (0.2)

Check-ins: 9/9 (100%)

avgEnergy = 0.64
responsiveness = 1.0
stability = 0.45

energyScore = ((0.64 + 1.0 + 0.45) / 3) * 100 = 70%

Insights:
- "Solid energy levels today. You maintained good momentum."
- "Your energy fluctuated a lot today — try pacing tasks with breaks."
- "Great check-in consistency! Your energy trends are very accurate."
```

---

## 🔒 **ZERO DISRUPTION RULE**

This update **ONLY** modifies:
- ✅ Energy metric calculation logic
- ✅ Energy insights generation
- ✅ Energy UI description

It **DOES NOT** affect:
- ✅ Clock-in/out flow
- ✅ Task flows (start/pause/resume/complete)
- ✅ Mood/Energy popups (timing, frequency)
- ✅ Other metrics (Efficiency, Completion, Focus, Velocity, Rhythm, Utilization, Momentum, Consistency)
- ✅ Dashboard structure
- ✅ Admin/user isolation
- ✅ Database schema (uses existing tables)

---

## 📝 **Files Modified**

### **✅ Backend (COMPLETE):**

1. **`src/utils/enhancedMetrics.ts`** (lines 488-700)
   - Completely rewrote `calculateEnhancedEnergy()`
   - Removed all task-based penalties
   - Added 3 new parameters: `energyEntries`, `moodEntries`, `clockInData`
   - Created new `generateEnergyInsights()` function

2. **`src/pages/SmartDARDashboard.tsx`** (lines 50-63, 626-630)
   - Imported `generateEnergyInsights`
   - Updated `calculateEnhancedEnergy()` call with new parameters
   - Added energy insights generation

3. **`src/components/dashboard/SmartDARHowItWorks.tsx`** (lines 65-73)
   - Updated Energy description with new 3-factor formula

---

## 🎯 **Expected Outcomes**

After full implementation:

✅ **Energy becomes meaningful** — Based on how user actually feels  
✅ **No task penalties** — Energy is state, not performance  
✅ **Rich insights** — Peak hours, dip hours, stability patterns  
✅ **Survey engagement tracked** — Responsiveness factor rewards participation  
✅ **Stability measured** — Predictable patterns vs erratic swings  
✅ **Fair scoring** — All factors weighted equally (33% each)  
✅ **Behavioral guidance** — "Take breaks at 3 PM" vs "Work harder"  
✅ **UI enhanced** — Bar graphs, chips, insights list  

---

## 🎉 **Summary**

### **New Energy Formula:**
```
Energy = (Avg Energy + Survey Responsiveness + Energy Stability) ÷ 3 × 100

Where:
- Avg Energy = mean(energy check-ins converted to 0-1 scale)
- Survey Responsiveness = (actual check-ins / expected check-ins)
- Energy Stability = 1 - (variance / 0.4)

NO task-based penalties
Energy is your STATE, not your PERFORMANCE
```

### **Rich Insights Include:**
- Overall energy summary
- Peak energy window (best hour)
- Lowest energy window (dip hour)
- Stability commentary
- Survey responsiveness feedback

**Result:** A pure, fair, self-reported energy metric that measures how the user actually feels, not how they perform! 🔋✨

---

**Implementation Date:** November 24, 2025  
**Status:** ✅ **COMPLETE & READY**  
**Build:** ✅ **SUCCESS** (3565 modules transformed)  
**Linter:** ✅ **NO ERRORS**

