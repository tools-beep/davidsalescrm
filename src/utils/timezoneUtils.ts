/**
 * Timezone Utility - Forces all dates to EST/EDT (America/New_York)
 * 
 * CRITICAL: All users (regardless of their local timezone) will see times in EST/EDT.
 * This includes admins viewing from any location.
 */

const EST_TIMEZONE = 'America/New_York';

/**
 * Get the UTC offset for EST/EDT at a given date
 * Returns either -05:00 (EST) or -04:00 (EDT)
 */
function getESTOffset(date: Date): string {
  // Simple check for daylight saving time
  // DST in US: Second Sunday in March to First Sunday in November
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Between March and November, might be DST
  // For simplicity, we'll use -04:00 from March to October, -05:00 otherwise
  if (month >= 2 && month <= 9) {
    // March through October - might be EDT
    return '-04:00';
  } else {
    // November through February - EST
    return '-05:00';
  }
}

/**
 * Convert a Date object to EST (for display purposes)
 * Returns the same Date object (Date objects are timezone-agnostic internally)
 */
export function toEST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d;
}

/**
 * Get current date/time (returns current moment - database stores in UTC)
 */
export function nowEST(): Date {
  // Just return the current time - no conversion needed
  // The database stores timestamps in UTC, and Date objects work with UTC internally
  return new Date();
}

/**
 * Format a date to EST timezone string for display
 */
export function formatDateEST(date: Date | string, formatStr: string = 'PPpp'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return formatter.format(d);
}

/**
 * Get start of day in EST (midnight EST)
 */
export function startOfDayEST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Get the date components in EST
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(d);
  const dateParts: any = {};
  
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });

  // Create midnight EST for this date
  const offset = getESTOffset(d);
  const estMidnight = new Date(
    `${dateParts.year}-${dateParts.month}-${dateParts.day}T00:00:00${offset}`
  );

  return estMidnight;
}

/**
 * Get end of day in EST (23:59:59 EST)
 */
export function endOfDayEST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(d);
  const dateParts: any = {};
  
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });

  const offset = getESTOffset(d);
  const estEndOfDay = new Date(
    `${dateParts.year}-${dateParts.month}-${dateParts.day}T23:59:59${offset}`
  );

  return estEndOfDay;
}

/**
 * Convert a date key (YYYY-MM-DD) to EST start of day
 */
export function dateKeyToESTStart(dateKey: string): Date {
  // dateKey is in format "2025-11-19"
  // Interpret as EST midnight
  return new Date(`${dateKey}T00:00:00-05:00`);
}

/**
 * Convert a date key (YYYY-MM-DD) to EST end of day
 */
export function dateKeyToESTEnd(dateKey: string): Date {
  // dateKey is in format "2025-11-19"
  // Interpret as EST 23:59:59
  return new Date(`${dateKey}T23:59:59-05:00`);
}

/**
 * Get the date key (YYYY-MM-DD) for a date in EST
 */
export function getDateKeyEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(d);
  const dateParts: any = {};
  
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });

  return `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
}

/**
 * Get week start (Monday) in EST for a given date
 */
export function getWeekStartEST(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // Get the date in EST
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short'
  });

  const parts = formatter.formatToParts(d);
  const dateParts: any = {};
  
  parts.forEach(part => {
    if (part.type !== 'literal') {
      dateParts[part.type] = part.value;
    }
  });

  // Create a date object in EST
  const estDate = new Date(`${dateParts.year}-${dateParts.month}-${dateParts.day}T00:00:00-05:00`);
  
  // Get day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const dayOfWeek = estDate.getUTCDay();
  
  // Calculate offset to Monday
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  // Create Monday midnight EST
  const monday = new Date(estDate);
  monday.setUTCDate(monday.getUTCDate() + daysToMonday);
  
  return monday;
}

/**
 * Get time display in EST (e.g., "2:30 PM EST")
 */
export function formatTimeEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return formatter.format(d) + ' EST';
}

/**
 * Get full date + time display in EST (e.g., "Nov 19, 2025, 2:30 PM EST")
 */
export function formatDateTimeEST(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: EST_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return formatter.format(d) + ' EST';
}

/**
 * Check if a date is "today" in EST
 */
export function isTodayEST(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const todayKey = getDateKeyEST(new Date());
  const dateKey = getDateKeyEST(d);
  return todayKey === dateKey;
}


/**
 * Convert X days ago to EST date range
 */
export function daysAgoEST(days: number): Date {
  const now = nowEST();
  const past = new Date(now);
  past.setDate(past.getDate() - days);
  return startOfDayEST(past);
}

/**
 * Format duration in a human-readable way
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * Parse a UTC ISO string and convert to EST display
 */
export function parseUTCtoEST(utcString: string): Date {
  const utcDate = new Date(utcString);
  return toEST(utcDate);
}

console.log('🌍 Timezone System: All times display in EST (America/New_York)');
console.log(`📍 Current EST offset: ${getESTOffset(new Date())}`);

