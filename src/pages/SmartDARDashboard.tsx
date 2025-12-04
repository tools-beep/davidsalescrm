import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2, 
  Pause, 
  Play,
  Zap,
  Target,
  AlertCircle,
  Award,
  BarChart3,
  Activity,
  Users,
  Brain,
  Sparkles,
  ThumbsUp,
  Coffee,
  CalendarIcon,
  MessageSquare,
  Flame,
  CalendarDays
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format } from "date-fns";
import { BehaviorInsightCard } from "@/components/dashboard/BehaviorInsightCard";
import { analyzeBehaviorPatterns } from "@/utils/behaviorAnalysis";
import { ProgressHistoryCard } from "@/components/dashboard/ProgressHistoryCard";
import { StreakHistoryCard } from "@/components/dashboard/StreakHistoryCard";
import { PointsDashboardSection } from "@/components/dashboard/PointsDashboardSection";
import { SmartDARDatePicker } from "@/components/dashboard/SmartDARDatePicker";
import { analyzeProgressHistory, analyzeProgressHistoryWithSnapshots, formatWeekLabel } from "@/utils/progressAnalysis";
import { 
  getDateKeyEST, 
  startOfDayEST, 
  endOfDayEST, 
  formatDateTimeEST,
  nowEST,
  daysAgoEST
} from "@/utils/timezoneUtils";
import {
  calculateEnhancedEfficiency,
  calculateTimeBasedEfficiency,
  calculateTrueIdleTime,
  calculateEnhancedCompletion,
  calculatePriorityCompletion,
  calculateEstimationAccuracyCompletion,
  calculateEnhancedFocusScore,
  calculateEnhancedVelocity,
  calculateEnhancedRhythm,
  calculateEnhancedEnergy,
  generateEnergyInsights,
  calculateEnhancedUtilization,
  calculateEnhancedMomentum,
  calculateEnhancedConsistency,
  applyEnergyPenalty,
  applyConsistencyPenalty,
  applyMomentumPenalty,
  calculateSurveyEngagementPenalty,
} from "@/utils/enhancedMetrics";

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
  mood_level: string;
}

interface EnergyEntry {
  timestamp: string;
  energy_level: string;
}

interface UserProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface UserMetrics {
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  pausedTasks: number;
  avgTimePerTask: number;
  activeTime: number;
  pausedTime: number;
  efficiencyScore: number;
  consistencyScore: number;
  taskCompletionRate: number; // Final weighted completion score
  priorityCompletion: number; // NEW: Priority-weighted completion
  estimationAccuracy: number; // NEW: Estimation accuracy completion
  timeUtilization: number;
  productivityMomentum: number;
  focusIndex: number;
  taskVelocity: number;
  workRhythm: number;
  energyLevel: number;
  delayedTasks: number;
  peakHour: number | null;
}

interface CompanyMetrics {
  totalTasks: number;
  activeTime: number;
  idleTime: number;
  efficiency: number;
  totalUsers: number;
  activeUsers: number;
}

interface ProductivityMetric {
  name: string;
  value: number;
  color: string;
  description: string;
}

// Pastel Macaroon Design System Colors
const COLORS = {
  pastelBlue: '#A7C7E7',
  pastelLavender: '#C7B8EA',
  pastelMint: '#B8EBD0',
  pastelPeach: '#F8D4C7',
  pastelYellow: '#FAE8A4',
  pastelPink: '#F7C9D4',
  cream: '#FFFCF9',
  softGray: '#EDEDED',
  warmText: '#6F6F6F',
  darkText: '#4B4B4B',
};

