// 🌟 ENHANCED CONTEXT-AWARE PRODUCTIVITY METRICS
// Elite-level analytics far beyond basic time trackers

interface TimeEntry {
  id: string;
  user_id: string;
  task_description: string;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  accumulated_seconds: number;
  client_name: string;
  created_at: string;
  status?: string;
  task_type?: string | null;
  goal_duration_minutes?: number | null;
  task_intent?: string | null;
  task_categories?: string[] | null;
  task_enjoyment?: number | null;
  task_priority?: string | null;
}

interface MoodEntry {
  timestamp: string;
  mood_level: string;
}

interface EnergyEntry {
  timestamp: string;
  energy_level: string;
}

// Task type midpoint expectations (in minutes)
const TASK_TYPE_EXPECTATIONS: Record<string, number> = {
  'Quick Task': 10, // 5-15 min → midpoint 10
  'Standard Task': 32.5, // 20-45 min → midpoint 32.5
  'Deep Work Task': 90, // 1-2 hours → midpoint 90
  'Long Task': 180, // 2-4 hours → midpoint 180
  'Very Long Task': 300, // 4+ hours → midpoint 300 (5 hours)
};

// Task type weightings for velocity (UPDATED: Fairer rewards for complex work)
const TASK_WEIGHTS: Record<string, number> = {
  'Quick Task': 1,
  'Standard Task': 1,
  'Deep Work Task': 3,   // Increased from 2 — Deep Work deserves more credit
  'Long Task': 4,        // Increased from 3 — Long tasks are valuable
  'Very Long Task': 5,   // Increased from 4 — Major projects should not tank velocity
};

// 🎯 PRIORITY WEIGHTING SYSTEM

// Priority multipliers for efficiency (urgent tasks = harder)
const PRIORITY_EFFICIENCY_WEIGHTS: Record<string, number> = {
  'Immediate Impact Task': 1.3,
  'Daily Task': 1.1,
  'Weekly Task': 1.0,
  'Monthly Task': 0.9,
  'Evergreen Task': 0.8,
  'Trigger Task': 1.0,
};

// Priority allowed pause times (in minutes)
const PRIORITY_PAUSE_ALLOWANCE: Record<string, number> = {
  'Immediate Impact Task': 2,
  'Daily Task': 5,
  'Weekly Task': 10,
  'Monthly Task': 12,
  'Evergreen Task': 15,
  'Trigger Task': 8,
};

// Priority velocity weights (UPDATED: Motivate long-term work, reduce penalties)
const PRIORITY_VELOCITY_WEIGHTS: Record<string, number> = {
  'Immediate Impact Task': 1.4,  // Unchanged — urgent work is valuable
  'Daily Task': 1.2,             // Unchanged — daily consistency matters
  'Weekly Task': 1.0,            // Unchanged — baseline
  'Monthly Task': 0.9,           // Improved from 0.8 — less penalty for strategic work
  'Evergreen Task': 0.8,         // Improved from 0.6 — big improvement to motivate long-term tasks
  'Trigger Task': 1.0,           // Unchanged — baseline
};

// Priority energy costs
const PRIORITY_ENERGY_COSTS: Record<string, number> = {
  'Immediate Impact Task': 20,
  'Daily Task': 10,
  'Weekly Task': 6,
  'Monthly Task': 5,
  'Evergreen Task': 3,
  'Trigger Task': 12,
};

// 🔢 1. EFFICIENCY (NEW TIME-BASED WITH TRUE IDLE)
// Calculates TRUE idle time (only when NO tasks are active)
// Handles overlapping tasks correctly
export function calculateTrueIdleTime(
  entries: TimeEntry[],
  clockInData: { clocked_in_at: string; clocked_out_at?: string | null } | null
): number {
  if (!clockInData || !clockInData.clocked_in_at) return 0;

  const clockInTime = new Date(clockInData.clocked_in_at).getTime();
  const clockOutTime = clockInData.clocked_out_at 
    ? new Date(clockInData.clocked_out_at).getTime() 
    : Date.now();

  // Sort entries by started_at to create timeline
  const sortedEntries = [...entries].sort((a, b) => 
    new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );

  // Build timeline of when tasks were active
  const activeIntervals: Array<{start: number, end: number}> = [];
  
  sortedEntries.forEach(entry => {
    if (!entry.started_at) return;
    
    const taskStart = new Date(entry.started_at).getTime();
    let taskEnd: number;
    
    if (entry.ended_at) {
      taskEnd = new Date(entry.ended_at).getTime();
    } else if (entry.paused_at) {
      // Paused task: active from start to pause
      taskEnd = new Date(entry.paused_at).getTime();
    } else {
      // Currently active task
      taskEnd = Date.now();
    }
    
    activeIntervals.push({ start: taskStart, end: taskEnd });
  });

  // Merge overlapping intervals (when multiple tasks were active simultaneously)
  const mergedIntervals: Array<{start: number, end: number}> = [];
  activeIntervals.forEach(interval => {
    if (mergedIntervals.length === 0) {
      mergedIntervals.push(interval);
      return;
    }
    
    const last = mergedIntervals[mergedIntervals.length - 1];
    if (interval.start <= last.end) {
      // Overlapping - merge
      last.end = Math.max(last.end, interval.end);
    } else {
      // Non-overlapping - add new interval
      mergedIntervals.push(interval);
    }
  });

  // Calculate total active time from merged intervals
  let totalActiveMs = 0;
  mergedIntervals.forEach(interval => {
    const start = Math.max(interval.start, clockInTime);
    const end = Math.min(interval.end, clockOutTime);
    if (end > start) {
      totalActiveMs += (end - start);
    }
  });

  // Total clocked-in time
  const totalClockedInMs = clockOutTime - clockInTime;
  
  // TRUE idle time = clocked-in time - active time
  const trueIdleMs = Math.max(0, totalClockedInMs - totalActiveMs);
  
  return trueIdleMs / 1000; // Convert to seconds
}

