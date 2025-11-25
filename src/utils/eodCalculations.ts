/**
 * 🌈 EOD Calculations Utility
 * Helper functions for shift goals, rounding, and utilization calculations
 * Used by EOD History page, View Details modal, and EOD Email
 */

/**
 * Custom rounding rule for hours
 * Examples:
 * - 8.35h → 8h
 * - 8.7h → 9h
 * - 7.5h → 8h (standard rounding)
 */
export function roundHours(hours: number): number {
  return Math.round(hours);
}

/**
 * Format hours and minutes from total minutes
 * Example: 485 minutes → "8h 5m"
 */
export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hrs === 0) {
    return `${mins}m`;
  }
  if (mins === 0) {
    return `${hrs}h`;
  }
  return `${hrs}h ${mins}m`;
}

/**
 * Format hours from decimal
 * Example: 8.5 → "8h 30m"
 */
export function formatHoursDecimal(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  return formatDuration(totalMinutes);
}

/**
 * Calculate shift duration in hours from clock-in/out times
 */
export function calculateShiftDuration(clockedInAt: string | null, clockedOutAt: string | null): number {
  if (!clockedInAt || !clockedOutAt) return 0;
  
  const start = new Date(clockedInAt);
  const end = new Date(clockedOutAt);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.max(0, diffHours); // Ensure non-negative
}

/**
 * Calculate total active task time from accumulated seconds
 */
export function calculateActiveTaskHours(accumulatedSeconds: number): number {
  return accumulatedSeconds / 3600;
}

/**
 * Generate utilization summary text
 * Example: "You spent 6 of 7 hours actively working."
 */
export function generateUtilizationText(
  activeTaskHours: number,
  actualShiftHours: number,
  roundedActiveHours: number,
  roundedShiftHours: number
): string {
  if (actualShiftHours === 0) {
    return "No shift data available.";
  }
  
  if (activeTaskHours === 0) {
    return "No active task time recorded.";
  }
  
  // Use rounded values for friendly text
  if (roundedActiveHours === roundedShiftHours) {
    return `You spent all ${roundedShiftHours}h actively working on tasks. 🎯`;
  }
  
  return `You spent ${roundedActiveHours}h out of ${roundedShiftHours}h actively working.`;
}

/**
 * Generate shift plan accuracy text
 * Example: "You planned 8h, you worked 7h."
 */
export function generateShiftPlanText(
  plannedShiftMinutes: number | null,
  actualShiftHours: number
): string {
  if (!plannedShiftMinutes || plannedShiftMinutes === 0) {
    return "No shift goal was set.";
  }
  
  const plannedHours = Math.round(plannedShiftMinutes / 60);
  const actualRounded = roundHours(actualShiftHours);
  
  if (plannedHours === actualRounded) {
    return `You planned ${plannedHours}h and worked exactly ${actualRounded}h. Perfect! ✨`;
  } else if (actualRounded > plannedHours) {
    return `You planned ${plannedHours}h, you worked ${actualRounded}h. Great dedication! 💪`;
  } else {
    return `You planned ${plannedHours}h, you worked ${actualRounded}h.`;
  }
}

/**
 * Check if daily task goal was achieved
 */
export function checkDailyGoalAchieved(
  plannedTaskGoal: number | null,
  actualTasksCompleted: number
): {
  achieved: boolean;
  text: string;
} {
  if (!plannedTaskGoal || plannedTaskGoal === 0) {
    return {
      achieved: false,
      text: "No task goal was set."
    };
  }
  
  if (actualTasksCompleted >= plannedTaskGoal) {
    return {
      achieved: true,
      text: `Goal Achieved! ${actualTasksCompleted}/${plannedTaskGoal} tasks ✅`
    };
  } else {
    return {
      achieved: false,
      text: `${actualTasksCompleted}/${plannedTaskGoal} tasks completed`
    };
  }
}

/**
 * Interface for shift goal data
 */
export interface ShiftGoalData {
  plannedShiftMinutes: number | null;
  dailyTaskGoal: number | null;
}

/**
 * Interface for shift summary data
 */
export interface ShiftSummaryData {
  clockedInAt: string | null;
  clockedOutAt: string | null;
  actualShiftHours: number;
  roundedShiftHours: number;
  activeTaskHours: number;
  roundedActiveTaskHours: number;
  utilizationText: string;
  shiftPlanText: string;
}

