// 🎯 Smart DAR Points Engine
// Calculates and awards points based on task completion, surveys, streaks, and goals

export interface PointsCalculation {
  totalPoints: number;
  breakdown: PointBreakdown;
  notifications: PointNotification[];
}

export interface PointBreakdown {
  basePoints: number;
  priorityBonus: number;
  focusBonus: number;
  accuracyBonus: number;
  surveyBonus: number;
  enjoymentBonus: number;
  momentumBonus: number;
  priorityCompletionBonus: number;
  dailyGoalBonus: number;
}

export interface PointNotification {
  type: string;
  message: string;
  points: number;
  icon: string;
}

export interface TaskData {
  task_type?: string | null;
  task_priority?: string | null;
  goal_duration_minutes?: number | null;
  accumulated_seconds?: number;
  task_enjoyment?: number | null;
  pause_count?: number;
}

export interface SurveyData {
  moodAnswered: boolean;
  energyAnswered: boolean;
  enjoymentAnswered: boolean;
}

export interface MomentumData {
  quickTasksInBurst: number; // Count of quick tasks completed in last 2 hours
  isUninterruptedDeepWork: boolean; // Deep work with 0 pauses
  hasHighEnjoyment: boolean; // Enjoyment >= 4
}

// ✅ A. BASE POINTS (Task Type)
const TASK_TYPE_POINTS: Record<string, number> = {
  'Quick Task': 3,
  'Standard Task': 5,
  'Deep Work Task': 10,
  'Long Task': 12,
  'Very Long Task': 15,
};

// ✅ B. PRIORITY BONUS
const PRIORITY_BONUS_POINTS: Record<string, number> = {
  'Immediate Impact Task': 5,
  'Daily Task': 3,
  'Weekly Task': 2,
  'Monthly Task': 1,
  'Evergreen Task': 1,
  'Trigger Task': 3,
};

// ✅ C. FOCUS SCORE BONUS
export function calculateFocusBonus(focusScore: number): number {
  if (focusScore >= 90) return 5;
  if (focusScore >= 75) return 3;
  return 0;
}

// ✅ D. ESTIMATION ACCURACY BONUS
export function calculateAccuracyBonus(
  goalMinutes: number,
  actualMinutes: number
): number {
  if (goalMinutes <= 0 || actualMinutes <= 0) return 0;
  
  const diff = Math.abs(actualMinutes - goalMinutes);
  const accuracyPercent = (diff / goalMinutes) * 100;
  
  // Within ±20% of goal
  if (accuracyPercent <= 20) return 3;
  
  return 0;
}

// ✅ E. SURVEY ENGAGEMENT BONUS
export function calculateSurveyBonus(surveys: SurveyData): number {
  let bonus = 0;
  
  if (surveys.moodAnswered) bonus += 2;
  if (surveys.energyAnswered) bonus += 2;
  if (surveys.enjoymentAnswered) bonus += 1;
  
  return bonus;
}

// ✅ F. MOMENTUM BONUS
export function calculateMomentumBonus(momentum: MomentumData): number {
  let bonus = 0;
  
  // Quick burst: 2+ quick tasks in short time
  if (momentum.quickTasksInBurst >= 2) bonus += 3;
  
  // Uninterrupted deep work
  if (momentum.isUninterruptedDeepWork) bonus += 4;
  
  // High enjoyment
  if (momentum.hasHighEnjoyment) bonus += 2;
  
  return bonus;
}

// ✅ G. PRIORITY COMPLETION BONUS
export function calculatePriorityCompletionBonus(priority?: string | null): number {
  if (priority === 'Immediate Impact Task') return 4;
  if (priority === 'Daily Task') return 2;
  return 0;
}

// ✅ H. DAILY GOAL BONUS
export function calculateDailyGoalBonus(
  completedTasks: number,
  dailyGoal?: number
): { bonus: number; status: 'not-set' | 'below' | 'met' | 'exceeded' } {
  if (!dailyGoal || dailyGoal <= 0) {
    return { bonus: 0, status: 'not-set' };
  }
  
  if (completedTasks >= dailyGoal) {
    // Goal exceeded
    if (completedTasks > dailyGoal) {
      return { bonus: 15, status: 'exceeded' };
    }
    // Goal exactly met
    return { bonus: 10, status: 'met' };
  }
  
  // Below goal
  return { bonus: 0, status: 'below' };
}

