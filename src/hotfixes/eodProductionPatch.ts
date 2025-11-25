/**
 * 🔥 EOD PRODUCTION PATCH
 * 
 * Safe, non-destructive patches for EOD system
 * Applied as wrapper functions - NO refactoring, NO breaking changes
 * 
 * Date: November 26, 2025
 * Purpose: Ensure data integrity across entire EOD pipeline
 */

// ============================================================================
// 1️⃣ CLOCK-IN MODAL & SHIFT GOALS
// ============================================================================

/**
 * Validates shift goal data before saving
 * Ensures no null/undefined values reach the database
 */
export function validateShiftGoals(
  plannedShiftMinutes: number | null | undefined,
  dailyTaskGoal: number | null | undefined
): { valid: boolean; plannedShiftMinutes: number; dailyTaskGoal: number; errors: string[] } {
  const errors: string[] = [];
  
  // Ensure plannedShiftMinutes is a valid positive number
  let validShiftMinutes = 0;
  if (typeof plannedShiftMinutes === 'number' && plannedShiftMinutes > 0 && plannedShiftMinutes <= 960) {
    validShiftMinutes = Math.floor(plannedShiftMinutes);
  } else {
    errors.push('Invalid shift minutes - must be between 1 and 960 (16 hours)');
  }
  
  // Ensure dailyTaskGoal is a valid positive integer
  let validTaskGoal = 0;
  if (typeof dailyTaskGoal === 'number' && dailyTaskGoal > 0 && dailyTaskGoal <= 50) {
    validTaskGoal = Math.floor(dailyTaskGoal);
  } else {
    errors.push('Invalid task goal - must be between 1 and 50');
  }
  
  return {
    valid: errors.length === 0,
    plannedShiftMinutes: validShiftMinutes,
    dailyTaskGoal: validTaskGoal,
    errors
  };
}

// ============================================================================
// 2️⃣ TASK TIME CALCULATIONS
// ============================================================================

/**
 * Safely calculates task duration with fallback
 * NEVER returns null, undefined, or negative values
 */
export function safeCalculateTaskDuration(
  startedAt: string | Date,
  endedAt: string | Date | null,
  accumulatedSeconds: number | null | undefined
): { durationMinutes: number; totalSeconds: number; isValid: boolean } {
  try {
    const start = new Date(startedAt).getTime();
    const end = endedAt ? new Date(endedAt).getTime() : Date.now();
    
    // Validate timestamps
    if (isNaN(start) || isNaN(end) || start > end) {
      console.error('[PATCH] Invalid timestamps:', { startedAt, endedAt });
      return { durationMinutes: 0, totalSeconds: 0, isValid: false };
    }
    
    // Calculate current session
    const currentSessionMs = end - start;
    const currentSessionSeconds = Math.floor(currentSessionMs / 1000);
    
    // Add accumulated seconds (from previous pauses)
    const accumulated = typeof accumulatedSeconds === 'number' ? Math.max(0, accumulatedSeconds) : 0;
    const totalSeconds = Math.max(0, currentSessionSeconds + accumulated);
    const durationMinutes = Math.floor(totalSeconds / 60);
    
    return {
      durationMinutes: Math.max(0, durationMinutes),
      totalSeconds: Math.max(0, totalSeconds),
      isValid: true
    };
  } catch (error) {
    console.error('[PATCH] Error calculating task duration:', error);
    return { durationMinutes: 0, totalSeconds: 0, isValid: false };
  }
}

/**
 * Safely calculates shift duration
 * NEVER returns null or negative values
 */
export function safeCalculateShiftDuration(
  clockedInAt: string | Date | null,
  clockedOutAt: string | Date | null
): { shiftHours: number; shiftMinutes: number; shiftSeconds: number; isValid: boolean } {
  try {
    if (!clockedInAt) {
      return { shiftHours: 0, shiftMinutes: 0, shiftSeconds: 0, isValid: false };
    }
    
    const start = new Date(clockedInAt).getTime();
    const end = clockedOutAt ? new Date(clockedOutAt).getTime() : Date.now();
    
    if (isNaN(start) || isNaN(end) || start > end) {
      console.error('[PATCH] Invalid shift timestamps:', { clockedInAt, clockedOutAt });
      return { shiftHours: 0, shiftMinutes: 0, shiftSeconds: 0, isValid: false };
    }
    
    const diffMs = end - start;
    const shiftSeconds = Math.floor(diffMs / 1000);
    const shiftMinutes = Math.floor(shiftSeconds / 60);
    const shiftHours = shiftMinutes / 60;
    
    return {
      shiftHours: Math.max(0, shiftHours),
      shiftMinutes: Math.max(0, shiftMinutes),
      shiftSeconds: Math.max(0, shiftSeconds),
      isValid: true
    };
  } catch (error) {
    console.error('[PATCH] Error calculating shift duration:', error);
    return { shiftHours: 0, shiftMinutes: 0, shiftSeconds: 0, isValid: false };
  }
}