// NEW TIME-BASED EFFICIENCY: active_time / (active_time + true_idle_time)
export function calculateTimeBasedEfficiency(
  entries: TimeEntry[],
  clockInData: { clocked_in_at: string; clocked_out_at?: string | null } | null
): number {
  // 🔧 CRITICAL FIX: For historical dates without clock-in data, calculate efficiency differently
  if (!clockInData || !clockInData.clocked_in_at) {
    console.log('🔧 HISTORICAL DATE MODE: entries=', entries.length);
    
    // Historical date: Calculate efficiency based on ALL tasks with accumulated time
    // Include completed, paused, and any task with accumulated_seconds
    const tasksWithTime = entries.filter(e => e.accumulated_seconds && e.accumulated_seconds > 0);
    console.log('🔧 Tasks with time:', tasksWithTime.length, 'out of', entries.length);
    
    if (tasksWithTime.length === 0) {
      console.log('🔧 No tasks with accumulated_seconds, returning 0');
      return 0;
    }
    
    // Calculate total active time from ALL tasks (not just completed)
    const totalActiveTime = tasksWithTime.reduce((sum, e) => sum + (e.accumulated_seconds || 0), 0);
    
    // For historical data, estimate total available time from first to last task
    if (entries.length === 0) return 0;
    
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );
    
    const firstTaskStart = new Date(sortedEntries[0].started_at).getTime();
    
    // For last task, use ended_at if available, otherwise paused_at, otherwise started_at + accumulated_seconds
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    let lastTaskEnd: number;
    
    if (lastEntry.ended_at) {
      lastTaskEnd = new Date(lastEntry.ended_at).getTime();
    } else if (lastEntry.paused_at) {
      lastTaskEnd = new Date(lastEntry.paused_at).getTime();
    } else if (lastEntry.accumulated_seconds) {
      // Task still active or incomplete: use started_at + accumulated_seconds
      lastTaskEnd = new Date(lastEntry.started_at).getTime() + (lastEntry.accumulated_seconds * 1000);
    } else {
      lastTaskEnd = new Date(lastEntry.started_at).getTime();
    }
    
    const totalTimeSpan = (lastTaskEnd - firstTaskStart) / 1000; // in seconds
    console.log('🔧 Active time:', totalActiveTime, 'Time span:', totalTimeSpan);
    
    if (totalTimeSpan === 0) return 0;
    
    const efficiency = totalActiveTime / totalTimeSpan;
    const result = Math.min(Math.round(efficiency * 100), 100);
    console.log('🔧 HISTORICAL EFFICIENCY RESULT:', result + '%');
    return result;
  }

  // Calculate total active time from accumulated_seconds
  // For active tasks, add time since started_at
  let totalActiveTime = 0;
  entries.forEach(entry => {
    if (entry.ended_at || entry.paused_at) {
      // Completed or paused: use accumulated_seconds
      totalActiveTime += (entry.accumulated_seconds || 0);
    } else if (entry.started_at && !entry.ended_at && !entry.paused_at) {
      // Currently active: accumulated_seconds + time since started_at
      const currentDuration = (Date.now() - new Date(entry.started_at).getTime()) / 1000;
      totalActiveTime += (entry.accumulated_seconds || 0) + currentDuration;
    }
  });

  // Calculate true idle time (only when NO tasks are active)
  const trueIdleTime = calculateTrueIdleTime(entries, clockInData);

  if (totalActiveTime === 0 && trueIdleTime === 0) return 0;

  // New efficiency formula
  const efficiency = totalActiveTime / (totalActiveTime + trueIdleTime);
  
  return Math.min(Math.round(efficiency * 100), 100);
}

// LEGACY: Keep old efficiency for estimation accuracy calculations only
// This measures how close tasks are to their expected duration (goal vs actual)
export function calculateEnhancedEfficiency(
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): number {
  const completedTasks = entries.filter(e => e.ended_at && e.accumulated_seconds);
  
  if (completedTasks.length === 0) return 0;

  let totalEfficiencyScore = 0;

  completedTasks.forEach(task => {
    const taskType = task.task_type || 'Standard Task';
    const expectedDuration = TASK_TYPE_EXPECTATIONS[taskType] || 30;
    const actualDuration = task.accumulated_seconds! / 60; // Convert to minutes

    // Base efficiency: expected / actual
    let efficiency = expectedDuration / actualDuration;

    // Cap at 2.0 (200%) to avoid extreme values
    efficiency = Math.min(efficiency, 2.0);

    totalEfficiencyScore += efficiency;
  });

  const avgEfficiency = totalEfficiencyScore / completedTasks.length;
  
  // Normalize to 0-100 scale (1.0 = 100%)
  return Math.min(Math.round(avgEfficiency * 100), 100);
}

// 🔢 2. COMPLETION - NEW BEHAVIOR-DRIVEN SYSTEM
// Priority weights for completion scoring
const PRIORITY_WEIGHTS: Record<string, number> = {
  'Immediate Impact Task': 4,
  'Daily Task': 3,
  'Weekly Task': 2,
  'Monthly Task': 1.5,
  'Evergreen Task': 1,
  'Trigger Task': 2.5,
};

// Grace windows for estimation accuracy (by task type)
const GRACE_WINDOWS: Record<string, number> = {
  'Quick Task': 0.20,      // 20% over is acceptable
  'Standard Task': 0.25,   // 25% over is acceptable
  'Deep Work Task': 0.40,  // 40% over is acceptable
  'Long Task': 0.50,       // 50% over is acceptable
  'Very Long Task': 0.60,  // 60% over is acceptable
};

// 🎯 Priority Completion Rate
export function calculatePriorityCompletion(entries: TimeEntry[]): number {
  if (entries.length === 0) return 0;

  const startedTasks = entries.filter(e => e.started_at);
  const completedTasks = entries.filter(e => e.ended_at);

  if (startedTasks.length === 0) return 0;

  let totalWeight = 0;
  let completedWeight = 0;

  // Calculate total weight of all started tasks
  startedTasks.forEach(task => {
    const priority = task.task_priority || 'Weekly Task';
    const weight = PRIORITY_WEIGHTS[priority] || 2;
    totalWeight += weight;
  });

  // Calculate weight of completed tasks
  completedTasks.forEach(task => {
    const priority = task.task_priority || 'Weekly Task';
    const weight = PRIORITY_WEIGHTS[priority] || 2;
    completedWeight += weight;
  });

  const priorityCompletionRate = (completedWeight / totalWeight) * 100;
  return Math.min(Math.round(priorityCompletionRate), 100);
}

// 🎯 Estimation Accuracy Completion Rate
export function calculateEstimationAccuracyCompletion(entries: TimeEntry[]): number {
  const completedTasks = entries.filter(e => e.ended_at && e.goal_duration_minutes);

  if (completedTasks.length === 0) return 0;

  let accurateTasks = 0;

  completedTasks.forEach(task => {
    const goalMinutes = task.goal_duration_minutes!;
    const actualMinutes = (task.accumulated_seconds || 0) / 60;
    const taskType = task.task_type || 'Standard Task';
    const gracePercent = GRACE_WINDOWS[taskType] || 0.25;
    const maxAllowed = goalMinutes * (1 + gracePercent);

    if (actualMinutes <= maxAllowed) {
      accurateTasks++;
    }
  });

  const estimationAccuracyRate = (accurateTasks / completedTasks.length) * 100;
  return Math.min(Math.round(estimationAccuracyRate), 100);
}