// ✅ MAIN POINTS CALCULATION FUNCTION
export function calculateTaskPoints(
  task: TaskData,
  focusScore: number,
  surveys: SurveyData,
  momentum: MomentumData
): PointsCalculation {
  const breakdown: PointBreakdown = {
    basePoints: 0,
    priorityBonus: 0,
    focusBonus: 0,
    accuracyBonus: 0,
    surveyBonus: 0,
    enjoymentBonus: 0,
    momentumBonus: 0,
    priorityCompletionBonus: 0,
    dailyGoalBonus: 0,
  };
  
  const notifications: PointNotification[] = [];
  
  // A. Base Points
  const taskType = task.task_type || 'Standard Task';
  breakdown.basePoints = TASK_TYPE_POINTS[taskType] || 5;
  
  // B. Priority Bonus
  const priority = task.task_priority || 'Daily Task';
  breakdown.priorityBonus = PRIORITY_BONUS_POINTS[priority] || 0;
  
  // C. Focus Bonus
  breakdown.focusBonus = calculateFocusBonus(focusScore);
  if (breakdown.focusBonus > 0) {
    notifications.push({
      type: 'focus',
      message: focusScore >= 90 ? '💡 Exceptional Focus! +5 points' : '💡 Great Focus! +3 points',
      points: breakdown.focusBonus,
      icon: '💡',
    });
  }
  
  // D. Accuracy Bonus
  const actualMinutes = (task.accumulated_seconds || 0) / 60;
  breakdown.accuracyBonus = calculateAccuracyBonus(
    task.goal_duration_minutes || 0,
    actualMinutes
  );
  if (breakdown.accuracyBonus > 0) {
    notifications.push({
      type: 'accuracy',
      message: '⏱️ Right on Time! +3 points',
      points: breakdown.accuracyBonus,
      icon: '⏱️',
    });
  }
  
  // E. Survey Bonus
  breakdown.surveyBonus = calculateSurveyBonus(surveys);
  if (surveys.moodAnswered || surveys.energyAnswered) {
    notifications.push({
      type: 'survey',
      message: '😊 Thanks for checking in! +' + breakdown.surveyBonus + ' points',
      points: breakdown.surveyBonus,
      icon: '😊',
    });
  }
  
  // F. Enjoyment Bonus
  if (task.task_enjoyment && task.task_enjoyment >= 4) {
    breakdown.enjoymentBonus = 2;
  }
  
  // G. Momentum Bonus
  breakdown.momentumBonus = calculateMomentumBonus(momentum);
  if (momentum.quickTasksInBurst >= 2) {
    notifications.push({
      type: 'momentum',
      message: '⚡ Momentum Boost! +3 points',
      points: 3,
      icon: '⚡',
    });
  }
  if (momentum.isUninterruptedDeepWork) {
    notifications.push({
      type: 'deepwork',
      message: '🧠 Deep Work Flow! +4 points',
      points: 4,
      icon: '🧠',
    });
  }
  
  // H. Priority Completion Bonus
  breakdown.priorityCompletionBonus = calculatePriorityCompletionBonus(priority);
  if (breakdown.priorityCompletionBonus > 0) {
    notifications.push({
      type: 'priority',
      message: '🔥 Priority Task Completed! +' + breakdown.priorityCompletionBonus + ' points',
      points: breakdown.priorityCompletionBonus,
      icon: '🔥',
    });
  }
  
  // Calculate total
  const totalPoints = 
    breakdown.basePoints +
    breakdown.priorityBonus +
    breakdown.focusBonus +
    breakdown.accuracyBonus +
    breakdown.surveyBonus +
    breakdown.enjoymentBonus +
    breakdown.momentumBonus +
    breakdown.priorityCompletionBonus +
    breakdown.dailyGoalBonus;
  
  // Add main completion notification
  notifications.unshift({
    type: 'completion',
    message: `🎉 You earned +${totalPoints} points!`,
    points: totalPoints,
    icon: '🎉',
  });
  
  return {
    totalPoints,
    breakdown,
    notifications,
  };
}

// ✅ H. DAILY TASK GOAL BONUS
export function calculateDailyGoalBonus(
  completedTasks: number,
  dailyGoal: number
): { points: number; notification: PointNotification | null } {
  if (dailyGoal <= 0) return { points: 0, notification: null };
  
  if (completedTasks > dailyGoal) {
    return {
      points: 15,
      notification: {
        type: 'goal_exceeded',
        message: '🏆 You beat your task goal! +15 points',
        points: 15,
        icon: '🏆',
      },
    };
  }
  
  if (completedTasks >= dailyGoal) {
    return {
      points: 10,
      notification: {
        type: 'goal_achieved',
        message: '✨ Daily Task Goal Achieved! +10 points',
        points: 10,
        icon: '✨',
      },
    };
  }
  
  return { points: 0, notification: null };
}

