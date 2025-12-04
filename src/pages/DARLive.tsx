import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Play, 
  Square, 
  User, 
  Calendar,
  Activity,
  TrendingUp,
  Users,
  Timer,
  LogOut,
  Trash2,
  StopCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nowEST, getDateKeyEST } from "@/utils/timezoneUtils";

interface LiveTask {
  id: string;
  user_id: string;
  client_name: string;
  task_description: string;
  started_at: string;
  duration_minutes: number;
  user_email?: string;
  user_name?: string;
}

interface UserActivity {
  user_id: string;
  user_name: string;
  user_email: string;
  is_clocked_in: boolean;
  clocked_in_at?: string;
  active_tasks: number;
  total_time_today: number;
  last_activity?: string;
}

export default function DARLive() {
  const { toast } = useToast();
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [clockingOut, setClockingOut] = useState<Record<string, boolean>>({});
  const [deletingTask, setDeletingTask] = useState<Record<string, boolean>>({});
  const [stoppingTask, setStoppingTask] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadLiveData();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadLiveData();
      setCurrentTime(new Date());
    }, 10000);

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('dar_live_updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'eod_time_entries'
      }, () => {
        loadLiveData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'eod_clock_ins'
      }, () => {
        loadLiveData();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, []);

  const loadLiveData = async () => {
    try {
      await Promise.all([
        loadActiveTasks(),
        loadUserActivities()
      ]);
    } catch (error) {
      console.error('Error loading live data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveTasks = async () => {
    try {
      // Get ALL uncompleted tasks (no ended_at) - including stale ones from previous days
      // This allows admins to see and stop tasks that were never completed (both active and paused)
      const { data: tasks, error } = await supabase
        .from('eod_time_entries')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false });

      if (error) throw error;

      // Get user info for each task
      const userIds = [...new Set(tasks?.map(t => t.user_id) || [])];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [
          p.user_id, 
          {
            email: p.email,
            name: p.first_name && p.last_name 
              ? `${p.first_name} ${p.last_name}` 
              : p.first_name || p.last_name || p.email
          }
        ])
      );

      const tasksWithUsers = (tasks || []).map(task => {
        const profile = profileMap.get(task.user_id);
        const startTime = new Date(task.started_at);
        const now = new Date();
        
        // Calculate duration correctly using accumulated_seconds
        let durationMinutes = 0;
        
        if (task.paused_at) {
          // Task is paused - use accumulated_seconds only
          durationMinutes = Math.floor((task.accumulated_seconds || 0) / 60);
        } else {
          // Task is active - accumulated_seconds + time since started_at
          const currentSessionSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          const totalSeconds = (task.accumulated_seconds || 0) + currentSessionSeconds;
          durationMinutes = Math.floor(totalSeconds / 60);
        }

        return {
          ...task,
          user_email: profile?.email || 'Unknown',
          user_name: profile?.name || 'Unknown User',
          duration_minutes: durationMinutes
        };
      });

      setLiveTasks(tasksWithUsers);
    } catch (error) {
      console.error('Error loading active tasks:', error);
    }
  };

  const loadUserActivities = async () => {
    try {
      // Use EST date, not local timezone
      const today = getDateKeyEST(nowEST());

      // Get all users
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name')
        .eq('role', 'eod_user');

      if (!profiles) return;

      // Get clock-in status for today
      const { data: clockIns } = await supabase
        .from('eod_clock_ins')
        .select('*')
        .eq('date', today)
        .in('user_id', profiles.map(p => p.user_id));

      // Get all time entries for today
      const { data: timeEntries } = await supabase
        .from('eod_time_entries')
        .select('*')
        .gte('started_at', `${today}T00:00:00`)
        .in('user_id', profiles.map(p => p.user_id));

      const activities: UserActivity[] = profiles.map(profile => {
        const userClockIns = clockIns?.filter(c => c.user_id === profile.user_id) || [];
        const userTasks = timeEntries?.filter(t => t.user_id === profile.user_id) || [];
        const activeTasks = userTasks.filter(t => !t.ended_at).length;
        
        // Calculate total time today from ALL clock-in sessions
        let totalMinutes = 0;
        userClockIns.forEach(clockIn => {
          if (clockIn.clocked_in_at) {
            const startTime = new Date(clockIn.clocked_in_at);
            const endTime = clockIn.clocked_out_at ? new Date(clockIn.clocked_out_at) : new Date();
            const diffMs = endTime.getTime() - startTime.getTime();
            const minutes = Math.floor(diffMs / (1000 * 60));
            totalMinutes += minutes;
          }
        });

        // Check if ANY clock-in is still active (user might have multiple clients)
        const hasActiveClockIn = userClockIns.some(clockIn => !clockIn.clocked_out_at);
        
        // Get the most recent clock-in (for display purposes)
        const mostRecentClockIn = userClockIns.sort((a, b) => 
          new Date(b.clocked_in_at).getTime() - new Date(a.clocked_in_at).getTime()
        )[0];

        // Get last activity
        const lastTask = userTasks.sort((a, b) => 
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )[0];

        return {
          user_id: profile.user_id,
          user_name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.first_name || profile.last_name || profile.email,
          user_email: profile.email,
          is_clocked_in: hasActiveClockIn, // Check ANY active clock-in, not just most recent
          clocked_in_at: mostRecentClockIn?.clocked_in_at,
          active_tasks: activeTasks,
          total_time_today: totalMinutes,
          last_activity: lastTask?.started_at
        };
      });

      setUserActivities(activities.sort((a, b) => b.active_tasks - a.active_tasks));
    } catch (error) {
      console.error('Error loading user activities:', error);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTimeSince = (date: string) => {
    const start = new Date(date);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    return `${hours}h ago`;
  };

  const handleAdminClockOut = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `⚠️ Admin Clock-Out\n\nAre you sure you want to clock out ${userName}?\n\nThis will end their current work session.`
    );
    
    if (!confirmed) return;

    setClockingOut(prev => ({ ...prev, [userId]: true }));
    
    try {
      // Use EST date and time, not local timezone
      const today = getDateKeyEST(nowEST());
      const now = nowEST().toISOString();
      
      console.log('=== ADMIN CLOCK-OUT (EST) ===');
      console.log('User ID:', userId);
      console.log('User Name:', userName);
      
      // Get all active clock-ins for this user today
      const { data: activeClockIns, error: fetchError } = await supabase
        .from('eod_clock_ins')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .is('clocked_out_at', null);

      if (fetchError) throw fetchError;

      if (!activeClockIns || activeClockIns.length === 0) {
        toast({
          title: 'Already Clocked Out',
          description: `${userName} is not currently clocked in.`,
          variant: 'default'
        });
        return;
      }

      console.log('Found', activeClockIns.length, 'active clock-in(s)');

      // Clock out all active sessions
      for (const clockIn of activeClockIns) {
        const { error: updateError } = await supabase
          .from('eod_clock_ins')
          .update({ clocked_out_at: now })
          .eq('id', clockIn.id);

        if (updateError) {
          console.error('Error clocking out session:', updateError);
          throw updateError;
        }

        console.log('✅ Clocked out session:', clockIn.client_name || 'session');
      }

      toast({
        title: 'User Clocked Out',
        description: `✅ Successfully clocked out ${userName} (${activeClockIns.length} session${activeClockIns.length > 1 ? 's' : ''})`,
      });

      // Reload data to reflect changes
      await loadLiveData();

    } catch (error: any) {
      console.error('Admin clock-out error:', error);
      toast({
        title: 'Clock-Out Failed',
        description: error.message || 'Failed to clock out user. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setClockingOut(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleDeleteTask = async (taskId: string, taskDescription: string, userName: string) => {
    const confirmed = window.confirm(
      `🗑️ Delete Active Task\n\nAre you sure you want to delete this task?\n\nUser: ${userName}\nTask: ${taskDescription}\n\n⚠️ This action cannot be undone!`
    );
    
    if (!confirmed) return;

    setDeletingTask(prev => ({ ...prev, [taskId]: true }));
    
    try {
      console.log('=== ADMIN DELETE TASK ===');
      console.log('Task ID:', taskId);
      console.log('Task Description:', taskDescription);
      console.log('User:', userName);
      
      // Delete the task from eod_time_entries
      const { error } = await supabase
        .from('eod_time_entries')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      console.log('✅ Task deleted successfully');

      toast({
        title: 'Task Deleted',
        description: `Successfully removed task: ${taskDescription}`,
      });

      // Reload data to reflect changes
      await loadLiveData();

    } catch (error: any) {
      console.error('Admin delete task error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete task. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDeletingTask(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Admin function to properly stop/complete a stale task
  const handleStopTask = async (task: LiveTask) => {
    const durationHours = Math.floor(task.duration_minutes / 60);
    const durationMins = task.duration_minutes % 60;
    
    const confirmed = window.confirm(
      `⏹️ Admin Stop Task\n\nAre you sure you want to stop this task?\n\nUser: ${task.user_name}\nTask: ${task.task_description}\nRunning for: ${durationHours}h ${durationMins}m\n\nThis will mark the task as completed with the current duration.`
    );
    
    if (!confirmed) return;

    setStoppingTask(prev => ({ ...prev, [task.id]: true }));
    
    try {
      console.log('=== ADMIN STOP TASK ===');
      console.log('Task ID:', task.id);
      console.log('Task Description:', task.task_description);
      console.log('User:', task.user_name);
      console.log('Duration (minutes):', task.duration_minutes);
      
      const now = nowEST().toISOString();
      
      // Properly complete the task - set ended_at and duration_minutes
      const { error } = await supabase
        .from('eod_time_entries')
        .update({ 
          ended_at: now,
          duration_minutes: task.duration_minutes,
          // Add a note that this was admin-stopped
          comments: `[Admin stopped: ${new Date().toLocaleString()}]`
        })
        .eq('id', task.id);

      if (error) throw error;

      console.log('✅ Task stopped successfully');

      toast({
        title: 'Task Stopped',
        description: `Successfully stopped task for ${task.user_name}: ${task.task_description} (${durationHours}h ${durationMins}m)`,
      });

      // Reload data to reflect changes
      await loadLiveData();

    } catch (error: any) {
      console.error('Admin stop task error:', error);
      toast({
        title: 'Stop Failed',
        description: error.message || 'Failed to stop task. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setStoppingTask(prev => ({ ...prev, [task.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading live data...</p>
        </div>
      </div>
    );
  }

  const activeUsers = userActivities.filter(u => u.is_clocked_in).length;
  const totalActiveTasks = liveTasks.length;
  const totalTimeToday = userActivities.reduce((sum, u) => sum + u.total_time_today, 0);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8 text-primary animate-pulse" />
            DAR Live
          </h1>
          <p className="text-muted-foreground">
            Real-time activity tracking • Updates every 10 seconds
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {currentTime.toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Currently clocked in
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Play className="h-4 w-4 text-green-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveTasks}</div>
            <p className="text-xs text-muted-foreground">
              Tasks in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Time Today</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalTimeToday)}</div>
            <p className="text-xs text-muted-foreground">
              Across all users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userActivities.length > 0 
                ? formatDuration(Math.floor(totalTimeToday / userActivities.length))
                : '0h 0m'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Per user today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Tasks */}
        <Card>
          <CardHeader className="bg-gradient-secondary">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-green-500 animate-pulse" />
              Uncompleted Tasks ({totalActiveTasks})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tasks that haven't been stopped (includes stale tasks from previous days)
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {liveTasks.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Square className="mx-auto h-12 w-12 mb-2" />
                  <p>No active tasks right now</p>
                </div>
              ) : (
                <div className="divide-y">
                  {liveTasks.map((task) => (
                    <div key={task.id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {task.user_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{task.user_name}</p>
                            <p className="text-xs text-muted-foreground">{task.user_email}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={
                            (task as any).paused_at 
                              ? "bg-yellow-500 text-white" 
                              : task.duration_minutes > 480 
                                ? "bg-red-500 text-white" 
                                : "bg-green-500 text-white animate-pulse"
                          }>
                            {(task as any).paused_at ? (
                              <>
                                <Square className="h-3 w-3 mr-1" />
                                Paused
                              </>
                            ) : task.duration_minutes > 480 ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Stale ({Math.floor(task.duration_minutes / 60)}h)
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Active
                              </>
                            )}
                          </Badge>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 text-xs border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                              onClick={() => handleStopTask(task)}
                              disabled={stoppingTask[task.id]}
                              title="Stop this task (marks as completed)"
                            >
                              <StopCircle className="h-4 w-4 mr-1" />
                              {stoppingTask[task.id] ? 'Stopping...' : 'Stop'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-8 px-3 text-xs"
                              onClick={() => handleDeleteTask(task.id, task.task_description, task.user_name || 'Unknown')}
                              disabled={deletingTask[task.id]}
                              title="Delete this task (removes entirely)"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {deletingTask[task.id] ? '...' : 'Delete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-10 space-y-1">
                        <p className="text-sm font-medium">{task.client_name}</p>
                        <p className="text-sm text-muted-foreground">{task.task_description}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>Started {getTimeSince(task.started_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            <span className="font-semibold text-primary">
                              {formatDuration(task.duration_minutes)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* User Activity */}
        <Card>
          <CardHeader className="bg-gradient-secondary">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Activity ({userActivities.length})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              All users and their current status
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {userActivities.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <User className="mx-auto h-12 w-12 mb-2" />
                  <p>No users found</p>
                </div>
              ) : (
                <div className="divide-y">
                  {userActivities.map((user) => (
                    <div key={user.user_id} className="p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {user.user_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold text-sm">{user.user_name}</p>
                            <p className="text-xs text-muted-foreground">{user.user_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={user.is_clocked_in ? "default" : "secondary"}>
                            {user.is_clocked_in ? (
                              <>
                                <Clock className="h-3 w-3 mr-1" />
                                Clocked In
                              </>
                            ) : (
                              'Clocked Out'
                            )}
                          </Badge>
                          {user.is_clocked_in && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                              onClick={() => handleAdminClockOut(user.user_id, user.user_name)}
                              disabled={clockingOut[user.user_id]}
                              title="Admin Clock-Out"
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              {clockingOut[user.user_id] ? 'Clocking out...' : 'Clock Out'}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-10 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Active Tasks</p>
                            <p className="font-semibold">
                              {user.active_tasks > 0 ? (
                                <span className="text-green-500">{user.active_tasks}</span>
                              ) : (
                                <span>0</span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Time Today</p>
                            <p className="font-semibold">{formatDuration(user.total_time_today)}</p>
                          </div>
                        </div>
                        
                        {user.is_clocked_in && user.clocked_in_at && (
                          <div className="text-xs text-muted-foreground">
                            Clocked in {getTimeSince(user.clocked_in_at)}
                          </div>
                        )}
                        
                        {user.last_activity && (
                          <div className="text-xs text-muted-foreground">
                            Last activity: {getTimeSince(user.last_activity)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