// 🎯 Final Completion Score (Weighted Combination)
export function calculateEnhancedCompletion(entries: TimeEntry[]): number {
  if (entries.length === 0) return 0;

  const priorityCompletion = calculatePriorityCompletion(entries);
  const estimationAccuracy = calculateEstimationAccuracyCompletion(entries);

  // Weighted final score: 70% priority completion, 30% estimation accuracy
  const finalScore = (priorityCompletion * 0.7) + (estimationAccuracy * 0.3);

  return Math.min(Math.round(finalScore), 100);
}

// 🔢 3. FOCUS SCORE - NEW BEHAVIOR-DRIVEN, EMOTION-NEUTRAL VERSION
// Mood and energy are NO LONGER used in calculation - only for insights
export function calculateEnhancedFocusScore(
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): number {
  const activeEntries = entries.filter(e => !e.paused_at || e.ended_at);
  
  if (activeEntries.length === 0) return 0;

  let totalFocusScore = 0;

  activeEntries.forEach(task => {
    const taskType = task.task_type || 'Standard Task';
    
    // ✅ STEP 1: Base allowed pauses by task type
    let allowedPauses = 0;
    if (taskType === 'Quick Task') {
      allowedPauses = 0;
    } else if (taskType === 'Standard Task') {
      allowedPauses = 1;
    } else if (taskType === 'Deep Work Task' || taskType === 'Long Task') {
      allowedPauses = 2;
    } else if (taskType === 'Very Long Task') {
      allowedPauses = 3;
    }

    // ✅ STEP 2: Priority adjustment (behavior-based only)
    const priority = task.task_priority || 'Weekly Task';
    if (priority === 'Immediate Impact Task' || priority === 'Daily Task') {
      allowedPauses = Math.max(0, allowedPauses - 1); // Stricter for urgent
    } else if (priority === 'Evergreen Task' || priority === 'Monthly Task') {
      allowedPauses = allowedPauses + 1; // More lenient for long-term
    }

    // Ensure minimum of 0 allowed pauses
    allowedPauses = Math.max(0, allowedPauses);

    const actualPauses = task.paused_at ? 1 : 0;
    
    // ✅ STEP 3: Calculate focus score (pause penalty - behavior-based only)
    let focusScore: number;
    if (actualPauses <= allowedPauses) {
      focusScore = 1.0; // Perfect focus!
    } else {
      const excess = actualPauses - allowedPauses;
      focusScore = Math.max(1.0 - (excess * 0.2), 0); // -20% per extra pause
    }

    // ❌ REMOVED: Mood adjustments (no longer affects score)
    // ❌ REMOVED: Energy adjustments (no longer affects score)
    // Mood and energy are now used ONLY for behavioral insights, not scoring

    // ✅ STEP 4: Enjoyment boost (only positive modifier allowed)
    if (task.task_enjoyment && task.task_enjoyment >= 4) {
      focusScore *= 1.1; // 10% boost for enjoyed tasks
      focusScore = Math.min(focusScore, 1.0); // Cap at 1.0
    }

    totalFocusScore += focusScore;
  });

  const avgFocus = totalFocusScore / activeEntries.length;
  
  // ✅ STEP 5: Final Focus Index (0-100 range)
  const focusIndex = avgFocus * 100;
  return Math.min(Math.max(Math.round(focusIndex), 0), 100);
}

// 🔢 4. VELOCITY (UPGRADED — Fair & Balanced Model)
export function calculateEnhancedVelocity(entries: TimeEntry[]): number {
  const completedTasks = entries.filter(e => e.ended_at);
  
  if (completedTasks.length === 0) return 0;

  // ✅ STEP 1: Calculate total weighted task points
  let totalPoints = 0;
  let deepOrLongTaskCount = 0;
  let longTaskCount = 0;
  
  completedTasks.forEach(task => {
    const taskType = task.task_type || 'Standard Task';
    const weight = TASK_WEIGHTS[taskType] || 1;
    
    // 🎯 Apply priority velocity multiplier
    const priority = task.task_priority || 'Weekly Task';
    const priorityMultiplier = PRIORITY_VELOCITY_WEIGHTS[priority] || 1.0;
    
    let taskPoints = weight * priorityMultiplier;
    
    // ✅ STEP 2: Add Long-Task Duration Fairness Bonus
    // Tasks that run 90+ minutes get extra credit for sustained focus
    const actualMinutes = (task.accumulated_seconds || 0) / 60;
    if (actualMinutes >= 90) {
      const blocks = Math.floor((actualMinutes - 90) / 30);
      taskPoints += blocks * 0.3; // +0.3 points per extra 30-min block
    }
    
    totalPoints += taskPoints;
    
    // Track task complexity for fairness bonus
    if (taskType === 'Deep Work Task' || taskType === 'Long Task' || taskType === 'Very Long Task') {
      deepOrLongTaskCount++;
    }
    if (taskType === 'Long Task' || taskType === 'Very Long Task') {
      longTaskCount++;
    }
  });

  // ✅ STEP 3: Calculate total active hours
  const totalActiveSeconds = completedTasks.reduce((sum, task) => sum + (task.accumulated_seconds || 0), 0);
  const totalActiveHours = totalActiveSeconds / 3600;

  if (totalActiveHours === 0) return 0;

  // ✅ STEP 4: Calculate base velocity
  let velocity = totalPoints / totalActiveHours;

  // ✅ STEP 5: Apply "Effort Fairness Bonus" for Deep/Long Work Days
  // Users who focus on complex work shouldn't be penalized with low velocity
  const percentDeepOrLong = deepOrLongTaskCount / completedTasks.length;
  const percentLongOnly = longTaskCount / completedTasks.length;
  
  if (percentDeepOrLong >= 0.60) {
    velocity *= 1.15; // +15% for deep/long-heavy day (60%+ of tasks)
  } else if (percentLongOnly >= 0.50) {
    velocity *= 1.10; // +10% for long-task-heavy day (50%+ of tasks)
  }

  // ✅ STEP 6: Normalize to 0-100 scale (5 points/hour = 100%)
  let velocityScore = (velocity / 5) * 100;
  
  return Math.min(Math.round(velocityScore), 100);
}