// ✅ I. STREAK BONUSES
export function calculateStreakBonus(
  dailyStreak: number,
  weeklyStreak: number,
  isWeeklyStreakComplete: boolean
): { points: number; notifications: PointNotification[] } {
  const notifications: PointNotification[] = [];
  let points = 0;
  
  // Daily streak bonus (Mon-Fri only)
  if (dailyStreak > 0) {
    points += 5;
    notifications.push({
      type: 'daily_streak',
      message: `🔥 Daily Streak! +5 points (${dailyStreak} days)`,
      points: 5,
      icon: '🔥',
    });
  }
  
  // Weekly streak bonus (awarded Monday on login)
  if (isWeeklyStreakComplete) {
    points += 20;
    notifications.push({
      type: 'weekly_streak',
      message: '🌟 Weekly Streak Completed! +20 points',
      points: 20,
      icon: '🌟',
    });
  }
  
  return { points, notifications };
}

// ✅ HELPER: Calculate Focus Score for Task
export function calculateTaskFocusScore(
  taskType: string,
  taskPriority: string,
  pauseCount: number,
  enjoyment: number
): number {
  // Base allowed pauses by task type
  const BASE_ALLOWED_PAUSES: Record<string, number> = {
    'Quick Task': 0,
    'Standard Task': 1,
    'Deep Work Task': 2,
    'Long Task': 2,
    'Very Long Task': 3,
  };
  
  let allowedPauses = BASE_ALLOWED_PAUSES[taskType] || 1;
  
  // Priority adjustment
  if (taskPriority === 'Immediate Impact Task' || taskPriority === 'Daily Task') {
    allowedPauses = Math.max(0, allowedPauses - 1); // Stricter
  }
  if (taskPriority === 'Evergreen Task' || taskPriority === 'Monthly Task') {
    allowedPauses += 1; // More lenient
  }
  
  // Calculate focus score
  let focusScore = 1.0;
  
  if (pauseCount <= allowedPauses) {
    focusScore = 1.0;
  } else {
    const excess = pauseCount - allowedPauses;
    focusScore = Math.max(0, 1.0 - (excess * 0.2));
  }
  
  // Enjoyment boost
  if (enjoyment >= 4) {
    focusScore *= 1.1;
  }
  
  focusScore = Math.min(focusScore, 1.0);
  
  return Math.round(focusScore * 100);
}

// ✅ HELPER: Detect Quick Task Burst
export function detectQuickTaskBurst(
  recentTasks: Array<{ completed_at: string; task_type: string }>,
  currentTime: Date = new Date()
): number {
  const twoHoursAgo = new Date(currentTime.getTime() - 2 * 60 * 60 * 1000);
  
  return recentTasks.filter(task => {
    const completedAt = new Date(task.completed_at);
    return (
      task.task_type === 'Quick Task' &&
      completedAt >= twoHoursAgo &&
      completedAt <= currentTime
    );
  }).length;
}

// ✅ HELPER: Format Points for Display
export function formatPoints(points: number): string {
  if (points >= 1000000) {
    return (points / 1000000).toFixed(1) + 'M';
  }
  if (points >= 1000) {
    return (points / 1000).toFixed(1) + 'K';
  }
  return points.toString();
}

// ✅ HELPER: Get Points Breakdown Text
export function getPointsBreakdownText(breakdown: PointBreakdown): string[] {
  const lines: string[] = [];
  
  if (breakdown.basePoints > 0) {
    lines.push(`Base: +${breakdown.basePoints}`);
  }
  if (breakdown.priorityBonus > 0) {
    lines.push(`Priority: +${breakdown.priorityBonus}`);
  }
  if (breakdown.focusBonus > 0) {
    lines.push(`Focus: +${breakdown.focusBonus}`);
  }
  if (breakdown.accuracyBonus > 0) {
    lines.push(`Accuracy: +${breakdown.accuracyBonus}`);
  }
  if (breakdown.surveyBonus > 0) {
    lines.push(`Surveys: +${breakdown.surveyBonus}`);
  }
  if (breakdown.enjoymentBonus > 0) {
    lines.push(`Enjoyment: +${breakdown.enjoymentBonus}`);
  }
  if (breakdown.momentumBonus > 0) {
    lines.push(`Momentum: +${breakdown.momentumBonus}`);
  }
  if (breakdown.priorityCompletionBonus > 0) {
    lines.push(`Priority Complete: +${breakdown.priorityCompletionBonus}`);
  }
  
  return lines;
}

