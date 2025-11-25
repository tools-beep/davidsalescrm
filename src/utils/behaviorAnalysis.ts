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
  mood_level: string; // 😊 😐 😣 🥱 🔥
}

interface EnergyEntry {
  timestamp: string;
  energy_level: string; // High, Medium, Low, Drained, Recharging
}

interface UserMetrics {
  efficiencyScore: number;
  taskCompletionRate: number;
  focusIndex: number;
  taskVelocity: number;
  workRhythm: number;
  energyLevel: number;
  timeUtilization: number;
  productivityMomentum: number;
  consistencyScore: number;
  peakHour: number | null;
}

export interface BehaviorInsight {
  id: string;
  title: string;
  insight: string;
  advice: string;
  tag: 'Timing Pattern' | 'Focus Pattern' | 'Strength' | 'Momentum' | 'Energy' | 'Wellness' | 'Category' | 'Accuracy' | 'Deep Work' | 'Priority';
  category: 'timing' | 'focus' | 'strength' | 'momentum' | 'energy' | 'wellness' | 'enjoyment' | 'accuracy' | 'deepwork' | 'priority';
  color: string;
}

// Color mapping for insight types
const INSIGHT_COLORS = {
  timing: '#A7C7E7',      // Pastel Blue
  focus: '#C7B8EA',       // Pastel Lavender
  strength: '#B8EBD0',    // Pastel Mint
  momentum: '#B8EBD0',    // Pastel Mint
  energy: '#F8D4C7',      // Pastel Peach
  wellness: '#F8D4C7',    // Pastel Peach
  enjoyment: '#F7C9D4',   // Pastel Pink
  accuracy: '#FAE8A4',    // Pastel Yellow
  deepwork: '#C7B8EA',    // Pastel Lavender
  priority: '#D4A5D4',    // Pastel Purple (for priority insights)
};

// ⭐ MAIN BEHAVIOR INSIGHT ENGINE
// Integrates ALL 9 metrics + task types + mood + energy + enjoyment
export function analyzeBehaviorPatterns(
  entries: TimeEntry[],
  metrics: UserMetrics,
  moodEntries?: MoodEntry[],
  energyEntries?: EnergyEntry[]
): BehaviorInsight[] {
  
  // Minimum data threshold - show placeholder if not enough data
  if (!entries || entries.length === 0) {
    return [{
      id: 'placeholder-1',
      title: 'Start Tracking',
      insight: "We're learning your patterns — more data incoming!",
      advice: "Each task you complete helps us understand your natural flow better.",
      tag: 'Wellness',
      category: 'wellness',
      color: INSIGHT_COLORS.wellness,
    }];
  }

  const insights: BehaviorInsight[] = [];

  // 1️⃣ Timing Insights (from Rhythm + Velocity + Peak Hour)
  const timingInsights = generateTimingInsights(entries, metrics);
  insights.push(...timingInsights);

  // 2️⃣ Focus Insights (from Focus + Pauses + Task Type)
  const focusInsights = generateFocusInsights(entries, metrics);
  insights.push(...focusInsights);

  // 3️⃣ Momentum Insights (from Velocity + Quick-task bursts)
  const momentumInsights = generateMomentumInsights(entries, metrics);
  insights.push(...momentumInsights);

  // 4️⃣ Energy Insights (from Energy Check-ins + Task Length)
  const energyInsights = generateEnergyInsights(entries, metrics, energyEntries);
  insights.push(...energyInsights);

  // 5️⃣ Mood Insights (from Mood Check-ins + Enjoyment)
  const moodInsights = generateMoodInsights(entries, moodEntries);
  insights.push(...moodInsights);

  // 6️⃣ Category Insights (from category frequency + efficiency)
  const categoryInsights = generateCategoryInsights(entries, metrics);
  insights.push(...categoryInsights);

  // 7️⃣ Consistency Insights (from Consistency + Streak History)
  const consistencyInsights = generateConsistencyInsights(entries, metrics);
  insights.push(...consistencyInsights);

  // 8️⃣ Completion Insights (from Completion metric + overdue tasks)
  const completionInsights = generateCompletionInsights(entries, metrics);
  insights.push(...completionInsights);

  // 9️⃣ Efficiency Insights (from efficiency accuracy + task type normalization)
  const efficiencyInsights = generateEfficiencyInsights(entries, metrics);
  insights.push(...efficiencyInsights);

  // 🎯 PRIORITY INSIGHTS (New - from task priority patterns)
  const priorityInsights = generatePriorityInsights(entries, metrics);
  insights.push(...priorityInsights);

  // Return top 6 most relevant insights (at least 1 per category when possible)
  return selectTopInsights(insights, 6);
}

