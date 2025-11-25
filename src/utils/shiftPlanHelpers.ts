// 🎯 Shift Plan & Task Goal Helper Functions
// Safe utility functions for shift plan and task goal integrations

export interface ShiftPlanData {
  planned_shift_minutes?: number;
  actual_shift_minutes?: number;
  clocked_in_at?: string;
  clocked_out_at?: string;
  daily_task_goal?: number;
}

export interface ShiftPlanAccuracy {
  accuracy: number; // 0-1
  accuracyPercent: number; // 0-100
  status: 'excellent' | 'good' | 'fair' | 'needs-improvement';
}

// ✅ Calculate Shift Plan Accuracy
export function calculateShiftPlanAccuracy(
  plannedMinutes: number,
  actualMinutes: number
): ShiftPlanAccuracy {
  if (plannedMinutes <= 0 || actualMinutes <= 0) {
    return { accuracy: 0, accuracyPercent: 0, status: 'needs-improvement' };
  }
  
  // Fair calculation: min(planned/actual, actual/planned)
  const accuracy = Math.min(
    plannedMinutes / actualMinutes,
    actualMinutes / plannedMinutes
  );
  
  const accuracyPercent = Math.round(accuracy * 100);
  
  let status: 'excellent' | 'good' | 'fair' | 'needs-improvement' = 'needs-improvement';
  if (accuracyPercent >= 90) status = 'excellent';
  else if (accuracyPercent >= 75) status = 'good';
  else if (accuracyPercent >= 60) status = 'fair';
  
  return { accuracy, accuracyPercent, status };
}

// ✅ Format Shift Duration for Display
export function formatShiftDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// ✅ Calculate Actual Shift Duration
export function calculateActualShiftDuration(
  clockInTime: string,
  clockOutTime: string
): number {
  const start = new Date(clockInTime).getTime();
  const end = new Date(clockOutTime).getTime();
  return Math.floor((end - start) / (1000 * 60)); // minutes
}

// ✅ Get Daily Goal Status
export function getDailyGoalStatus(
  completedTasks: number,
  dailyGoal?: number
): { status: 'not-set' | 'below' | 'met' | 'exceeded'; percentage: number; message: string } {
  if (!dailyGoal || dailyGoal <= 0) {
    return {
      status: 'not-set',
      percentage: 0,
      message: 'No goal set'
    };
  }
  
  const percentage = Math.round((completedTasks / dailyGoal) * 100);
  
  if (completedTasks >= dailyGoal) {
    return {
      status: completedTasks > dailyGoal ? 'exceeded' : 'met',
      percentage: Math.min(percentage, 200),
      message: completedTasks > dailyGoal 
        ? `Goal exceeded! ${completedTasks}/${dailyGoal} tasks`
        : `Goal met! ${completedTasks}/${dailyGoal} tasks`
    };
  }
  
  return {
    status: 'below',
    percentage,
    message: `${completedTasks}/${dailyGoal} tasks (${percentage}%)`
  };
}

// ✅ Check if Shift Qualifies for Streak
// A shift counts toward streak if:
// 1. User clocked in
// 2. Planned shift was set
// 3. At least some work was done
export function doesShiftQualifyForStreak(shiftData: ShiftPlanData): boolean {
  // Must have planned shift
  if (!shiftData.planned_shift_minutes || shiftData.planned_shift_minutes <= 0) {
    return false;
  }
  
  // Must have clocked in
  if (!shiftData.clocked_in_at) {
    return false;
  }
  
  // If clocked out, must have worked at least 30 minutes
  if (shiftData.clocked_out_at && shiftData.actual_shift_minutes) {
    return shiftData.actual_shift_minutes >= 30;
  }
  
  // If still clocked in, assume it qualifies
  return true;
}

// ✅ Segment Day by Shift (for Energy & Rhythm)
export interface DaySegment {
  name: 'morning' | 'midday' | 'afternoon' | 'evening';
  startHour: number;
  endHour: number;
}

export function getShiftSegment(timestamp: string): DaySegment {
  const hour = new Date(timestamp).getHours();
  
  if (hour >= 6 && hour < 12) {
    return { name: 'morning', startHour: 6, endHour: 12 };
  } else if (hour >= 12 && hour < 15) {
    return { name: 'midday', startHour: 12, endHour: 15 };
  } else if (hour >= 15 && hour < 18) {
    return { name: 'afternoon', startHour: 15, endHour: 18 };
  } else {
    return { name: 'evening', startHour: 18, endHour: 24 };
  }
}

// ✅ Generate Shift Summary for EOD Reports
export interface ShiftSummary {
  plannedShift: string;
  actualShift: string;
  roundedShift: string;
  accuracy: ShiftPlanAccuracy;
  taskGoal: string;
  goalStatus: ReturnType<typeof getDailyGoalStatus>;
}

export function generateShiftSummary(
  shiftData: ShiftPlanData,
  completedTasks: number
): ShiftSummary | null {
  if (!shiftData.planned_shift_minutes) {
    return null;
  }
  
  const plannedShift = formatShiftDuration(shiftData.planned_shift_minutes);
  
  let actualShift = 'In progress';
  let roundedShift = 'In progress';
  let accuracy: ShiftPlanAccuracy = { accuracy: 0, accuracyPercent: 0, status: 'needs-improvement' };
  
  if (shiftData.clocked_out_at && shiftData.clocked_in_at) {
    const actualMinutes = calculateActualShiftDuration(
      shiftData.clocked_in_at,
      shiftData.clocked_out_at
    );
    actualShift = formatShiftDuration(actualMinutes);
    
    const roundedHours = Math.round(actualMinutes / 60);
    roundedShift = `${roundedHours}h`;
    
    accuracy = calculateShiftPlanAccuracy(shiftData.planned_shift_minutes, actualMinutes);
  }
  
  const taskGoal = shiftData.daily_task_goal 
    ? `${shiftData.daily_task_goal} tasks`
    : 'Not set';
  
  const goalStatus = getDailyGoalStatus(completedTasks, shiftData.daily_task_goal);
  
  return {
    plannedShift,
    actualShift,
    roundedShift,
    accuracy,
    taskGoal,
    goalStatus
  };
}

