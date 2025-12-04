import { 
  getDateKeyEST, 
  dateKeyToESTStart, 
  dateKeyToESTEnd, 
  getWeekStartEST 
} from './timezoneUtils';
import {
  calculateEnhancedEfficiency,
  calculateEnhancedCompletion,
  calculateEnhancedFocusScore,
  calculateEnhancedVelocity,
  calculateEnhancedRhythm,
  calculateEnhancedEnergy,
  calculateEnhancedUtilization,
  calculateEnhancedMomentum,
  calculateEnhancedConsistency
} from './enhancedMetrics';

interface TimeEntry {
  id: string;
  user_id: string;
  task_description: string;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  accumulated_seconds: number;
  created_at: string;
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

interface UserMetrics {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  pausedTasks: number;
  avgTimePerTask: number;
  activeTime: number;
  pausedTime: number;
  efficiencyScore: number;
  consistencyScore: number;
  taskCompletionRate: number;
  timeUtilization: number;
  productivityMomentum: number;
  focusIndex: number;
  taskVelocity: number;
  workRhythm: number;
  energyLevel: number;
  delayedTasks: number;
  peakHour: number | null;
}

interface WeekData {
  weekNumber: number;
  weekStart: Date;
  weekEnd: Date;
  tasksCompleted: number;
  avgCompletionTime: number;
  focusHours: number; // Deep work blocks only (20+ min uninterrupted)
  pauseTime: number;
  
  // ✨ ALL 9 CORE METRICS (using exact same calculations as dashboard)
  efficiency: number; // calculateEnhancedEfficiency
  completion: number; // calculateEnhancedCompletion
  focusScore: number; // calculateEnhancedFocusScore
  velocity: number; // calculateEnhancedVelocity
  rhythm: number; // calculateEnhancedRhythm
  energy: number; // calculateEnhancedEnergy
  utilization: number; // calculateEnhancedUtilization
  momentum: number; // calculateEnhancedMomentum
  consistency: number; // calculateEnhancedConsistency
  
  streakDays: number;
  totalActiveMinutes: number;
  deepWorkBlocks: number;
  quickTaskBursts: number;
  avgGoalAccuracy: number;
  pausesPerHour: number;
  avgMood?: number;
  avgEnergy?: number;
  // 🎯 Priority-based metrics
  mostCompletedPriority?: string;
  priorityDistribution?: Record<string, number>;
  priorityEfficiency?: Record<string, number>;
  priorityFocusScore?: Record<string, number>;
  moodByPriority?: Record<string, number>;
}

interface ProgressInsight {
  type: 'weekly' | 'trend' | 'streak' | 'monthly';
  message: string;
  subtext: string;
  indicator: 'up' | 'stable' | 'gentle' | 'balanced';
  category: 'speed' | 'focus' | 'consistency' | 'momentum' | 'growth';
  value?: number;
  trend?: 'improving' | 'stable' | 'balanced';
}

interface StreakEvent {
  streakLength: number;
  startDate: Date;
  endDate: Date;
  resetReason?: string;
  isCurrent: boolean;
  avgMood?: number;
  avgEnergy?: number;
  estimationAccuracy?: number;
  dominantTaskType?: string;
  momentumTrend?: string;
}

interface MonthlyGrowth {
  totalTasks: number;
  
  // ✨ ALL 9 CORE METRICS (averaged from weekly data)
  avgEfficiency: number;
  avgCompletion: number;
  avgFocusScore: number;
  avgVelocity: number;
  avgRhythm: number;
  avgEnergy: number;
  avgUtilization: number;
  avgMomentum: number;
  avgConsistency: number;
  
