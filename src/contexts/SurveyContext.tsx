import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { playNotificationSound } from '@/utils/notificationSound';
import { startOfDayEST, endOfDayEST, nowEST } from '@/utils/timezoneUtils';

// ============================================================================
// SURVEY CONTEXT - GLOBAL PROVIDER FOR MOOD & ENERGY CHECK-INS
// ============================================================================
// This provider runs at the app root level and manages:
// - 30-minute interval timers for mood/energy surveys
// - 30-second auto-dismiss with missed survey logging
// - Database logging for all survey events (answered/missed)
// - Notifications for survey events
// - Works across ALL tabs and pages
// ============================================================================

interface SurveyEvent {
  id?: string;
  user_id: string;
  type: 'mood' | 'energy';
  value: string | null;
  responded: boolean;
  timestamp: string;
}

interface SurveyStats {
  totalMoodSurveys: number;
  missedMoodSurveys: number;
  totalEnergySurveys: number;
  missedEnergySurveys: number;
  moodMissRate: number;
  energyMissRate: number;
  overallMissRate: number;
  engagementPenalty: boolean;
}

interface SurveyContextType {
  // Popup states
  moodCheckOpen: boolean;
  energyCheckOpen: boolean;
  
  // Control functions
  setMoodCheckOpen: (open: boolean) => void;
  setEnergyCheckOpen: (open: boolean) => void;
  
  // Submit handlers
  handleMoodSubmit: (mood: string) => Promise<void>;
  handleEnergySubmit: (energy: string) => Promise<void>;
  
  // Missed handlers
  handleMoodMissed: () => Promise<void>;
  handleEnergyMissed: () => Promise<void>;
  
  // Stats for penalty calculation
  surveyStats: SurveyStats;
  
  // Last check times
  lastMoodCheckTime: number;
  lastEnergyCheckTime: number;
  
  // Clock-in state (for timer management)
  setClockInState: (clockedIn: boolean, clockInTime?: Date) => void;
}

const SurveyContext = createContext<SurveyContextType | null>(null);

export function useSurvey() {
  const context = useContext(SurveyContext);
  if (!context) {
    throw new Error('useSurvey must be used within a SurveyProvider');
  }
  return context;
}

// Safe hook that returns null if not in provider (for pages that don't need surveys)
export function useSurveySafe() {
  return useContext(SurveyContext);
}

interface SurveyProviderProps {
  children: React.ReactNode;
}