// ============================================================================
// 3️⃣ ROUNDING LOGIC
// ============================================================================

/**
 * Standard rounding to nearest whole number
 * 1.49 → 1, 1.50 → 2, 1.51 → 2
 */
export function roundHours(hours: number | null | undefined): number {
  if (typeof hours !== 'number' || isNaN(hours)) {
    return 0;
  }
  return Math.round(Math.max(0, hours));
}

/**
 * Formats duration as "Xh Ym"
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0) {
    return '0m';
  }
  
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

// ============================================================================
// 4️⃣ EOD SUBMISSION DATA INTEGRITY
// ============================================================================

/**
 * Validates and sanitizes EOD submission data
 * Ensures all required fields are present and valid
 */
export interface EODSubmissionData {
  user_id: string;
  report_id: string;
  clocked_in_at: string | null;
  clocked_out_at: string | null;
  total_hours: number;
  total_active_seconds: number;
  planned_shift_minutes?: number | null;
  daily_task_goal?: number | null;
}

export function validateEODSubmission(data: Partial<EODSubmissionData>): {
  valid: boolean;
  sanitized: EODSubmissionData;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate user_id
  if (!data.user_id || typeof data.user_id !== 'string') {
    errors.push('Missing or invalid user_id');
  }
  
  // Validate report_id
  if (!data.report_id || typeof data.report_id !== 'string') {
    errors.push('Missing or invalid report_id');
  }
  
  // Validate total_hours (must be >= 0)
  const totalHours = typeof data.total_hours === 'number' && data.total_hours >= 0
    ? data.total_hours
    : 0;
  
  // Validate total_active_seconds (must be >= 0)
  const totalActiveSeconds = typeof data.total_active_seconds === 'number' && data.total_active_seconds >= 0
    ? data.total_active_seconds
    : 0;
  
  // Validate planned_shift_minutes
  const plannedShiftMinutes = typeof data.planned_shift_minutes === 'number' && data.planned_shift_minutes > 0
    ? data.planned_shift_minutes
    : null;
  
  // Validate daily_task_goal
  const dailyTaskGoal = typeof data.daily_task_goal === 'number' && data.daily_task_goal > 0
    ? data.daily_task_goal
    : null;
  
  const sanitized: EODSubmissionData = {
    user_id: data.user_id || '',
    report_id: data.report_id || '',
    clocked_in_at: data.clocked_in_at || null,
    clocked_out_at: data.clocked_out_at || null,
    total_hours: totalHours,
    total_active_seconds: totalActiveSeconds,
    planned_shift_minutes: plannedShiftMinutes,
    daily_task_goal: dailyTaskGoal,
  };
  
  return {
    valid: errors.length === 0,
    sanitized,
    errors
  };
}

// ============================================================================
// 5️⃣ TASK DATA PRESERVATION
// ============================================================================

/**
 * Ensures task description is NEVER cleared or overwritten
 * Returns original description if new one is invalid
 */
export function preserveTaskDescription(
  originalDescription: string | null | undefined,
  newDescription: string | null | undefined
): string {
  // If original exists and new is empty/null, keep original
  if (originalDescription && (!newDescription || !newDescription.trim())) {
    console.warn('[PATCH] Preserving original task description - new value was empty');
    return originalDescription;
  }
  
  // If new description exists and is valid, use it
  if (newDescription && newDescription.trim()) {
    return newDescription.trim();
  }
  
  // If original exists, use it
  if (originalDescription) {
    return originalDescription;
  }
  
  // Fallback to empty string (should never happen)
  console.error('[PATCH] No valid task description found!');
  return '';
}

/**
 * Validates task update to ensure no data loss
 */
