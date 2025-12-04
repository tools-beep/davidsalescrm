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
  Timer,
  StopCircle,
  Trash2,
  LogOut
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { nowEST, getDateKeyEST } from "@/utils/timezoneUtils";

interface LiveTask {
  id: string;
  user_id: string;
  client_name: string;
  task_description: string;
  started_at: string;
  paused_at?: string | null;
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

export function DARLiveContent() {
  const { toast } = useToast();
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [stoppingTask, setStoppingTask] = useState<Record<string, boolean>>({});
  const [deletingTask, setDeletingTask] = useState<Record<string, boolean>>({});
  const [clockingOut, setClockingOut] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadLiveData();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadLiveData();
    }, 10000);

    // Subscribe to real-time updates
    const subscription = supabase
      .channel('dar_live_content_updates')
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
      console.log('Loading ALL uncompleted tasks...');
      
      // Get ALL uncompleted tasks (no ended_at) - including stale ones from previous days
      const { data: tasks, error } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .is('ended_at', null)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error loading active tasks:', error);
        throw error;
      }
      
      console.log('Uncompleted tasks loaded:', tasks?.length || 0);

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
        
        // Calculate duration correctly
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
      const today = getDateKeyEST(nowEST());

      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name')
        .eq('role', 'eod_user');

      console.log('DAR users found:', profiles?.length || 0);
      if (!profiles) return;

      const { data: clockIns } = await (supabase as any)
        .from('eod_clock_ins')
        .select('*')
        .eq('date', today)
        .in('user_id', profiles.map(p => p.user_id));
      
      const { data: activeSessions } = await supabase
        .from('eod_submissions')
        .select('*')
        .is('submitted_at', null)
        .gte('created_at', `${today}T00:00:00`)
        .in('user_id', profiles.map(p => p.user_id));

      const { data: timeEntries } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .gte('started_at', `${today}T00:00:00`)
        .in('user_id', profiles.map(p => p.user_id));

      const activities: UserActivity[] = profiles.map(profile => {
        const userClockIns = clockIns?.filter(c => c.user_id === profile.user_id) || [];
        const userActiveSessions = activeSessions?.filter(s => s.user_id === profile.user_id) || [];
        const userTasks = timeEntries?.filter(t => t.user_id === profile.user_id) || [];
        const activeTasks = userTasks.filter(t => !t.ended_at && !t.paused_at).length;
        
        const hasActiveClockIn = userClockIns.some(clockIn => !clockIn.clocked_out_at);
        const hasActiveSession = userActiveSessions.length > 0;
        const isActive = hasActiveClockIn || hasActiveSession || activeTasks > 0;
        
        if (activeTasks > 0 || hasActiveSession) {
          console.log(`User ${profile.email}:`, {
            clockIns: userClockIns.length,
            activeClockIns: userClockIns.filter(c => !c.clocked_out_at).length,
            activeSessions: userActiveSessions.length,
            activeTasks,
            isActive
          });
        }
        
        const mostRecentClockIn = userClockIns.sort((a, b) => 
          new Date(b.clocked_in_at).getTime() - new Date(a.clocked_in_at).getTime()
        )[0];
        
        const totalMinutes = userTasks.reduce((sum, task) => {
          if (task.duration_minutes) {
            return sum + task.duration_minutes;
          }
          return sum;
        }, 0);

        const lastTask = userTasks.sort((a, b) => 
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        )[0];

        return {
          user_id: profile.user_id,
          user_name: profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : profile.first_name || profile.last_name || profile.email,
          user_email: profile.email,
          is_clocked_in: isActive,
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
      
      const { error } = await supabase
        .from('eod_time_entries')
        .update({ 
          ended_at: now,
          duration_minutes: task.duration_minutes,
          comments: `[Admin stopped: ${new Date().toLocaleString()}]`
        })
        .eq('id', task.id);

      if (error) throw error;

      console.log('✅ Task stopped successfully');

      toast({
        title: 'Task Stopped',
        description: `Successfully stopped task for ${task.user_name}: ${task.task_description} (${durationHours}h ${durationMins}m)`,
      });

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

  // Admin function to delete a task entirely
  const handleDeleteTask = async (task: LiveTask) => {
    const confirmed = window.confirm(
      `🗑️ Delete Active Task\n\nAre you sure you want to delete this task?\n\nUser: ${task.user_name}\nTask: ${task.task_description}\n\n⚠️ This action cannot be undone!`
    );
    
    if (!confirmed) return;

    setDeletingTask(prev => ({ ...prev, [task.id]: true }));
    
    try {
      console.log('=== ADMIN DELETE TASK ===');
      console.log('Task ID:', task.id);
      
      const { error } = await supabase
        .from('eod_time_entries')
        .delete()
        .eq('id', task.id);

      if (error) throw error;

      console.log('✅ Task deleted successfully');

      toast({
        title: 'Task Deleted',
        description: `Successfully removed task: ${task.task_description}`,
      });

      await loadLiveData();

    } catch (error: any) {
      console.error('Admin delete task error:', error);
      toast({
        title: 'Delete Failed',
        description: error.message || 'Failed to delete task. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDeletingTask(prev => ({ ...prev, [task.id]: false }));
    }
  };

  // Admin function to clock out a user
  const handleAdminClockOut = async (userId: string, userName: string) => {
    const confirmed = window.confirm(
      `⚠️ Admin Clock-Out\n\nAre you sure you want to clock out ${userName}?\n\nThis will end their current work session.`
    );
    
    if (!confirmed) return;

    setClockingOut(prev => ({ ...prev, [userId]: true }));
    
    try {
      const today = getDateKeyEST(nowEST());
      const now = nowEST().toISOString();
      
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

      for (const clockIn of activeClockIns) {
        const { error: updateError } = await supabase
          .from('eod_clock_ins')
          .update({ clocked_out_at: now })
          .eq('id', clockIn.id);

        if (updateError) throw updateError;
      }

      toast({
        title: 'User Clocked Out',
        description: `✅ Successfully clocked out ${userName}`,
      });

      await loadLiveData();

    } catch (error: any) {
      console.error('Admin clock-out error:', error);
      toast({
        title: 'Clock-Out Failed',
        description: error.message || 'Failed to clock out user.',
        variant: 'destructive'
      });
    } finally {
      setClockingOut(prev => ({ ...prev, [userId]: false }));
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

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Active Tasks */}
      <Card>
        <CardHeader className="bg-gradient-secondary">
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-500 animate-pulse" />
            Uncompleted Tasks ({liveTasks.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tasks that haven't been stopped (includes stale tasks from previous days)
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            {liveTasks.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Play className="mx-auto h-12 w-12 mb-2" />
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
                        {/* Status Badge */}
                        <Badge className={
                          task.paused_at 
                            ? "bg-yellow-500 text-white" 
                            : task.duration_minutes > 480 
                              ? "bg-red-500 text-white" 
                              : "bg-green-500 text-white animate-pulse"
                        }>
                          {task.paused_at ? (
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
                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                            onClick={() => handleStopTask(task)}
                            disabled={stoppingTask[task.id]}
                            title="Stop this task (marks as completed)"
                          >
                            <StopCircle className="h-3 w-3 mr-1" />
                            {stoppingTask[task.id] ? '...' : 'Stop'}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2 text-xs"
                            onClick={() => handleDeleteTask(task)}
                            disabled={deletingTask[task.id]}
                            title="Delete this task (removes entirely)"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
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
                          <span className={`font-semibold ${task.duration_minutes > 480 ? 'text-red-500' : 'text-primary'}`}>
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
            <User className="h-5 w-5" />
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
                            className="h-7 px-2 text-xs border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleAdminClockOut(user.user_id, user.user_name)}
                            disabled={clockingOut[user.user_id]}
                            title="Admin Clock-Out"
                          >
                            <LogOut className="h-3 w-3 mr-1" />
                            {clockingOut[user.user_id] ? '...' : 'Clock Out'}
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
  );
}
