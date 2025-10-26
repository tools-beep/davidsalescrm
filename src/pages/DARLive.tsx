import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Clock, 
  Play, 
  Square, 
  User, 
  Calendar,
  Activity,
  TrendingUp,
  Users,
  Timer
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
      const today = new Date().toISOString().split('T')[0];
      
      // Get active tasks (tasks that have started but not ended)
      const { data: tasks, error } = await supabase
        .from('eod_time_entries')
        .select('*')
        .gte('started_at', `${today}T00:00:00`)
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
      const today = new Date().toISOString().split('T')[0];

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
        const userClockIn = clockIns?.find(c => c.user_id === profile.user_id);
        const userTasks = timeEntries?.filter(t => t.user_id === profile.user_id) || [];
        const activeTasks = userTasks.filter(t => !t.ended_at).length;
        
        // Calculate total time today
        const totalMinutes = userTasks.reduce((sum, task) => {
          if (task.duration_minutes) {
            return sum + task.duration_minutes;
          }
          return sum;
        }, 0);

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
          is_clocked_in: !!(userClockIn && !userClockIn.clocked_out_at),
          clocked_in_at: userClockIn?.clocked_in_at,
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
              Active Tasks ({totalActiveTasks})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tasks currently in progress
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
    </div>
  );
}

