// 🕐 HOURS CALCULATION SYSTEM
// Calculates both Actual Hours (precise) and Rounded Hours (nearest whole hour)

export interface HoursData {
  totalSeconds: number;
  actualHours: number;
  roundedHours: number;
  formattedActual: string;
  formattedRounded: string;
}

// 🧮 CALCULATE ACTUAL HOURS (PRECISE)
export function calculateActualHours(totalSeconds: number): number {
  return totalSeconds / 3600;
}

// 🧮 CALCULATE ROUNDED HOURS (NEAREST WHOLE HOUR)
// Uses standard math rounding:
// 0.0 - 0.4 → round down
// 0.5 - 0.9 → round up
export function calculateRoundedHours(actualHours: number): number {
  return Math.round(actualHours);
}

// 🧮 CALCULATE BOTH ACTUAL AND ROUNDED HOURS
export function calculateHours(totalSeconds: number): HoursData {
  const actualHours = calculateActualHours(totalSeconds);
  const roundedHours = calculateRoundedHours(actualHours);
  
  return {
    totalSeconds,
    actualHours,
    roundedHours,
    formattedActual: formatActualHours(actualHours),
    formattedRounded: formatRoundedHours(roundedHours),
  };
}

// 📊 FORMAT ACTUAL HOURS (2 decimal places)
export function formatActualHours(actualHours: number): string {
  return actualHours.toFixed(2);
}

// 📊 FORMAT ROUNDED HOURS (whole number)
export function formatRoundedHours(roundedHours: number): string {
  return roundedHours.toString();
}

// 🕐 CALCULATE SHIFT HOURS FROM CLOCK-IN/OUT
export function calculateShiftHours(
  clockInTime: string | Date,
  clockOutTime: string | Date,
  totalActiveSeconds: number
): HoursData {
  const clockIn = new Date(clockInTime).getTime();
  const clockOut = new Date(clockOutTime).getTime();
  
  // Total shift duration in seconds
  const totalShiftSeconds = (clockOut - clockIn) / 1000;
  
  // Calculate idle time (using TRUE idle logic)
  const totalIdleSeconds = totalShiftSeconds - totalActiveSeconds;
  
  // Total hours = active + idle
  const totalSeconds = totalActiveSeconds + totalIdleSeconds;
  
  return calculateHours(totalSeconds);
}

// 🕐 CALCULATE HOURS FROM TASK ENTRIES
export function calculateHoursFromEntries(
  entries: Array<{ accumulated_seconds?: number }>,
  clockInData?: { clocked_in_at: string; clocked_out_at?: string }
): HoursData {
  // Calculate total active seconds from all tasks
  const totalActiveSeconds = entries.reduce(
    (sum, entry) => sum + (entry.accumulated_seconds || 0),
    0
  );
  
  if (clockInData && clockInData.clocked_in_at) {
    const clockOutTime = clockInData.clocked_out_at || new Date().toISOString();
    return calculateShiftHours(
      clockInData.clocked_in_at,
      clockOutTime,
      totalActiveSeconds
    );
  }
  
  // If no clock-in data, just use active time
  return calculateHours(totalActiveSeconds);
}

// 🧪 TEST CASES
export function runHoursCalculationTests(): {
  passed: boolean;
  results: Array<{ case: string; passed: boolean; details: string }>;
} {
  const testCases = [
    {
      name: 'Case 1: 8.5 hrs → 9 hrs',
      clockIn: '2025-11-24T09:00:00Z',
      clockOut: '2025-11-24T17:30:00Z',
      expectedActual: 8.5,
      expectedRounded: 9,
    },
    {
      name: 'Case 2: 5.23 hrs → 5 hrs',
      clockIn: '2025-11-24T10:00:00Z',
      clockOut: '2025-11-24T15:14:00Z',
      expectedActual: 5.23,
      expectedRounded: 5,
    },
    {
      name: 'Case 3: 2.45 hrs → 2 hrs',
      clockIn: '2025-11-24T11:00:00Z',
      clockOut: '2025-11-24T13:27:00Z',
      expectedActual: 2.45,
      expectedRounded: 2,
    },
    {
      name: 'Case 4: 10.88 hrs → 11 hrs',
      clockIn: '2025-11-24T08:00:00Z',
      clockOut: '2025-11-24T18:53:00Z',
      expectedActual: 10.88,
      expectedRounded: 11,
    },
  ];
  
  const results = testCases.map(test => {
    const clockIn = new Date(test.clockIn).getTime();
    const clockOut = new Date(test.clockOut).getTime();
    const totalSeconds = (clockOut - clockIn) / 1000;
    
    const hours = calculateHours(totalSeconds);
    const actualPassed = Math.abs(hours.actualHours - test.expectedActual) < 0.01;
    const roundedPassed = hours.roundedHours === test.expectedRounded;
    const passed = actualPassed && roundedPassed;
    
    return {
      case: test.name,
      passed,
      details: passed
        ? `✅ Actual: ${hours.actualHours.toFixed(2)}, Rounded: ${hours.roundedHours}`
        : `❌ Expected Actual: ${test.expectedActual}, Got: ${hours.actualHours.toFixed(2)} | Expected Rounded: ${test.expectedRounded}, Got: ${hours.roundedHours}`,
    };
  });
  
  const allPassed = results.every(r => r.passed);
  
  return {
    passed: allPassed,
    results,
  };
}

// 🧮 ADDITIONAL ROUNDING EXAMPLES FOR VALIDATION
export const ROUNDING_EXAMPLES = [
  { actual: 8.12, rounded: 8 },
  { actual: 8.49, rounded: 8 },
  { actual: 8.50, rounded: 9 },
  { actual: 8.73, rounded: 9 },
  { actual: 7.29, rounded: 7 },
  { actual: 7.51, rounded: 8 },
  { actual: 0.4, rounded: 0 },
  { actual: 0.5, rounded: 1 },
  { actual: 10.49, rounded: 10 },
  { actual: 10.50, rounded: 11 },
];

// Validate all examples
export function validateRoundingExamples(): boolean {
  return ROUNDING_EXAMPLES.every(example => {
    const rounded = calculateRoundedHours(example.actual);
    return rounded === example.rounded;
  });
}