// 🔢 5. RHYTHM (UPGRADED)
export function calculateEnhancedRhythm(
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): number {
  if (entries.length < 3) return 0;

  let rhythmScore = 0;
  let factors = 0;

  // Factor 1: Time-of-day performance consistency
  const hourlyData: Record<number, number[]> = {};
  entries.filter(e => e.ended_at).forEach(task => {
    const hour = new Date(task.started_at).getHours();
    const duration = task.accumulated_seconds || 0;
    if (!hourlyData[hour]) hourlyData[hour] = [];
    hourlyData[hour].push(duration);
  });

  const hourlyVariances = Object.values(hourlyData).map(durations => {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avg, 2), 0) / durations.length;
    return variance;
  });

  const avgVariance = hourlyVariances.reduce((a, b) => a + b, 0) / hourlyVariances.length;
  const consistencyScore = Math.max(0, 1 - (avgVariance / 10000)); // Normalize
  rhythmScore += consistencyScore;
  factors++;

  // Factor 2: Start time consistency
  const startHours = entries.map(e => new Date(e.started_at).getHours());
  const avgStartHour = startHours.reduce((a, b) => a + b, 0) / startHours.length;
  const startVariance = startHours.reduce((sum, h) => sum + Math.pow(h - avgStartHour, 2), 0) / startHours.length;
  const startConsistency = Math.max(0, 1 - (startVariance / 20));
  rhythmScore += startConsistency;
  factors++;

  // Factor 3: Mood & energy wave alignment (if available)
  if (moodEntries && moodEntries.length >= 3) {
    // Check if mood follows a natural pattern (e.g., better in morning, dip in afternoon)
    const morningMoods = moodEntries.filter(m => {
      const hour = new Date(m.timestamp).getHours();
      return hour >= 6 && hour < 12;
    });
    
    const afternoonMoods = moodEntries.filter(m => {
      const hour = new Date(m.timestamp).getHours();
      return hour >= 14 && hour < 18;
    });

    if (morningMoods.length > 0 && afternoonMoods.length > 0) {
      // Natural rhythm includes some energy dips - this is healthy
      rhythmScore += 0.8;
      factors++;
    }
  }

  // 🎯 Factor 4: Priority timing patterns (e.g., immediate tasks in morning, evergreen in low-energy times)
  const morningTasks = entries.filter(e => {
    const hour = new Date(e.started_at).getHours();
    return hour >= 6 && hour < 12;
  });

  const immediateMorning = morningTasks.filter(e => 
    e.task_priority === 'Immediate Impact Task' || 
    e.task_priority === 'Daily Task'
  ).length;

  const afternoonTasks = entries.filter(e => {
    const hour = new Date(e.started_at).getHours();
    return hour >= 14 && hour < 18;
  });

  const evergreenAfternoon = afternoonTasks.filter(e => 
    e.task_priority === 'Evergreen Task' || 
    e.task_priority === 'Monthly Task'
  ).length;

  // Good rhythm = urgent tasks in high-energy times, long-term in flexible times
  let priorityTimingScore = 0;
  if (morningTasks.length > 0) {
    priorityTimingScore += (immediateMorning / morningTasks.length) * 0.5;
  }
  if (afternoonTasks.length > 0) {
    priorityTimingScore += (evergreenAfternoon / afternoonTasks.length) * 0.5;
  }

  if (morningTasks.length > 0 || afternoonTasks.length > 0) {
    rhythmScore += priorityTimingScore;
    factors++;
  }

  return factors > 0 ? Math.round((rhythmScore / factors) * 100) : 0;
}

// 🔢 6. ENERGY (NEW - Pure Self-Reported Energy System)
// Measures REAL energy levels based only on user's self-reported check-ins
// NO task-based penalties, NO performance metrics
export function calculateEnhancedEnergy(
  entries: TimeEntry[],
  energyEntries?: EnergyEntry[],
  moodEntries?: MoodEntry[],
  clockInData?: { clocked_in_at?: string; clocked_out_at?: string; planned_shift_minutes?: number }
): number {
  // ✅ FACTOR 1 — Average Energy Level (33%)
  let avgEnergy = 0;
  
  if (energyEntries && energyEntries.length > 0) {
    const energyValues: Record<string, number> = {
      'High': 1.0,
      'Medium': 0.7,
      'Recharging': 0.6,
      'Low': 0.4,
      'Drained': 0.2,
    };
    
    avgEnergy = energyEntries.reduce((sum, e) => 
      sum + (energyValues[e.energy_level] || 0.5), 0
    ) / energyEntries.length;
  } else {
    avgEnergy = 0; // No energy entries = no data
  }

  // ✅ FACTOR 2 — Survey Responsiveness (33%)
  let responsiveness = 0;
  
  if (clockInData && clockInData.clocked_in_at) {
    // Calculate shift hours
    const clockInTime = new Date(clockInData.clocked_in_at).getTime();
    const clockOutTime = clockInData.clocked_out_at 
      ? new Date(clockInData.clocked_out_at).getTime() 
      : Date.now();
    const shiftHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    
    // Expected check-ins: Energy every 2 hours + Mood every 90 minutes
    const expectedCheckins = Math.floor(shiftHours / 1.5) + Math.floor(shiftHours / 2);
    
    // Actual check-ins
    const actualCheckins = (energyEntries?.length || 0) + (moodEntries?.length || 0);
    
    // Calculate responsiveness (cap at 1.0)
    responsiveness = expectedCheckins > 0 
      ? Math.min(actualCheckins / expectedCheckins, 1.0) 
      : 0;
  } else {
    // Fallback: If no clock-in data, assume 8-hour shift
    const expectedCheckins = Math.floor(8 / 1.5) + Math.floor(8 / 2); // ≈ 9
    const actualCheckins = (energyEntries?.length || 0) + (moodEntries?.length || 0);
    responsiveness = Math.min(actualCheckins / expectedCheckins, 1.0);
  }

  // ✅ FACTOR 3 — Energy Stability (33%)
  let stability = 0;
  
  if (energyEntries && energyEntries.length > 1) {
    const energyValues: Record<string, number> = {
      'High': 1.0,
      'Medium': 0.7,
      'Recharging': 0.6,
      'Low': 0.4,
      'Drained': 0.2,
    };
    
    // Convert to numeric values
    const numericEnergy = energyEntries.map(e => energyValues[e.energy_level] || 0.5);
    
    // Calculate variance
    const mean = numericEnergy.reduce((sum, v) => sum + v, 0) / numericEnergy.length;
    const variance = numericEnergy.reduce((sum, v) => 
      sum + Math.pow(v - mean, 2), 0
    ) / numericEnergy.length;
    
    // Normalize (max expected variance ≈ 0.4)
    stability = Math.max(0, 1 - (variance / 0.4));
  } else if (energyEntries && energyEntries.length === 1) {
    stability = 0; // Insufficient data
  } else {
    stability = 0; // No energy entries
  }

  // ✅ FINAL ENERGY SCORE
  const energyScore = ((avgEnergy + responsiveness + stability) / 3) * 100;
  
  return Math.round(energyScore);
}