export function SurveyProvider({ children }: SurveyProviderProps) {
  // User state
  const [userId, setUserId] = useState<string | null>(null);
  
  // Popup states
  const [moodCheckOpen, setMoodCheckOpen] = useState(false);
  const [energyCheckOpen, setEnergyCheckOpen] = useState(false);
  
  // Timer tracking
  const [lastMoodCheckTime, setLastMoodCheckTime] = useState<number>(0);
  const [lastEnergyCheckTime, setLastEnergyCheckTime] = useState<number>(0);
  
  // Clock-in state
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  
  // Survey stats for penalty calculation
  const [surveyStats, setSurveyStats] = useState<SurveyStats>({
    totalMoodSurveys: 0,
    missedMoodSurveys: 0,
    totalEnergySurveys: 0,
    missedEnergySurveys: 0,
    moodMissRate: 0,
    energyMissRate: 0,
    overallMissRate: 0,
    engagementPenalty: false,
  });
  
  // Ref to track if initial survey check was done
  const initialCheckDone = useRef(false);
  
  // Timer interval ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================================================
  // FETCH USER ON MOUNT
  // ============================================================================
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
    
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================================
  // LOAD RECENT SURVEYS ON MOUNT (prevents popup on refresh)
  // ============================================================================
  useEffect(() => {
    if (!userId || initialCheckDone.current) return;
    
    const checkRecentSurveys = async () => {
      try {
        const todayStart = startOfDayEST(nowEST());
        const todayEnd = endOfDayEST(nowEST());
        
        // Check for mood entries today
        const { data: recentMood } = await (supabase as any)
          .from('mood_entries')
          .select('timestamp')
          .eq('user_id', userId)
          .gte('timestamp', todayStart.toISOString())
          .lte('timestamp', todayEnd.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);
        
        // Check for energy entries today
        const { data: recentEnergy } = await (supabase as any)
          .from('energy_entries')
          .select('timestamp')
          .eq('user_id', userId)
          .gte('timestamp', todayStart.toISOString())
          .lte('timestamp', todayEnd.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);
        
        if (recentMood && recentMood.length > 0) {
          const lastMoodTime = new Date(recentMood[0].timestamp).getTime();
          console.log('[SurveyProvider] Found recent mood entry, setting lastMoodCheckTime');
          setLastMoodCheckTime(lastMoodTime);
        }
        
        if (recentEnergy && recentEnergy.length > 0) {
          const lastEnergyTime = new Date(recentEnergy[0].timestamp).getTime();
          console.log('[SurveyProvider] Found recent energy entry, setting lastEnergyCheckTime');
          setLastEnergyCheckTime(lastEnergyTime);
        }
        
        // Load survey stats for penalty calculation
        await loadSurveyStats();
        
        initialCheckDone.current = true;
      } catch (error) {
        console.error('[SurveyProvider] Error checking recent surveys:', error);
      }
    };
    
    checkRecentSurveys();
  }, [userId]);

  // ============================================================================
  // LOAD SURVEY STATS FOR PENALTY CALCULATION
  // ============================================================================
  const loadSurveyStats = useCallback(async () => {
    if (!userId) return;
    
    try {
      const todayStart = startOfDayEST(nowEST());
      const todayEnd = endOfDayEST(nowEST());
      
      // Get all mood entries today (both answered and missed)
      const { data: moodData } = await (supabase as any)
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', todayStart.toISOString())
        .lte('timestamp', todayEnd.toISOString());
      
      // Get all energy entries today
      const { data: energyData } = await (supabase as any)
        .from('energy_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', todayStart.toISOString())
        .lte('timestamp', todayEnd.toISOString());
      
      // Get survey events (for missed tracking)
      const { data: surveyEvents } = await (supabase as any)
        .from('survey_events')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', todayStart.toISOString())
        .lte('timestamp', todayEnd.toISOString());
      
      const moodAnswered = moodData?.length || 0;
      const energyAnswered = energyData?.length || 0;
      
      const moodMissed = surveyEvents?.filter((e: SurveyEvent) => e.type === 'mood' && !e.responded).length || 0;
      const energyMissed = surveyEvents?.filter((e: SurveyEvent) => e.type === 'energy' && !e.responded).length || 0;
      
      const totalMood = moodAnswered + moodMissed;
      const totalEnergy = energyAnswered + energyMissed;
      const totalSurveys = totalMood + totalEnergy;
      const totalMissed = moodMissed + energyMissed;
      
      const moodMissRate = totalMood > 0 ? moodMissed / totalMood : 0;
      const energyMissRate = totalEnergy > 0 ? energyMissed / totalEnergy : 0;
      const overallMissRate = totalSurveys > 0 ? totalMissed / totalSurveys : 0;
      
      // Engagement penalty if miss rate >= 50%
      const engagementPenalty = overallMissRate >= 0.5;
      
      setSurveyStats({
        totalMoodSurveys: totalMood,
        missedMoodSurveys: moodMissed,
        totalEnergySurveys: totalEnergy,
        missedEnergySurveys: energyMissed,
        moodMissRate,
        energyMissRate,
        overallMissRate,
        engagementPenalty,
      });
      
      console.log('[SurveyProvider] Survey stats loaded:', {
        moodAnswered,
        moodMissed,
        energyAnswered,
        energyMissed,
        overallMissRate,
        engagementPenalty,
      });
    } catch (error) {
      console.error('[SurveyProvider] Error loading survey stats:', error);
    }
  }, [userId]);

  // ============================================================================
  // CLOCK-IN STATE SETTER
  // ============================================================================
  const setClockInState = useCallback((clockedIn: boolean, time?: Date) => {
    setIsClockedIn(clockedIn);
    if (clockedIn && time) {
      setClockInTime(time);
      
      // If this is a fresh clock-in (within 2 minutes), trigger initial mood check
      const now = Date.now();
      const clockInTimestamp = time.getTime();
      const minutesSinceClockIn = (now - clockInTimestamp) / 1000 / 60;
      
      if (minutesSinceClockIn <= 2 && lastMoodCheckTime === 0) {
        console.log('[SurveyProvider] Fresh clock-in detected, scheduling mood check');
        setTimeout(() => {
          playNotificationSound();
          setMoodCheckOpen(true);
        }, 2000);
      }
    } else {
      setClockInTime(null);
    }
  }, [lastMoodCheckTime]);

  // ============================================================================
  // MAIN TIMER - RUNS EVERY 1 MINUTE WHILE CLOCKED IN
  // ============================================================================
  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (!isClockedIn || !userId) {
      console.log('[SurveyProvider] Timer not running - not clocked in or no user');
      return;
    }
    
    console.log('[SurveyProvider] Starting survey timer (1 minute interval)');
    
    const SURVEY_INTERVAL = 30 * 60 * 1000; // 30 minutes
    
    const checkSurveys = () => {
      const now = Date.now();
      console.log('[SurveyProvider] Checking survey timers...');
      
      // Check mood (every 30 minutes)
      if (lastMoodCheckTime > 0) {
        const timeSinceLastMood = now - lastMoodCheckTime;
        console.log(`[SurveyProvider] Time since last mood: ${Math.floor(timeSinceLastMood / 1000 / 60)}min (need 30min)`);
        
        if (timeSinceLastMood >= SURVEY_INTERVAL && !moodCheckOpen && !energyCheckOpen) {
          console.log('[SurveyProvider] ✅ Triggering mood check');
          playNotificationSound();
          logSurveyNotification('Mood check-in available', 'survey_available', 'mood');
          setMoodCheckOpen(true);
        }
      }
      
      // Check energy (every 30 minutes, offset from mood)
      if (lastEnergyCheckTime > 0) {
        const timeSinceLastEnergy = now - lastEnergyCheckTime;
        console.log(`[SurveyProvider] Time since last energy: ${Math.floor(timeSinceLastEnergy / 1000 / 60)}min (need 30min)`);
        
        if (timeSinceLastEnergy >= SURVEY_INTERVAL && !moodCheckOpen && !energyCheckOpen) {
          console.log('[SurveyProvider] ✅ Triggering energy check');
          playNotificationSound();
          logSurveyNotification('Energy check-in available', 'survey_available', 'energy');
          setEnergyCheckOpen(true);
        }
      } else if (clockInTime) {
        // First energy check - trigger 15 minutes after clock-in
        const timeSinceClockIn = now - clockInTime.getTime();
        const FIRST_ENERGY_INTERVAL = 15 * 60 * 1000; // 15 minutes for first energy
        
        if (timeSinceClockIn >= FIRST_ENERGY_INTERVAL && !moodCheckOpen && !energyCheckOpen) {
          console.log('[SurveyProvider] ✅ Triggering first energy check');
          playNotificationSound();
          logSurveyNotification('Energy check-in available', 'survey_available', 'energy');
          setEnergyCheckOpen(true);
        }
      }
    };
    
    // Run immediately and then every minute
    checkSurveys();
    timerRef.current = setInterval(checkSurveys, 60000); // Every 1 minute
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isClockedIn, userId, lastMoodCheckTime, lastEnergyCheckTime, clockInTime, moodCheckOpen, energyCheckOpen]);

  // ============================================================================
  // LOG SURVEY NOTIFICATION
  // ============================================================================
  const logSurveyNotification = async (message: string, type: string, category: string) => {
    if (!userId) return;
    
    try {
      await (supabase as any)
        .from('notification_log')
        .insert([{
          user_id: userId,
          message,
          type,
          category,
        }]);
    } catch (error) {
      console.error('[SurveyProvider] Error logging notification:', error);
    }
  };

  // ============================================================================
  // LOG SURVEY EVENT
  // ============================================================================
  const logSurveyEvent = async (type: 'mood' | 'energy', value: string | null, responded: boolean) => {
    if (!userId) return;
    
    try {
      const { error } = await (supabase as any)
        .from('survey_events')
        .insert([{
          user_id: userId,
          type,
          value,
          responded,
          timestamp: new Date().toISOString(),
        }]);
      
      if (error) {
        console.error('[SurveyProvider] Error logging survey event:', error);
      } else {
        console.log('[SurveyProvider] ✅ Survey event logged:', { type, value, responded });
        // Reload stats after logging
        await loadSurveyStats();
      }
    } catch (error) {
      console.error('[SurveyProvider] Exception logging survey event:', error);
    }
  };

  // ============================================================================
  // HANDLE MOOD SUBMIT
  // ============================================================================
  const handleMoodSubmit = async (mood: string) => {
    if (!userId) return;
    
    const timestamp = new Date().toISOString();
    setLastMoodCheckTime(Date.now());
    console.log('[SurveyProvider] Mood submitted:', mood);
    
    try {
      // Save to mood_entries
      const { error } = await (supabase as any)
        .from('mood_entries')
        .insert([{
          user_id: userId,
          timestamp,
          mood_level: mood,
        }]);
      
      if (error) {
        console.error('[SurveyProvider] Error saving mood entry:', error);
      } else {
        console.log('[SurveyProvider] ✅ Mood entry saved');
        
        // Log survey event as answered
        await logSurveyEvent('mood', mood, true);
        
        // Log notification
        await logSurveyNotification(`Mood check-in answered: ${mood}`, 'survey_completed', 'mood');
        
        // Award points for answering (+2)
        await awardSurveyPoints('mood');
      }
    } catch (error) {
      console.error('[SurveyProvider] Exception saving mood:', error);
    }
    
    setMoodCheckOpen(false);
  };

  // ============================================================================
  // HANDLE ENERGY SUBMIT
  // ============================================================================
  const handleEnergySubmit = async (energy: string) => {
    if (!userId) return;
    
    const timestamp = new Date().toISOString();
    setLastEnergyCheckTime(Date.now());
    console.log('[SurveyProvider] Energy submitted:', energy);
    
    try {
      // Save to energy_entries
      const { error } = await (supabase as any)
        .from('energy_entries')
        .insert([{
          user_id: userId,
          timestamp,
          energy_level: energy,
        }]);
      
      if (error) {
        console.error('[SurveyProvider] Error saving energy entry:', error);
      } else {
        console.log('[SurveyProvider] ✅ Energy entry saved');
        
        // Log survey event as answered
        await logSurveyEvent('energy', energy, true);
        
        // Log notification
        await logSurveyNotification(`Energy check-in answered: ${energy}`, 'survey_completed', 'energy');
        
        // Award points for answering (+2)
        await awardSurveyPoints('energy');
      }
    } catch (error) {
      console.error('[SurveyProvider] Exception saving energy:', error);
    }
    
    setEnergyCheckOpen(false);
  };

  // ============================================================================
  // HANDLE MOOD MISSED (auto-dismiss after 30 seconds)
  // ============================================================================
  const handleMoodMissed = async () => {
    if (!userId) return;
    
    console.log('[SurveyProvider] ⚠️ Mood check-in MISSED');
    setLastMoodCheckTime(Date.now());
    
    // Log survey event as missed
    await logSurveyEvent('mood', null, false);
    
    // Log notification
    await logSurveyNotification('You missed a mood check-in', 'survey_missed', 'mood');
    
    setMoodCheckOpen(false);
  };

  // ============================================================================
  // HANDLE ENERGY MISSED (auto-dismiss after 30 seconds)
  // ============================================================================
  const handleEnergyMissed = async () => {
    if (!userId) return;
    
    console.log('[SurveyProvider] ⚠️ Energy check-in MISSED');
    setLastEnergyCheckTime(Date.now());
    
    // Log survey event as missed
    await logSurveyEvent('energy', null, false);
    
    // Log notification
    await logSurveyNotification('You missed an energy check-in', 'survey_missed', 'energy');
    
    setEnergyCheckOpen(false);
  };

  // ============================================================================
  // AWARD SURVEY POINTS (+2 for answered surveys)
  // ============================================================================
  const awardSurveyPoints = async (type: 'mood' | 'energy') => {
    if (!userId) return;
    
    try {
      // Insert points history
      await (supabase as any)
        .from('points_history')
        .insert([{
          user_id: userId,
          points: 2,
          reason: `${type === 'mood' ? 'Mood' : 'Energy'} check-in completed`,
          timestamp: new Date().toISOString(),
        }]);
      
      // Update user profile points
      const { data: profile } = await (supabase as any)
        .from('user_profiles')
        .select('total_points, weekly_points, monthly_points')
        .eq('user_id', userId)
        .single();
      
      if (profile) {
        await (supabase as any)
          .from('user_profiles')
          .update({
            total_points: (profile.total_points || 0) + 2,
            weekly_points: (profile.weekly_points || 0) + 2,
            monthly_points: (profile.monthly_points || 0) + 2,
          })
          .eq('user_id', userId);
        
        console.log('[SurveyProvider] ✅ +2 points awarded for survey');
      }
    } catch (error) {
      console.error('[SurveyProvider] Error awarding points:', error);
    }
  };

  // ============================================================================
  // CONTEXT VALUE
  // ============================================================================
  const value: SurveyContextType = {
    moodCheckOpen,
    energyCheckOpen,
    setMoodCheckOpen,
    setEnergyCheckOpen,
    handleMoodSubmit,
    handleEnergySubmit,
    handleMoodMissed,
    handleEnergyMissed,
    surveyStats,
    lastMoodCheckTime,
    lastEnergyCheckTime,
    setClockInState,
  };

  return (
    <SurveyContext.Provider value={value}>
      {children}
    </SurveyContext.Provider>
  );
}