// 1️⃣ TIMING INSIGHTS (Rhythm + Velocity + Peak Hour)
function generateTimingInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  // Minimum threshold: Need at least 3 tasks
  if (entries.length < 3) return insights;

  // Peak Hour Analysis
  if (metrics.peakHour !== null && metrics.peakHour !== undefined && !isNaN(metrics.peakHour)) {
    const hour = metrics.peakHour;
    let timeWindow = '';
    let advice = '';

    if (hour >= 6 && hour < 9) {
      timeWindow = 'Early mornings (6-9 AM)';
      advice = 'Schedule your most important decisions and creative work during these golden hours.';
    } else if (hour >= 9 && hour < 12) {
      timeWindow = 'Late mornings (9 AM-12 PM)';
      advice = 'This is your mental peak — ideal for complex problem-solving and deep work.';
    } else if (hour >= 12 && hour < 15) {
      timeWindow = 'Early afternoons (12-3 PM)';
      advice = 'Your steady afternoon energy is perfect for structured or collaborative tasks.';
    } else if (hour >= 15 && hour < 18) {
      timeWindow = 'Late afternoons (3-6 PM)';
      advice = 'Great time for review work, planning, and lighter administrative tasks.';
    } else {
      timeWindow = 'Evenings';
      advice = 'Your calm evening focus is wonderful for wrapping up loose ends and organizing.';
    }

    insights.push({
      id: `timing-peak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Peak Performance Window',
      insight: `${timeWindow} show your strongest focus and velocity.`,
      advice,
      tag: 'Timing Pattern',
      category: 'timing',
      color: INSIGHT_COLORS.timing,
    });
  }

  // Rhythm Score Analysis
  if (metrics.workRhythm >= 70 && !isNaN(metrics.workRhythm)) {
    insights.push({
      id: `timing-rhythm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Consistent Daily Rhythm',
      insight: `Your work rhythm score is ${Math.round(metrics.workRhythm)}% — you have a strong natural cadence.`,
      advice: 'Keep honoring this rhythm. Consistency like this builds sustainable productivity.',
      tag: 'Timing Pattern',
      category: 'timing',
      color: INSIGHT_COLORS.timing,
    });
  }

  // Time-of-Day Velocity (check for valid timestamps)
  const morningTasks = entries.filter(e => {
    try {
      const hour = new Date(e.started_at).getHours();
      return !isNaN(hour) && hour >= 6 && hour < 12;
    } catch {
      return false;
    }
  });

  const afternoonTasks = entries.filter(e => {
    try {
      const hour = new Date(e.started_at).getHours();
      return !isNaN(hour) && hour >= 12 && hour < 18;
    } catch {
      return false;
    }
  });

  if (morningTasks.length > afternoonTasks.length * 1.5 && morningTasks.length >= 2) {
    insights.push({
      id: `timing-morning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Morning Momentum',
      insight: 'You naturally build strong momentum in the mornings with higher task completion.',
      advice: 'Front-load your day with important work. Your morning energy is a superpower.',
      tag: 'Timing Pattern',
      category: 'timing',
      color: INSIGHT_COLORS.timing,
    });
  }

  return insights;
}

// 2️⃣ FOCUS INSIGHTS (Focus Score + Pauses + Task Type)
function generateFocusInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  if (entries.length < 3) return insights;

  // High Focus Score
  if (metrics.focusIndex >= 80) {
    insights.push({
      id: `focus-high-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Exceptional Focus Ability',
      insight: `Your focus score is ${metrics.focusIndex}% — you maintain impressive concentration.`,
      advice: 'This sustained attention is rare. Leverage it for your most complex challenges.',
      tag: 'Focus Pattern',
      category: 'focus',
      color: INSIGHT_COLORS.focus,
    });
  }

  // Deep Work Focus (need at least 2 deep work tasks)
  const deepWorkTasks = entries.filter(e => 
    e.task_type === 'Deep Work Task' || e.task_type === 'Long Task'
  );

  if (deepWorkTasks.length >= 2) {
    const deepWorkWithMinimalPauses = deepWorkTasks.filter(e => !e.paused_at);
    const deepWorkFocusRate = (deepWorkWithMinimalPauses.length / deepWorkTasks.length) * 100;

    if (deepWorkFocusRate >= 70) {
      insights.push({
        id: `focus-deepwork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Deep Work Mastery',
        insight: `You maintain ${Math.round(deepWorkFocusRate)}% uninterrupted focus on deep work tasks.`,
        advice: "Protect these flow states. They are where your best, most meaningful work happens.",
        tag: 'Deep Work',
        category: 'deepwork',
        color: INSIGHT_COLORS.deepwork,
      });
    }
    
    // Check for sustained long sessions (90+ minutes) that get fairness bonus
    const longSessions = deepWorkTasks.filter(e => 
      e.ended_at && e.accumulated_seconds && e.accumulated_seconds >= 90 * 60
    );
    
    if (longSessions.length >= 2) {
      insights.push({
        id: `focus-sustained-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Sustained Deep Work Sessions',
        insight: `Long tasks didn't reduce your Velocity score thanks to sustained deep work sessions (90+ min).`,
        advice: 'Your ability to maintain focus for extended periods is exceptional. These sessions now earn fairness bonuses!',
        tag: 'Deep Work',
        category: 'deepwork',
        color: INSIGHT_COLORS.deepwork,
      });
    }
  }

  // Task Type Focus Differences
  const quickTasks = entries.filter(e => e.task_type === 'Quick Task');
  const quickTasksWithPauses = quickTasks.filter(e => e.paused_at);

  if (quickTasks.length >= 3 && quickTasksWithPauses.length / quickTasks.length < 0.2) {
    insights.push({
      id: `focus-quick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Quick Task Flow',
      insight: 'You breeze through quick tasks with minimal interruptions — excellent natural flow.',
      advice: 'Batch 3-4 quick tasks together to maximize this momentum and build confidence.',
      tag: 'Momentum',
      category: 'momentum',
      color: INSIGHT_COLORS.momentum,
    });
  }

  return insights;
}

// 3️⃣ MOMENTUM INSIGHTS (Velocity + Quick-task bursts)
function generateMomentumInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  if (entries.length < 3) return insights;

  // High Momentum Score
  if (metrics.productivityMomentum >= 60) {
    insights.push({
      id: `momentum-high-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Strong Productive Flow',
      insight: `Your momentum score is ${metrics.productivityMomentum}% — you create powerful flow states.`,
      advice: 'When you feel this flow, ride it! Complete multiple tasks in succession.',
      tag: 'Momentum',
      category: 'momentum',
      color: INSIGHT_COLORS.momentum,
    });
  }

  // Velocity Analysis (Updated for new fair model)
  if (metrics.taskVelocity >= 60) {
    insights.push({
      id: `momentum-velocity-high-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Exceptional Task Velocity',
      insight: `Your velocity of ${metrics.taskVelocity}% shows excellent weighted output — you're completing high-value work efficiently.`,
      advice: 'This pace is impressive. You are balancing complexity and speed beautifully.',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  } else if (metrics.taskVelocity >= 40 && metrics.taskVelocity < 60) {
    // Check if user is doing deep/long work (which naturally lowers velocity but is valuable)
    const deepOrLongTasks = entries.filter(e => 
      e.task_type === 'Deep Work Task' || 
      e.task_type === 'Long Task' || 
      e.task_type === 'Very Long Task'
    );
    const deepOrLongRatio = deepOrLongTasks.length / entries.length;
    
    if (deepOrLongRatio >= 0.5) {
      insights.push({
        id: `momentum-velocity-strategic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Strategic Deep Work Focus',
        insight: `Your Velocity was ${metrics.taskVelocity}%, but you completed many long-term tasks — great strategic focus.`,
        advice: 'Lower velocity on deep work days is normal and valuable. You are investing in high-impact work.',
        tag: 'Deep Work',
        category: 'deepwork',
        color: INSIGHT_COLORS.deepwork,
      });
    }
  }

  // Quick Task Bursts
  const quickTasks = entries.filter(e => e.task_type === 'Quick Task' && e.ended_at);
  const sortedByTime = [...quickTasks].sort((a, b) => 
    new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
  );

  let maxBurst = 0;
  let currentBurst = 0;

  for (let i = 0; i < sortedByTime.length - 1; i++) {
    // Safety check: Ensure ended_at exists before calculating
    if (!sortedByTime[i].ended_at) continue;
    
    const timeBetween = new Date(sortedByTime[i + 1].started_at).getTime() - 
                       new Date(sortedByTime[i].ended_at!).getTime();
    
    if (timeBetween < 30 * 60 * 1000) { // < 30 minutes apart
      currentBurst++;
      maxBurst = Math.max(maxBurst, currentBurst);
    } else {
      currentBurst = 0;
    }
  }

  if (maxBurst >= 2) {
    insights.push({
      id: `momentum-burst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Task Burst Capability',
      insight: `You completed ${maxBurst + 1} quick tasks in rapid succession — powerful momentum building.`,
      advice: 'Start your day with 2-3 quick wins to activate this momentum state early.',
      tag: 'Momentum',
      category: 'momentum',
      color: INSIGHT_COLORS.momentum,
    });
  }
  
  // Balanced Task Mix (Quick Wins + Deep Work)
  const completedTasks = entries.filter(e => e.ended_at);
  const quickCompleted = completedTasks.filter(e => e.task_type === 'Quick Task' || e.task_type === 'Standard Task');
  const deepCompleted = completedTasks.filter(e => 
    e.task_type === 'Deep Work Task' || 
    e.task_type === 'Long Task' || 
    e.task_type === 'Very Long Task'
  );
  
  if (quickCompleted.length >= 2 && deepCompleted.length >= 2 && completedTasks.length >= 5) {
    insights.push({
      id: `momentum-balanced-mix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Optimal Task Mix',
      insight: 'Your best Velocity days happen when you mix quick wins + deep work blocks.',
      advice: 'This balance is ideal: quick tasks build momentum, deep work creates value. Keep this rhythm!',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  }

  return insights;
}

// 4️⃣ ENERGY INSIGHTS (Energy Check-ins + Task Length)
function generateEnergyInsights(
  entries: TimeEntry[],
  metrics: UserMetrics,
  energyEntries?: EnergyEntry[]
): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  if (entries.length < 3) return insights;

  // Energy Level Analysis
  if (metrics.energyLevel >= 70) {
    insights.push({
      id: `energy-high-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Strong Energy Management',
      insight: `Your energy level of ${metrics.energyLevel}% shows excellent vitality and pacing.`,
      advice: 'Keep balancing work intensity with recovery. Your energy management is working well.',
      tag: 'Energy',
      category: 'energy',
      color: INSIGHT_COLORS.energy,
    });
  } else if (metrics.energyLevel < 50) {
    insights.push({
      id: `energy-low-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Energy Recovery Needed',
      insight: `Your energy level of ${metrics.energyLevel}% suggests you might benefit from more rest.`,
      advice: 'Consider shorter work sessions, more breaks, or lighter task loads for recovery.',
      tag: 'Wellness',
      category: 'wellness',
      color: INSIGHT_COLORS.wellness,
    });
  }

  // Energy Check-in Patterns (if available)
  if (energyEntries && energyEntries.length >= 3) {
    const energyByTimeOfDay: Record<number, string[]> = {};
    
    energyEntries.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (!energyByTimeOfDay[hour]) energyByTimeOfDay[hour] = [];
      energyByTimeOfDay[hour].push(entry.energy_level);
    });

    // Find energy dips
    const afternoonEnergy = energyEntries.filter(e => {
      const hour = new Date(e.timestamp).getHours();
      return hour >= 14 && hour < 17;
    });

    const lowAfternoonEnergy = afternoonEnergy.filter(e => 
      e.energy_level === 'Low' || e.energy_level === 'Drained'
    );

    if (lowAfternoonEnergy.length >= 2) {
      insights.push({
        id: `energy-afternoon-dip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Afternoon Energy Dip',
        insight: 'Your energy consistently dips in the afternoon — a natural circadian pattern.',
        advice: 'Schedule admin, repetitive, or collaborative tasks during this window.',
        tag: 'Energy',
        category: 'energy',
        color: INSIGHT_COLORS.energy,
      });
    }
  }

  // Long Session Analysis
  const longSessions = entries.filter(e => 
    e.ended_at && e.accumulated_seconds > 90 * 60 // > 90 minutes
  );

  if (longSessions.length >= 2) {
    const lateNightSessions = longSessions.filter(e => {
      const hour = new Date(e.started_at).getHours();
      return hour >= 18;
    });

    if (lateNightSessions.length >= 2) {
      insights.push({
        id: `energy-late-sessions-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Late Work Sessions',
        insight: "You are working long sessions late in the day — watch for fatigue signals.",
        advice: 'Try shifting deep work earlier when your energy is naturally higher.',
        tag: 'Wellness',
        category: 'wellness',
        color: INSIGHT_COLORS.wellness,
      });
    }
  }

  return insights;
}

// 5️⃣ MOOD INSIGHTS (Mood Check-ins + Enjoyment)
function generateMoodInsights(entries: TimeEntry[], moodEntries?: MoodEntry[]): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  // Enjoyment Analysis (need at least 3 ratings with valid values)
  const tasksWithEnjoyment = entries.filter(e => 
    e.task_enjoyment !== null && 
    e.task_enjoyment !== undefined && 
    typeof e.task_enjoyment === 'number' && 
    e.task_enjoyment >= 1 && 
    e.task_enjoyment <= 5
  );
  
  if (tasksWithEnjoyment.length >= 3) {
    const avgEnjoyment = tasksWithEnjoyment.reduce((sum, e) => sum + e.task_enjoyment!, 0) / tasksWithEnjoyment.length;
    
    if (avgEnjoyment >= 3.5 && !isNaN(avgEnjoyment)) {
      insights.push({
        id: `mood-high-enjoyment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Positive Work Experience',
        insight: `Your average enjoyment rating is ${avgEnjoyment.toFixed(1)}/5 — you are genuinely enjoying your work!`,
        advice: 'This positive energy is sustainable. Keep noticing what makes tasks feel good.',
        tag: 'Wellness',
        category: 'enjoyment',
        color: INSIGHT_COLORS.enjoyment,
      });
    }

    // Find most enjoyed categories
    const lovedTasks = tasksWithEnjoyment.filter(e => e.task_enjoyment! >= 4);
    if (lovedTasks.length >= 2) {
      const lovedCategories = lovedTasks
        .filter(e => e.task_categories && e.task_categories.length > 0)
        .flatMap(e => e.task_categories!);
      
      if (lovedCategories.length > 0) {
        const categoryCount: Record<string, number> = {};
        lovedCategories.forEach(cat => {
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        
        const sortedLovedCategories = Object.entries(categoryCount).sort(([, a], [, b]) => b - a);
        
        if (sortedLovedCategories.length > 0) {
          const topCategory = sortedLovedCategories[0];
          
          insights.push({
            id: `mood-loved-category-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: 'Energizing Task Type',
            insight: `You love ${topCategory[0].toLowerCase()} tasks — they consistently lift your mood.`,
            advice: 'Schedule these tasks early to boost motivation and set a positive tone for your day.',
            tag: 'Category',
            category: 'enjoyment',
            color: INSIGHT_COLORS.enjoyment,
          });
        }
      }
    }
  }

  // Mood Entry Patterns (if available)
  if (moodEntries && moodEntries.length >= 3) {
    const positiveMoods = moodEntries.filter(e => e.mood_level === '😊' || e.mood_level === '🔥');
    const positiveMoodRate = (positiveMoods.length / moodEntries.length) * 100;

    if (positiveMoodRate >= 60) {
      insights.push({
        id: `mood-positive-trend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Positive Mood Trend',
        insight: `${Math.round(positiveMoodRate)}% of your check-ins show positive mood — wonderful emotional balance.`,
        advice: 'Your work environment and pacing are supporting your wellbeing. Keep it up!',
        tag: 'Wellness',
        category: 'wellness',
        color: INSIGHT_COLORS.wellness,
      });
    }
  }

  return insights;
}

// 6️⃣ CATEGORY INSIGHTS (Category frequency + efficiency)
function generateCategoryInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  const tasksWithCategories = entries.filter(e => e.task_categories && e.task_categories.length > 0);
  
  if (tasksWithCategories.length < 3) return insights;

  // Analyze category distribution
  const categoryCount: Record<string, number> = {};
  const categoryEfficiency: Record<string, number[]> = {};
  
  tasksWithCategories.forEach(e => {
    e.task_categories!.forEach(cat => {
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      
      if (e.goal_duration_minutes && e.accumulated_seconds) {
        const efficiency = e.goal_duration_minutes / (e.accumulated_seconds / 60);
        if (!categoryEfficiency[cat]) categoryEfficiency[cat] = [];
        categoryEfficiency[cat].push(efficiency);
      }
    });
  });

  // Find most common category
  const sortedCategories = Object.entries(categoryCount).sort(([, a], [, b]) => b - a);
  
  if (sortedCategories.length > 0) {
    const [topCategory, count] = sortedCategories[0];
    const percentage = (count / tasksWithCategories.length) * 100;

    if (percentage >= 30) {
      insights.push({
        id: `category-dominant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Primary Focus Area',
        insight: `${topCategory} tasks make up ${Math.round(percentage)}% of your work — this is your main focus.`,
        advice: 'Consider optimizing your workflow specifically for this type of work.',
        tag: 'Category',
        category: 'strength',
        color: INSIGHT_COLORS.strength,
      });
    }

    // Analyze efficiency for top category
    if (categoryEfficiency[topCategory] && categoryEfficiency[topCategory].length >= 2) {
      const avgEfficiency = categoryEfficiency[topCategory].reduce((a, b) => a + b, 0) / categoryEfficiency[topCategory].length;
      
      if (avgEfficiency >= 0.9 && avgEfficiency <= 1.1) {
        insights.push({
          id: `category-efficient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Category Mastery',
          insight: `You are highly efficient with ${topCategory.toLowerCase()} tasks — excellent time estimation.`,
          advice: 'This is a strength. Consider mentoring others or batching these tasks for even better flow.',
          tag: 'Strength',
          category: 'strength',
          color: INSIGHT_COLORS.strength,
        });
      }
    }
  }

  // Variety analysis
  const uniqueCategories = Object.keys(categoryCount).length;
  if (uniqueCategories >= 4) {
    insights.push({
      id: `category-variety-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Balanced Task Variety',
      insight: `You work across ${uniqueCategories} different task categories — great mental diversity.`,
      advice: 'This variety keeps your work engaging. Continue mixing task types for sustained energy.',
      tag: 'Wellness',
      category: 'wellness',
      color: INSIGHT_COLORS.wellness,
    });
  }

  return insights;
}

// 7️⃣ CONSISTENCY INSIGHTS (Consistency + Streak History)
function generateConsistencyInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  if (entries.length < 3) return insights;

  // Consistency Score Analysis
  if (metrics.consistencyScore >= 70) {
    insights.push({
      id: `consistency-high-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Excellent Consistency',
      insight: `Your consistency score is ${metrics.consistencyScore}% — you maintain balanced effort over time.`,
      advice: 'This steady rhythm is the foundation of sustainable productivity. Keep it up!',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  } else if (metrics.consistencyScore < 50) {
    insights.push({
      id: `consistency-building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Building Consistency',
      insight: `Your consistency score of ${metrics.consistencyScore}% shows room for more balanced pacing.`,
      advice: 'Try maintaining similar work hours each day. Even 20-30 minutes daily builds strong patterns.',
      tag: 'Wellness',
      category: 'wellness',
      color: INSIGHT_COLORS.wellness,
    });
  }

  // Detect streaks
  const dailyActivity: Record<string, number> = {};
  entries.forEach(e => {
    const date = new Date(e.created_at).toISOString().split('T')[0];
    dailyActivity[date] = (dailyActivity[date] || 0) + 1;
  });

  const activeDays = Object.keys(dailyActivity).sort();
  let currentStreak = 0;
  let maxStreak = 0;

  for (let i = 0; i < activeDays.length - 1; i++) {
    const today = new Date(activeDays[i]);
    const tomorrow = new Date(activeDays[i + 1]);
    const daysDiff = Math.floor((tomorrow.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      currentStreak++;
      maxStreak = Math.max(maxStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  if (maxStreak >= 3) {
    insights.push({
      id: `consistency-streak-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Strong Streak Building',
      insight: `You maintained a ${maxStreak + 1}-day work streak — impressive commitment.`,
      advice: 'Streaks like this compound over time. Even short daily sessions keep momentum alive.',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  }

  return insights;
}

// 8️⃣ COMPLETION INSIGHTS (Completion metric + goal tracking)
function generateCompletionInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  if (entries.length < 3) return insights;

  // Completion Rate Analysis
  if (metrics.taskCompletionRate >= 80) {
    insights.push({
      id: `completion-high-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Excellent Follow-Through',
      insight: `Your ${metrics.taskCompletionRate}% completion rate shows you finish what you start.`,
      advice: 'This reliability is powerful. Trust yourself with bigger, more ambitious challenges.',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  }

  // Task Type Completion Patterns
  const deepWorkTasks = entries.filter(e => 
    e.task_type === 'Deep Work Task' || e.task_type === 'Long Task'
  );
  const deepWorkCompleted = deepWorkTasks.filter(e => e.ended_at);

  if (deepWorkTasks.length >= 2 && deepWorkCompleted.length / deepWorkTasks.length >= 0.75) {
    insights.push({
      id: `completion-deepwork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Deep Work Completion',
      insight: "You complete most deep work sessions — that's impressive discipline and focus.",
      advice: 'This is a rare strength. Consider tackling even more complex or challenging projects.',
      tag: 'Deep Work',
      category: 'deepwork',
      color: INSIGHT_COLORS.deepwork,
    });
  }

  // Quick Task Speed (with validation)
  const quickTasks = entries.filter(e => e.task_type === 'Quick Task' && e.ended_at && e.accumulated_seconds);
  const avgQuickTaskTime = quickTasks.length > 0
    ? quickTasks.reduce((sum, e) => sum + (e.accumulated_seconds || 0), 0) / quickTasks.length / 60
    : 0;

  if (quickTasks.length >= 3 && avgQuickTaskTime > 0 && avgQuickTaskTime <= 15) {
    insights.push({
      id: `completion-quick-speed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Rapid Task Completion',
      insight: `You complete quick tasks in ${Math.round(avgQuickTaskTime)} minutes on average — excellent efficiency.`,
      advice: 'Use this speed as confidence builders. Start days with 2-3 quick wins for momentum.',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  }

  return insights;
}

// 9️⃣ EFFICIENCY INSIGHTS (Efficiency + task type normalization + estimation accuracy)
function generateEfficiencyInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  if (entries.length < 3) return insights;

  // Efficiency Score Analysis
  if (metrics.efficiencyScore >= 75) {
    insights.push({
      id: `efficiency-high-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'High Efficiency',
      insight: `Your ${metrics.efficiencyScore}% efficiency score shows excellent time management.`,
      advice: 'You work smart, not just hard. Keep refining this natural pacing awareness.',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  } else if (metrics.efficiencyScore < 50) {
    insights.push({
      id: `efficiency-building-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Refining Efficiency',
      insight: `Your ${metrics.efficiencyScore}% efficiency suggests tasks take longer than expected.`,
      advice: 'Consider breaking large tasks into smaller chunks or adding buffer time to estimates.',
      tag: 'Accuracy',
      category: 'accuracy',
      color: INSIGHT_COLORS.accuracy,
    });
  }

  // Estimation Accuracy (need at least 3 tasks with goals and valid data)
  const tasksWithGoals = entries.filter(e => 
    e.goal_duration_minutes && 
    e.goal_duration_minutes > 0 && 
    e.ended_at &&
    e.accumulated_seconds &&
    e.accumulated_seconds > 0 &&
    typeof e.goal_duration_minutes === 'number' &&
    typeof e.accumulated_seconds === 'number' &&
    !isNaN(e.goal_duration_minutes) &&
    !isNaN(e.accumulated_seconds)
  );
  
  if (tasksWithGoals.length >= 3) {
    const accuracyScores = tasksWithGoals.map(e => {
      const goalMinutes = e.goal_duration_minutes!;
      const actualMinutes = e.accumulated_seconds! / 60;
      
      // Additional safety check
      if (actualMinutes === 0 || isNaN(actualMinutes)) {
        return { deviation: 999, ratio: 999, invalid: true };
      }
      
      const ratio = goalMinutes / actualMinutes;
      const deviation = Math.abs(1 - ratio);
      return { deviation, ratio, invalid: false };
    }).filter(s => !s.invalid);

    // Check if we still have enough valid scores
    if (accuracyScores.length < 3) return insights;

    const avgDeviation = accuracyScores.reduce((sum, s) => sum + s.deviation, 0) / accuracyScores.length;
    const accuracyPercent = Math.round((1 - avgDeviation) * 100);

    if (avgDeviation <= 0.20) {
      insights.push({
        id: `efficiency-estimation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Excellent Time Estimation',
        insight: `Your task estimates are ${accuracyPercent}% accurate — your internal clock is well-calibrated!`,
        advice: 'Trust your instincts on new tasks. This accuracy is a competitive advantage.',
        tag: 'Accuracy',
        category: 'accuracy',
        color: INSIGHT_COLORS.accuracy,
      });
    } else if (avgDeviation > 0.40) {
      const avgRatio = accuracyScores.reduce((sum, s) => sum + s.ratio, 0) / accuracyScores.length;
      
      if (avgRatio < 0.8) {
        insights.push({
          id: `efficiency-underestimate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Faster Than Expected',
          insight: 'You tend to finish tasks faster than estimated — efficient work!',
          advice: 'You might be underestimating your abilities. Try slightly more ambitious goals.',
          tag: 'Accuracy',
          category: 'accuracy',
          color: INSIGHT_COLORS.accuracy,
        });
      } else if (avgRatio > 1.3) {
        insights.push({
          id: `efficiency-overestimate-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Quality Takes Time',
          insight: "Tasks often take longer than expected — that's normal for quality work.",
          advice: 'Add 20-30% buffer time to estimates for more realistic planning.',
          tag: 'Accuracy',
          category: 'accuracy',
          color: INSIGHT_COLORS.accuracy,
        });
      }
    }
  }

  return insights;
}

// 🎯 PRIORITY INSIGHTS (Task Priority Patterns)
function generatePriorityInsights(entries: TimeEntry[], metrics: UserMetrics): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];
  
  // Minimum threshold: Need at least 5 tasks with priority data
  const tasksWithPriority = entries.filter(e => e.task_priority);
  if (tasksWithPriority.length < 5) return insights;

  // Count priority distribution
  const priorityCounts: Record<string, number> = {};
  const priorityCompleted: Record<string, number> = {};
  
  tasksWithPriority.forEach(e => {
    const priority = e.task_priority!;
    priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;
    if (e.ended_at) {
      priorityCompleted[priority] = (priorityCompleted[priority] || 0) + 1;
    }
  });

  const totalTasks = tasksWithPriority.length;

  // 🟣 Priority Strength Pattern
  const immediateImpact = priorityCounts['Immediate Impact Task'] || 0;
  const daily = priorityCounts['Daily Task'] || 0;
  const urgentTotal = immediateImpact + daily;
  const urgentRatio = urgentTotal / totalTasks;

  if (urgentRatio > 0.6 && (priorityCompleted['Immediate Impact Task'] || 0) >= 3) {
    insights.push({
      id: `priority-strength-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Urgent Task Strength',
      insight: 'You handle Immediate Impact and Daily tasks exceptionally well — huge strength.',
      advice: 'Keep protecting your high-urgency windows for these priority tasks.',
      tag: 'Strength',
      category: 'strength',
      color: INSIGHT_COLORS.strength,
    });
  }

  // 💛 Avoidance Pattern (Monthly/Evergreen neglect)
  const monthly = priorityCounts['Monthly Task'] || 0;
  const evergreen = priorityCounts['Evergreen Task'] || 0;
  const longTermTotal = monthly + evergreen;
  const longTermRatio = longTermTotal / totalTasks;

  if (longTermRatio < 0.15 && totalTasks > 10) {
    insights.push({
      id: `priority-avoidance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Long-Term Planning',
      insight: 'You tend to delay Monthly and Evergreen tasks — totally normal for busy schedules.',
      advice: 'Try batching one or two long-term tasks early in the week for peace of mind. These tasks now contribute more to your Velocity score!',
      tag: 'Wellness',
      category: 'wellness',
      color: INSIGHT_COLORS.wellness,
    });
  } else if (longTermRatio >= 0.25 && (priorityCompleted['Evergreen Task'] || 0) >= 2) {
    // Positive reinforcement for completing long-term work
    insights.push({
      id: `priority-longterm-strength-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Strategic Task Balance',
      insight: 'You improved Velocity by focusing more on Weekly/Monthly tasks — great balance.',
      advice: 'Evergreen tasks contributed more value this week. Your consistency is growing!',
      tag: 'Priority',
      category: 'priority',
      color: INSIGHT_COLORS.priority,
    });
  }

  // 🩵 Energy Alignment Pattern
  // Check if Evergreen tasks are scheduled during afternoon/evening (low-energy times)
  const evergreenTasks = tasksWithPriority.filter(e => e.task_priority === 'Evergreen Task');
  const evergreenInAfternoon = evergreenTasks.filter(e => {
    const hour = new Date(e.started_at).getHours();
    return hour >= 14 && hour < 18;
  }).length;

  if (evergreenTasks.length >= 3 && evergreenInAfternoon / evergreenTasks.length > 0.5) {
    insights.push({
      id: `priority-energy-align-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Smart Energy Alignment',
      insight: 'You tend to complete Evergreen tasks when energy dips — perfect self-regulation.',
      advice: 'Your instinct for saving flexible tasks for low-energy windows is spot on.',
      tag: 'Energy',
      category: 'energy',
      color: INSIGHT_COLORS.energy,
    });
  }

  // 💚 Weekly Cycle Pattern
  // Check if Daily tasks peak on certain days (e.g., Monday/Thursday)
  const dailyTasksByDay: Record<string, number> = {};
  tasksWithPriority.filter(e => e.task_priority === 'Daily Task').forEach(e => {
    const day = new Date(e.started_at).toLocaleDateString('en-US', { weekday: 'long' });
    dailyTasksByDay[day] = (dailyTasksByDay[day] || 0) + 1;
  });

  const peakDays = Object.entries(dailyTasksByDay)
    .filter(([_, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([day]) => day);

  if (peakDays.length > 0) {
    insights.push({
      id: `priority-weekly-cycle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Weekly Rhythm Detected',
      insight: `Your Daily tasks peak on ${peakDays.join(' and ')} — strong weekly rhythm.`,
      advice: 'Keep this natural weekly pattern — consistency like this builds great habits.',
      tag: 'Timing Pattern',
      category: 'timing',
      color: INSIGHT_COLORS.timing,
    });
  }

  // 🟡 Balance Warning (too much urgent work)
  if (urgentRatio > 0.8 && totalTasks > 15) {
    insights.push({
      id: `priority-balance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Mostly Urgent Tasks',
      insight: 'Over 80% of your work is Immediate or Daily priority — high-pressure load.',
      advice: 'Try scheduling one or two Weekly/Monthly tasks to maintain balance.',
      tag: 'Wellness',
      category: 'wellness',
      color: INSIGHT_COLORS.wellness,
    });
  }

  return insights;
}

// Helper: Select top insights ensuring category diversity
function selectTopInsights(insights: BehaviorInsight[], maxCount: number): BehaviorInsight[] {
  if (insights.length <= maxCount) return insights;

  // Ensure at least 1 per category (when available)
  const categorySeen = new Set<string>();
  const selected: BehaviorInsight[] = [];

  // First pass: Select one from each category
  for (const insight of insights) {
    if (!categorySeen.has(insight.category)) {
      selected.push(insight);
      categorySeen.add(insight.category);
      
      if (selected.length >= maxCount) break;
    }
  }

  // Second pass: Fill remaining slots with highest priority insights
  if (selected.length < maxCount) {
    const remaining = insights.filter(i => !selected.includes(i));
    selected.push(...remaining.slice(0, maxCount - selected.length));
  }

  return selected;
}
