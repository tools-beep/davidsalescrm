// 🔥 NEW WEEKDAY-ONLY STREAK SYSTEM
// Tracks only Mon-Fri for streaks, weekends never break streaks

export interface StreakData {
  weekdayStreak: number;
  longestWeekdayStreak: number;
  weekendBonusStreak: number;
  lastSubmissionDate: string | null;
  streakHistory: StreakHistoryEntry[];
}

export interface StreakHistoryEntry {
  date: string;
  streakValue: number;
  isWeekday: boolean;
  wasSubmitted: boolean;
}

export interface StreakInsights {
  insights: string[];
  bestStreakDay: string | null;
  weakestStreakDay: string | null;
  avgStreakLength: number;
  totalResets: number;
}

// 🟦 WEEKDAY VALIDATION
export function isWeekday(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day >= 1 && day <= 5; // Monday (1) through Friday (5)
}

// 🟦 GET PREVIOUS WEEKDAY
export function getPreviousWeekday(date: Date): Date {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  
  // If previous day is weekend, keep going back
  while (!isWeekday(previous)) {
    previous.setDate(previous.getDate() - 1);
  }
  
  return previous;
}

// 🟦 FORMAT DATE FOR COMPARISON (YYYY-MM-DD in user's timezone)
export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 🟦 CALCULATE WEEKDAY STREAK
export function calculateWeekdayStreak(
  submissions: Array<{ date: string; submitted: boolean }>,
  currentDate: Date = new Date()
): StreakData {
  // Sort submissions by date (newest first)
  const sortedSubmissions = [...submissions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let weekdayStreak = 0;
  let longestWeekdayStreak = 0;
  let weekendBonusStreak = 0;
  let lastSubmissionDate: string | null = null;
  const streakHistory: StreakHistoryEntry[] = [];

  // Convert submissions to a map for quick lookup
  const submissionMap = new Map<string, boolean>();
  submissions.forEach(sub => {
    submissionMap.set(sub.date, sub.submitted);
  });

  // Start from today and go backwards
  const today = formatDateLocal(currentDate);
  let checkDate = new Date(currentDate);
  let currentStreakCount = 0;
  let foundFirstSubmission = false;

  // Calculate current streak (going backwards from today)
  while (true) {
    const dateStr = formatDateLocal(checkDate);
    const wasSubmitted = submissionMap.get(dateStr) || false;
    const isWeekdayDate = isWeekday(checkDate);

    // Track history
    streakHistory.push({
      date: dateStr,
      streakValue: currentStreakCount,
      isWeekday: isWeekdayDate,
      wasSubmitted,
    });

    // Only count weekdays for streak
    if (isWeekdayDate) {
      if (wasSubmitted) {
        currentStreakCount++;
        foundFirstSubmission = true;
        if (!lastSubmissionDate) {
          lastSubmissionDate = dateStr;
        }
      } else {
        // Weekday with no submission breaks the streak
        if (foundFirstSubmission) {
          break; // Stop counting, streak is broken
        }
        // If we haven't found first submission yet, keep looking back
      }
    }
    // Weekends don't affect streak calculation - skip them

    // Stop after checking 90 days back
    if (streakHistory.length > 90) break;

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);
  }

  weekdayStreak = currentStreakCount;

  // Calculate longest streak from history
  let tempStreak = 0;
  let maxStreak = 0;
  
  // Go through all submissions chronologically to find longest streak
  const allDates = Array.from(submissionMap.keys()).sort();
  let lastWeekdayDate: Date | null = null;

  for (const dateStr of allDates) {
    const date = new Date(dateStr);
    const wasSubmitted = submissionMap.get(dateStr);
    
    if (isWeekday(date) && wasSubmitted) {
      if (lastWeekdayDate) {
        // Check if this is consecutive weekday
        const expectedNext = getPreviousWeekday(date);
        const lastDateStr = formatDateLocal(lastWeekdayDate);
        const expectedDateStr = formatDateLocal(expectedNext);
        
        if (lastDateStr === expectedDateStr) {
          tempStreak++;
        } else {
          // Gap detected, reset temp streak
          maxStreak = Math.max(maxStreak, tempStreak);
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      
      lastWeekdayDate = date;
    }
  }
  
  maxStreak = Math.max(maxStreak, tempStreak);
  longestWeekdayStreak = Math.max(maxStreak, weekdayStreak);

  // Calculate weekend bonus streak
  const recentWeekends = submissions.filter(sub => {
    const date = new Date(sub.date);
    return !isWeekday(date) && sub.submitted;
  });
  weekendBonusStreak = recentWeekends.length;

  return {
    weekdayStreak,
    longestWeekdayStreak,
    weekendBonusStreak,
    lastSubmissionDate,
    streakHistory: streakHistory.reverse(), // Reverse to chronological order
  };
}

// 🟦 GENERATE STREAK INSIGHTS
export function generateStreakInsights(
  streakData: StreakData,
  historicalData: Array<{ date: string; submitted: boolean; dayOfWeek: string }>
): StreakInsights {
  const insights: string[] = [];
  
  // Analyze day-of-week patterns
  const dayStats: Record<string, { total: number; submitted: number }> = {
    Monday: { total: 0, submitted: 0 },
    Tuesday: { total: 0, submitted: 0 },
    Wednesday: { total: 0, submitted: 0 },
    Thursday: { total: 0, submitted: 0 },
    Friday: { total: 0, submitted: 0 },
  };

  historicalData.forEach(entry => {
    if (entry.dayOfWeek in dayStats) {
      dayStats[entry.dayOfWeek].total++;
      if (entry.submitted) {
        dayStats[entry.dayOfWeek].submitted++;
      }
    }
  });

  // Find best and weakest days
  let bestDay: string | null = null;
  let weakestDay: string | null = null;
  let bestRate = 0;
  let weakestRate = 1;

  Object.entries(dayStats).forEach(([day, stats]) => {
    if (stats.total > 0) {
      const rate = stats.submitted / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        bestDay = day;
      }
      if (rate < weakestRate && stats.total >= 3) { // Only if enough data
        weakestRate = rate;
        weakestDay = day;
      }
    }
  });

  // Generate insights based on current streak
  if (streakData.weekdayStreak >= 20) {
    insights.push("🔥 Incredible! 20+ day streak — you're unstoppable!");
  } else if (streakData.weekdayStreak >= 10) {
    insights.push("🌟 Amazing consistency! 10+ day streak is impressive.");
  } else if (streakData.weekdayStreak >= 5) {
    insights.push("💪 Strong week! 5+ day streak shows great discipline.");
  } else if (streakData.weekdayStreak >= 1) {
    insights.push("✨ Streak started! Keep it going day by day.");
  } else {
    insights.push("🌱 Ready for a fresh start? Begin your streak today!");
  }

  // Day-specific insights
  if (bestDay && bestRate >= 0.8) {
    insights.push(`You maintain streaks best on ${bestDay}s.`);
  }
  
  if (weakestDay && weakestRate < 0.6) {
    insights.push(`Your weakest streak day is ${weakestDay}.`);
  }

  // Weekend bonus insights
  if (streakData.weekendBonusStreak >= 4) {
    insights.push("🏆 Weekend Warrior! You've worked 4+ weekend days recently.");
  } else if (streakData.weekendBonusStreak >= 2) {
    insights.push("✨ Weekend Bonus! You're going above and beyond.");
  }

  // Longest streak comparison
  if (streakData.longestWeekdayStreak > streakData.weekdayStreak && streakData.longestWeekdayStreak >= 10) {
    insights.push(`Your longest streak was ${streakData.longestWeekdayStreak} days — you can reach it again!`);
  }

  // Calculate resets (times streak went to 0)
  let totalResets = 0;
  let lastStreakValue = 0;
  
  streakData.streakHistory.forEach(entry => {
    if (entry.isWeekday && entry.streakValue === 0 && lastStreakValue > 0) {
      totalResets++;
    }
    lastStreakValue = entry.streakValue;
  });

  if (totalResets >= 4) {
    insights.push(`You've restarted streak successfully ${totalResets} times this month — consistency is improving!`);
  }

  // Average streak length
  const avgStreakLength = streakData.longestWeekdayStreak > 0 
    ? Math.round(streakData.longestWeekdayStreak / Math.max(totalResets, 1))
    : 0;

  // Early start insight
  const earlySubmissions = historicalData.filter(entry => {
    const date = new Date(entry.date);
    return entry.submitted && date.getHours() < 11;
  });
  
  if (earlySubmissions.length >= 5) {
    insights.push("Your streak grows fastest when you start tasks before 11 AM.");
  }

  return {
    insights,
    bestStreakDay: bestDay,
    weakestStreakDay: weakestDay,
    avgStreakLength,
    totalResets,
  };
}

// 🟦 CHECK IF STREAK IS AT RISK
export function isStreakAtRisk(
  lastSubmissionDate: string | null,
  currentDate: Date = new Date()
): boolean {
  const today = formatDateLocal(currentDate);
  const todayIsWeekday = isWeekday(currentDate);
  
  // Only at risk if today is a weekday and no submission yet
  if (!todayIsWeekday) return false;
  
  // Check if already submitted today
  if (lastSubmissionDate === today) return false;
  
  // Check current hour (only show risk after 11 AM)
  const currentHour = currentDate.getHours();
  if (currentHour < 11) return false;
  
  // Streak is at risk!
  return true;
}

// 🟦 DETERMINE STREAK NOTIFICATION TYPE
export function getStreakNotification(
  previousStreak: number,
  currentStreak: number,
  weekendBonusEarned: boolean,
  isWeekdaySubmission: boolean
): { type: string; message: string } | null {
  // Weekend bonus
  if (weekendBonusEarned) {
    return {
      type: 'weekend_bonus',
      message: '✨ Weekend Warrior! Bonus streak earned.',
    };
  }

  // Streak increased
  if (isWeekdaySubmission && currentStreak > previousStreak) {
    return {
      type: 'streak_increased',
      message: `🔥 Streak extended! You've worked consistently for ${currentStreak} days.`,
    };
  }

  // Streak reset
  if (currentStreak === 1 && previousStreak > 1) {
    return {
      type: 'streak_reset',
      message: '💛 New day, fresh start. Your streak has reset — you can build it again!',
    };
  }

  return null;
}

