/**
 * Smart DAR Snapshot Service
 * 
 * This service handles saving comprehensive Smart DAR metrics snapshots
 * when users submit their DAR. The snapshot captures the exact state
 * of the dashboard for historical viewing.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  calculateTimeBasedEfficiency,
  calculatePriorityCompletion,
  calculateEstimationAccuracyCompletion,
  calculateEnhancedCompletion,
  calculateEnhancedFocusScore,
  calculateEnhancedVelocity,
  calculateEnhancedRhythm,
  calculateEnhancedEnergy,
  calculateEnhancedUtilization,
  calculateEnhancedMomentum,
  calculateEnhancedConsistency,
  findPeakHour,
} from './enhancedMetrics';
import { analyzeBehaviorPatterns } from './behaviorAnalysis';
import { startOfDayEST, endOfDayEST, nowEST } from './timezoneUtils';

export interface SnapshotParams {
  supabase: SupabaseClient;
  userId: string;
  submissionId: string;
  snapshotDate: string;
  allTimeEntries: any[];
  earliestClockIn: string | null;
  latestClockOut: string | null;
  clockInRecord: any;
  totalHours: number;
}

export async function saveSmartDARSnapshot(params: SnapshotParams): Promise<void> {
  const { 
    supabase, 
    userId, 
    submissionId, 
    snapshotDate, 
    allTimeEntries,
    earliestClockIn,
    latestClockOut,
    clockInRecord,
    totalHours
  } = params;
  
  try {
    console.log('📊 Calculating COMPREHENSIVE Smart DAR metrics snapshot...');
    
    // Fetch mood and energy entries for today
    const todayStart = startOfDayEST(nowEST());
    const todayEnd = endOfDayEST(nowEST());
    
    const { data: moodData } = await (supabase as any)
      .from('mood_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString());
    
    const { data: energyData } = await (supabase as any)
      .from('energy_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString());
    
    const moodEntries = moodData || [];
    const energyEntries = energyData || [];
    
    // Calculate all 9 metrics using the task entries
    const taskEntries = allTimeEntries;
    const completedTasksForMetrics = taskEntries.filter((e: any) => e.ended_at);
    const activeTasksForMetrics = taskEntries.filter((e: any) => !e.ended_at && !e.paused_at);
    const pausedTasksForMetrics = taskEntries.filter((e: any) => e.paused_at && !e.ended_at);
    
    // Use clock-in data for metric calculations
    const clockInForMetrics = clockInRecord ? {
      clocked_in_at: earliestClockIn || new Date().toISOString(),
      clocked_out_at: latestClockOut || new Date().toISOString(),
    } : null;
    
    // ═══════════════════════════════════════════════════════════════
    // CALCULATE ALL 9 CORE METRICS
    // ═══════════════════════════════════════════════════════════════
    const efficiency = calculateTimeBasedEfficiency(taskEntries, clockInForMetrics);
    const priorityCompletionScore = calculatePriorityCompletion(taskEntries);
    const estimationAccuracy = calculateEstimationAccuracyCompletion(taskEntries);
    const taskCompletionRate = calculateEnhancedCompletion(taskEntries);
    const focusIndex = calculateEnhancedFocusScore(taskEntries, moodEntries, energyEntries);
    const taskVelocity = calculateEnhancedVelocity(taskEntries);
    const workRhythm = calculateEnhancedRhythm(taskEntries, moodEntries, energyEntries);
    const energyLevel = calculateEnhancedEnergy(taskEntries, energyEntries, moodEntries, clockInForMetrics);
    
    const surveyData = {
      responses: (moodEntries?.length || 0) + (energyEntries?.length || 0),
      sent: Math.max((moodEntries?.length || 0) + (energyEntries?.length || 0), 1)
    };
    
    const timeUtilization = calculateEnhancedUtilization(taskEntries, clockInForMetrics, surveyData);
    const productivityMomentum = calculateEnhancedMomentum(taskEntries, moodEntries, energyEntries, clockInForMetrics);
    const consistency = calculateEnhancedConsistency(taskEntries, moodEntries, energyEntries, clockInForMetrics);
    const peakHour = findPeakHour(taskEntries);
    
    // ═══════════════════════════════════════════════════════════════
    // CALCULATE TIME STATISTICS
    // ═══════════════════════════════════════════════════════════════
    let totalActiveTime = 0;
    let totalPausedTime = 0;
    let deepWorkMinutes = 0;
    let deepWorkBlocks = 0;
    let quickTaskCount = 0;
    
    taskEntries.forEach((entry: any) => {
      const actualDuration = entry.accumulated_seconds || 0;
      totalActiveTime += actualDuration;
      
      // Track deep work (20+ minutes uninterrupted)
      if (actualDuration >= 1200) { // 20 minutes = 1200 seconds
        deepWorkBlocks++;
        deepWorkMinutes += Math.floor(actualDuration / 60);
      }
      
      // Track quick tasks (<15 minutes)
      if (actualDuration < 900) { // 15 minutes = 900 seconds
        quickTaskCount++;
      }
      
      if (entry.ended_at) {
        const totalTaskTime = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
        const pauseTime = Math.max(0, totalTaskTime - actualDuration);
        totalPausedTime += pauseTime;
      }
    });
    
    const avgTimePerTask = completedTasksForMetrics.length > 0 
      ? totalActiveTime / completedTasksForMetrics.length 
      : 0;
    
    // Delayed tasks count
    const delayedCount = pausedTasksForMetrics.filter((e: any) => {
      if (e.paused_at) {
        const pausedTime = new Date(e.paused_at).getTime();
        const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
        return pausedTime < thirtyMinAgo;
      }
      return false;
    }).length;
    
    // ═══════════════════════════════════════════════════════════════
    // CALCULATE TASK BREAKDOWNS BY TYPE & PRIORITY
    // ═══════════════════════════════════════════════════════════════
    const tasksByType: Record<string, number> = {};
    const tasksByPriority: Record<string, number> = {};
    const tasksByCategory: Record<string, number> = {};
    
    completedTasksForMetrics.forEach((task: any) => {
      // By type
      const taskType = task.task_type || 'Standard Task';
      tasksByType[taskType] = (tasksByType[taskType] || 0) + 1;
      
      // By priority
      const priority = task.task_priority || 'Daily Task';
      tasksByPriority[priority] = (tasksByPriority[priority] || 0) + 1;
      
      // By category
      if (task.task_categories && Array.isArray(task.task_categories)) {
        task.task_categories.forEach((cat: string) => {
          tasksByCategory[cat] = (tasksByCategory[cat] || 0) + 1;
        });
      }
    });
    
    // ═══════════════════════════════════════════════════════════════
    // CALCULATE MOOD & ENERGY DISTRIBUTIONS
    // ═══════════════════════════════════════════════════════════════
    const moodDistribution: Record<string, number> = {};
    const energyDistribution: Record<string, number> = {};
    
    moodEntries.forEach((m: any) => {
      const mood = m.mood_level || 'Unknown';
      moodDistribution[mood] = (moodDistribution[mood] || 0) + 1;
    });
    
    energyEntries.forEach((e: any) => {
      const energy = e.energy_level || 'Unknown';
      energyDistribution[energy] = (energyDistribution[energy] || 0) + 1;
    });
    
    // Find most common mood and energy
    const avgMood = Object.entries(moodDistribution).length > 0
      ? Object.entries(moodDistribution).sort((a, b) => b[1] - a[1])[0][0]
      : null;
    const avgEnergy = Object.entries(energyDistribution).length > 0
      ? Object.entries(energyDistribution).sort((a, b) => b[1] - a[1])[0][0]
      : null;
    
    // ═══════════════════════════════════════════════════════════════
    // FETCH POINTS & STREAK DATA
    // ═══════════════════════════════════════════════════════════════
    const { data: pointsData } = await (supabase as any)
      .from('points_history')
      .select('points')
      .eq('user_id', userId)
      .gte('timestamp', todayStart.toISOString())
      .lte('timestamp', todayEnd.toISOString());
    
    const pointsEarned = (pointsData || []).reduce((sum: number, p: any) => sum + (p.points || 0), 0);
    
    // Fetch current streak data
    const { data: userProfile } = await (supabase as any)
      .from('user_profiles')
      .select('weekday_streak, weekend_bonus_streak')
      .eq('id', userId)
      .single();
    
    const weekdayStreak = userProfile?.weekday_streak || 0;
    const weekendBonusStreak = userProfile?.weekend_bonus_streak || 0;
    
    // ═══════════════════════════════════════════════════════════════
    // CHECK GOAL COMPLETION
    // ═══════════════════════════════════════════════════════════════
    const dailyGoalMet = clockInRecord?.daily_task_goal 
      ? completedTasksForMetrics.length >= clockInRecord.daily_task_goal
      : false;
    
    const shiftPlanMet = clockInRecord?.planned_shift_minutes
      ? (totalActiveTime / 60) >= (clockInRecord.planned_shift_minutes * 0.8) // 80% of planned
      : false;
    
    // ═══════════════════════════════════════════════════════════════
    // GENERATE EXPERT INSIGHT
    // ═══════════════════════════════════════════════════════════════
    let expertInsight = '';
    if (efficiency >= 80 && taskCompletionRate >= 80) {
      expertInsight = `Outstanding day! You achieved ${efficiency}% efficiency with ${completedTasksForMetrics.length} tasks completed. Your focus and momentum were exceptional.`;
    } else if (efficiency >= 60) {
      expertInsight = `Solid performance today with ${efficiency}% efficiency. ${completedTasksForMetrics.length} tasks completed. Consider reducing pauses to boost your rhythm.`;
    } else if (completedTasksForMetrics.length > 0) {
      expertInsight = `You completed ${completedTasksForMetrics.length} tasks today. Focus on longer uninterrupted work blocks to improve efficiency.`;
    } else {
      expertInsight = `No tasks completed today. Start with small wins to build momentum for tomorrow.`;
    }
    
    // ═══════════════════════════════════════════════════════════════
    // CAPTURE COMPLETED TASKS FOR TASK ANALYSIS SECTION
    // ═══════════════════════════════════════════════════════════════
    const completedTasksSnapshot = completedTasksForMetrics.slice(-10).map((task: any) => ({
      id: task.id,
      task_description: task.task_description,
      client_name: task.client_name,
      task_type: task.task_type || null,
      task_priority: task.task_priority || null,
      task_intent: task.task_intent || null,
      task_categories: task.task_categories || [],
      task_enjoyment: task.task_enjoyment || null,
      goal_duration_minutes: task.goal_duration_minutes || null,
      accumulated_seconds: task.accumulated_seconds || 0,
      started_at: task.started_at,
      ended_at: task.ended_at,
    }));
    
    // ═══════════════════════════════════════════════════════════════
    // CAPTURE PRODUCTIVITY DATA FOR BAR CHART
    // ═══════════════════════════════════════════════════════════════
    const productivityDataSnapshot = [
      { name: 'Efficiency', value: efficiency, description: 'Time utilization & estimation' },
      { name: 'Completion', value: taskCompletionRate, description: 'Priority + accuracy weighted' },
      { name: 'Focus', value: focusIndex, description: 'Energy & enjoyment aware' },
      { name: 'Velocity', value: taskVelocity, description: 'Complexity & priority weighted output' },
      { name: 'Rhythm', value: workRhythm, description: 'Time-of-day patterns' },
      { name: 'Energy', value: energyLevel, description: 'Recovery & flow aware' },
      { name: 'Utilization', value: Math.min(100, Math.round(timeUtilization)), description: 'Context-interpreted' },
      { name: 'Momentum', value: productivityMomentum, description: 'Flow state detection' },
      { name: 'Consistency', value: consistency, description: 'Mood/energy stability' },
    ];
    
    // ═══════════════════════════════════════════════════════════════
    // GENERATE BEHAVIOR INSIGHTS (For Behavior Insights Cards)
    // ═══════════════════════════════════════════════════════════════
    const metricsForInsights = {
      efficiencyScore: efficiency,
      taskCompletionRate: taskCompletionRate,
      focusIndex: focusIndex,
      taskVelocity: taskVelocity,
      workRhythm: workRhythm,
      energyLevel: energyLevel,
      timeUtilization: Math.min(100, Math.round(timeUtilization)),
      productivityMomentum: productivityMomentum,
      consistencyScore: consistency,
      peakHour: peakHour,
    };
    
    const behaviorInsightsSnapshot = analyzeBehaviorPatterns(
      taskEntries,
      metricsForInsights,
      moodEntries,
      energyEntries
    );
    
    // ═══════════════════════════════════════════════════════════════
    // CREATE COMPREHENSIVE SNAPSHOT - EXACT DASHBOARD STATE
    // ═══════════════════════════════════════════════════════════════
    const snapshotData = {
      user_id: userId,
      submission_id: submissionId,
      snapshot_date: snapshotDate,
      
      // ═══ CORE 9 METRICS (Bar Chart) ═══
      efficiency_score: efficiency,
      completion_rate: taskCompletionRate,
      priority_completion: priorityCompletionScore,
      estimation_accuracy: estimationAccuracy,
      focus_index: focusIndex,
      task_velocity: taskVelocity,
      work_rhythm: workRhythm,
      energy_level: energyLevel,
      time_utilization: Math.min(100, Math.round(timeUtilization)),
      productivity_momentum: productivityMomentum,
      consistency_score: consistency,
      
      // ═══ QUICK STATS GRID ═══
      total_tasks: taskEntries.length,
      completed_tasks: completedTasksForMetrics.length,
      active_tasks: activeTasksForMetrics.length,
      paused_tasks: pausedTasksForMetrics.length,
      delayed_tasks: delayedCount,
      
      // ═══ TIME CARD DATA ═══
      total_active_time: Math.round(totalActiveTime),
      total_paused_time: Math.round(totalPausedTime),
      avg_time_per_task: Math.round(avgTimePerTask),
      total_shift_hours: totalHours,
      
      // ═══ CLOCK-IN/OUT DATA ═══
      clocked_in_at: earliestClockIn,
      clocked_out_at: latestClockOut || new Date().toISOString(),
      planned_shift_minutes: clockInRecord?.planned_shift_minutes || null,
      daily_task_goal: clockInRecord?.daily_task_goal || null,
      
      // ═══ PEAK HOUR CARD ═══
      peak_hour: peakHour,
      
      // ═══ POINTS & STREAKS ═══
      points_earned: pointsEarned,
      weekday_streak: weekdayStreak,
      weekend_bonus_streak: weekendBonusStreak,
      
      // ═══ PIE CHART DATA (Task Breakdowns) ═══
      tasks_by_type: tasksByType,
      tasks_by_priority: tasksByPriority,
      tasks_by_category: tasksByCategory,
      
      // ═══ DEEP WORK METRICS ═══
      deep_work_blocks: deepWorkBlocks,
      deep_work_minutes: deepWorkMinutes,
      quick_task_count: quickTaskCount,
      
      // ═══ MOOD/ENERGY SECTION ═══
      mood_entries_count: moodEntries.length,
      energy_entries_count: energyEntries.length,
      avg_mood: avgMood,
      avg_energy: avgEnergy,
      mood_distribution: moodDistribution,
      energy_distribution: energyDistribution,
      
      // ═══ EXPERT INSIGHT TEXT ═══
      expert_insight: expertInsight,
      
      // ═══ GOAL TRACKING ═══
      daily_goal_met: dailyGoalMet,
      shift_plan_met: shiftPlanMet,
      
      // ═══ TASK ANALYSIS SECTION (Recent Completed Tasks) ═══
      completed_tasks_details: completedTasksSnapshot,
      
      // ═══ PRODUCTIVITY BAR CHART DATA ═══
      productivity_data: productivityDataSnapshot,
      
      // ═══ BEHAVIOR INSIGHTS CARDS ═══
      behavior_insights: behaviorInsightsSnapshot,
    };
    
    console.log('📊 COMPREHENSIVE Smart DAR Snapshot:', snapshotData);
    
    // Insert or update the snapshot (upsert)
    const { error: snapshotError } = await (supabase as any)
      .from('smart_dar_snapshots')
      .upsert(snapshotData, { 
        onConflict: 'user_id,snapshot_date',
        ignoreDuplicates: false 
      });
    
    if (snapshotError) {
      console.error('⚠️ Failed to save Smart DAR snapshot:', snapshotError);
      console.error('   Error code:', snapshotError.code);
      console.error('   Error message:', snapshotError.message);
      console.error('   Error details:', snapshotError.details);
      console.error('   Snapshot date:', snapshotDate);
      console.error('   User ID:', userId);
      
      // Check for common issues
      if (snapshotError.code === '23505') {
        console.error('   ℹ️ Duplicate entry - snapshot for this date already exists');
      } else if (snapshotError.code === '42501') {
        console.error('   ℹ️ Permission denied - RLS policy may be blocking insert');
      } else if (snapshotError.code === '23503') {
        console.error('   ℹ️ Foreign key violation - user_id or submission_id may not exist');
      }
    } else {
      console.log('✅ COMPREHENSIVE Smart DAR metrics snapshot saved successfully!');
      console.log('   📅 Date:', snapshotDate);
      console.log('   👤 User:', userId);
      console.log('   - 9 core metrics ✓');
      console.log('   - Task breakdowns by type/priority/category ✓');
      console.log('   - Deep work metrics ✓');
      console.log('   - Mood/energy distributions ✓');
      console.log('   - Points & streaks ✓');
      console.log('   - Goal tracking ✓');
    }
  } catch (snapshotErr: any) {
    console.error('⚠️ Error creating Smart DAR snapshot:', snapshotErr);
    console.error('   Stack:', snapshotErr?.stack);
    // Don't fail the submission, just log the error
  }
}

