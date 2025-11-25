import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Clock, 
  Play, 
  User, 
  Timer
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

export function DARLiveContent() {
  const { toast } = useToast();
  const [liveTasks, setLiveTasks] = useState<LiveTask[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLiveData();
    
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      loadLiveData();
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
      // Use EST date, not local timezone
      const today = getDateKeyEST(nowEST());
      
      console.log('Loading active tasks for EST date:', today);
      
      const { data: tasks, error } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .is('ended_at', null)
        .is('paused_at', null)
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error loading active tasks:', error);
        throw error;
      }
      
      console.log('Active tasks loaded (all):', tasks?.length || 0);
      console.log('Active tasks data:', tasks);

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
        const durationMinutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60));

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
      
      // Also check for active sessions (eod_submissions that are not submitted yet)
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
        // Get ALL clock-ins for this user today
        const userClockIns = clockIns?.filter(c => c.user_id === profile.user_id) || [];
        const userActiveSessions = activeSessions?.filter(s => s.user_id === profile.user_id) || [];
        const userTasks = timeEntries?.filter(t => t.user_id === profile.user_id) || [];
        const activeTasks = userTasks.filter(t => !t.ended_at && !t.paused_at).length;
        
        // User is clocked in if:
        // 1. ANY of their clock-in sessions are still active (no clocked_out_at), OR
        // 2. They have active EOD sessions (not yet submitted), OR
        // 3. They have active tasks
        const hasActiveClockIn = userClockIns.some(clockIn => !clockIn.clocked_out_at);
        const hasActiveSession = userActiveSessions.length > 0;
        const isActive = hasActiveClockIn || hasActiveSession || activeTasks > 0;
        
        // Debug logging
        if (activeTasks > 0 || hasActiveSession) {
          console.log(`User ${profile.email}:`, {
            clockIns: userClockIns.length,
            activeClockIns: userClockIns.filter(c => !c.clocked_out_at).length,
            activeSessions: userActiveSessions.length,
            activeTasks,
            isActive
          });
        }
        
        // Get the most recent clock-in for display purposes
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
          is_clocked_in: isActive, // Use the combined check
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
            Active Tasks ({liveTasks.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Tasks currently in progress
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
                      <Badge className="bg-green-500 text-white animate-pulse">
                        <Play className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
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