// 🌈 ENERGY INSIGHTS GENERATOR
export function generateEnergyInsights(
  energyEntries?: EnergyEntry[],
  moodEntries?: MoodEntry[],
  clockInData?: { clocked_in_at?: string; clocked_out_at?: string; planned_shift_minutes?: number }
): {
  insights: string[];
  peakEnergyHour: number | null;
  lowestEnergyHour: number | null;
  avgEnergyValue: number;
  energyStabilityValue: number;
  energyResponsivenessValue: number;
} {
  const insights: string[] = [];
  let peakEnergyHour: number | null = null;
  let lowestEnergyHour: number | null = null;
  let avgEnergyValue = 0;
  let energyStabilityValue = 0;
  let energyResponsivenessValue = 0;

  if (!energyEntries || energyEntries.length === 0) {
    insights.push("No energy check-ins recorded today. Start tracking to see insights!");
    return { insights, peakEnergyHour, lowestEnergyHour, avgEnergyValue, energyStabilityValue, energyResponsivenessValue };
  }

  const energyValues: Record<string, number> = {
    'High': 1.0,
    'Medium': 0.7,
    'Recharging': 0.6,
    'Low': 0.4,
    'Drained': 0.2,
  };

  // Calculate average energy
  avgEnergyValue = energyEntries.reduce((sum, e) => 
    sum + (energyValues[e.energy_level] || 0.5), 0
  ) / energyEntries.length;

  // ✔ INSIGHT 1 — Overall energy summary
  if (avgEnergyValue >= 0.8) {
    insights.push("Your energy levels were strong today — great stamina!");
  } else if (avgEnergyValue >= 0.6) {
    insights.push("Solid energy levels today. You maintained good momentum.");
  } else if (avgEnergyValue >= 0.4) {
    insights.push("Energy dipped today; try taking short breaks earlier.");
  } else {
    insights.push("Low energy day. Consider lighter tasks or more frequent breaks.");
  }

  // ✔ INSIGHT 2 — Peak energy prediction
  if (energyEntries.length > 0) {
    const hourlyEnergy: Record<number, { total: number; count: number }> = {};
    
    energyEntries.forEach(e => {
      const hour = new Date(e.timestamp).getHours();
      if (!hourlyEnergy[hour]) {
        hourlyEnergy[hour] = { total: 0, count: 0 };
      }
      hourlyEnergy[hour].total += energyValues[e.energy_level] || 0.5;
      hourlyEnergy[hour].count++;
    });

    let maxAvg = -1;
    Object.entries(hourlyEnergy).forEach(([hour, data]) => {
      const avg = data.total / data.count;
      if (avg > maxAvg) {
        maxAvg = avg;
        peakEnergyHour = parseInt(hour);
      }
    });

    if (peakEnergyHour !== null) {
      insights.push(`Your strongest energy window is around ${peakEnergyHour}:00 EST.`);
    }
  }

  // ✔ INSIGHT 3 — Lowest energy window
  if (energyEntries.length > 0) {
    const hourlyEnergy: Record<number, { total: number; count: number }> = {};
    
    energyEntries.forEach(e => {
      const hour = new Date(e.timestamp).getHours();
      if (!hourlyEnergy[hour]) {
        hourlyEnergy[hour] = { total: 0, count: 0 };
      }
      hourlyEnergy[hour].total += energyValues[e.energy_level] || 0.5;
      hourlyEnergy[hour].count++;
    });

    let minAvg = 2;
    Object.entries(hourlyEnergy).forEach(([hour, data]) => {
      const avg = data.total / data.count;
      if (avg < minAvg) {
        minAvg = avg;
        lowestEnergyHour = parseInt(hour);
      }
    });

    if (lowestEnergyHour !== null) {
      insights.push(`Your energy tends to dip around ${lowestEnergyHour}:00 EST.`);
    }
  }

  // Calculate stability
  if (energyEntries.length > 1) {
    const numericEnergy = energyEntries.map(e => energyValues[e.energy_level] || 0.5);
    const mean = numericEnergy.reduce((sum, v) => sum + v, 0) / numericEnergy.length;
    const variance = numericEnergy.reduce((sum, v) => 
      sum + Math.pow(v - mean, 2), 0
    ) / numericEnergy.length;
    
    energyStabilityValue = Math.max(0, 1 - (variance / 0.4));

    // ✔ INSIGHT 4 — Stability commentary
    if (energyStabilityValue < 0.5) {
      insights.push("Your energy fluctuated a lot today — try pacing tasks with breaks.");
    } else if (energyStabilityValue > 0.8) {
      insights.push("You maintained steady energy through your shift — amazing consistency!");
    }
  }

  // Calculate responsiveness
  if (clockInData && clockInData.clocked_in_at) {
    const clockInTime = new Date(clockInData.clocked_in_at).getTime();
    const clockOutTime = clockInData.clocked_out_at 
      ? new Date(clockInData.clocked_out_at).getTime() 
      : Date.now();
    const shiftHours = (clockOutTime - clockInTime) / (1000 * 60 * 60);
    
    const expectedCheckins = Math.floor(shiftHours / 1.5) + Math.floor(shiftHours / 2);
    const actualCheckins = (energyEntries?.length || 0) + (moodEntries?.length || 0);
    
    energyResponsivenessValue = expectedCheckins > 0 
      ? Math.min(actualCheckins / expectedCheckins, 1.0) 
      : 0;
  } else {
    const expectedCheckins = Math.floor(8 / 1.5) + Math.floor(8 / 2);
    const actualCheckins = (energyEntries?.length || 0) + (moodEntries?.length || 0);
    energyResponsivenessValue = Math.min(actualCheckins / expectedCheckins, 1.0);
  }

  // ✔ INSIGHT 5 — Survey responsiveness
  if (energyResponsivenessValue < 0.5) {
    insights.push("Low check-in rate — energy insights may be less accurate.");
  } else if (energyResponsivenessValue > 0.9) {
    insights.push("Great check-in consistency! Your energy trends are very accurate.");
  }

  return {
    insights,
    peakEnergyHour,
    lowestEnergyHour,
    avgEnergyValue,
    energyStabilityValue,
    energyResponsivenessValue
  };
}