export function validateTaskUpdate(
  originalTask: any,
  updates: any
): { valid: boolean; safeUpdates: any; errors: string[] } {
  const errors: string[] = [];
  const safeUpdates: any = { ...updates };
  
  // NEVER allow these fields to be updated after creation
  const protectedFields = ['id', 'user_id', 'eod_id', 'created_at', 'client_name'];
  protectedFields.forEach(field => {
    if (field in safeUpdates) {
      delete safeUpdates[field];
      console.warn(`[PATCH] Removed protected field from update: ${field}`);
    }
  });
  
  // NEVER allow task_description to be cleared
  if ('task_description' in safeUpdates) {
    safeUpdates.task_description = preserveTaskDescription(
      originalTask.task_description,
      safeUpdates.task_description
    );
  }
  
  // Ensure accumulated_seconds is never negative
  if ('accumulated_seconds' in safeUpdates) {
    safeUpdates.accumulated_seconds = Math.max(0, safeUpdates.accumulated_seconds || 0);
  }
  
  // Ensure duration_minutes is never negative
  if ('duration_minutes' in safeUpdates) {
    safeUpdates.duration_minutes = Math.max(0, safeUpdates.duration_minutes || 0);
  }
  
  return {
    valid: errors.length === 0,
    safeUpdates,
    errors
  };
}

// ============================================================================
// 6️⃣ FALLBACK CALCULATIONS
// ============================================================================

/**
 * Emergency fallback for shift hours calculation
 * Used if primary calculation fails
 */
export function fallbackShiftHours(
  clockedInAt: string | Date | null,
  clockedOutAt: string | Date | null
): number {
  try {
    if (!clockedInAt) return 0;
    
    const start = new Date(clockedInAt).getTime();
    const end = clockedOutAt ? new Date(clockedOutAt).getTime() : Date.now();
    
    if (isNaN(start) || isNaN(end) || start > end) return 0;
    
    const diffMs = end - start;
    const hours = diffMs / (1000 * 60 * 60);
    
    return Math.max(0, hours);
  } catch (error) {
    console.error('[PATCH] Fallback shift hours calculation failed:', error);
    return 0;
  }
}

/**
 * Emergency fallback for active task hours calculation
 * Used if primary calculation fails
 */
export function fallbackActiveTaskHours(tasks: any[]): number {
  try {
    if (!Array.isArray(tasks)) return 0;
    
    const totalSeconds = tasks.reduce((sum, task) => {
      const seconds = task.accumulated_seconds || 0;
      return sum + Math.max(0, seconds);
    }, 0);
    
    return Math.max(0, totalSeconds / 3600);
  } catch (error) {
    console.error('[PATCH] Fallback active task hours calculation failed:', error);
    return 0;
  }
}

// ============================================================================
// 7️⃣ DATA INTEGRITY GUARDS
// ============================================================================

/**
 * Logs data integrity issues for monitoring
 */
export function logDataIntegrityIssue(
  context: string,
  issue: string,
  data: any
): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    context,
    issue,
    data,
    severity: 'WARNING'
  };
  
  console.warn('[EOD PATCH] Data Integrity Issue:', logEntry);
  
  // In production, this could send to monitoring service
  // For now, just console log
}

/**
 * Validates that hours are never null/undefined/negative
 */
export function guardHoursValue(
  hours: any,
  context: string,
  fallback: number = 0
): number {
  if (typeof hours !== 'number' || isNaN(hours) || hours < 0) {
    logDataIntegrityIssue(
      context,
      'Invalid hours value detected',
      { received: hours, fallback }
    );
    return fallback;
  }
  return hours;
}

/**
 * Validates that task data is complete
 */
export function guardTaskData(task: any): boolean {
  const required = ['id', 'user_id', 'eod_id', 'task_description', 'client_name'];
  const missing = required.filter(field => !task[field]);
  
  if (missing.length > 0) {
    logDataIntegrityIssue(
      'Task Validation',
      'Missing required fields',
      { taskId: task.id, missing }
    );
    return false;
  }
  
  return true;
}

// ============================================================================
// 8️⃣ EXPORT ALL PATCHES
// ============================================================================

export const EODProductionPatch = {
  // Validation
  validateShiftGoals,
  validateEODSubmission,
  validateTaskUpdate,
  guardTaskData,
  guardHoursValue,
  
  // Calculations
  safeCalculateTaskDuration,
  safeCalculateShiftDuration,
  roundHours,
  formatDuration,
  
  // Fallbacks
  fallbackShiftHours,
  fallbackActiveTaskHours,
  
  // Data Preservation
  preserveTaskDescription,
  
  // Logging
  logDataIntegrityIssue,
};

export default EODProductionPatch;