export default function SmartDARDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<string>('all'); // 'all' or specific client name
  const [userClients, setUserClients] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(nowEST());
  const [companyDateFilter, setCompanyDateFilter] = useState<Date>(nowEST());
  const [metrics, setMetrics] = useState<UserMetrics>({
    totalTasks: 0,
    completedTasks: 0,
    activeTasks: 0,
    pausedTasks: 0,
    avgTimePerTask: 0,
    activeTime: 0,
    pausedTime: 0,
    efficiencyScore: 0,
    consistencyScore: 0,
    taskCompletionRate: 0,
    priorityCompletion: 0,
    estimationAccuracy: 0,
    timeUtilization: 0,
    productivityMomentum: 0,
    focusIndex: 0,
    taskVelocity: 0,
    workRhythm: 0,
    energyLevel: 0,
    delayedTasks: 0,
    peakHour: null as number | null,
  });
  
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [companyMetrics, setCompanyMetrics] = useState<CompanyMetrics>({
    totalTasks: 0,
    activeTime: 0,
    idleTime: 0,
    efficiency: 0,
    totalUsers: 0,
    activeUsers: 0,
  });
  const [productivityData, setProductivityData] = useState<ProductivityMetric[]>([]);
  const [expertInsight, setExpertInsight] = useState<string>('');
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [behaviorInsights, setBehaviorInsights] = useState<any[]>([]);
  const [progressHistory, setProgressHistory] = useState<any>(null);
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([]);
  const [clockIn, setClockIn] = useState<any>(null);
  const [dayEntries, setDayEntries] = useState<TimeEntry[]>([]);

  // Check user role and set up initial user
  useEffect(() => {
    checkUserRoleAndInitialize();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  // Fetch user's assigned clients when user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserClients(selectedUserId);
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      fetchUserDashboardData(selectedUserId, selectedDate);
    }
  }, [selectedUserId, selectedDate, selectedClient]);

  useEffect(() => {
    fetchCompanyMetrics();
    
    const channel = supabase
      .channel('smart-dar-dashboard-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'eod_time_entries' 
      }, () => {
        console.log('Real-time update received');
        if (selectedUserId) {
          fetchUserDashboardData(selectedUserId, selectedDate);
        }
        fetchCompanyMetrics();
        setLastUpdate(new Date());
      })
      .subscribe();

    const interval = setInterval(() => {
      if (selectedUserId) {
        fetchUserDashboardData(selectedUserId, selectedDate);
      }
      fetchCompanyMetrics();
      setLastUpdate(new Date());
    }, 1200000); // Update every 20 minutes (20 * 60 * 1000 = 1,200,000ms)

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [selectedUserId, selectedDate]); // 🔧 FIX: Removed unnecessary dependencies

  const checkUserRoleAndInitialize = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user');
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);

      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const userIsAdmin = profile?.role === 'admin';
      setIsAdmin(userIsAdmin);

      if (userIsAdmin) {
        // Admin can see all users - will load users in separate useEffect
        console.log('Admin user detected - enabling user selector');
      } else {
        // Regular user - can only see their own data
        console.log('Regular user detected - showing only personal data');
        setSelectedUserId(user.id);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking user role:', error);
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: profiles, error} = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email')
        .order('first_name');

      if (error) throw error;

      setUsers(profiles || []);
      if (profiles && profiles.length > 0 && !selectedUserId) {
        setSelectedUserId(profiles[0].user_id);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserClients = async (userId: string) => {
    try {
      console.log('🔍 Fetching clients for user:', userId);
      
      // Fetch distinct client names from time entries for this user
      const { data: entries, error } = await (supabase as any)
        .from('eod_time_entries')
        .select('client_name')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching clients:', error);
        return;
      }

      // Get unique client names
      const clientNames = [...new Set(entries?.map((e: any) => e.client_name).filter(Boolean) || [])];
      console.log('✅ Found clients:', clientNames);
      
      setUserClients(clientNames as string[]);
      
      // Reset to 'all' when user changes
      setSelectedClient('all');
    } catch (error) {
      console.error('Error fetching user clients:', error);
    }
  };

  const calculateActualDuration = (entry: TimeEntry): number => {
    if (!entry.started_at) return 0;
    
    // accumulated_seconds contains the ACTUAL active work time (excluding pauses)
    // This is the correct value to use for all completed and paused tasks
    if (entry.ended_at || entry.paused_at) {
      // ✅ FIX: For old tasks with accumulated_seconds = 0, calculate from timestamps
      if (entry.accumulated_seconds && entry.accumulated_seconds > 0) {
        return entry.accumulated_seconds;
      }
      
      // Fallback: Calculate duration from timestamps (for legacy tasks before accumulated_seconds was implemented)
      if (entry.ended_at) {
        const duration = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
        console.log(`⚠️ Legacy task detected (ID: ${entry.id.substring(0, 8)}...) - using timestamp calculation: ${Math.round(duration)}s`);
        return Math.max(0, duration);
      }
      
      // Paused task with no accumulated_seconds
      return 0;
    }
    
    // For currently active tasks (not paused, not ended)
    // accumulated_seconds + time since started_at
    const currentDuration = (Date.now() - new Date(entry.started_at).getTime()) / 1000;
    return (entry.accumulated_seconds || 0) + currentDuration;
  };

  // ✅ Using imported calculateTrueIdleTime and calculateTimeBasedEfficiency from enhancedMetrics.ts

  const fetchUserDashboardData = async (userId: string, date: Date) => {
    try {
      setLoading(true);
      
      // 🌟 Check if user is currently clocked in for ANY client
      const { data: allClockIns, error: clockInError } = await (supabase as any)
        .from('eod_clock_ins')
        .select('*')
        .eq('user_id', userId)
        .is('clocked_out_at', null)
        .order('clocked_in_at', { ascending: true }); // Get ALL active clock-ins, ordered by earliest first

      if (clockInError) {
        console.log('❌ Clock-in check error:', clockInError);
      }
      
      console.log('🔍 Clock-in check result:', allClockIns && allClockIns.length > 0 ? `FOUND ${allClockIns.length} active` : 'NOT FOUND');
      
      // Determine which clock-in to use based on selected client
      let clockInData = null;
      
      if (allClockIns && allClockIns.length > 0) {
        if (selectedClient && selectedClient !== 'all') {
          // Find clock-in for specific client
          clockInData = allClockIns.find((c: any) => c.client_name === selectedClient);
          console.log(`📍 Using clock-in for client "${selectedClient}":`, clockInData ? new Date(clockInData.clocked_in_at).toLocaleString() : 'NOT FOUND');
        } else {
          // Use EARLIEST clock-in (first in array since we ordered ascending)
          clockInData = allClockIns[0];
          console.log(`📍 Using EARLIEST clock-in (${clockInData.client_name}):`, new Date(clockInData.clocked_in_at).toLocaleString());
          console.log(`📊 Total active clock-ins: ${allClockIns.length}`);
        }
      }

      // Store clock-in data for UI labels
      setClockIn(clockInData);

      let queryStartTime: Date;
      let queryEndTime: Date;

      // 🔧 CRITICAL FIX: Check if selected date is TODAY before using clock-in logic
      const selectedDateKey = getDateKeyEST(date);
      const todayDateKey = getDateKeyEST(nowEST());
      const isViewingToday = selectedDateKey === todayDateKey;
      
      console.log('🔧 DATE CHECK:');
      console.log('  Selected Date Key:', selectedDateKey);
      console.log('  Today Date Key:', todayDateKey);
      console.log('  isViewingToday:', isViewingToday);

      // 🎯 CRITICAL: For historical dates, try to load from COMPREHENSIVE snapshot first
      if (!isViewingToday) {
        console.log('📊 Checking for Smart DAR snapshot for:', selectedDateKey);
        console.log('   User ID:', userId);
        console.log('   Current User (Admin):', currentUserId);
        console.log('   Is Admin:', isAdmin);
        
        // 🔥 FIX: Admin viewing another user's data - query should work with RLS policy
        const { data: snapshot, error: snapshotError } = await (supabase as any)
          .from('smart_dar_snapshots')
          .select('*')
          .eq('user_id', userId)
          .eq('snapshot_date', selectedDateKey)
          .maybeSingle();
        
        console.log('📊 Snapshot query result:');
        console.log('   - snapshot:', snapshot);
        console.log('   - error:', snapshotError);
        console.log('   - has data:', !!snapshot);
        
        // 🔥 DEBUG: If admin and no snapshot found, check if RLS is blocking
        if (!snapshot && isAdmin && snapshotError) {
          console.warn('⚠️ Admin may be blocked by RLS policy. Error:', snapshotError.message);
          console.warn('   Please run the migration: 20251204_fix_smart_dar_admin_access.sql');
        }
        
        if (snapshot && !snapshotError) {
          console.log('✅ Found COMPREHENSIVE Smart DAR snapshot! Loading historical data...');
          console.log('📊 Full Snapshot data:', JSON.stringify(snapshot, null, 2));
          
          // Use snapshot data directly - ALL comprehensive data
          const calculatedMetrics = {
            totalTasks: snapshot.total_tasks || 0,
            completedTasks: snapshot.completed_tasks || 0,
            activeTasks: snapshot.active_tasks || 0,
            pausedTasks: snapshot.paused_tasks || 0,
            avgTimePerTask: snapshot.avg_time_per_task || 0,
            activeTime: snapshot.total_active_time || 0,
            pausedTime: snapshot.total_paused_time || 0,
            efficiencyScore: snapshot.efficiency_score || 0,
            consistencyScore: snapshot.consistency_score || 0,
            taskCompletionRate: snapshot.completion_rate || 0,
            priorityCompletion: snapshot.priority_completion || 0,
            estimationAccuracy: snapshot.estimation_accuracy || 0,
            timeUtilization: snapshot.time_utilization || 0,
            productivityMomentum: snapshot.productivity_momentum || 0,
            focusIndex: snapshot.focus_index || 0,
            taskVelocity: snapshot.task_velocity || 0,
            workRhythm: snapshot.work_rhythm || 0,
            energyLevel: snapshot.energy_level || 0,
            delayedTasks: snapshot.delayed_tasks || 0,
            peakHour: snapshot.peak_hour,
          };
          
          setMetrics(calculatedMetrics);
          
          // Generate productivity data from snapshot
          const prodData: ProductivityMetric[] = [
            { name: 'Efficiency', value: snapshot.efficiency_score || 0, color: getScoreColor(snapshot.efficiency_score || 0), description: 'Time utilization & estimation' },
            { name: 'Completion', value: snapshot.completion_rate || 0, color: getScoreColor(snapshot.completion_rate || 0), description: 'Priority + accuracy weighted' },
            { name: 'Focus', value: snapshot.focus_index || 0, color: getScoreColor(snapshot.focus_index || 0), description: 'Energy & enjoyment aware' },
            { name: 'Velocity', value: snapshot.task_velocity || 0, color: getScoreColor(snapshot.task_velocity || 0), description: 'Complexity & priority weighted output' },
            { name: 'Rhythm', value: snapshot.work_rhythm || 0, color: getScoreColor(snapshot.work_rhythm || 0), description: 'Time-of-day patterns' },
            { name: 'Energy', value: snapshot.energy_level || 0, color: getScoreColor(snapshot.energy_level || 0), description: 'Recovery & flow aware' },
            { name: 'Utilization', value: snapshot.time_utilization || 0, color: getScoreColor(snapshot.time_utilization || 0), description: 'Context-interpreted' },
            { name: 'Momentum', value: snapshot.productivity_momentum || 0, color: getScoreColor(snapshot.productivity_momentum || 0), description: 'Flow state detection' },
            { name: 'Consistency', value: snapshot.consistency_score || 0, color: getScoreColor(snapshot.consistency_score || 0), description: 'Mood/energy stability' },
          ];
          setProductivityData(prodData);
          
          // Use expert insight from snapshot if available, otherwise generate
          if (snapshot.expert_insight) {
            setExpertInsight(snapshot.expert_insight);
          } else {
            const insight = generateExpertInsight(calculatedMetrics, []);
            setExpertInsight(insight);
          }
          
          // ═══ LOAD COMPLETED TASKS FOR TASK ANALYSIS SECTION ═══
          // Use completed_tasks_details from snapshot if available
          if (snapshot.completed_tasks_details && Array.isArray(snapshot.completed_tasks_details)) {
            // Convert snapshot tasks to TimeEntry format for display
            const historicalTasks = snapshot.completed_tasks_details.map((task: any) => ({
              ...task,
              ended_at: task.ended_at || new Date().toISOString(), // Ensure ended_at exists
            }));
            setDayEntries(historicalTasks);
            console.log('   📋 Loaded', historicalTasks.length, 'completed tasks for Task Analysis');
          } else {
            setDayEntries([]);
          }
          
          // ═══ LOAD BEHAVIOR INSIGHTS ═══
          if (snapshot.behavior_insights && Array.isArray(snapshot.behavior_insights)) {
            setBehaviorInsights(snapshot.behavior_insights);
          } else {
            setBehaviorInsights([]);
          }
          
          // ═══ SET CLOCK-IN DATA FOR UI DISPLAY ═══
          if (snapshot.clocked_in_at) {
            setClockIn({
              id: 'historical',
              clocked_in_at: snapshot.clocked_in_at,
              clocked_out_at: snapshot.clocked_out_at,
              date: selectedDateKey,
              client_name: 'Historical'
            });
          }
          
          // ═══ LOG COMPREHENSIVE SNAPSHOT DETAILS ═══
          console.log('✅ Historical dashboard loaded from COMPREHENSIVE snapshot:');
          console.log('   📊 9 Core Metrics ✓');
          console.log('   📈 Points earned:', snapshot.points_earned);
          console.log('   🔥 Weekday streak:', snapshot.weekday_streak);
          console.log('   ⏱️ Total shift hours:', snapshot.total_shift_hours);
          console.log('   🎯 Deep work blocks:', snapshot.deep_work_blocks);
          console.log('   📋 Tasks by type:', snapshot.tasks_by_type);
          console.log('   🏷️ Tasks by priority:', snapshot.tasks_by_priority);
          console.log('   📝 Completed tasks:', snapshot.completed_tasks_details?.length || 0);
          console.log('   😊 Mood distribution:', snapshot.mood_distribution);
          console.log('   ⚡ Energy distribution:', snapshot.energy_distribution);
          console.log('   ✅ Daily goal met:', snapshot.daily_goal_met);
          console.log('   💡 Expert insight:', snapshot.expert_insight?.substring(0, 50) + '...');
          
          setLoading(false);
          return; // Exit early - we have all the data we need
        } else {
          console.log('⚠️ No snapshot found for historical date:', selectedDateKey);
          console.log('   This date may be before the snapshot system was implemented.');
          console.log('   Will try to calculate from available data (may be incomplete)...');
          if (snapshotError) {
            console.log('   Snapshot error:', snapshotError.message);
          }
        }
      }

      if (clockInData && clockInData.clocked_in_at && isViewingToday) {
        // User is clocked in AND viewing TODAY - fetch all tasks since clock-in time
        queryStartTime = new Date(clockInData.clocked_in_at);
        queryEndTime = nowEST(); // Current time in EST
        console.log('🕐 User is clocked in TODAY - fetching tasks since:', formatDateTimeEST(queryStartTime));
      } else {
        // User not clocked in OR viewing historical date - fetch tasks for selected date only (in EST)
        queryStartTime = startOfDayEST(date);
        queryEndTime = endOfDayEST(date);
        console.log('📅 Fetching tasks for selected EST date:', formatDateTimeEST(queryStartTime), 'to', formatDateTimeEST(queryEndTime));
      }

      console.log('Fetching data for:', userId, 'Client:', selectedClient);
      console.log('📅 Query Time Range:');
      console.log('  From:', queryStartTime.toISOString(), '(', queryStartTime.toLocaleString(), ')');
      console.log('  To:', queryEndTime.toISOString(), '(', queryEndTime.toLocaleString(), ')');

      // Build query with optional client filter
      // Filter by started_at to capture when work actually happened, not when task was created
      let query = (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', queryStartTime.toISOString())
        .lte('started_at', queryEndTime.toISOString());
      
      // Add client filter if specific client is selected
      if (selectedClient && selectedClient !== 'all') {
        query = query.eq('client_name', selectedClient);
        console.log('🔍 Filtering by client:', selectedClient);
      }
      
      const { data: dayEntries, error } = await query.order('started_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('✅ Fetched entries:', dayEntries?.length || 0);
      if (dayEntries && dayEntries.length > 0) {
        console.log('📋 First task started_at:', dayEntries[0].started_at, '(', new Date(dayEntries[0].started_at).toLocaleString(), ')');
        console.log('📋 Last task started_at:', dayEntries[dayEntries.length - 1].started_at, '(', new Date(dayEntries[dayEntries.length - 1].started_at).toLocaleString(), ')');
      } else {
        console.log('⚠️ No tasks found in the specified time range');
      }

      const entries = dayEntries || [];
      setDayEntries(entries); // Store in state for pie charts

      // 🌟 Fetch mood and energy entries from database
      const { data: moodData } = await (supabase as any)
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', queryStartTime.toISOString())
        .lte('timestamp', queryEndTime.toISOString())
        .order('timestamp', { ascending: false });

      const { data: energyData } = await (supabase as any)
        .from('energy_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', queryStartTime.toISOString())
        .lte('timestamp', queryEndTime.toISOString())
        .order('timestamp', { ascending: false });

      const moodEntries: MoodEntry[] = moodData || [];
      const energyEntries: EnergyEntry[] = energyData || [];
      
      console.log('📊 Fetched mood entries:', moodEntries.length);
      console.log('📊 Fetched energy entries:', energyEntries.length);

      // Calculate metrics using ENHANCED CONTEXT-AWARE FUNCTIONS
      let totalActiveTime = 0;
      let totalPausedTime = 0;
      
      const completedTasks = entries.filter((e: TimeEntry) => e.ended_at);
      const activeTasks = entries.filter((e: TimeEntry) => !e.ended_at && !e.paused_at);
      const pausedTasks = entries.filter((e: TimeEntry) => e.paused_at && !e.ended_at);

      entries.forEach((entry: TimeEntry) => {
        const actualDuration = calculateActualDuration(entry);
        totalActiveTime += actualDuration;
        
        // Calculate paused/idle time
        if (entry.ended_at) {
          // For completed tasks: total time - active time = pause time
          const totalTaskTime = (new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / 1000;
          const pauseTime = Math.max(0, totalTaskTime - actualDuration);
          totalPausedTime += pauseTime;
        } else if (entry.paused_at) {
          // For currently paused tasks: time since pause
          const pausedDuration = (Date.now() - new Date(entry.paused_at).getTime()) / 1000;
          totalPausedTime += Math.max(0, pausedDuration);
        }
      });

      // 🔧 FIX: Add guard for empty array
      const avgTime = completedTasks.length > 0 ? 
        completedTasks.reduce((sum: number, e: TimeEntry) => sum + calculateActualDuration(e), 0) / completedTasks.length 
        : 0;

      // 🌟 ENHANCED CONTEXT-AWARE METRICS (Task-type, mood, energy, category aware)
      // 🆕 NEW: Use time-based efficiency (active time vs clocked-in time)
      // 🔧 CRITICAL FIX: Pass null for clockInData when viewing historical dates
      console.log('🔧 DEBUG: isViewingToday=', isViewingToday, 'clockInData=', clockInData ? 'exists' : 'null');
      console.log('🔧 DEBUG: Passing to efficiency:', isViewingToday ? 'clockInData' : 'null');
      const efficiency = calculateTimeBasedEfficiency(entries, isViewingToday ? clockInData : null);
      
      // 🆕 NEW COMPLETION SYSTEM: Behavior-driven metrics
      const priorityCompletion = calculatePriorityCompletion(entries);
      const estimationAccuracy = calculateEstimationAccuracyCompletion(entries);
      const taskCompletionRate = calculateEnhancedCompletion(entries); // Final weighted score
      
      const focusIndex = calculateEnhancedFocusScore(entries, moodEntries, energyEntries);
      const taskVelocity = calculateEnhancedVelocity(entries);
      const workRhythm = calculateEnhancedRhythm(entries, moodEntries, energyEntries);
      // 🔧 CRITICAL FIX: Pass null for clockInData when viewing historical dates
      let energyLevel = calculateEnhancedEnergy(entries, energyEntries, moodEntries, isViewingToday ? clockInData : null);
      
      // Generate energy insights
      const energyInsightsData = generateEnergyInsights(energyEntries, moodEntries, isViewingToday ? clockInData : null);
      
      // 📊 FETCH SURVEY EVENTS FOR PENALTY CALCULATION
      let surveyMissRate = 0;
      let engagementPenalty = false;
      try {
        const { data: surveyEvents } = await (supabase as any)
          .from('survey_events')
          .select('*')
          .eq('user_id', userId)
          .gte('timestamp', startOfDay.toISOString())
          .lte('timestamp', endOfDay.toISOString());
        
        if (surveyEvents && surveyEvents.length > 0) {
          const totalSurveys = surveyEvents.length;
          const missedSurveys = surveyEvents.filter((s: any) => !s.responded).length;
          const penaltyCalc = calculateSurveyEngagementPenalty(totalSurveys, missedSurveys);
          surveyMissRate = penaltyCalc.missRate;
          engagementPenalty = penaltyCalc.engagementPenalty;
          
          console.log('[SmartDAR] Survey stats:', { totalSurveys, missedSurveys, surveyMissRate, engagementPenalty });
        }
      } catch (e) {
        console.error('[SmartDAR] Error fetching survey events:', e);
      }
      
      // Calculate survey responsiveness for utilization bonus
      const surveyData = {
        responses: (moodEntries?.length || 0) + (energyEntries?.length || 0),
        sent: Math.max((moodEntries?.length || 0) + (energyEntries?.length || 0), 1) // Estimate based on available data
      };
      
      // 🔧 CRITICAL FIX: Pass null for clockInData when viewing historical dates
      const timeUtilization = calculateEnhancedUtilization(entries, isViewingToday ? clockInData : null, surveyData);
      let productivityMomentum = calculateEnhancedMomentum(entries, moodEntries, energyEntries, isViewingToday ? clockInData : null);
      let consistency = calculateEnhancedConsistency(entries, moodEntries, energyEntries, isViewingToday ? clockInData : null);
      
      // 📉 APPLY SURVEY ENGAGEMENT PENALTIES IF MISS RATE >= 50%
      if (engagementPenalty) {
        console.log('[SmartDAR] ⚠️ Applying survey engagement penalties (miss rate >= 50%)');
        energyLevel = applyEnergyPenalty(energyLevel, true);
        productivityMomentum = applyMomentumPenalty(productivityMomentum, true);
        consistency = applyConsistencyPenalty(consistency, true);
        console.log('[SmartDAR] Penalized metrics:', { energyLevel, productivityMomentum, consistency });
      }

      // Peak hour
      const peakHour = findPeakHour(entries);

      // Delayed tasks
      const delayedCount = pausedTasks.filter((e: TimeEntry) => {
        if (e.paused_at) {
          const pausedTime = new Date(e.paused_at).getTime();
          const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
          return pausedTime < thirtyMinAgo;
        }
        return false;
      }).length;

      console.log('=== 🌟 ENHANCED DASHBOARD CALCULATIONS ===');
      console.log('Total Entries:', entries.length);
      console.log('Completed Tasks:', completedTasks.length);
      console.log('Active Tasks:', activeTasks.length);
      console.log('Paused Tasks:', pausedTasks.length);
      console.log('---');
      console.log('📊 RAW TIME DATA:');
      entries.forEach((entry: TimeEntry, i: number) => {
        console.log(`Task ${i + 1}:`, {
          id: entry.id.substring(0, 8),
          started: new Date(entry.started_at).toLocaleTimeString(),
          ended: entry.ended_at ? new Date(entry.ended_at).toLocaleTimeString() : 'Active',
          paused: entry.paused_at ? 'Yes' : 'No',
          accumulated_seconds: entry.accumulated_seconds,
          calculated_duration: calculateActualDuration(entry),
        });
      });
      console.log('---');
      console.log('Total Active Time (seconds):', Math.round(totalActiveTime), `(${formatTime(totalActiveTime)})`);
      console.log('Total Paused Time (seconds):', Math.round(totalPausedTime), `(${formatTime(totalPausedTime)})`);
      console.log('---');
      console.log('🌟 ENHANCED METRICS (Context-Aware):');
      console.log('Efficiency (time utilization):', efficiency + '%');
      console.log('Completion (final weighted):', taskCompletionRate + '%');
      console.log('  ↳ Priority Completion:', priorityCompletion + '%');
      console.log('  ↳ Estimation Accuracy:', estimationAccuracy + '%');
      console.log('Focus (mood/energy/enjoyment aware):', focusIndex + '%');
      console.log('Velocity (weighted points):', taskVelocity);
      console.log('Rhythm (time patterns):', workRhythm + '%');
      console.log('Energy (recovery aware):', energyLevel + '%');
      console.log('Utilization (context-interpreted):', timeUtilization + '%');
      console.log('Momentum (flow detection):', productivityMomentum);
      console.log('Consistency (mood/energy stability):', consistency);
      console.log('=== END ENHANCED CALCULATIONS ===');

      const calculatedMetrics = {
        totalTasks: entries.length,
        completedTasks: completedTasks.length,
        activeTasks: activeTasks.length,
        pausedTasks: pausedTasks.length,
        avgTimePerTask: avgTime,
        activeTime: totalActiveTime,
        pausedTime: totalPausedTime,
        efficiencyScore: efficiency,
        consistencyScore: consistency,
        taskCompletionRate,
        priorityCompletion,
        estimationAccuracy,
        timeUtilization: Math.min(100, Math.round(timeUtilization)),
        productivityMomentum,
        focusIndex,
        taskVelocity,
        workRhythm,
        energyLevel,
        delayedTasks: delayedCount,
        peakHour,
      };

      console.log('Calculated metrics:', calculatedMetrics);
      setMetrics(calculatedMetrics);

      // Generate productivity data with ENHANCED CONTEXT-AWARE descriptions
      const prodData: ProductivityMetric[] = [
        { name: 'Efficiency', value: efficiency, color: getScoreColor(efficiency), description: 'Time utilization & estimation' },
        { name: 'Completion', value: taskCompletionRate, color: getScoreColor(taskCompletionRate), description: 'Priority + accuracy weighted' },
        { name: 'Focus', value: focusIndex, color: getScoreColor(focusIndex), description: 'Energy & enjoyment aware' },
        { name: 'Velocity', value: taskVelocity, color: getScoreColor(taskVelocity), description: 'Complexity & priority weighted output' },
        { name: 'Rhythm', value: workRhythm, color: getScoreColor(workRhythm), description: 'Time-of-day patterns' },
        { name: 'Energy', value: energyLevel, color: getScoreColor(energyLevel), description: 'Recovery & flow aware' },
        { name: 'Utilization', value: timeUtilization, color: getScoreColor(timeUtilization), description: 'Context-interpreted' },
        { name: 'Momentum', value: productivityMomentum, color: getScoreColor(productivityMomentum), description: 'Flow state detection' },
        { name: 'Consistency', value: consistency, color: getScoreColor(consistency), description: 'Mood/energy stability' },
      ];
      setProductivityData(prodData);

      // Generate expert insight
      const insight = generateExpertInsight(calculatedMetrics, entries);
      setExpertInsight(insight);

      // Analyze behavior patterns for the past 7 days (in EST)
      const sevenDaysAgo = daysAgoEST(7);
      const now = nowEST();
      
      // 🐛 FIX: Use started_at instead of created_at for consistency
      const { data: weekEntries } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', sevenDaysAgo.toISOString())
        .lte('started_at', now.toISOString());

      // Fetch mood and energy data for the past 7 days
      const { data: weekMoodData } = await (supabase as any)
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', sevenDaysAgo.toISOString())
        .lte('timestamp', now.toISOString());

      const { data: weekEnergyData } = await (supabase as any)
        .from('energy_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', sevenDaysAgo.toISOString())
        .lte('timestamp', now.toISOString());

      console.log('📊 Week mood entries for insights:', weekMoodData?.length || 0);
      console.log('📊 Week energy entries for insights:', weekEnergyData?.length || 0);

      // 🌟 Generate behavior insights using ALL 9 metrics + task data + mood/energy
      const metricsForInsights = {
        efficiencyScore: efficiency,
        taskCompletionRate: taskCompletionRate,
        focusIndex: focusIndex,
        taskVelocity: taskVelocity,
        workRhythm: workRhythm,
        energyLevel: energyLevel,
        timeUtilization: timeUtilization,
        productivityMomentum: productivityMomentum,
        consistencyScore: consistency,
        peakHour: peakHour,
      };
      
      const insights = analyzeBehaviorPatterns(
        weekEntries || [], 
        metricsForInsights, 
        weekMoodData || [], 
        weekEnergyData || []
      );
      console.log('🌟 Metrics-aware behavior insights generated:', insights.length, insights);
      setBehaviorInsights(insights);

      // Analyze progress history (last 8 weeks) in EST
      const eightWeeksAgo = daysAgoEST(56); // 8 weeks ago in EST
      const nowForHistory = nowEST(); // Current time in EST
      const eightWeeksAgoDateKey = getDateKeyEST(eightWeeksAgo);
      const nowDateKey = getDateKeyEST(nowForHistory);
      
      // 🎯 NEW: Try to fetch historical SNAPSHOTS first (more accurate for weekly/monthly summaries)
      console.log('📊 Fetching historical snapshots for progress analysis...');
      console.log('   User ID:', userId);
      console.log('   Date Range:', eightWeeksAgoDateKey, 'to', nowDateKey);
      
      const { data: historicalSnapshots, error: snapshotsError } = await (supabase as any)
        .from('smart_dar_snapshots')
        .select('*')
        .eq('user_id', userId)
        .gte('snapshot_date', eightWeeksAgoDateKey)
        .lte('snapshot_date', nowDateKey)
        .order('snapshot_date', { ascending: true });
      
      console.log('📊 Historical snapshots fetched:', historicalSnapshots?.length || 0);
      if (snapshotsError) {
        console.error('⚠️ Error fetching historical snapshots:', snapshotsError);
        console.log('   Falling back to raw time entries...');
      }
      
      // Build historical query with optional client filter
      // 🐛 FIX: Use started_at instead of created_at for consistency
      let histQuery = (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', eightWeeksAgo.toISOString())
        .lte('started_at', nowForHistory.toISOString());
      
      // Add client filter if specific client is selected
      if (selectedClient && selectedClient !== 'all') {
        histQuery = histQuery.eq('client_name', selectedClient);
      }
      
      const { data: historicalEntries, error: histError } = await histQuery.order('created_at', { ascending: true });

      if (histError) {
        console.error('Error fetching historical entries:', histError);
      }

      // Fetch historical mood and energy data (8 weeks)
      const { data: histMoodData } = await (supabase as any)
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', eightWeeksAgo.toISOString())
        .lte('timestamp', nowForHistory.toISOString());

      const { data: histEnergyData } = await (supabase as any)
        .from('energy_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', eightWeeksAgo.toISOString())
        .lte('timestamp', nowForHistory.toISOString());

      console.log('Historical entries fetched:', historicalEntries?.length || 0);
      console.log('Historical mood entries:', histMoodData?.length || 0);
      console.log('Historical energy entries:', histEnergyData?.length || 0);
      console.log('Date range:', eightWeeksAgo.toISOString(), 'to', nowForHistory.toISOString());
      
      // 🎯 NEW: If we have snapshots, use them to enhance progress data
      // Snapshots contain pre-calculated metrics that are more accurate
      let progressData;
      
      if (historicalSnapshots && historicalSnapshots.length > 0) {
        console.log('✅ Using historical snapshots for progress analysis (more accurate)');
        progressData = analyzeProgressHistoryWithSnapshots(
          historicalSnapshots,
          historicalEntries || [],
          metricsForInsights,
          histMoodData || [],
          histEnergyData || []
        );
      } else {
        console.log('📊 Using raw time entries for progress analysis (no snapshots available)');
        // Pass metrics and check-in data to progress analysis
        progressData = analyzeProgressHistory(
          historicalEntries || [], 
          metricsForInsights, 
          histMoodData || [], 
          histEnergyData || []
        );
      }
      console.log('Progress data:', {
        weeklyDataLength: progressData.weeklyData.length,
        insightsLength: progressData.progressInsights.length,
        streaksLength: progressData.streakHistory.length,
        hasMonthlyGrowth: progressData.monthlyGrowth !== null
      });
      console.log('Full progress data:', progressData);
      
      setProgressHistory(progressData);

      // Prepare weekly chart data with proper values - ALL 9 METRICS
      if (progressData.weeklyData.length > 0) {
        const chartData = progressData.weeklyData.map(week => ({
          week: formatWeekLabel(week),
          tasks: Number(week.tasksCompleted) || 0,
          // ✨ ALL 9 CORE METRICS (exact same as dashboard)
          efficiency: Number(Math.round(week.efficiency)) || 0,
          completion: Number(Math.round(week.completion)) || 0,
          focusScore: Number(Math.round(week.focusScore)) || 0,
          velocity: Number(Math.round(week.velocity)) || 0,
          rhythm: Number(Math.round(week.rhythm)) || 0,
          energy: Number(Math.round(week.energy)) || 0,
          utilization: Number(Math.round(week.utilization)) || 0,
          momentum: Number(Math.round(week.momentum)) || 0,
          consistency: Number(Math.round(week.consistency)) || 0,
          // Legacy field for backwards compatibility
          focusHours: Number((Math.round(week.focusHours * 10) / 10).toFixed(1)) || 0,
        }));
        setWeeklyChartData(chartData);
        console.log('✨ Weekly Chart Data (All 9 Metrics):', chartData);
      } else {
        setWeeklyChartData([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  const fetchCompanyMetrics = async () => {
    try {
      // Use EST boundaries for company metrics
      const dayStart = startOfDayEST(companyDateFilter);
      const dayEnd = endOfDayEST(companyDateFilter);

      console.log('Fetching company metrics for EST:', formatDateTimeEST(dayStart));

      // 🔧 FIX: Use started_at instead of created_at for consistency with user dashboard
      const { data: entries, error } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .gte('started_at', dayStart.toISOString())
        .lte('started_at', dayEnd.toISOString());

      if (error) throw error;

      console.log('Company entries fetched:', entries?.length || 0);

      let totalActive = 0;
      let totalIdle = 0;
      let completedCount = 0;
      const uniqueUsers = new Set();
      
      (entries || []).forEach((entry: TimeEntry) => {
        uniqueUsers.add(entry.user_id);
        
        const actualDuration = calculateActualDuration(entry);
        
        if (entry.paused_at && !entry.ended_at) {
          totalActive += actualDuration;
          const pausedDuration = (Date.now() - new Date(entry.paused_at).getTime()) / 1000;
          totalIdle += pausedDuration;
        } else {
          totalActive += actualDuration;
        }
        
        if (entry.ended_at) completedCount++;
      });

      // 🔧 FIX: Add guard against division by zero
      const totalTime = totalActive + totalIdle;
      const efficiency = totalTime > 0 && completedCount > 0
        ? Math.round((totalActive / totalTime) * 100) 
        : totalActive > 0 ? 100 : 0; // If only active time exists, show 100%

      // Get total users count
      const { data: allUsers } = await supabase
        .from('user_profiles')
        .select('user_id', { count: 'exact', head: true });

      const companyData = {
        totalTasks: completedCount,
        activeTime: totalActive,
        idleTime: totalIdle,
        efficiency,
        totalUsers: allUsers?.length || 0,
        activeUsers: uniqueUsers.size,
      };

      console.log('Company metrics:', companyData);
      setCompanyMetrics(companyData);
    } catch (error) {
      console.error('Error fetching company metrics:', error);
    }
  };

  // Advanced metric calculations
  // 🗑️ DEPRECATED: This function is replaced by calculateEnhancedMomentum from enhancedMetrics.ts
  // Keeping for reference only - NOT USED
  // const calculateProductivityMomentum = (entries: TimeEntry[]): number => { ... }

  // 🗑️ DEPRECATED: This function is replaced by calculateEnhancedFocusScore from enhancedMetrics.ts
  // Keeping for reference only - NOT USED
  // const calculateFocusIndex = (completedTasks: TimeEntry[]): number => { ... }

  // 🗑️ DEPRECATED: This function is replaced by calculateEnhancedRhythm from enhancedMetrics.ts
  // Keeping for reference only - NOT USED
  // const calculateWorkRhythm = (entries: TimeEntry[]): number => { ... }

  // 🗑️ DEPRECATED: This function is replaced by calculateEnhancedEnergy from enhancedMetrics.ts
  // Keeping for reference only - NOT USED
  // const calculateEnergyLevel = (entries: TimeEntry[]): number => { ... }

  const calculateConsistencyScore = async (userId: string): Promise<number> => {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // 🐛 FIX: Use started_at instead of created_at for consistency
      const { data: entries } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', sevenDaysAgo.toISOString());

      if (!entries || entries.length < 2) return 50;

      const dailyCounts: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dailyCounts[date.toISOString().split('T')[0]] = 0;
      }

      entries.forEach((entry: TimeEntry) => {
        if (entry.ended_at) {
          // 🐛 FIX: Use started_at to group by when work actually happened
          const dateKey = entry.started_at.split('T')[0];
          if (dateKey in dailyCounts) {
            dailyCounts[dateKey]++;
          }
        }
      });

      const counts = Object.values(dailyCounts);
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      
      if (avg === 0) return 0;
      
      const variance = counts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / counts.length;
      const stdDev = Math.sqrt(variance);
      
      const consistency = Math.max(0, Math.min(100, 100 - (stdDev / (avg + 1)) * 50));
      return Math.round(consistency);
    } catch (error) {
      console.error('Error calculating consistency:', error);
      return 50;
    }
  };

  const findPeakHour = (entries: TimeEntry[]): number | null => {
    // 🌟 Need at least 5 completed tasks to determine peak hour
    const completedTasks = entries.filter(e => e.ended_at);
    if (completedTasks.length < 5) return null;
    
    const hourCounts: Record<number, number> = {};
    completedTasks.forEach(entry => {
      // 🔧 FIX: Use EST timezone for hour calculation
      const estDate = new Date(entry.started_at).toLocaleString('en-US', { 
        timeZone: 'America/New_York', 
        hour: 'numeric', 
        hour12: false 
      });
      const hour = parseInt(estDate);
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const peakHour = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)[0];
    
    return peakHour ? parseInt(peakHour[0]) : null;
  };

  const generateExpertInsight = (metrics: UserMetrics, entries: TimeEntry[]): string => {
    const insights: string[] = [];

    // Efficiency insights
    if (metrics.efficiencyScore >= 90) {
      insights.push("Exceptional time management");
    } else if (metrics.efficiencyScore >= 75) {
      insights.push("Strong productivity habits");
    } else if (metrics.efficiencyScore < 60) {
      insights.push("Consider reducing idle time between tasks");
    }

    // Completion rate (new behavior-driven system)
    if (metrics.taskCompletionRate >= 90) {
      insights.push("excellent priority completion and time estimation");
    } else if (metrics.taskCompletionRate < 70) {
      insights.push("focus on high-priority tasks and accurate time estimates");
    }
    
    // Priority completion insights
    if (metrics.priorityCompletion >= 85) {
      insights.push("strong focus on high-priority work");
    } else if (metrics.priorityCompletion < 60) {
      insights.push("prioritize Immediate Impact and Daily tasks");
    }
    
    // Estimation accuracy insights
    if (metrics.estimationAccuracy >= 80) {
      insights.push("excellent time estimation discipline");
    } else if (metrics.estimationAccuracy < 50) {
      insights.push("consider longer time blocks for Deep Work tasks");
    }

    // Focus and rhythm
    if (metrics.focusIndex >= 80 && metrics.workRhythm >= 80) {
      insights.push("maintains optimal flow state");
    } else if (metrics.focusIndex < 60) {
      insights.push("try longer focus sessions (25-90 min)");
    }

    // Energy and momentum
    if (metrics.energyLevel >= 80 && metrics.productivityMomentum >= 70) {
      insights.push("building strong momentum throughout the day");
    } else if (metrics.energyLevel < 50) {
      insights.push("energy levels declining - consider breaks");
    }

    // Peak performance
    if (metrics.peakHour >= 9 && metrics.peakHour <= 11) {
      insights.push("peak performance in morning hours");
    } else if (metrics.peakHour >= 14 && metrics.peakHour <= 16) {
      insights.push("afternoon productivity peak");
    }

    // Consistency
    if (metrics.consistencyScore >= 80) {
      insights.push("highly consistent daily patterns");
    }

    const expertOpinion = insights.length > 0 ? insights.join(", ") + "." : "Building productivity baseline - continue tracking for personalized insights.";
    
    return expertOpinion.charAt(0).toUpperCase() + expertOpinion.slice(1);
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getTrendIcon = (direction: 'up' | 'down' | 'stable') => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4" style={{ color: COLORS.pastelMint }} />;
      case 'down':
        return <TrendingDown className="h-4 w-4" style={{ color: COLORS.pastelPeach }} />;
      default:
        return <Minus className="h-4 w-4" style={{ color: COLORS.pastelBlue }} />;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return COLORS.pastelMint;
    if (score >= 60) return COLORS.pastelBlue;
    if (score >= 40) return COLORS.pastelYellow;
    return COLORS.pastelPeach;
  };

  const getScoreBadge = (score: number): string => {
    if (score >= 80) return 'rounded-full px-4 py-1.5 text-sm font-medium border-0 shadow-sm';
    if (score >= 60) return 'rounded-full px-4 py-1.5 text-sm font-medium border-0 shadow-sm';
    if (score >= 40) return 'rounded-full px-4 py-1.5 text-sm font-medium border-0 shadow-sm';
    return 'rounded-full px-4 py-1.5 text-sm font-medium border-0 shadow-sm';
  };

  // Task Type Color Mapping
  const getTaskTypeColor = (taskType?: string | null): string => {
    switch (taskType) {
      case 'Quick': return COLORS.pastelBlue;
      case 'Standard': return COLORS.pastelMint;
      case 'Deep Work': return COLORS.pastelLavender;
      case 'Long': return COLORS.pastelPeach;
      case 'Very Long': return COLORS.pastelPink;
      default: return COLORS.softGray;
    }
  };

  // Calculate estimation accuracy
  const calculateEstimationAccuracy = (goalMinutes?: number | null, actualSeconds?: number): { accuracy: number; color: string; label: string } => {
    if (!goalMinutes || !actualSeconds) {
      return { accuracy: 0, color: COLORS.softGray, label: 'N/A' };
    }
    
    const actualMinutes = actualSeconds / 60;
    const accuracy = (goalMinutes / actualMinutes) * 100;
    const difference = Math.abs(100 - accuracy);
    
    if (difference <= 20) {
      return { accuracy: Math.round(accuracy), color: COLORS.pastelMint, label: 'Accurate' };
    } else if (difference <= 50) {
      return { accuracy: Math.round(accuracy), color: COLORS.pastelYellow, label: 'Slightly Off' };
    } else {
      return { accuracy: Math.round(accuracy), color: COLORS.pastelPeach, label: 'Far Off' };
    }
  };

  const getPerformanceAnimation = (score: number) => {
    if (score >= 80) {
      return (
        <div className="animate-pulse">
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </div>
      );
    } else if (score < 60) {
      return (
        <div className="animate-bounce">
          <Coffee className="h-6 w-6 text-orange-500" />
        </div>
      );
    }
    return <ThumbsUp className="h-6 w-6" style={{ color: COLORS.pastelBlue }} />;
  };

  const pieChartData = [
    { name: 'Active Time', value: companyMetrics.activeTime / 3600, color: COLORS.pastelMint },
    { name: 'Idle Time', value: companyMetrics.idleTime / 3600, color: COLORS.pastelPeach },
  ];

  if (loading && !selectedUserId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: COLORS.pastelBlue }} />
      </div>
    );
  }

  const selectedUser = users.find(u => u.user_id === selectedUserId);

  return (
    <div style={{ 
      backgroundColor: COLORS.cream,
      fontFamily: "'Inter', 'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
      minHeight: '100vh',
      paddingBottom: '120px'
    }}>
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="space-y-12">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[36px] font-semibold mb-2 animate-soft-fade" style={{ 
              color: COLORS.darkText, 
              letterSpacing: '-0.02em',
              lineHeight: '1.2'
            }}>
              Smart DAR Dashboard
              <Badge className="ml-3 rounded-full px-3 py-1 text-[12px] font-medium border-0" style={{
                backgroundColor: COLORS.pastelBlue,
                color: COLORS.darkText
              }}>
                🌍 EST
              </Badge>
            </h1>
            <p className="text-[16px] animate-soft-fade stagger-1" style={{ color: COLORS.warmText }}>
              Real-time productivity & performance insights (All times in Eastern Time)
            </p>
            <div className="text-[14px] mt-3 flex items-center gap-2 animate-soft-fade stagger-2" style={{ color: COLORS.warmText }}>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: COLORS.pastelMint }}></div>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="macaroon-btn text-[13px] font-medium px-5 py-2 rounded-full border-0 flex items-center gap-2 animate-soft-fade stagger-3" style={{ 
              color: COLORS.darkText,
              backgroundColor: COLORS.pastelMint
            }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: COLORS.darkText }}></div>
              Live Data
            </Badge>
            {isAdmin && (
              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-[260px] h-12 rounded-full border-0 text-[15px] justify-between animate-soft-fade stagger-4"
                    style={{
                      backgroundColor: COLORS.pastelLavender,
                      color: COLORS.darkText,
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <span className="truncate text-left">
                      {selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name}` : "Search team member"}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m19 19-3.5-3.5" />
                      <circle cx="11" cy="11" r="6" />
                    </svg>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[320px] rounded-3xl border-0" style={{ backgroundColor: COLORS.cream, boxShadow: '0 12px 30px rgba(0, 0, 0, 0.08)' }}>
                  <Command className="rounded-3xl">
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup className="max-h-[260px] overflow-y-auto">
                      {users.map((user) => {
                        const fullName = `${user.first_name} ${user.last_name}`.trim();
                        return (
                          <CommandItem
                            key={user.user_id}
                            value={`${fullName.toLowerCase()} ${user.email?.toLowerCase() ?? ''}`}
                            onSelect={() => {
                              setSelectedUserId(user.user_id);
                              setUserSearchOpen(false);
                            }}
                            className="flex flex-col items-start gap-0.5 px-3 py-2 rounded-2xl"
                          >
                            <span className="text-[15px]" style={{ color: COLORS.darkText }}>{fullName || 'Unnamed User'}</span>
                            {user.email && (
                              <span className="text-[13px]" style={{ color: COLORS.warmText }}>{user.email}</span>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            
            {/* Client selector - visible to all users if they have multiple clients */}
            {userClients.length > 1 && (
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[200px] h-12 rounded-full border-0 text-[15px] animate-soft-fade stagger-5" style={{ 
                  backgroundColor: COLORS.pastelMint,
                  color: COLORS.darkText,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                }}>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent className="rounded-3xl border-0" style={{ 
                  backgroundColor: COLORS.cream,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <SelectItem value="all" className="text-[15px] rounded-xl">
                    All Clients
                  </SelectItem>
                  {userClients.map((clientName) => (
                    <SelectItem key={clientName} value={clientName} className="text-[15px] rounded-xl">
                      {clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <div className="h-px mt-8 mb-6 animate-soft-fade" style={{ backgroundColor: COLORS.softGray, opacity: 0.5 }}></div>
      </div>

      {/* Date Picker for Historical Data */}
      {selectedUserId && (
        <div className="animate-soft-slide">
          <SmartDARDatePicker
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            userId={selectedUserId}
          />
        </div>
      )}

      {/* Company-Wide Analytics - Admin Only */}
      {isAdmin && (
        <div className="section-wrapper animate-soft-slide">
          <Card className="macaroon-card hover-lift border-0" style={{
            backgroundColor: COLORS.cream,
            borderRadius: '28px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
          }}>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl" style={{ color: COLORS.darkText }}>
                    <div className="p-2.5 rounded-2xl" style={{ backgroundColor: COLORS.pastelBlue }}>
                      <Users className="h-5 w-5" style={{ color: COLORS.cream }} />
                    </div>
                    Company Analytics
                  </CardTitle>
                  <CardDescription className="text-[15px]" style={{ color: COLORS.warmText }}>Overall team performance snapshot</CardDescription>
                </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(companyDateFilter, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={companyDateFilter}
                    onSelect={(date) => date && setCompanyDateFilter(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-3xl hover-lift transition-all" style={{
                    backgroundColor: '#F5F9FD',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                  }}>
                    <p className="text-[14px] mb-2" style={{ color: COLORS.warmText }}>Total Tasks</p>
                    <p className="text-3xl font-semibold" style={{ color: COLORS.darkText }}>{companyMetrics.totalTasks}</p>
                  </div>
                  <div className="p-6 rounded-3xl hover-lift transition-all" style={{
                    backgroundColor: '#F5FDF9',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                  }}>
                    <p className="text-[14px] mb-2" style={{ color: COLORS.warmText }}>Efficiency</p>
                    <p className={`text-3xl font-semibold`} style={{ color: getScoreColor(companyMetrics.efficiency) }}>
                      {companyMetrics.efficiency}%
                    </p>
                  </div>
                  <div className="p-6 rounded-3xl hover-lift transition-all" style={{
                    backgroundColor: '#F5FDF9',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                  }}>
                    <p className="text-[14px] mb-2" style={{ color: COLORS.warmText }}>Active Time</p>
                    <p className="text-3xl font-semibold" style={{ color: COLORS.pastelMint }}>
                      {formatTime(companyMetrics.activeTime)}
                    </p>
                  </div>
                  <div className="p-6 rounded-3xl hover-lift transition-all" style={{
                    backgroundColor: '#FEF9F7',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                  }}>
                    <p className="text-[14px] mb-2" style={{ color: COLORS.warmText }}>Idle Time</p>
                    <p className="text-3xl font-semibold" style={{ color: COLORS.pastelPeach }}>
                      {formatTime(companyMetrics.idleTime)}
                    </p>
                  </div>
                  <div className="p-6 rounded-3xl hover-lift transition-all" style={{
                    backgroundColor: '#F9F7FD',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)'
                  }}>
                    <p className="text-[14px] mb-2" style={{ color: COLORS.warmText }}>Active Users</p>
                    <p className="text-3xl font-semibold" style={{ color: COLORS.pastelLavender }}>
                      {companyMetrics.activeUsers} / {companyMetrics.totalUsers}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill={COLORS.pastelBlue}
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)} hours`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* User Metrics Header */}
      {selectedUser && (
        <div className="flex items-center justify-between animate-fade-in flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Users className="h-5 w-5 text-primary" />
              {isAdmin ? `Analytics for: ${selectedUser.first_name} ${selectedUser.last_name}` : 'Your Personal Analytics'}
              {selectedClient && selectedClient !== 'all' && (
                <span className="text-base font-normal" style={{ color: COLORS.mutedText }}>
                  • {selectedClient}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {format(selectedDate, "PPPP")}
              {selectedClient === 'all' && userClients.length > 1 && (
                <span className="ml-2 text-xs" style={{ color: COLORS.mutedText }}>
                  (All Clients)
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Points Dashboard Section */}
      {selectedUserId && (
        <div className="animate-soft-slide">
          <PointsDashboardSection userId={selectedUserId} selectedDate={selectedDate} />
        </div>
      )}

      {/* Expert Insight Card */}
      {expertInsight && (
        <Card className="macaroon-card hover-lift border-0 animate-bloom" style={{
          backgroundColor: '#F9F7FD',
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl" style={{ color: COLORS.darkText }}>
              <div className="p-2.5 rounded-2xl" style={{ backgroundColor: COLORS.pastelLavender }}>
                <MessageSquare className="h-5 w-5" style={{ color: COLORS.cream }} />
              </div>
              How Experts Think About You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-[16px] leading-relaxed" style={{ color: COLORS.warmText }}>{expertInsight}</p>
            <div className="flex items-center gap-3 mt-5">
              {metrics.totalTasks > 0 && getPerformanceAnimation(metrics.efficiencyScore)}
              <span className="text-[15px] font-medium" style={{ color: COLORS.darkText }}>
                {metrics.totalTasks === 0 ? 'Start tracking to see your progress!' : metrics.efficiencyScore >= 80 ? 'Outstanding Performance!' : metrics.efficiencyScore >= 60 ? 'Good Progress!' : 'Keep Building!'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Distribution Pie Charts */}
      <div className="grid gap-6 md:grid-cols-2 mb-8 animate-soft-fade">
        {/* Task Category Distribution Chart */}
        <Card className="macaroon-card border-0" style={{
          backgroundColor: COLORS.cream,
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg" style={{ color: COLORS.darkText }}>
              <div className="p-2 rounded-2xl" style={{ backgroundColor: COLORS.pastelMint }}>
                <Activity className="h-5 w-5" style={{ color: COLORS.cream }} />
              </div>
              Task Category Distribution
            </CardTitle>
            <CardDescription className="text-[14px]" style={{ color: COLORS.warmText }}>
              What kind of work you do
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const categoryMap = new Map<string, number>();
              dayEntries.forEach(entry => {
                if (entry.task_categories && entry.task_categories.length > 0) {
                  entry.task_categories.forEach(cat => {
                    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
                  });
                }
              });

              const categoryData = Array.from(categoryMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 8);

              const categoryColors = [
                COLORS.pastelBlue,
                COLORS.pastelLavender,
                COLORS.pastelMint,
                COLORS.pastelPeach,
                COLORS.pastelYellow,
                COLORS.pastelPink,
                '#D4A5D4',
                '#A8D8EA'
              ];

              if (categoryData.length === 0) {
                return (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-[15px]" style={{ color: COLORS.warmText }}>
                      No categorized tasks yet. Start adding categories to your tasks!
                    </p>
                  </div>
                );
              }

              return (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: COLORS.cream,
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{
                        paddingTop: '20px'
                      }}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>

        {/* Task Priority Distribution Chart */}
        <Card className="macaroon-card border-0" style={{
          backgroundColor: COLORS.cream,
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg" style={{ color: COLORS.darkText }}>
              <div className="p-2 rounded-2xl" style={{ backgroundColor: COLORS.pastelPeach }}>
                <Target className="h-5 w-5" style={{ color: COLORS.cream }} />
              </div>
              Task Priority Distribution
            </CardTitle>
            <CardDescription className="text-[14px]" style={{ color: COLORS.warmText }}>
              What priority levels you focus on
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const priorityMap = new Map<string, number>();
              dayEntries.forEach(entry => {
                if (entry.task_priority) {
                  priorityMap.set(entry.task_priority, (priorityMap.get(entry.task_priority) || 0) + 1);
                }
              });

              const priorityData = Array.from(priorityMap.entries())
                .map(([name, value]) => ({ 
                  name: name.replace(' Task', ''), 
                  fullName: name,
                  value 
                }))
                .sort((a, b) => {
                  const order = ['Immediate Impact', 'Daily', 'Weekly', 'Monthly', 'Evergreen', 'Trigger'];
                  return order.indexOf(a.name) - order.indexOf(b.name);
                });

              const priorityColorMap: Record<string, string> = {
                'Immediate Impact': '#FF6B6B',
                'Daily': '#FFD93D',
                'Weekly': '#6BCF7F',
                'Monthly': '#6C9CFF',
                'Evergreen': '#C896F7',
                'Trigger': '#FF9A62'
              };

              if (priorityData.length === 0) {
                return (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-[15px]" style={{ color: COLORS.warmText }}>
                      No task priorities set yet. Start setting priorities for your tasks!
                    </p>
                  </div>
                );
              }

              return (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={priorityData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {priorityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={priorityColorMap[entry.name] || COLORS.pastelBlue} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: COLORS.cream,
                        border: 'none',
                        borderRadius: '16px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any, name: string) => [value, name]}
                    />
                    <Legend 
                      wrapperStyle={{
                        paddingTop: '20px'
                      }}
                      iconType="circle"
                      formatter={(value) => {
                        const item = priorityData.find(d => d.name === value);
                        return item ? item.fullName : value;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              );
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Productivity Metrics */}
      <div className="section-wrapper animate-soft-slide">
        <Card className="macaroon-card hover-lift border-0" style={{
          backgroundColor: COLORS.cream,
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl" style={{ color: COLORS.darkText }}>
              <div className="p-2.5 rounded-2xl" style={{ backgroundColor: COLORS.pastelYellow }}>
                <BarChart3 className="h-5 w-5" style={{ color: COLORS.cream }} />
              </div>
              Real-Time Productivity Metrics
            </CardTitle>
            <CardDescription className="text-[15px]" style={{ color: COLORS.warmText }}>
              9 trackable variables updated every 20 minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} domain={[0, 100]} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-semibold">{payload[0].payload.name}</p>
                          <p className="text-sm">{payload[0].payload.description}</p>
                          <p className="text-lg font-bold" style={{ color: payload[0].payload.color }}>
                            {payload[0].value}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="value" name="Performance Score" radius={[8, 8, 0, 0]}>
                  {productivityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 section-wrapper">
        <Card className="macaroon-card hover-lift border-0 animate-bloom stagger-1" style={{
          backgroundColor: '#F5F9FD',
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-[14px] font-medium" style={{ color: COLORS.warmText }}>
              {clockIn && !clockIn.clocked_out_at ? 'Tasks (Since Clock-In)' : 'Tasks Today'}
            </CardTitle>
            <div className="p-2 rounded-xl" style={{ backgroundColor: COLORS.pastelBlue }}>
              <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.cream }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold mb-2" style={{ color: COLORS.darkText }}>
              {metrics.totalTasks}
            </div>
            <p className="text-[13px] mb-1" style={{ color: COLORS.warmText }}>
              {metrics.activeTasks} active • {metrics.pausedTasks} paused
            </p>
            <div className="text-[13px]" style={{ color: COLORS.warmText }}>
              {metrics.completedTasks} completed
            </div>
          </CardContent>
        </Card>

        <Card className="macaroon-card hover-lift border-0 animate-bloom stagger-2" style={{
          backgroundColor: '#F5FDF9',
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-[14px] font-medium" style={{ color: COLORS.warmText }}>
              {clockIn && !clockIn.clocked_out_at ? 'Time (Since Clock-In)' : 'Time Today'}
            </CardTitle>
            <div className="p-2 rounded-xl" style={{ backgroundColor: COLORS.pastelMint }}>
              <Clock className="h-4 w-4" style={{ color: COLORS.cream }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold mb-2" style={{ color: COLORS.pastelMint }}>{formatTime(metrics.activeTime)}</div>
            <p className="text-[13px] mb-1" style={{ color: COLORS.warmText }}>
              Active time
            </p>
            <div className="text-[13px]" style={{ color: COLORS.pastelPeach }}>
              {formatTime(metrics.pausedTime)} idle
            </div>
          </CardContent>
        </Card>

        <Card className="macaroon-card hover-lift border-0 animate-bloom stagger-3" style={{
          backgroundColor: '#FFFBF5',
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-[14px] font-medium" style={{ color: COLORS.warmText }}>Efficiency</CardTitle>
            <div className="p-2 rounded-xl" style={{ backgroundColor: COLORS.pastelYellow }}>
              <Zap className="h-4 w-4" style={{ color: COLORS.cream }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold mb-3" style={{ color: getScoreColor(metrics.efficiencyScore) }}>
              {metrics.efficiencyScore}%
            </div>
            <Badge className={`mt-2 ${getScoreBadge(metrics.efficiencyScore)}`} style={{
              backgroundColor: getScoreColor(metrics.efficiencyScore),
              color: COLORS.darkText
            }}>
              {metrics.totalTasks === 0 ? 'No Data' : metrics.efficiencyScore >= 80 ? 'Excellent' : metrics.efficiencyScore >= 60 ? 'Good' : 'Needs Focus'}
            </Badge>
            <p className="text-[12px] mt-3 leading-relaxed" style={{ color: COLORS.mutedText }}>
              Measures active time vs clocked-in time. Only periods with no active tasks count as idle. Also factors in goal duration vs actual duration accuracy.
            </p>
          </CardContent>
        </Card>

        <Card className="macaroon-card hover-lift border-0 animate-bloom stagger-4" style={{
          backgroundColor: '#F9F7FD',
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-[14px] font-medium" style={{ color: COLORS.warmText }}>Peak Hour</CardTitle>
            <div className="p-2 rounded-xl" style={{ backgroundColor: COLORS.pastelLavender }}>
              <Target className="h-4 w-4" style={{ color: COLORS.cream }} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold mb-2" style={{ color: COLORS.darkText }}>
              {metrics.peakHour !== null ? `${metrics.peakHour}:00` : 'N/A'}
            </div>
            <p className="text-[13px]" style={{ color: COLORS.warmText }}>
              {metrics.peakHour !== null ? 'Most productive time' : 'Building data...'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ===== TASK ANALYSIS SECTION ===== */}
      <div className="mt-16 pt-16" style={{ borderTop: '2px solid', borderColor: COLORS.softGray }}>
        <div className="mb-8 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="p-4 rounded-3xl" style={{ backgroundColor: COLORS.pastelBlue, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
              <CheckCircle2 className="h-8 w-8" style={{ color: COLORS.cream }} />
            </div>
          </div>
          <h2 className="text-4xl font-semibold mb-3" style={{ color: COLORS.darkText }}>
            Task Analysis
          </h2>
          <p className="text-[16px] max-w-2xl mx-auto" style={{ color: COLORS.warmText }}>
            Detailed insights into your task completion patterns and estimation accuracy.
          </p>
        </div>

        {/* Recent Completed Tasks with Settings */}
        <Card className="macaroon-card border-0 animate-bloom" style={{
          backgroundColor: COLORS.cream,
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardHeader>
            <CardTitle className="text-xl" style={{ color: COLORS.darkText }}>
              Recent Completed Tasks
            </CardTitle>
            <CardDescription style={{ color: COLORS.warmText }}>
              Task type, goals, and estimation accuracy
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(() => {
                // Filter completed tasks
                let completedTasks = dayEntries.filter(e => e.ended_at);
                
                // 🔍 Filter by clocked-in client if user is clocked in
                if (clockIn && clockIn.client_name) {
                  const targetClient = selectedClient === 'all' ? clockIn.client_name : selectedClient;
                  completedTasks = completedTasks.filter(e => e.client_name === targetClient);
                  console.log(`🎯 Task Analysis: Showing tasks for client: ${targetClient}`);
                }
                
                // Filter for tasks with settings (task type, goal, or intent)
                const tasksWithSettings = completedTasks.filter(e => 
                  e.task_type || e.goal_duration_minutes || e.task_intent
                );
                
                console.log(`📊 Task Analysis: ${completedTasks.length} completed tasks, ${tasksWithSettings.length} with settings`);

                if (completedTasks.length === 0) {
                  return (
                    <div className="text-center py-8" style={{ color: COLORS.warmText }}>
                      <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-30" style={{ color: COLORS.softGray }} />
                      <p>No completed tasks yet</p>
                    </div>
                  );
                }

                if (tasksWithSettings.length === 0) {
                  return (
                    <div className="text-center py-8" style={{ color: COLORS.warmText }}>
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" style={{ color: COLORS.pastelMint }} />
                      <p>Complete tasks with task settings to see detailed analysis here</p>
                    </div>
                  );
                }

                return tasksWithSettings.slice(-10).reverse().map((task) => {
                  // Use calculateActualDuration to handle both new and legacy tasks
                  const actualDurationSeconds = calculateActualDuration(task); // Returns SECONDS
                  const actualDurationMinutes = actualDurationSeconds / 60; // 🔥 FIX: Convert to minutes for display
                  const accuracy = task.goal_duration_minutes 
                    ? calculateEstimationAccuracy(task.goal_duration_minutes, actualDurationSeconds) // Pass seconds
                    : null;

                  // 🔥 FIX: Format duration as hours and minutes if >= 60 minutes
                  const formatTaskDuration = (minutes: number): string => {
                    if (minutes >= 60) {
                      const hours = Math.floor(minutes / 60);
                      const mins = Math.round(minutes % 60);
                      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
                    }
                    return `${Math.round(minutes)}m`;
                  };

                  return (
                    <Card key={task.id} className="border-0" style={{
                      backgroundColor: COLORS.softGray,
                      borderRadius: '18px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
                    }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-[15px] mb-1" style={{ color: COLORS.darkText }}>
                              {task.task_description || 'Untitled Task'}
                            </h4>
                            {task.task_type && (
                              <Badge 
                                className="text-[11px] font-medium border-0 mr-2"
                                style={{ 
                                  backgroundColor: getTaskTypeColor(task.task_type),
                                  color: COLORS.darkText 
                                }}
                              >
                                {task.task_type}
                              </Badge>
                            )}
                          </div>
                          {accuracy && (
                            <Badge 
                              className="text-[12px] font-medium border-0"
                              style={{ 
                                backgroundColor: accuracy.color,
                                color: COLORS.darkText 
                              }}
                            >
                              {accuracy.label}
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[13px]" style={{ color: COLORS.warmText }}>
                          {task.goal_duration_minutes && (
                            <div>
                              <span className="opacity-70">Goal:</span>{' '}
                              <span className="font-medium" style={{ color: COLORS.darkText }}>
                                {formatTaskDuration(task.goal_duration_minutes)}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="opacity-70">Actual:</span>{' '}
                            <span className="font-medium" style={{ color: COLORS.darkText }}>
                              {formatTaskDuration(actualDurationMinutes)}
                            </span>
                          </div>
                          {task.task_intent && (
                            <div className="col-span-2">
                              <span className="opacity-70">Intent:</span>{' '}
                              <span className="font-medium" style={{ color: COLORS.darkText }}>
                                {task.task_intent}
                              </span>
                            </div>
                          )}
                          {task.task_priority && (
                            <div className="col-span-2">
                              <span className="opacity-70">Priority:</span>{' '}
                              <span className="font-medium" style={{ color: COLORS.darkText }}>
                                {task.task_priority}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                });
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== DEEP BEHAVIOR TRENDS SECTION ===== */}
      <div className="mt-16 pt-16" style={{ borderTop: '2px solid', borderColor: COLORS.softGray }}>
          <div className="mb-8 text-center animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-4 rounded-3xl" style={{ backgroundColor: COLORS.pastelLavender, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                <Brain className="h-8 w-8" style={{ color: COLORS.cream }} />
              </div>
            </div>
            <h2 className="text-4xl font-semibold mb-3" style={{ color: COLORS.darkText }}>
              Behavior Insights Area
            </h2>
            <p className="text-[16px] max-w-2xl mx-auto" style={{ color: COLORS.warmText }}>
              DOABLE, FRIENDLY insights based on your task patterns, timing, mood, energy, and enjoyment. 
              Discover your unique rhythm and optimize your workflow with AI-powered behavioral intelligence.
            </p>
          </div>

          {behaviorInsights.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {behaviorInsights.map((insight) => (
                <BehaviorInsightCard
                  key={insight.id}
                  id={insight.id}
                  title={insight.title}
                  insight={insight.insight}
                  advice={insight.advice}
                  tag={insight.tag}
                  category={insight.category}
                  color={insight.color}
                />
              ))}
            </div>
          ) : (
            <Card className="macaroon-card border-0" style={{
              backgroundColor: COLORS.cream,
              borderRadius: '28px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
            }}>
              <CardContent className="p-16 text-center">
                <div>
                  <Brain className="h-16 w-16 mx-auto mb-5 opacity-30" style={{ color: COLORS.pastelLavender }} />
                  <p className="text-xl font-medium mb-3" style={{ color: COLORS.darkText }}>Building Your Behavior Profile</p>
                  <p className="text-[15px]" style={{ color: COLORS.warmText }}>
                    Complete tasks over the next 7 days to unlock personalized insights about your work patterns and natural rhythms.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 p-8 rounded-3xl animate-soft-fade" style={{
            backgroundColor: '#F9F7FD',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
          }}>
            <div className="flex items-start gap-4">
              <Sparkles className="h-6 w-6 flex-shrink-0 mt-1" style={{ color: COLORS.pastelLavender }} />
              <div>
                <h3 className="font-semibold text-lg mb-3" style={{ color: COLORS.darkText }}>Understanding Your Patterns</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: COLORS.warmText }}>
                  These insights are generated by analyzing your task completion times, pause patterns, and work rhythms. 
                  The more you use the system, the more personalized and accurate your insights become. 
                  Use these patterns to schedule your most important work during your peak hours and honor your natural energy cycles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== PROGRESS HISTORY & TRENDS VIEW ===== */}
      <div className="mt-16 pt-16" style={{ borderTop: '2px solid', borderColor: COLORS.softGray }}>
          <div className="mb-8 text-center animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="p-4 rounded-3xl" style={{ backgroundColor: COLORS.pastelMint, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
                <TrendingUp className="h-8 w-8" style={{ color: COLORS.cream }} />
              </div>
            </div>
            <h2 className="text-4xl font-semibold mb-3" style={{ color: COLORS.darkText }}>
              Progress History & Trends
            </h2>
            <p className="text-[16px] max-w-2xl mx-auto" style={{ color: COLORS.warmText }}>
              Your journey of growth, consistency, and continuous improvement over time.
            </p>
          </div>

      {/* Week-by-Week Comparison Chart */}
      {weeklyChartData.length > 0 ? (
        <Card className="mb-8 macaroon-card border-0 animate-bloom" style={{
          backgroundColor: COLORS.cream,
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
              <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl" style={{ color: COLORS.darkText }}>
              <div className="p-2.5 rounded-2xl" style={{ backgroundColor: COLORS.pastelMint }}>
                <BarChart3 className="h-5 w-5" style={{ color: COLORS.cream }} />
              </div>
              Week-by-Week Performance
            </CardTitle>
            <CardDescription className="text-[15px]" style={{ color: COLORS.warmText }}>
              Visual comparison of your weekly progress and momentum
            </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="tasks" className="w-full">
                  <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9 gap-1">
                    <TabsTrigger value="tasks">Tasks</TabsTrigger>
                    <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
                    <TabsTrigger value="completion">Completion</TabsTrigger>
                    <TabsTrigger value="focus">Focus</TabsTrigger>
                    <TabsTrigger value="velocity">Velocity</TabsTrigger>
                    <TabsTrigger value="rhythm">Rhythm</TabsTrigger>
                    <TabsTrigger value="energy">Energy</TabsTrigger>
                    <TabsTrigger value="utilization">Utilization</TabsTrigger>
                    <TabsTrigger value="momentum">Momentum</TabsTrigger>
                    <TabsTrigger value="consistency">Consistency</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="tasks" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis allowDecimals={false} domain={[0, 'auto']} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Tasks']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="tasks" 
                          stroke={COLORS.pastelMint} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelMint, r: 6 }}
                          name="Tasks Completed"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="efficiency" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Efficiency']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="efficiency" 
                          stroke={COLORS.pastelBlue} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelBlue, r: 6 }}
                          name="Efficiency Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="completion" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Completion']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="completion" 
                          stroke={COLORS.pastelMint} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelMint, r: 6 }}
                          name="Completion Rate"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="focus" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Focus Score']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="focusScore" 
                          stroke={COLORS.pastelYellow} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelYellow, r: 6 }}
                          name="Focus Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="velocity" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 'auto']} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Velocity']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="velocity" 
                          stroke={COLORS.pastelPeach} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelPeach, r: 6 }}
                          name="Task Velocity"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="rhythm" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Rhythm']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rhythm" 
                          stroke={COLORS.pastelPink} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelPink, r: 6 }}
                          name="Work Rhythm"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="energy" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Energy']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="energy" 
                          stroke="#F8D4C7" 
                          strokeWidth={3} 
                          dot={{ fill: "#F8D4C7", r: 6 }}
                          name="Energy Level"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="utilization" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Utilization']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="utilization" 
                          stroke={COLORS.pastelBlue} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelBlue, r: 6 }}
                          name="Time Utilization"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="momentum" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 'auto']} />
                        <Tooltip 
                          formatter={(value: number) => [value, 'Momentum']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="momentum" 
                          stroke={COLORS.pastelMint} 
                          strokeWidth={3} 
                          dot={{ fill: COLORS.pastelMint, r: 6 }}
                          name="Productivity Momentum"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </TabsContent>
                  
                  <TabsContent value="consistency" className="mt-6">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={weeklyChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip 
                          formatter={(value: number) => [`${value}%`, 'Consistency']}
                          labelStyle={{ color: '#000' }}
                        />
                        <Bar 
                          dataKey="consistency" 
                          fill={COLORS.pastelLavender} 
                          radius={[8, 8, 0, 0]}
                          name="Consistency Score"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
        <Card className="mb-8 macaroon-card border-0" style={{
          backgroundColor: COLORS.cream,
          borderRadius: '28px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
        }}>
          <CardContent className="p-16 text-center">
            <div>
              <CalendarDays className="h-16 w-16 mx-auto mb-5 opacity-30" style={{ color: COLORS.pastelBlue }} />
              <p className="text-xl font-medium mb-3" style={{ color: COLORS.darkText }}>No historical data yet</p>
              <p className="text-[15px]" style={{ color: COLORS.warmText }}>Complete tasks over the next few weeks to see your progress trends</p>
            </div>
          </CardContent>
        </Card>
          )}

          {/* Weekly & Trend Insights */}
          {progressHistory && progressHistory.progressInsights && progressHistory.progressInsights.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: COLORS.pastelMint }} />
                Weekly Progress & Improvement Trends
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {progressHistory.progressInsights.map((insight: any, index: number) => (
                  <ProgressHistoryCard
                    key={index}
                    type={insight.type}
                    message={insight.message}
                    subtext={insight.subtext}
                    indicator={insight.indicator}
                    category={insight.category}
                    value={insight.value}
                    trend={insight.trend}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Streak History */}
          {progressHistory && progressHistory.streakHistory && progressHistory.streakHistory.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-600" />
                Streak History & Momentum
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {progressHistory.streakHistory.slice(0, 6).map((streak: any, index: number) => (
                  <StreakHistoryCard
                    key={index}
                    streakLength={streak.streakLength}
                    startDate={streak.startDate}
                    endDate={streak.endDate}
                    resetReason={streak.resetReason}
                    isCurrent={streak.isCurrent}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Monthly Growth Summary */}
          {progressHistory && progressHistory.monthlyGrowth && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2" style={{ color: COLORS.darkText }}>
                <CalendarDays className="h-5 w-5" style={{ color: COLORS.pastelBlue }} />
                Monthly Growth Summary (Accumulated from Weekly Data)
              </h3>
              <p className="text-[14px] mb-6" style={{ color: COLORS.warmText }}>
                All metrics averaged across {progressHistory.weeklyData?.length || 0} week{progressHistory.weeklyData?.length !== 1 ? 's' : ''} of data
              </p>

              {/* ✨ ALL 9 CORE METRICS + Total Tasks */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Total Tasks</span>
                      <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.pastelMint }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.totalTasks}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Efficiency</span>
                      <Zap className="h-4 w-4" style={{ color: COLORS.pastelYellow }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgEfficiency}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Completion</span>
                      <CheckCircle2 className="h-4 w-4" style={{ color: COLORS.pastelMint }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgCompletion}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Focus</span>
                      <Brain className="h-4 w-4" style={{ color: COLORS.pastelLavender }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgFocusScore}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Velocity</span>
                      <TrendingUp className="h-4 w-4" style={{ color: COLORS.pastelPeach }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgVelocity}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Rhythm</span>
                      <Activity className="h-4 w-4" style={{ color: COLORS.pastelPink }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgRhythm}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Energy</span>
                      <Zap className="h-4 w-4" style={{ color: COLORS.pastelYellow }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgEnergy}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Utilization</span>
                      <Clock className="h-4 w-4" style={{ color: COLORS.pastelBlue }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgUtilization}%
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Momentum</span>
                      <TrendingUp className="h-4 w-4" style={{ color: COLORS.pastelMint }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgMomentum}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px]" style={{ color: COLORS.warmText }}>Consistency</span>
                      <Target className="h-4 w-4" style={{ color: COLORS.pastelLavender }} />
                    </div>
                    <div className="text-[28px] font-bold" style={{ color: COLORS.darkText }}>
                      {progressHistory.monthlyGrowth.avgConsistency}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Insights */}
              <div className="grid gap-4 md:grid-cols-2 mb-6">
                <Card className="border-0 animate-soft-fade" style={{
                  backgroundColor: COLORS.cream,
                  borderRadius: '22px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                }}>
                  <CardContent className="p-6">
                    <h4 className="text-[15px] font-semibold mb-3" style={{ color: COLORS.darkText }}>Work Patterns</h4>
                    <div className="space-y-2 text-[14px]" style={{ color: COLORS.warmText }}>
                      <div className="flex justify-between">
                        <span>Best Task Type:</span>
                        <span className="font-medium" style={{ color: COLORS.darkText }}>{progressHistory.monthlyGrowth.bestTaskType}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Most Productive Day:</span>
                        <span className="font-medium" style={{ color: COLORS.darkText }}>{progressHistory.monthlyGrowth.mostProductiveDayOfWeek}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Mood:</span>
                        <span className="font-medium" style={{ color: COLORS.darkText }}>{progressHistory.monthlyGrowth.avgMood}/5</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Energy Level:</span>
                        <span className="font-medium" style={{ color: COLORS.darkText }}>{progressHistory.monthlyGrowth.avgEnergyLevel}/5</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Category Distribution */}
                {progressHistory.monthlyGrowth.categoryDistribution.length > 0 && (
                  <Card className="border-0 animate-soft-fade" style={{
                    backgroundColor: COLORS.cream,
                    borderRadius: '22px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
                  }}>
                    <CardContent className="p-6">
                      <h4 className="text-[15px] font-semibold mb-3" style={{ color: COLORS.darkText }}>Category Distribution</h4>
                      <div className="space-y-2">
                        {progressHistory.monthlyGrowth.categoryDistribution.slice(0, 5).map((cat: any, idx: number) => (
                          <div key={idx}>
                            <div className="flex justify-between text-[13px] mb-1">
                              <span style={{ color: COLORS.warmText }}>{cat.category}</span>
                              <span style={{ color: COLORS.darkText }} className="font-medium">{cat.percentage}%</span>
                            </div>
                            <div className="h-2 rounded-full" style={{ backgroundColor: COLORS.softGray }}>
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${cat.percentage}%`, 
                                  backgroundColor: COLORS.pastelBlue 
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Monthly Insights */}
              {progressHistory.monthlyGrowth.insights && progressHistory.monthlyGrowth.insights.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {progressHistory.monthlyGrowth.insights.map((growth: any, index: number) => (
                    <ProgressHistoryCard
                      key={index}
                      type={growth.type}
                      message={growth.message}
                      subtext={growth.subtext}
                      indicator={growth.indicator}
                      category={growth.category}
                      value={growth.value}
                      trend={growth.trend}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="p-8 rounded-3xl animate-soft-fade" style={{
            backgroundColor: '#F5FDF9',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.05)'
          }}>
            <div className="flex items-start gap-4">
              <Award className="h-6 w-6 flex-shrink-0 mt-1" style={{ color: COLORS.pastelMint }} />
              <div>
                <h3 className="font-semibold text-lg mb-3" style={{ color: COLORS.darkText }}>Your Growth Journey</h3>
                <p className="text-[15px] leading-relaxed" style={{ color: COLORS.warmText }}>
                  This progress view celebrates your continuous growth over weeks and months. 
                  Every task completed, every streak maintained, and every improvement — no matter how small — 
                  contributes to your journey of sustainable productivity. Keep building on this momentum!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