// 🔢 7. UTILIZATION (NEW - Shift-Based Utilization)
// Measures how effectively user uses their planned shift time
export function calculateEnhancedUtilization(
  entries: TimeEntry[],
  clockInData?: { planned_shift_minutes?: number },
  surveyData?: { responses: number; sent: number }
): number {
  // Calculate total active time (excludes pauses, idle time)
  const totalActiveTime = entries.reduce((sum, e) => sum + (e.accumulated_seconds || 0), 0);
  
  // Get planned shift time
  let plannedShiftSeconds = 0;
  
  if (clockInData && clockInData.planned_shift_minutes) {
    plannedShiftSeconds = clockInData.planned_shift_minutes * 60;
  } else {
    // Fallback: Use old calculation if no planned shift
    let totalTime = 0;
    entries.forEach(e => {
      if (e.ended_at) {
        const duration = (new Date(e.ended_at).getTime() - new Date(e.started_at).getTime()) / 1000;
        totalTime += duration;
      } else if (e.paused_at) {
        const duration = (new Date(e.paused_at).getTime() - new Date(e.started_at).getTime()) / 1000;
        totalTime += duration;
      }
    });
    
    if (totalTime === 0) return 0;
    
    const utilization = totalActiveTime / totalTime;
    return Math.round(utilization * 100);
  }
  
  if (plannedShiftSeconds === 0) return 0;
  
  // Calculate base utilization
  let utilization = totalActiveTime / plannedShiftSeconds;
  
  // Cap at 1.0 (100%) - no punishment for working more than planned
  utilization = Math.min(utilization, 1.0);
  
  // Convert to percentage
  let utilizationScore = utilization * 100;
  
  // ✅ OPTIONAL MICRO-BONUS: Survey Responsiveness
  // If user answers >60% of surveys, add tiny boost
  if (surveyData && surveyData.sent > 0) {
    const responseRate = surveyData.responses / surveyData.sent;
    if (responseRate > 0.6) {
      utilizationScore += 5; // Subtle presence signal
    }
  }
  
  // Cap at 100
  utilizationScore = Math.min(utilizationScore, 100);
  
  return Math.round(utilizationScore);
}

// 🔢 8. MOMENTUM (NEW - Flow State Momentum Index)
// Fair, simple 4-factor model that measures flow entry, sustain, enjoyment, and continuity
export function calculateEnhancedMomentum(
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[],
  clockInData?: { clocked_in_at: string; daily_task_goal?: number }
): number {
  if (entries.length === 0) return 0;

  // ✅ FACTOR 1: Entry Momentum (Early Activation)
  // Measures how quickly user enters flow after clock-in
  let entryMomentum = 0;
  
  if (clockInData && clockInData.clocked_in_at) {
    const clockInTime = new Date(clockInData.clocked_in_at).getTime();
    const first90MinWindow = clockInTime + (90 * 60 * 1000); // 90 minutes after clock-in
    
    // Signal 1: Started any task within first 90 min
    const startedTaskIn90 = entries.some(e => {
      const startTime = new Date(e.started_at).getTime();
      return startTime >= clockInTime && startTime <= first90MinWindow;
    });
    
    // Signal 2: Reached ≥ 20 minutes accumulated active time in first 90 min
    const activeTimeIn90 = entries
      .filter(e => {
        const startTime = new Date(e.started_at).getTime();
        return startTime >= clockInTime && startTime <= first90MinWindow;
      })
      .reduce((sum, e) => sum + (e.accumulated_seconds || 0), 0);
    const active20minIn90 = activeTimeIn90 >= (20 * 60); // 20 minutes
    
    // Signal 3: Responded to ANY survey in first 90 min
    let surveyResponseIn90 = false;
    if (moodEntries || energyEntries) {
      const allSurveys = [
        ...(moodEntries || []).map(m => m.timestamp),
        ...(energyEntries || []).map(e => e.timestamp)
      ];
      surveyResponseIn90 = allSurveys.some(timestamp => {
        const surveyTime = new Date(timestamp).getTime();
        return surveyTime >= clockInTime && surveyTime <= first90MinWindow;
      });
    }
    
    // Calculate entry momentum
    entryMomentum = 
      (startedTaskIn90 ? 0.4 : 0) +
      (active20minIn90 ? 0.4 : 0) +
      (surveyResponseIn90 ? 0.2 : 0);
    
    entryMomentum = Math.min(entryMomentum, 1.0);
  } else {
    // No clock-in data: give partial credit if user started any task
    entryMomentum = entries.length > 0 ? 0.5 : 0;
  }

  // ✅ FACTOR 2: Deep Engagement Score (Flow Sustain)
  // Measures sustained focus blocks (≥25 minutes accumulated time)
  const deepEngagementCount = entries.filter(e => 
    (e.accumulated_seconds || 0) >= 1500 // 25 minutes
  ).length;
  
  const deepEngagementScore = Math.min(deepEngagementCount / 2, 1.0); // Cap at 2 blocks

  // ✅ FACTOR 3: Enjoyment Score (Flow Satisfaction)
  // Measures how much user enjoys their work
  const completedTasks = entries.filter(e => e.ended_at);
  const enjoyedTasks = completedTasks.filter(e => 
    e.task_enjoyment && e.task_enjoyment >= 4
  );
  
  let enjoymentScore = 0;
  if (completedTasks.length > 0) {
    enjoymentScore = enjoyedTasks.length / completedTasks.length;
    enjoymentScore = Math.min(enjoymentScore, 0.7); // Capped at 70%
  }

  // ✅ FACTOR 4: Flow Continuity (Task-to-Task Transitions)
  // Measures smooth transitions between completed tasks
  const sortedEntries = [...entries]
    .filter(e => e.ended_at) // Only completed tasks
    .sort((a, b) => new Date(a.ended_at!).getTime() - new Date(b.ended_at!).getTime());
  
  let flowTransitions = 0;
  for (let i = 0; i < sortedEntries.length - 1; i++) {
    const currentEndTime = new Date(sortedEntries[i].ended_at!).getTime();
    const nextStartTime = new Date(sortedEntries[i + 1].started_at).getTime();
    const timeBetween = (nextStartTime - currentEndTime) / 1000; // seconds
    
    // Flow transition = next task starts within 10 minutes (600 seconds)
    if (timeBetween >= 0 && timeBetween <= 600) {
      flowTransitions++;
    }
  }
  
  let flowContinuity = Math.min(flowTransitions / 3, 1.0); // Cap at 3 transitions
  
  // Daily Task Goal Bonus (light influence)
  if (clockInData && clockInData.daily_task_goal) {
    const plannedTasks = clockInData.daily_task_goal;
    const completedTasksCount = completedTasks.length;
    
    if (completedTasksCount >= plannedTasks) {
      flowContinuity = Math.min(flowContinuity + 0.2, 1.0); // Exceeded goal
    } else if (completedTasksCount >= plannedTasks * 0.8) {
      flowContinuity = Math.min(flowContinuity + 0.1, 1.0); // 80%+ of goal
    }
  }

  // ✅ FINAL MOMENTUM SCORE
  const momentumScore = (entryMomentum + deepEngagementScore + enjoymentScore + flowContinuity) / 4;
  
  return Math.round(momentumScore * 100);
}