  totalDeepWorkHours: number;
  bestTaskType: string;
  mostProductiveDayOfWeek: string;
  avgMood: number;
  avgEnergyLevel: number; // Renamed from avgEnergy to avoid confusion with metric
  estimationAccuracyTrend: number;
  categoryDistribution: { category: string; count: number; percentage: number }[];
  weeklyConsistencyGraph: { week: number; consistency: number }[];
  insights: ProgressInsight[];
  // 🎯 Priority-based fields
  priorityDistribution: { priority: string; count: number; percentage: number }[];
  priorityAccuracy: Record<string, number>;
  longTermVsShortTermBalance: { shortTerm: number; longTerm: number };
  triggerAndEvergreenPatterns: { trigger: number; evergreen: number };
}

export function analyzeProgressHistory(
  entries: TimeEntry[],
  metrics: UserMetrics,
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): {
  weeklyData: WeekData[];
  progressInsights: ProgressInsight[];
  streakHistory: StreakEvent[];
  monthlyGrowth: MonthlyGrowth | null;
} {
  if (!entries || entries.length < 3) {
    return {
      weeklyData: [],
      progressInsights: [{
        type: 'weekly',
        message: "You're just getting started — keep building your rhythm!",
        subtext: "Complete more tasks to unlock your personal progress story.",
        indicator: 'stable',
        category: 'growth',
      }],
      streakHistory: [],
      monthlyGrowth: null,
    };
  }

  // Fix: Input validation - sanitize entries
  const sanitizedEntries = entries.filter(e => {
    // Remove entries with negative accumulated_seconds
    if (e.accumulated_seconds < 0) {
      console.warn('Skipping entry with negative accumulated_seconds:', e.id);
      return false;
    }
    // Remove entries with invalid dates - use started_at for accuracy
    const startedAt = new Date(e.started_at || e.created_at);
    if (isNaN(startedAt.getTime())) {
      console.warn('Skipping entry with invalid started_at:', e.id);
      return false;
    }
    return true;
  });

  const weeklyData = calculateWeeklyData(sanitizedEntries, moodEntries, energyEntries);
  const progressInsights = generateProgressInsights(weeklyData, sanitizedEntries, metrics);
  const streakHistory = analyzeStreakHistory(sanitizedEntries, moodEntries, energyEntries);
  const monthlyGrowth = generateMonthlyGrowth(sanitizedEntries, weeklyData, moodEntries, energyEntries);

  return {
    weeklyData,
    progressInsights,
    streakHistory,
    monthlyGrowth,
  };
}

// ========================
// PART 1: WEEK-BY-WEEK PERFORMANCE
// ========================
function calculateWeeklyData(
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): WeekData[] {
  const weeks: Map<string, TimeEntry[]> = new Map();

  // Group entries by week (Monday-Sunday) in EST
  entries.forEach(entry => {
    const date = new Date(entry.started_at || entry.created_at);
    const weekStart = getWeekStartEST(date);
    const weekKey = weekStart.toISOString();
    
    if (!weeks.has(weekKey)) {
      weeks.set(weekKey, []);
    }
    weeks.get(weekKey)!.push(entry);
  });

  // Calculate metrics for each week
  const weeklyData: WeekData[] = [];
  
  Array.from(weeks.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .forEach(([weekKey, weekEntries], index) => {
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const completedTasks = weekEntries.filter(e => e.ended_at);
      const tasksCompleted = completedTasks.length;

      let totalCompletionTime = 0;
      let totalActiveTime = 0;
      let totalPauseTime = 0;

      // Calculate times
      completedTasks.forEach(entry => {
        if (entry.ended_at) {
          const completionTime = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
          totalCompletionTime += completionTime;

          const activeTime = entry.accumulated_seconds || 0;
          totalActiveTime += activeTime;

          const pauseTime = completionTime - activeTime;
          totalPauseTime += Math.max(0, pauseTime);
        }
      });

      // ✨ CALCULATE ALL 9 CORE METRICS (using the exact same functions as dashboard)
      const weekMoodEntriesForMetrics = moodEntries?.filter(m => {
        const moodDate = new Date(m.timestamp);
        return moodDate >= weekStart && moodDate <= weekEnd;
      }) || [];

      const weekEnergyEntriesForMetrics = energyEntries?.filter(e => {
        const energyDate = new Date(e.timestamp);
        return energyDate >= weekStart && energyDate <= weekEnd;
      }) || [];

      const efficiency = calculateEnhancedEfficiency(weekEntries, weekMoodEntriesForMetrics, weekEnergyEntriesForMetrics);
      const completion = calculateEnhancedCompletion(weekEntries);
      const focusScore = calculateEnhancedFocusScore(weekEntries, weekMoodEntriesForMetrics, weekEnergyEntriesForMetrics);
      const velocity = calculateEnhancedVelocity(weekEntries);
      const rhythm = calculateEnhancedRhythm(weekEntries, weekMoodEntriesForMetrics, weekEnergyEntriesForMetrics);
      const energy = calculateEnhancedEnergy(weekEntries, weekEnergyEntriesForMetrics);
      const utilization = calculateEnhancedUtilization(weekEntries);
      const momentum = calculateEnhancedMomentum(weekEntries);
      const consistency = calculateEnhancedConsistency(weekEntries, weekMoodEntriesForMetrics, weekEnergyEntriesForMetrics);

      // Calculate FOCUS HOURS (deep work blocks only: 20+ min uninterrupted sessions)
      const focusHours = calculateDeepWorkBlocks(weekEntries);

      // Calculate other metrics
      const deepWorkBlocks = countDeepWorkBlocks(weekEntries);
      const quickTaskBursts = countQuickTaskBursts(weekEntries);
      const avgGoalAccuracy = calculateAvgGoalAccuracy(completedTasks);
      // Fix: Only count pauses from COMPLETED tasks in this week
      const pausesPerHour = totalActiveTime > 0 
        ? (completedTasks.filter(e => e.paused_at).length / (totalActiveTime / 3600)) 
        : 0;

      // Calculate mood/energy for this week
      const weekMoodEntries = moodEntries?.filter(m => {
        const moodDate = new Date(m.timestamp);
        return moodDate >= weekStart && moodDate <= weekEnd;
      }) || [];

      const weekEnergyEntries = energyEntries?.filter(e => {
        const energyDate = new Date(e.timestamp);
        return energyDate >= weekStart && energyDate <= weekEnd;
      }) || [];

      const avgMood = weekMoodEntries.length > 0 
        ? weekMoodEntries.reduce((sum, m) => sum + moodToNumber(m.mood_level), 0) / weekMoodEntries.length 
        : undefined;

      const avgEnergy = weekEnergyEntries.length > 0 
        ? weekEnergyEntries.reduce((sum, e) => sum + energyToNumber(e.energy_level), 0) / weekEnergyEntries.length 
        : undefined;

      // Calculate streak days in this week
      const streakDays = calculateWeekStreakDays(weekEntries);

      // 🎯 Calculate priority-based metrics
      const priorityDistribution: Record<string, number> = {};
      const priorityEfficiency: Record<string, number> = {};
      const priorityFocusScore: Record<string, number> = {};
      const moodByPriority: Record<string, number> = {};

      completedTasks.forEach(task => {
        const priority = task.task_priority || 'Not Set';
        priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1;

        // Calculate efficiency per priority
        if (task.goal_duration_minutes && task.accumulated_seconds) {
          const goalMinutes = task.goal_duration_minutes;
          const actualMinutes = task.accumulated_seconds / 60;
          const efficiency = Math.min(goalMinutes / actualMinutes, 2.0);
          
          if (!priorityEfficiency[priority]) {
            priorityEfficiency[priority] = 0;
          }
          priorityEfficiency[priority] += efficiency;
        }

        // Focus score per priority (lower pauses = better focus)
        const focusScore = task.paused_at ? 0.7 : 1.0;
        if (!priorityFocusScore[priority]) {
          priorityFocusScore[priority] = 0;
        }
        priorityFocusScore[priority] += focusScore;

        // Mood correlation with priority
        if (weekMoodEntries.length > 0) {
          const taskTime = new Date(task.started_at).getTime();
          const closestMood = weekMoodEntries.reduce((prev, curr) => {
            const prevDiff = Math.abs(new Date(prev.timestamp).getTime() - taskTime);
            const currDiff = Math.abs(new Date(curr.timestamp).getTime() - taskTime);
            return currDiff < prevDiff ? curr : prev;
          });
          
          if (!moodByPriority[priority]) {
            moodByPriority[priority] = 0;
          }
          moodByPriority[priority] += moodToNumber(closestMood.mood_level);
        }
      });

      // Average the accumulated values
      Object.keys(priorityEfficiency).forEach(p => {
        priorityEfficiency[p] = priorityEfficiency[p] / (priorityDistribution[p] || 1);
      });
      Object.keys(priorityFocusScore).forEach(p => {
        priorityFocusScore[p] = priorityFocusScore[p] / (priorityDistribution[p] || 1);
      });
      Object.keys(moodByPriority).forEach(p => {
        moodByPriority[p] = moodByPriority[p] / (priorityDistribution[p] || 1);
      });

      // Find most completed priority
      const mostCompletedPriority = Object.entries(priorityDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      const weekData: WeekData = {
        weekNumber: index + 1,
        weekStart,
        weekEnd,
        tasksCompleted,
        avgCompletionTime: tasksCompleted > 0 ? totalCompletionTime / tasksCompleted : 0,
        focusHours: focusHours / 60, // Convert minutes to hours
        pauseTime: totalPauseTime,
        
        // ✨ ALL 9 CORE METRICS (exact same as dashboard)
        efficiency: Math.round(efficiency),
        completion: Math.round(completion),
        focusScore: Math.round(focusScore),
        velocity: Math.round(velocity),
        rhythm: Math.round(rhythm),
        energy: Math.round(energy),
        utilization: Math.round(utilization),
        momentum: Math.round(momentum),
        consistency: Math.round(consistency),
        
        streakDays,
        totalActiveMinutes: totalActiveTime / 60,
        deepWorkBlocks,
        quickTaskBursts,
        avgGoalAccuracy: Math.round(avgGoalAccuracy * 100),
        pausesPerHour: Math.round(pausesPerHour * 10) / 10,
        avgMood,
        avgEnergy,
        // 🎯 Priority metrics
        mostCompletedPriority,
        priorityDistribution,
        priorityEfficiency,
        priorityFocusScore,
        moodByPriority,
      };
      
      console.log(`📅 Week ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}:`, {
        tasks: tasksCompleted,
        focusHours: Math.round(weekData.focusHours * 10) / 10,
        '✨ 9 Core Metrics': {
          efficiency: weekData.efficiency,
          completion: weekData.completion,
          focusScore: weekData.focusScore,
          velocity: weekData.velocity,
          rhythm: weekData.rhythm,
          energy: weekData.energy,
          utilization: weekData.utilization,
          momentum: weekData.momentum,
          consistency: weekData.consistency,
        },
        deepWorkBlocks,
        quickTaskBursts,
      });
      
      weeklyData.push(weekData);
    });

  console.log('✅ Total weeks calculated:', weeklyData.length);
  return weeklyData;
}

// Helper: Calculate deep work blocks (20+ min uninterrupted sessions)
function calculateDeepWorkBlocks(entries: TimeEntry[]): number {
  let totalDeepWorkMinutes = 0;

  entries.forEach(entry => {
    const activeSeconds = entry.accumulated_seconds || 0;
    const activeMinutes = activeSeconds / 60;

    // If task lasted 20+ minutes and was completed without pause, it's deep work
    if (activeMinutes >= 20 && entry.ended_at && !entry.paused_at) {
      totalDeepWorkMinutes += activeMinutes;
    }
  });

  return totalDeepWorkMinutes;
}

function countDeepWorkBlocks(entries: TimeEntry[]): number {
  return entries.filter(e => {
    const activeMinutes = (e.accumulated_seconds || 0) / 60;
    return activeMinutes >= 20 && e.ended_at && !e.paused_at;
  }).length;
}

function countQuickTaskBursts(entries: TimeEntry[]): number {
  // Quick tasks are tasks completed in < 15 minutes
  const quickTasks = entries.filter(e => {
    const activeMinutes = (e.accumulated_seconds || 0) / 60;
    return activeMinutes < 15 && e.ended_at;
  }).sort((a, b) => new Date(a.ended_at!).getTime() - new Date(b.ended_at!).getTime());

  if (quickTasks.length === 0) return 0;

  let maxBurst = 0;
  let currentBurst = 1;

  for (let i = 1; i < quickTasks.length; i++) {
    const prevEnd = new Date(quickTasks[i - 1].ended_at!).getTime();
    const currEnd = new Date(quickTasks[i].ended_at!).getTime();
    const gap = (currEnd - prevEnd) / 1000 / 60; // minutes

    if (gap <= 5) {
      currentBurst++;
    } else {
      maxBurst = Math.max(maxBurst, currentBurst);
      currentBurst = 1;
    }
  }

  maxBurst = Math.max(maxBurst, currentBurst);
  return maxBurst;
}

// Helper: Calculate task-type weighted efficiency
function calculateWeeklyEfficiency(completedTasks: TimeEntry[]): number {
  if (completedTasks.length === 0) return 0;

  const TASK_TYPE_EXPECTED_MINUTES: { [key: string]: number } = {
    'Quick Task (5–15 min)': 10,
    'Standard Task (20–45 min)': 32.5,
    'Deep Work Task (1–2 hours)': 90,
    'Long Task (2–4 hours)': 180,
    'Very Long Task (4+ hours)': 300,
  };

  let totalEfficiency = 0;
  let count = 0;

  completedTasks.forEach(task => {
    const taskType = task.task_type || 'Standard Task (20–45 min)';
    const expectedMinutes = TASK_TYPE_EXPECTED_MINUTES[taskType] || 30;
    const actualMinutes = (task.accumulated_seconds || 0) / 60;

    // Fix: Add minimum threshold to prevent skewed results
    if (actualMinutes >= 0.5) { // At least 30 seconds
      const efficiency = (expectedMinutes / actualMinutes) * 100;
      // Fix: Cap between 10% and 200% for realistic range
      totalEfficiency += Math.max(10, Math.min(efficiency, 200));
      count++;
    }
  });

  return count > 0 ? totalEfficiency / count : 0;
}

// Helper: Calculate consistency (variance in daily active time) in EST
function calculateDailyConsistency(entries: TimeEntry[]): number {
  const dailyActiveTimes = new Map<string, number>();

  entries.forEach(entry => {
    // Use EST date key with started_at for accuracy
    const dateKey = getDateKeyEST(new Date(entry.started_at || entry.created_at));

    const activeMinutes = (entry.accumulated_seconds || 0) / 60;
    dailyActiveTimes.set(dateKey, (dailyActiveTimes.get(dateKey) || 0) + activeMinutes);
  });

  const dailyValues = Array.from(dailyActiveTimes.values());

  if (dailyValues.length === 0) return 0;
  if (dailyValues.length === 1) return 100; // Perfect consistency with 1 day

  const mean = dailyValues.reduce((a, b) => a + b, 0) / dailyValues.length;
  const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
  const stdDev = Math.sqrt(variance);

  // consistency = 1 - (stddev / mean)
  const consistency = mean > 0 ? Math.max(0, (1 - (stdDev / mean)) * 100) : 0;

  return consistency;
}

function calculateAvgGoalAccuracy(completedTasks: TimeEntry[]): number {
  const accuracyScores = completedTasks
    .filter(task => 
      task.goal_duration_minutes && 
      typeof task.goal_duration_minutes === 'number' &&
      task.goal_duration_minutes > 0 &&
      task.accumulated_seconds > 0
    )
    .map(task => {
      const goalMinutes = task.goal_duration_minutes!;
      const actualMinutes = (task.accumulated_seconds || 0) / 60;
      
      // Fix: Prevent division by extremely small numbers (< 1 minute)
      if (actualMinutes < 1) return 1; // Treat sub-1-minute tasks as 100% accurate
      
      const ratio = goalMinutes / actualMinutes;
      // Fix: Cap extreme values (0.1x to 10x range is reasonable)
      return Math.max(0.1, Math.min(10, ratio));
    });

  if (accuracyScores.length === 0) return 1;

  return accuracyScores.reduce((a, b) => a + b, 0) / accuracyScores.length;
}

function calculateWeekStreakDays(entries: TimeEntry[]): number {
  const days = groupByDay(entries);
  return days.size;
}

// Removed: getWeekStart is now getWeekStartEST from timezoneUtils

function groupByDay(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const days = new Map<string, TimeEntry[]>();
  
  entries.forEach(entry => {
    // Use EST date key with started_at for accuracy
    const dayKey = getDateKeyEST(new Date(entry.started_at || entry.created_at));
    
    if (!days.has(dayKey)) {
      days.set(dayKey, []);
    }
    days.get(dayKey)!.push(entry);
  });

  return days;
}

// ========================
// PART 2: WEEKLY PROGRESS CARDS (DELTA-BASED)
// ========================
function generateProgressInsights(
  weeklyData: WeekData[],
  allEntries: TimeEntry[],
  metrics: UserMetrics
): ProgressInsight[] {
  const insights: ProgressInsight[] = [];

  if (weeklyData.length < 2) {
    return [{
      type: 'weekly',
      message: "You're building your first full week of data!",
      subtext: "Keep going — your progress story is just beginning.",
      indicator: 'up',
      category: 'growth',
    }];
  }

  const currentWeek = weeklyData[weeklyData.length - 1];
  const previousWeek = weeklyData[weeklyData.length - 2];

  // 📈 Card 1: Task Momentum (delta-based)
  const taskDelta = currentWeek.tasksCompleted - previousWeek.tasksCompleted;
  
  if (taskDelta > 0) {
    insights.push({
      type: 'weekly',
      message: `This week you completed ${taskDelta} more task${taskDelta > 1 ? 's' : ''} than last week — beautiful momentum!`,
      subtext: "Your productivity is naturally expanding.",
      indicator: 'up',
      category: 'growth',
      value: currentWeek.tasksCompleted,
    });
  } else if (taskDelta === 0 && currentWeek.tasksCompleted > 0) {
    insights.push({
      type: 'weekly',
      message: "Your task completion stayed wonderfully consistent this week.",
      subtext: "Steady rhythm is a sign of healthy work patterns.",
      indicator: 'stable',
      category: 'consistency',
      value: currentWeek.tasksCompleted,
    });
  } else if (taskDelta < 0) {
    insights.push({
      type: 'weekly',
      message: "A lighter week can be just as valuable — balance is key.",
      subtext: "Your body and mind need different paces at different times.",
      indicator: 'balanced',
      category: 'consistency',
      value: currentWeek.tasksCompleted,
    });
  }

  // 🎯 Card 2: Focus Improvement (delta-based)
  const focusDelta = currentWeek.focusHours - previousWeek.focusHours;

  if (focusDelta > 0.5) {
    insights.push({
      type: 'weekly',
      message: `Your deep work increased by ${Math.round(focusDelta * 10) / 10} hours this week — strong focus development!`,
      subtext: "More sustained attention leads to deeper work.",
      indicator: 'up',
      category: 'focus',
      trend: 'improving',
    });
  } else if (focusDelta >= -0.5 && focusDelta <= 0.5) {
    insights.push({
      type: 'weekly',
      message: "Your focus hours stayed stable this week — consistent energy.",
      subtext: "Maintaining deep work is a powerful skill.",
      indicator: 'stable',
      category: 'focus',
      trend: 'stable',
    });
  }

  // 🔵 Card 3: Consistency (delta-based)
  const consistencyDelta = currentWeek.consistency - previousWeek.consistency;

  if (consistencyDelta >= 10) {
    insights.push({
      type: 'weekly',
      message: "Your daily work rhythm became more consistent this week — habits forming beautifully!",
      subtext: "This reliability builds strong momentum.",
      indicator: 'up',
      category: 'consistency',
      value: currentWeek.consistency,
      trend: 'improving',
    });
  } else if (consistencyDelta >= -10) {
    insights.push({
      type: 'weekly',
      message: "Your work pattern stayed balanced across the week. Nice flow!",
      subtext: "This steady rhythm is a real strength.",
      indicator: 'stable',
      category: 'consistency',
      value: currentWeek.consistency,
      trend: 'stable',
    });
  }

  // Efficiency trends (tied to Metric 1)
  if (currentWeek.efficiency > previousWeek.efficiency + 5 && currentWeek.efficiency > 0) {
    insights.push({
      type: 'trend',
      message: "Your efficiency is trending upward week over week.",
      subtext: "You're finding your natural flow state more easily.",
      indicator: 'up',
      category: 'momentum',
      trend: 'improving',
    });
  }

  // Multi-week trends (if we have 3+ weeks)
  if (weeklyData.length >= 3) {
    const recentWeeks = weeklyData.slice(-3);

    // Speed improvement trend
    const avgCompletionTimes = recentWeeks.map(w => w.avgCompletionTime).filter(t => t > 0);
    
    if (avgCompletionTimes.length === 3) {
      const isImproving = avgCompletionTimes[0] > avgCompletionTimes[1] && avgCompletionTimes[1] > avgCompletionTimes[2];
      
      if (isImproving) {
        insights.push({
          type: 'trend',
          message: "Your completion time has gently improved over the past three weeks.",
          subtext: "Consistent progress builds sustainable momentum.",
          indicator: 'up',
          category: 'speed',
          trend: 'improving',
        });
      }
    }

    // Consistency trend
    const consistencyScores = recentWeeks.map(w => w.consistency);
    const avgConsistency = consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length;
    
    if (avgConsistency >= 75) {
      insights.push({
        type: 'trend',
        message: "Your consistency score has been rising steadily. Great work!",
        subtext: "This reliability is building strong habits.",
        indicator: 'stable',
        category: 'consistency',
        trend: 'stable',
      });
    }
  }

  return insights.slice(0, 6); // Return top 6 insights
}

// ========================
// PART 3: STREAK HISTORY (WORKDAY-BASED, 30 MIN THRESHOLD)
// ========================
function analyzeStreakHistory(
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): StreakEvent[] {
  if (entries.length === 0) return [];

  // Group entries by day (EST) and calculate total active time per day
  const dailyActiveTime = new Map<string, number>();
  
  entries.forEach(entry => {
    // Use EST date key for workday grouping - using started_at for accuracy
    const dateKey = getDateKeyEST(new Date(entry.started_at || entry.created_at));
    const activeMinutes = (entry.accumulated_seconds || 0) / 60;
    dailyActiveTime.set(dateKey, (dailyActiveTime.get(dateKey) || 0) + activeMinutes);
  });

  // Filter workdays with ≥30 minutes of activity
  const workdays = Array.from(dailyActiveTime.entries())
    .filter(([_, minutes]) => minutes >= 30)
    .map(([dateKey, _]) => dateKey)
    .sort();

  if (workdays.length === 0) return [];

  const streakEvents: StreakEvent[] = [];
  let currentStreakStart = workdays[0];
  let currentStreakEnd = workdays[0];
  let currentStreakLength = 1;

  for (let i = 1; i < workdays.length; i++) {
    const prevDate = new Date(workdays[i - 1]);
    const currDate = new Date(workdays[i]);
    
    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Allow up to 3 days gap (weekends or single day off)
    if (diffDays <= 3) {
      currentStreakLength++;
      currentStreakEnd = workdays[i];
    } else {
      // Streak broken
      if (currentStreakLength >= 2) {
        const streakData = calculateStreakMetrics(
          currentStreakStart,
          currentStreakEnd,
          entries,
          moodEntries,
          energyEntries
        );

        let resetReason = '';
        if (diffDays <= 5) {
          resetReason = 'A few days off — totally normal for weekends or rest.';
        } else if (diffDays <= 7) {
          resetReason = 'Week-long break — welcome back! Fresh starts build new momentum.';
        } else {
          resetReason = 'Extended break — you bounced back beautifully.';
        }

        streakEvents.push({
          streakLength: currentStreakLength,
          startDate: new Date(currentStreakStart),
          endDate: new Date(currentStreakEnd),
          resetReason,
          isCurrent: false,
          ...streakData,
        });
      }

      currentStreakStart = workdays[i];
      currentStreakEnd = workdays[i];
      currentStreakLength = 1;
    }
  }

  // Check if current streak is still active (within last 2 days)
  const lastWorkday = new Date(workdays[workdays.length - 1]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSinceLastWorkday = Math.round((today.getTime() - lastWorkday.getTime()) / (1000 * 60 * 60 * 24));

  const isCurrentStreakActive = daysSinceLastWorkday <= 2;

  // Add final streak
  if (currentStreakLength >= 2) {
    const streakData = calculateStreakMetrics(
      currentStreakStart,
      currentStreakEnd,
      entries,
      moodEntries,
      energyEntries
    );

    streakEvents.push({
      streakLength: currentStreakLength,
      startDate: new Date(currentStreakStart),
      endDate: new Date(currentStreakEnd),
      resetReason: undefined,
      isCurrent: isCurrentStreakActive,
      ...streakData,
    });
  }

  return streakEvents.reverse();
}

function calculateStreakMetrics(
  startDateKey: string,
  endDateKey: string,
  entries: TimeEntry[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): {
  avgMood?: number;
  avgEnergy?: number;
  estimationAccuracy?: number;
  dominantTaskType?: string;
  momentumTrend?: string;
} {
  // Use EST timezone utilities for date boundaries
  const startDate = dateKeyToESTStart(startDateKey);
  const endDate = dateKeyToESTEnd(endDateKey);

  // Filter entries in streak range (comparing UTC timestamps)
  const streakEntries = entries.filter(e => {
    const entryDate = new Date(e.started_at || e.created_at);
    return entryDate >= startDate && entryDate <= endDate;
  });

  // Calculate mood (using inclusive date range)
  const streakMoods = moodEntries?.filter(m => {
    const moodDate = new Date(m.timestamp);
    return moodDate >= startDate && moodDate <= endDate;
  }) || [];

  const avgMood = streakMoods.length > 0
    ? streakMoods.reduce((sum, m) => sum + moodToNumber(m.mood_level), 0) / streakMoods.length
    : undefined;

  // Calculate energy (using inclusive date range)
  const streakEnergy = energyEntries?.filter(e => {
    const energyDate = new Date(e.timestamp);
    return energyDate >= startDate && energyDate <= endDate;
  }) || [];

  const avgEnergy = streakEnergy.length > 0
    ? streakEnergy.reduce((sum, e) => sum + energyToNumber(e.energy_level), 0) / streakEnergy.length
    : undefined;

  // Calculate estimation accuracy
  const tasksWithGoals = streakEntries.filter(e => 
    e.goal_duration_minutes && 
    e.goal_duration_minutes > 0 &&
    e.accumulated_seconds > 0
  );

  const estimationAccuracy = tasksWithGoals.length > 0
    ? tasksWithGoals.reduce((sum, e) => {
        const goalMinutes = e.goal_duration_minutes!;
        const actualMinutes = (e.accumulated_seconds || 0) / 60;
        
        // Fix: Prevent division by extremely small numbers
        if (actualMinutes < 1) return sum + 1;
        
        const ratio = goalMinutes / actualMinutes;
        // Fix: Cap extreme values
        return sum + Math.max(0.1, Math.min(10, ratio));
      }, 0) / tasksWithGoals.length
    : undefined;

  // Find dominant task type
  const taskTypeCounts = new Map<string, number>();
  streakEntries.forEach(e => {
    if (e.task_type) {
      taskTypeCounts.set(e.task_type, (taskTypeCounts.get(e.task_type) || 0) + 1);
    }
  });

  const dominantTaskType = taskTypeCounts.size > 0
    ? Array.from(taskTypeCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : undefined;

  // Calculate momentum trend
  const dailyTasks = groupByDay(streakEntries);
  const taskCounts = Array.from(dailyTasks.values()).map(tasks => tasks.length);
  
  // Fix: Better momentum detection for short streaks
  let momentumTrend = 'Stable';
  if (taskCounts.length >= 3) {
    const isIncreasing = taskCounts[taskCounts.length - 1] > taskCounts[0];
    momentumTrend = isIncreasing ? 'Growing' : 'Stable';
  } else if (taskCounts.length === 2) {
    const isIncreasing = taskCounts[1] > taskCounts[0];
    momentumTrend = isIncreasing ? 'Growing' : 'Stable';
  }

  return {
    avgMood,
    avgEnergy,
    estimationAccuracy,
    dominantTaskType,
    momentumTrend,
  };
}

// ========================
// PART 4: MONTHLY GROWTH SUMMARIES
// ========================
function generateMonthlyGrowth(
  allEntries: TimeEntry[],
  weeklyData: WeekData[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): MonthlyGrowth | null {
  // ✅ Reduced requirement: Show even with 1+ weeks of data
  if (weeklyData.length < 1) {
    return null; // Need at least 1 week for monthly data
  }

  // Get entries from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0); // Fix: Normalize to start of day

  const monthEntries = allEntries.filter(e => new Date(e.started_at || e.created_at) >= thirtyDaysAgo);
  const completedMonthEntries = monthEntries.filter(e => e.ended_at);

  if (completedMonthEntries.length === 0) {
    return null;
  }

  // Total tasks completed
  const totalTasks = completedMonthEntries.length;

  // ✨ Calculate ALL 9 CORE METRICS from weekly data (accumulated/averaged)
  // Average all 9 metrics across available weeks
  const avgEfficiency = weeklyData.reduce((sum, w) => sum + w.efficiency, 0) / weeklyData.length;
  const avgCompletion = weeklyData.reduce((sum, w) => sum + w.completion, 0) / weeklyData.length;
  const avgFocusScore = weeklyData.reduce((sum, w) => sum + w.focusScore, 0) / weeklyData.length;
  const avgVelocity = weeklyData.reduce((sum, w) => sum + w.velocity, 0) / weeklyData.length;
  const avgRhythm = weeklyData.reduce((sum, w) => sum + w.rhythm, 0) / weeklyData.length;
  const avgEnergy = weeklyData.reduce((sum, w) => sum + w.energy, 0) / weeklyData.length;
  const avgUtilization = weeklyData.reduce((sum, w) => sum + w.utilization, 0) / weeklyData.length;
  const avgMomentum = weeklyData.reduce((sum, w) => sum + w.momentum, 0) / weeklyData.length;
  const avgConsistency = weeklyData.reduce((sum, w) => sum + w.consistency, 0) / weeklyData.length;

  // Total deep work hours
  const totalDeepWorkHours = calculateDeepWorkBlocks(monthEntries) / 60;

  // Best task type (most completed)
  const taskTypeCounts = new Map<string, number>();
  completedMonthEntries.forEach(e => {
    if (e.task_type) {
      taskTypeCounts.set(e.task_type, (taskTypeCounts.get(e.task_type) || 0) + 1);
    }
  });
  const bestTaskType = taskTypeCounts.size > 0
    ? Array.from(taskTypeCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : 'Standard tasks';

  // Most productive day of week
  const dayOfWeekCounts = new Map<number, number>();
  completedMonthEntries.forEach(e => {
    const dayOfWeek = new Date(e.started_at || e.created_at).getDay();
    dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + 1);
  });
  const mostProductiveDayNum = dayOfWeekCounts.size > 0
    ? Array.from(dayOfWeekCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : 1;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mostProductiveDayOfWeek = dayNames[mostProductiveDayNum];

  // Avg mood
  const monthMoods = moodEntries?.filter(m => new Date(m.timestamp) >= thirtyDaysAgo) || [];
  const avgMood = monthMoods.length > 0
    ? monthMoods.reduce((sum, m) => sum + moodToNumber(m.mood_level), 0) / monthMoods.length
    : 3;

  // Avg energy check-in level
  const monthEnergy = energyEntries?.filter(e => new Date(e.timestamp) >= thirtyDaysAgo) || [];
  const avgEnergyLevel = monthEnergy.length > 0
    ? monthEnergy.reduce((sum, e) => sum + energyToNumber(e.energy_level), 0) / monthEnergy.length
    : 3;

  // Estimation accuracy trend
  const tasksWithGoals = completedMonthEntries.filter(e => 
    e.goal_duration_minutes && 
    e.goal_duration_minutes > 0 &&
    e.accumulated_seconds > 0
  );
  const estimationAccuracyTrend = tasksWithGoals.length > 0
    ? tasksWithGoals.reduce((sum, e) => {
        const goalMinutes = e.goal_duration_minutes!;
        const actualMinutes = (e.accumulated_seconds || 0) / 60;
        
        // Fix: Prevent division by extremely small numbers
        if (actualMinutes < 1) return sum + 1;
        
        const ratio = goalMinutes / actualMinutes;
        // Fix: Cap extreme values
        return sum + Math.max(0.1, Math.min(10, ratio));
      }, 0) / tasksWithGoals.length
    : 1;

  // Category distribution
  const categoryMap = new Map<string, number>();
  completedMonthEntries.forEach(e => {
    if (e.task_categories && e.task_categories.length > 0) {
      e.task_categories.forEach(cat => {
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
      });
    }
  });
  const categoryDistribution = Array.from(categoryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalTasks) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Weekly consistency graph (last 4 weeks)
  const weeklyConsistencyGraph = weeklyData.slice(-4).map((week, index) => ({
    week: index + 1,
    consistency: week.consistency,
  }));

  // Generate insights
  const insights: ProgressInsight[] = [];

  // Deep work growth
  if (totalDeepWorkHours > 5) {
    insights.push({
      type: 'monthly',
      message: `Your deep work reached ${Math.round(totalDeepWorkHours)} hours this month — strong focus development!`,
      subtext: "Sustained concentration is building real expertise.",
      indicator: 'up',
      category: 'focus',
      trend: 'improving',
    });
  }

  // Best category
  if (categoryDistribution.length > 0) {
    const topCategory = categoryDistribution[0];
    insights.push({
      type: 'monthly',
      message: `${topCategory.category} tasks were your primary focus this month (${topCategory.percentage}%).`,
      subtext: "This concentration helps build deep skills.",
      indicator: 'stable',
      category: 'focus',
      trend: 'stable',
    });
  }

  // Consistency (already calculated at top from weeklyData)
  if (avgConsistency >= 70) {
    insights.push({
      type: 'monthly',
      message: "Consistency stayed strong all month — habits forming beautifully.",
      subtext: "This reliability is your secret weapon.",
      indicator: 'stable',
      category: 'consistency',
      trend: 'stable',
    });
  }

  // Efficiency
  if (avgEfficiency >= 75) {
    insights.push({
      type: 'monthly',
      message: "Your efficiency remained high throughout the month — excellent time management!",
      subtext: "You're matching work to the right timeframes.",
      indicator: 'stable',
      category: 'speed',
      trend: 'stable',
    });
  }

  // 🎯 PRIORITY ANALYSIS

  // Priority distribution
  const priorityMap = new Map<string, number>();
  completedMonthEntries.forEach(e => {
    if (e.task_priority) {
      priorityMap.set(e.task_priority, (priorityMap.get(e.task_priority) || 0) + 1);
    }
  });
  const priorityDistribution = Array.from(priorityMap.entries())
    .map(([priority, count]) => ({
      priority,
      count,
      percentage: Math.round((count / totalTasks) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Priority accuracy (estimation accuracy by priority)
  const priorityAccuracy: Record<string, number> = {};
  completedMonthEntries.forEach(e => {
    if (e.task_priority && e.goal_duration_minutes && e.accumulated_seconds) {
      const priority = e.task_priority;
      const goalMinutes = e.goal_duration_minutes;
      const actualMinutes = e.accumulated_seconds / 60;
      
      if (actualMinutes >= 1) {
        const ratio = goalMinutes / actualMinutes;
        if (!priorityAccuracy[priority]) {
          priorityAccuracy[priority] = 0;
        }
        priorityAccuracy[priority] += Math.max(0.1, Math.min(10, ratio));
      }
    }
  });

  // Average the accuracy scores
  Object.keys(priorityAccuracy).forEach(p => {
    const count = priorityMap.get(p) || 1;
    priorityAccuracy[p] = Math.round((priorityAccuracy[p] / count) * 100);
  });

  // Long-term vs short-term balance
  const shortTerm = (priorityMap.get('Immediate Impact Task') || 0) + (priorityMap.get('Daily Task') || 0);
  const longTerm = (priorityMap.get('Monthly Task') || 0) + (priorityMap.get('Evergreen Task') || 0);
  const longTermVsShortTermBalance = { shortTerm, longTerm };

  // Trigger and Evergreen patterns
  const trigger = priorityMap.get('Trigger Task') || 0;
  const evergreen = priorityMap.get('Evergreen Task') || 0;
  const triggerAndEvergreenPatterns = { trigger, evergreen };

  // Priority insights
  if (priorityDistribution.length > 0) {
    const topPriority = priorityDistribution[0];
    insights.push({
      type: 'monthly',
      message: `Your primary focus was ${topPriority.priority} (${topPriority.percentage}%) — ${
        topPriority.priority === 'Immediate Impact Task' ? 'high-urgency execution' :
        topPriority.priority === 'Daily Task' ? 'strong daily rhythm' :
        topPriority.priority === 'Weekly Task' ? 'balanced weekly planning' :
        topPriority.priority === 'Monthly Task' ? 'long-term strategic work' :
        topPriority.priority === 'Evergreen Task' ? 'sustainable ongoing tasks' :
        'responsive trigger-based work'
      }.`,
      subtext: "Your priority mix reflects your natural workflow.",
      indicator: 'stable',
      category: 'focus',
      trend: 'stable',
    });
  }

  if (longTermVsShortTermBalance.longTerm < longTermVsShortTermBalance.shortTerm * 0.2 && totalTasks > 20) {
    insights.push({
      type: 'monthly',
      message: "Most of your work was short-term priorities — consider scheduling more long-term tasks.",
      subtext: "A balanced mix helps build sustainable progress.",
      indicator: 'stable',
      category: 'balance',
      trend: 'stable',
    });
  }

  return {
    totalTasks,
    
    // ✨ ALL 9 CORE METRICS (averaged from weekly data)
    avgEfficiency: Math.round(avgEfficiency),
    avgCompletion: Math.round(avgCompletion),
    avgFocusScore: Math.round(avgFocusScore),
    avgVelocity: Math.round(avgVelocity),
    avgRhythm: Math.round(avgRhythm),
    avgEnergy: Math.round(avgEnergy),
    avgUtilization: Math.round(avgUtilization),
    avgMomentum: Math.round(avgMomentum),
    avgConsistency: Math.round(avgConsistency),
    
    totalDeepWorkHours: Math.round(totalDeepWorkHours * 10) / 10,
    bestTaskType,
    mostProductiveDayOfWeek,
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergyLevel: Math.round(avgEnergyLevel * 10) / 10,
    estimationAccuracyTrend: Math.round(estimationAccuracyTrend * 100),
    categoryDistribution,
    weeklyConsistencyGraph,
    insights,
    // 🎯 Priority metrics
    priorityDistribution,
    priorityAccuracy,
    longTermVsShortTermBalance,
    triggerAndEvergreenPatterns,
  };
}

// ========================
// HELPER FUNCTIONS
// ========================
function moodToNumber(mood: string): number {
  const moodMap: { [key: string]: number } = {
    '😊': 5,
    '😐': 3,
    '😣': 2,
    '🥱': 2,
    '🔥': 5,
  };
  return moodMap[mood] || 3;
}

function energyToNumber(energy: string): number {
  const energyMap: { [key: string]: number } = {
    'High': 5,
    'Medium': 3,
    'Low': 2,
    'Drained': 1,
    'Recharging': 2,
  };
  return energyMap[energy] || 3;
}

export function formatWeekLabel(weekData: WeekData): string {
  const start = weekData.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end = weekData.weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${start} - ${end}`;
}

// ========================
// NEW: ANALYZE PROGRESS USING SNAPSHOTS
// This provides more accurate historical data using pre-calculated metrics
// ========================
interface SmartDARSnapshot {
  snapshot_date: string;
  efficiency_score: number;
  completion_rate: number;
  focus_index: number;
  task_velocity: number;
  work_rhythm: number;
  energy_level: number;
  time_utilization: number;
  productivity_momentum: number;
  consistency_score: number;
  total_tasks: number;
  completed_tasks: number;
  total_active_time: number;
  total_paused_time: number;
  deep_work_blocks: number;
  deep_work_minutes: number;
  avg_mood?: string;
  avg_energy?: string;
  tasks_by_priority?: Record<string, number>;
  points_earned?: number;
  weekday_streak?: number;
}

export function analyzeProgressHistoryWithSnapshots(
  snapshots: SmartDARSnapshot[],
  entries: TimeEntry[],
  metrics: UserMetrics,
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): {
  weeklyData: WeekData[];
  progressInsights: ProgressInsight[];
  streakHistory: StreakEvent[];
  monthlyGrowth: MonthlyGrowth | null;
} {
  console.log('📊 Analyzing progress with', snapshots.length, 'snapshots');
  
  if (!snapshots || snapshots.length < 1) {
    // Fall back to regular analysis if no snapshots
    return analyzeProgressHistory(entries, metrics, moodEntries, energyEntries);
  }

  // Group snapshots by week (Monday-Sunday)
  const snapshotsByWeek: Map<string, SmartDARSnapshot[]> = new Map();
  
  snapshots.forEach(snapshot => {
    const snapshotDate = new Date(snapshot.snapshot_date);
    const weekStart = getWeekStartEST(snapshotDate);
    const weekKey = weekStart.toISOString();
    
    if (!snapshotsByWeek.has(weekKey)) {
      snapshotsByWeek.set(weekKey, []);
    }
    snapshotsByWeek.get(weekKey)!.push(snapshot);
  });

  // Calculate weekly data from snapshots (more accurate than raw entries)
  const weeklyData: WeekData[] = [];
  
  Array.from(snapshotsByWeek.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .forEach(([weekKey, weekSnapshots], index) => {
      const weekStart = new Date(weekKey);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Aggregate snapshot data for the week
      const tasksCompleted = weekSnapshots.reduce((sum, s) => sum + (s.completed_tasks || 0), 0);
      const totalActiveTime = weekSnapshots.reduce((sum, s) => sum + (s.total_active_time || 0), 0);
      const totalPauseTime = weekSnapshots.reduce((sum, s) => sum + (s.total_paused_time || 0), 0);
      const deepWorkBlocks = weekSnapshots.reduce((sum, s) => sum + (s.deep_work_blocks || 0), 0);
      const deepWorkMinutes = weekSnapshots.reduce((sum, s) => sum + (s.deep_work_minutes || 0), 0);

      // Average the metrics across the week's snapshots
      const avgMetric = (field: keyof SmartDARSnapshot) => {
        const values = weekSnapshots.map(s => typeof s[field] === 'number' ? s[field] : 0).filter(v => v > 0);
        return values.length > 0 ? (values as number[]).reduce((a, b) => a + b, 0) / values.length : 0;
      };

      // Calculate mood/energy averages
      let avgMood: number | undefined;
      let avgEnergy: number | undefined;

      const moodValues = weekSnapshots.map(s => s.avg_mood).filter(m => m);
      if (moodValues.length > 0) {
        avgMood = moodValues.reduce((sum, m) => sum + moodToNumber(m!), 0) / moodValues.length;
      }

      const energyValues = weekSnapshots.map(s => s.avg_energy).filter(e => e);
      if (energyValues.length > 0) {
        avgEnergy = energyValues.reduce((sum, e) => sum + energyToNumber(e!), 0) / energyValues.length;
      }

      // Aggregate priority distribution
      const priorityDistribution: Record<string, number> = {};
      weekSnapshots.forEach(s => {
        if (s.tasks_by_priority) {
          Object.entries(s.tasks_by_priority).forEach(([priority, count]) => {
            priorityDistribution[priority] = (priorityDistribution[priority] || 0) + count;
          });
        }
      });

      const mostCompletedPriority = Object.entries(priorityDistribution)
        .sort((a, b) => b[1] - a[1])[0]?.[0];

      const weekData: WeekData = {
        weekNumber: index + 1,
        weekStart,
        weekEnd,
        tasksCompleted,
        avgCompletionTime: tasksCompleted > 0 ? totalActiveTime / tasksCompleted : 0,
        focusHours: deepWorkMinutes / 60,
        pauseTime: totalPauseTime,
        
        // ✨ ALL 9 CORE METRICS (averaged from snapshots - more accurate!)
        efficiency: Math.round(avgMetric('efficiency_score')),
        completion: Math.round(avgMetric('completion_rate')),
        focusScore: Math.round(avgMetric('focus_index')),
        velocity: Math.round(avgMetric('task_velocity')),
        rhythm: Math.round(avgMetric('work_rhythm')),
        energy: Math.round(avgMetric('energy_level')),
        utilization: Math.round(avgMetric('time_utilization')),
        momentum: Math.round(avgMetric('productivity_momentum')),
        consistency: Math.round(avgMetric('consistency_score')),
        
        streakDays: weekSnapshots.length, // Days with snapshots = days worked
        totalActiveMinutes: totalActiveTime / 60,
        deepWorkBlocks,
        quickTaskBursts: 0, // Not tracked in snapshots
        avgGoalAccuracy: 0, // Not tracked in snapshots
        pausesPerHour: 0, // Not tracked in snapshots
        avgMood,
        avgEnergy,
        mostCompletedPriority,
        priorityDistribution,
      };
      
      console.log(`📅 Week ${weekStart.toLocaleDateString()} (from ${weekSnapshots.length} snapshots):`, {
        tasks: tasksCompleted,
        efficiency: weekData.efficiency,
        completion: weekData.completion,
        focusScore: weekData.focusScore,
      });
      
      weeklyData.push(weekData);
    });

  console.log('✅ Total weeks from snapshots:', weeklyData.length);

  // Generate insights from snapshot-based weekly data
  const progressInsights = generateProgressInsights(weeklyData, entries, metrics);

  // For streak history, we still use raw entries as it needs day-by-day analysis
  const streakHistory = analyzeStreakHistory(entries, moodEntries, energyEntries);

  // Generate monthly growth from snapshot-based weekly data
  const monthlyGrowth = generateMonthlyGrowthFromSnapshots(snapshots, weeklyData, moodEntries, energyEntries);

  return {
    weeklyData,
    progressInsights,
    streakHistory,
    monthlyGrowth,
  };
}

// Generate monthly growth summary from snapshots
function generateMonthlyGrowthFromSnapshots(
  snapshots: SmartDARSnapshot[],
  weeklyData: WeekData[],
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): MonthlyGrowth | null {
  if (weeklyData.length < 1) {
    return null;
  }

  // Get snapshots from the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const monthSnapshots = snapshots.filter(s => new Date(s.snapshot_date) >= thirtyDaysAgo);
  
  if (monthSnapshots.length === 0) {
    return null;
  }

  // Total tasks from snapshots
  const totalTasks = monthSnapshots.reduce((sum, s) => sum + (s.completed_tasks || 0), 0);

  // Average all 9 metrics from snapshots (more accurate than calculating from raw entries)
  const avgMetric = (field: keyof SmartDARSnapshot) => {
    const values = monthSnapshots.map(s => typeof s[field] === 'number' ? s[field] : 0).filter(v => v > 0);
    return values.length > 0 ? Math.round((values as number[]).reduce((a, b) => a + b, 0) / values.length) : 0;
  };

  // Deep work hours
  const totalDeepWorkMinutes = monthSnapshots.reduce((sum, s) => sum + (s.deep_work_minutes || 0), 0);
  const totalDeepWorkHours = totalDeepWorkMinutes / 60;

  // Mood and energy from snapshots
  const moodValues = monthSnapshots.map(s => s.avg_mood).filter(m => m);
  const avgMood = moodValues.length > 0
    ? Math.round(moodValues.reduce((sum, m) => sum + moodToNumber(m!), 0) / moodValues.length * 10) / 10
    : 3;

  const energyValues = monthSnapshots.map(s => s.avg_energy).filter(e => e);
  const avgEnergyLevel = energyValues.length > 0
    ? Math.round(energyValues.reduce((sum, e) => sum + energyToNumber(e!), 0) / energyValues.length * 10) / 10
    : 3;

  // Priority distribution from snapshots
  const priorityMap = new Map<string, number>();
  monthSnapshots.forEach(s => {
    if (s.tasks_by_priority) {
      Object.entries(s.tasks_by_priority).forEach(([priority, count]) => {
        priorityMap.set(priority, (priorityMap.get(priority) || 0) + count);
      });
    }
  });
  
  const priorityDistribution = Array.from(priorityMap.entries())
    .map(([priority, count]) => ({
      priority,
      count,
      percentage: Math.round((count / totalTasks) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  // Most productive day of week (from snapshot dates)
  const dayOfWeekCounts = new Map<number, number>();
  monthSnapshots.forEach(s => {
    const dayOfWeek = new Date(s.snapshot_date).getDay();
    dayOfWeekCounts.set(dayOfWeek, (dayOfWeekCounts.get(dayOfWeek) || 0) + (s.completed_tasks || 0));
  });
  const mostProductiveDayNum = dayOfWeekCounts.size > 0
    ? Array.from(dayOfWeekCounts.entries()).sort((a, b) => b[1] - a[1])[0][0]
    : 1;
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const mostProductiveDayOfWeek = dayNames[mostProductiveDayNum];

  // Weekly consistency graph
  const weeklyConsistencyGraph = weeklyData.slice(-4).map((week, index) => ({
    week: index + 1,
    consistency: week.consistency,
  }));

  // Generate insights
  const insights: ProgressInsight[] = [];

  if (totalDeepWorkHours > 5) {
    insights.push({
      type: 'monthly',
      message: `Your deep work reached ${Math.round(totalDeepWorkHours)} hours this month — strong focus development!`,
      subtext: "Sustained concentration is building real expertise.",
      indicator: 'up',
      category: 'focus',
      trend: 'improving',
    });
  }

  const avgEfficiency = avgMetric('efficiency_score');
  if (avgEfficiency >= 75) {
    insights.push({
      type: 'monthly',
      message: "Your efficiency remained high throughout the month — excellent time management!",
      subtext: "You're matching work to the right timeframes.",
      indicator: 'stable',
      category: 'speed',
      trend: 'stable',
    });
  }

  const avgConsistency = avgMetric('consistency_score');
  if (avgConsistency >= 70) {
    insights.push({
      type: 'monthly',
      message: "Consistency stayed strong all month — habits forming beautifully.",
      subtext: "This reliability is your secret weapon.",
      indicator: 'stable',
      category: 'consistency',
      trend: 'stable',
    });
  }

  return {
    totalTasks,
    avgEfficiency,
    avgCompletion: avgMetric('completion_rate'),
    avgFocusScore: avgMetric('focus_index'),
    avgVelocity: avgMetric('task_velocity'),
    avgRhythm: avgMetric('work_rhythm'),
    avgEnergy: avgMetric('energy_level'),
    avgUtilization: avgMetric('time_utilization'),
    avgMomentum: avgMetric('productivity_momentum'),
    avgConsistency,
    totalDeepWorkHours: Math.round(totalDeepWorkHours * 10) / 10,
    bestTaskType: 'Standard tasks', // Not tracked individually in snapshots
    mostProductiveDayOfWeek,
    avgMood,
    avgEnergyLevel,
    estimationAccuracyTrend: 100, // Not tracked in snapshots
    categoryDistribution: [],
    weeklyConsistencyGraph,
    insights,
    priorityDistribution,
    priorityAccuracy: {},
    longTermVsShortTermBalance: { shortTerm: 0, longTerm: 0 },
    triggerAndEvergreenPatterns: { trigger: 0, evergreen: 0 },
  };
}

// Note: moodToNumber and energyToNumber are already defined above in this file