// 🔢 9. CONSISTENCY (NEW - Fair Stability-Based Metric)
// Measures day-to-day reliability and stability WITHOUT penalizing productivity, mood levels, or work styles
export function calculateEnhancedConsistency(
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[],
  clockInData?: { planned_shift_minutes?: number; clocked_in_at?: string; clocked_out_at?: string }
): number {
  if (entries.length < 3) return 0;

  // Helper function to calculate variance
  const calculateVariance = (values: number[]): number => {
    if (values.length === 0) return 0;
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
  };

  // ✅ FACTOR 1: Start-Time Reliability
  // Measures consistency of start times (NOT whether time is "good")
  // Extract first task start hour per day
  const dailyStartTimes: Record<string, number> = {};
  entries.forEach(e => {
    const date = e.started_at.split('T')[0];
    const hour = new Date(e.started_at).getHours();
    if (!dailyStartTimes[date]) {
      dailyStartTimes[date] = hour; // Only first task per day
    }
  });

  const startHours = Object.values(dailyStartTimes);
  const startVariance = calculateVariance(startHours);
  const startTimeConsistency = Math.max(0, 1 - (startVariance / 20));

  // ✅ FACTOR 2: Active Time Stability
  // Measures consistency of total active time per day
  const dailyActiveTime: Record<string, number> = {};
  entries.forEach(e => {
    const date = e.started_at.split('T')[0];
    if (!dailyActiveTime[date]) dailyActiveTime[date] = 0;
    dailyActiveTime[date] += e.accumulated_seconds || 0;
  });

  const dailyTimes = Object.values(dailyActiveTime);
  const activeVariance = calculateVariance(dailyTimes);
  const activeTimeStability = Math.max(0, 1 - (activeVariance / 100000));

  // ✅ FACTOR 3: Task Mix Stability (Type Consistency)
  // Measures stability of task type proportions across days
  const dailyTaskTypes: Record<string, Record<string, number>> = {};
  
  // Group tasks by day and count types
  entries.forEach(e => {
    const date = e.started_at.split('T')[0];
    const type = e.task_type || 'Standard Task';
    
    if (!dailyTaskTypes[date]) dailyTaskTypes[date] = {};
    dailyTaskTypes[date][type] = (dailyTaskTypes[date][type] || 0) + 1;
  });

  // Calculate daily percentages for each type
  const allTypes = ['Quick Task', 'Standard Task', 'Deep Work Task', 'Long Task', 'Very Long Task'];
  const typePercentages: number[] = [];
  
  Object.values(dailyTaskTypes).forEach(dayTypes => {
    const dayTotal = Object.values(dayTypes).reduce((a, b) => a + b, 0);
    allTypes.forEach(type => {
      const count = dayTypes[type] || 0;
      typePercentages.push(count / dayTotal);
    });
  });

  const typeVariance = calculateVariance(typePercentages);
  const taskMixConsistency = Math.max(0, 1 - (typeVariance / 0.20));

  // ✅ FACTOR 4: Priority Mix Stability
  // Measures stability in priority distribution across days
  const dailyPriorities: Record<string, Record<string, number>> = {};
  
  // Group tasks by day and count priorities
  entries.forEach(e => {
    const date = e.started_at.split('T')[0];
    const priority = e.task_priority || 'Weekly Task';
    
    if (!dailyPriorities[date]) dailyPriorities[date] = {};
    dailyPriorities[date][priority] = (dailyPriorities[date][priority] || 0) + 1;
  });

  // Calculate daily percentages for each priority
  const allPriorities = ['Immediate Impact Task', 'Daily Task', 'Weekly Task', 'Monthly Task', 'Evergreen Task', 'Trigger Task'];
  const priorityPercentages: number[] = [];
  
  Object.values(dailyPriorities).forEach(dayPriorities => {
    const dayTotal = Object.values(dayPriorities).reduce((a, b) => a + b, 0);
    allPriorities.forEach(priority => {
      const count = dayPriorities[priority] || 0;
      priorityPercentages.push(count / dayTotal);
    });
  });

  const priorityVariance = calculateVariance(priorityPercentages);
  const priorityStability = Math.max(0, 1 - (priorityVariance / 0.25));

  // ✅ FACTOR 5: Mood Stability
  // Measures variability, NOT positivity or negativity
  let moodStability = 0.5; // Default if no mood data
  
  if (moodEntries && moodEntries.length >= 3) {
    const moodValues: Record<string, number> = {
      '🔥': 1.0,
      '😊': 0.8,
      '😐': 0.5,
      '🥱': 0.3,
      '😣': 0.1,
    };
    
    const numericMoods = moodEntries.map(m => moodValues[m.mood_level] || 0.5);
    const moodVariance = calculateVariance(numericMoods);
    moodStability = Math.max(0, 1 - (moodVariance * 5));
  }

  // ✅ FACTOR 6: Energy Stability
  // Measures stability of reported physical energy
  let energyStability = 0.5; // Default if no energy data
  
  if (energyEntries && energyEntries.length >= 3) {
    const energyValues: Record<string, number> = {
      'High': 1.0,
      'Medium': 0.7,
      'Recharging': 0.6,
      'Low': 0.4,
      'Drained': 0.2,
    };
    
    const numericEnergy = energyEntries.map(e => energyValues[e.energy_level] || 0.5);
    const energyVariance = calculateVariance(numericEnergy);
    energyStability = Math.max(0, 1 - (energyVariance * 5));
  }

  // ✅ FACTOR 7: Shift Plan Accuracy
  // Measures how accurately user estimates their shift length
  let shiftPlanAccuracy = 0.5; // Default if no shift plan data
  
  if (clockInData && clockInData.planned_shift_minutes && clockInData.clocked_in_at && clockInData.clocked_out_at) {
    const plannedMinutes = clockInData.planned_shift_minutes;
    const clockInTime = new Date(clockInData.clocked_in_at).getTime();
    const clockOutTime = new Date(clockInData.clocked_out_at).getTime();
    const actualMinutes = (clockOutTime - clockInTime) / (1000 * 60);
    
    // Calculate accuracy: min(planned/actual, actual/planned)
    // This ensures both over and under estimates are treated fairly
    const accuracy = Math.min(
      plannedMinutes / actualMinutes,
      actualMinutes / plannedMinutes
    );
    
    shiftPlanAccuracy = Math.max(0, Math.min(accuracy, 1.0));
  }

  // ✅ FINAL CONSISTENCY SCORE
  const consistencyScore = (
    startTimeConsistency +
    activeTimeStability +
    taskMixConsistency +
    priorityStability +
    moodStability +
    energyStability +
    shiftPlanAccuracy
  ) / 7;

  return Math.round(consistencyScore * 100);
}

// 🎯 10. DAILY GOAL COMPLETION
// Measures progress toward daily task goal
export function calculateDailyGoalCompletion(
  completedTasks: number,
  dailyTaskGoal?: number
): { percentage: number; status: 'not-set' | 'below' | 'met' | 'exceeded' } {
  if (!dailyTaskGoal || dailyTaskGoal <= 0) {
    return { percentage: 0, status: 'not-set' };
  }
  
  const percentage = Math.round((completedTasks / dailyTaskGoal) * 100);
  
  let status: 'below' | 'met' | 'exceeded' = 'below';
  if (completedTasks >= dailyTaskGoal) {
    status = completedTasks > dailyTaskGoal ? 'exceeded' : 'met';
  }
  
  return { percentage: Math.min(percentage, 200), status }; // Cap at 200%
}

// 🎯 11. FIND PEAK HOUR
// Determines the hour with the most task completions
export function findPeakHour(entries: TimeEntry[]): number | null {
  // Need at least 5 completed tasks to determine peak hour
  const completedTasks = entries.filter(e => e.ended_at);
  if (completedTasks.length < 5) return null;
  
  const hourCounts: Record<number, number> = {};
  completedTasks.forEach(entry => {
    // Use EST timezone for hour calculation
    const estDate = new Date(entry.started_at).toLocaleString('en-US', { 
      timeZone: 'America/New_York', 
      hour: 'numeric', 
      hour12: false 
    });
    const hour = parseInt(estDate);
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakHour = Object.entries(hourCounts)
    .sort(([, a], [, b]) => b - a)[0];
  
  return peakHour ? parseInt(peakHour[0]) : null;
}

// ============================================================================
// 🎯 12. SURVEY ENGAGEMENT PENALTY SYSTEM
// ============================================================================
// Applies penalties to metrics when user misses too many surveys (>= 50% miss rate)
// This encourages engagement with mood/energy check-ins
// ============================================================================

export interface SurveyStats {
  totalMoodSurveys: number;
  missedMoodSurveys: number;
  totalEnergySurveys: number;
  missedEnergySurveys: number;
  moodMissRate: number;
  energyMissRate: number;
  overallMissRate: number;
  engagementPenalty: boolean;
}

// Calculate survey miss rate and determine if penalty applies
export function calculateSurveyEngagementPenalty(
  totalSurveys: number,
  missedSurveys: number
): { missRate: number; engagementPenalty: boolean } {
  if (totalSurveys === 0) {
    return { missRate: 0, engagementPenalty: false };
  }
  
  const missRate = missedSurveys / totalSurveys;
  const engagementPenalty = missRate >= 0.5; // 50% or more missed = penalty
  
  return { missRate, engagementPenalty };
}

// Apply penalty to ENERGY metric (25% reduction)
export function applyEnergyPenalty(
  energyScore: number,
  engagementPenalty: boolean
): number {
  if (!engagementPenalty) return energyScore;
  return Math.round(energyScore * 0.75);
}

// Apply penalty to CONSISTENCY metric (15% reduction)
export function applyConsistencyPenalty(
  consistencyScore: number,
  engagementPenalty: boolean
): number {
  if (!engagementPenalty) return consistencyScore;
  return Math.round(consistencyScore * 0.85);
}

// Apply penalty to MOMENTUM metric (10% reduction)
export function applyMomentumPenalty(
  momentumScore: number,
  engagementPenalty: boolean
): number {
  if (!engagementPenalty) return momentumScore;
  return Math.round(momentumScore * 0.90);
}

// Apply all penalties to a metrics object
export function applyAllSurveyPenalties(
  metrics: {
    energy: number;
    consistency: number;
    momentum: number;
    [key: string]: number;
  },
  surveyStats: SurveyStats
): {
  energy: number;
  consistency: number;
  momentum: number;
  [key: string]: number;
} {
  if (!surveyStats.engagementPenalty) {
    return metrics;
  }
  
  console.log('[Metrics] Applying survey engagement penalties (miss rate >= 50%)');
  
  return {
    ...metrics,
    energy: applyEnergyPenalty(metrics.energy, true),
    consistency: applyConsistencyPenalty(metrics.consistency, true),
    momentum: applyMomentumPenalty(metrics.momentum, true),
  };
}

// Get penalty info for display in UI
export function getSurveyPenaltyInfo(surveyStats: SurveyStats): {
  hasPenalty: boolean;
  missRate: number;
  message: string;
  affectedMetrics: string[];
} {
  if (!surveyStats.engagementPenalty) {
    return {
      hasPenalty: false,
      missRate: surveyStats.overallMissRate,
      message: '',
      affectedMetrics: [],
    };
  }
  
  return {
    hasPenalty: true,
    missRate: surveyStats.overallMissRate,
    message: `Survey engagement penalty applied (${Math.round(surveyStats.overallMissRate * 100)}% surveys missed)`,
    affectedMetrics: ['Energy (-25%)', 'Consistency (-15%)', 'Momentum (-10%)'],
  };
}

