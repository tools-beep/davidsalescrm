import { useEffect, useState, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogOut, Upload, Play, Square, Trash2, Link as LinkIcon, Image as ImageIcon, Search, History, Edit2, Check, X, MessageSquare, Settings, Eye, EyeOff, Key, ChevronDown, Pause, Globe, Menu, ListPlus, List, Bell, AlertCircle, MessageCircle } from "lucide-react";
import { EODMessaging } from "@/components/eod/EODMessaging";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeEntry {
  id: string;
  client_name: string;
  client_email?: string | null;
  client_timezone?: string | null;
  task_description: string;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  duration_minutes: number | null;
  task_link?: string | null;
  comments?: string | null;
  comment_images?: string[];
  status?: string;
  accumulated_seconds?: number;
}

interface ClockIn {
  id: string;
  clocked_in_at: string;
  clocked_out_at: string | null;
  date: string;
}

interface QueuedTask {
  id: string;
  client_name: string;
  task_description: string;
  created_at: string;
}

export default function DARPortal() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [images, setImages] = useState<Array<{ id: string; url: string }>>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [clientOpen, setClientOpen] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskLink, setTaskLink] = useState("");
  const [clients, setClients] = useState<Array<{ name: string; email?: string; timezone?: string }>>([]);
  const [stopDialog, setStopDialog] = useState(false);
  const [stoppedEntry, setStoppedEntry] = useState<any>(null);
  const [clockIn, setClockIn] = useState<ClockIn | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [commentImages, setCommentImages] = useState<Record<string, string[]>>({});
  const [uploadingCommentImage, setUploadingCommentImage] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"clients" | "messages" | "history" | "settings" | "feedback">("clients");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientClockIns, setClientClockIns] = useState<Record<string, ClockIn | null>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [submissionTasks, setSubmissionTasks] = useState<any[]>([]);
  const [submissionImages, setSubmissionImages] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Password change states
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Per-client task tracking states
  const [activeEntryByClient, setActiveEntryByClient] = useState<Record<string, TimeEntry | null>>({});
  const [pausedTasksByClient, setPausedTasksByClient] = useState<Record<string, TimeEntry[]>>({});
  const [timeEntriesByClient, setTimeEntriesByClient] = useState<Record<string, TimeEntry[]>>({});
  const [activeTaskCommentsByClient, setActiveTaskCommentsByClient] = useState<Record<string, string>>({});
  const [activeTaskLinkByClient, setActiveTaskLinkByClient] = useState<Record<string, string>>({});
  const [activeTaskStatusByClient, setActiveTaskStatusByClient] = useState<Record<string, string>>({});
  const [activeTaskImagesByClient, setActiveTaskImagesByClient] = useState<Record<string, string[]>>({});
  const [liveDurationByClient, setLiveDurationByClient] = useState<Record<string, number>>({});
  const [liveSecondsByClient, setLiveSecondsByClient] = useState<Record<string, number>>({});
  
  // Task queue states
  const [queuedTasksByClient, setQueuedTasksByClient] = useState<Record<string, QueuedTask[]>>({});
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [queueTaskDescription, setQueueTaskDescription] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  
  // Paused task notification states
  const [pausedTaskNotifications, setPausedTaskNotifications] = useState<Set<string>>(new Set());
  const [showPausedTaskAlert, setShowPausedTaskAlert] = useState(false);
  const [pausedTasksOver30Min, setPausedTasksOver30Min] = useState<TimeEntry[]>([]);

  // Feedback states
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackImages, setFeedbackImages] = useState<string[]>([]);
  const [uploadingFeedbackImage, setUploadingFeedbackImage] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  
  // Live client timezone time
  const [clientLiveTime, setClientLiveTime] = useState<string>("");
  
  // Live total clocked hours
  const [totalClockedHours, setTotalClockedHours] = useState<string>("");
  
  // Helper to get current client's active entry
  const activeEntry = selectedClient ? activeEntryByClient[selectedClient] || null : null;
  const pausedTasks = selectedClient ? pausedTasksByClient[selectedClient] || [] : [];
  const timeEntries = selectedClient ? timeEntriesByClient[selectedClient] || [] : [];
  const queuedTasks = selectedClient ? queuedTasksByClient[selectedClient] || [] : [];
  const activeTaskComments = selectedClient ? activeTaskCommentsByClient[selectedClient] || "" : "";
  const activeTaskLink = selectedClient ? activeTaskLinkByClient[selectedClient] || "" : "";
  const activeTaskStatus = selectedClient ? activeTaskStatusByClient[selectedClient] || "in_progress" : "in_progress";
  const activeTaskImages = selectedClient ? activeTaskImagesByClient[selectedClient] || [] : [];
  const liveDuration = selectedClient ? liveDurationByClient[selectedClient] || 0 : 0;
  const liveSeconds = selectedClient ? liveSecondsByClient[selectedClient] || 0 : 0;
  const clientTimezone = selectedClient ? (clients.find(c => c.name === selectedClient)?.timezone || "America/Los_Angeles") : "America/Los_Angeles";
  
  // Helper setters that update per-client state
  const setActiveTaskComments = (value: string) => {
    if (selectedClient) {
      setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: value }));
    }
  };
  
  const setActiveTaskLink = (value: string) => {
    if (selectedClient) {
      setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: value }));
    }
  };
  
  const setActiveTaskStatus = (value: string) => {
    if (selectedClient) {
      setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: value }));
    }
  };
  
  const setActiveTaskImages = (value: string[] | ((prev: string[]) => string[])) => {
    if (selectedClient) {
      setActiveTaskImagesByClient(prev => ({
        ...prev,
        [selectedClient]: typeof value === 'function' ? value(prev[selectedClient] || []) : value
      }));
    }
  };
  
  const setActiveEntry = (entry: TimeEntry | null) => {
    if (selectedClient) {
      setActiveEntryByClient(prev => ({ ...prev, [selectedClient]: entry }));
    }
  };
  
  const setPausedTasks = (tasks: TimeEntry[] | ((prev: TimeEntry[]) => TimeEntry[])) => {
    if (selectedClient) {
      setPausedTasksByClient(prev => ({
        ...prev,
        [selectedClient]: typeof tasks === 'function' ? tasks(prev[selectedClient] || []) : tasks
      }));
    }
  };
  
  const setTimeEntries = (entries: TimeEntry[] | ((prev: TimeEntry[]) => TimeEntry[])) => {
    if (selectedClient) {
      setTimeEntriesByClient(prev => ({
        ...prev,
        [selectedClient]: typeof entries === 'function' ? entries(prev[selectedClient] || []) : entries
      }));
    }
  };

  useEffect(() => {
    checkAuth();
    loadClients();
    loadQueueTasks();
    loadUnreadCount();
    
    // Set up real-time subscription for unread count
    const channel = supabase
      .channel('unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadUnreadCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_chat_messages' }, () => {
        loadUnreadCount();
      })
      .subscribe();

    // Set up real-time subscription for clock-in changes
    const clockInChannel = supabase
      .channel('clock-in-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eod_clock_ins' }, () => {
        loadClientClockIns();
      })
      .subscribe();

    // Reload clock-ins when page becomes visible (e.g., after tab switch or refresh)
    // Note: We only reload data, we do NOT auto-clock-out when tab is hidden
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page is now visible - reload clock-ins to get latest state
        loadClientClockIns();
        loadQueueTasks(); // Also reload queue tasks
      }
      // When page is hidden (tab switched), we do nothing - keep timers running
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(clockInChannel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Live timer for active tasks (with seconds) - runs for each client with an active task
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];
    
    // Set up interval for each client with an active task
    Object.entries(activeEntryByClient).forEach(([clientName, entry]) => {
      if (entry && !entry.paused_at) {
        const interval = setInterval(() => {
          const start = new Date(entry.started_at);
          const now = new Date();
          const currentSessionSeconds = Math.floor((now.getTime() - start.getTime()) / 1000);
          
          // Add accumulated seconds from previous sessions (if resumed after pause)
          const accumulatedSeconds = entry.accumulated_seconds || 0;
          const totalSeconds = currentSessionSeconds + accumulatedSeconds;
          const totalMinutes = Math.floor(totalSeconds / 60);
          
          setLiveDurationByClient(prev => ({ ...prev, [clientName]: totalMinutes }));
          setLiveSecondsByClient(prev => ({ ...prev, [clientName]: totalSeconds % 60 }));
        }, 1000); // Update every second
        
        intervals.push(interval);
      }
    });
    
    return () => intervals.forEach(clearInterval);
  }, [activeEntryByClient]);

  // Check for paused tasks over 30 minutes
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      
      // Get all paused tasks across all clients
      const allPausedTasks: TimeEntry[] = [];
      Object.entries(pausedTasksByClient).forEach(([clientName, tasks]) => {
        allPausedTasks.push(...tasks);
      });
      
      // Filter tasks paused for more than 30 minutes
      const tasksOver30Min = allPausedTasks.filter(task => {
        if (!task.paused_at) return false;
        const pausedTime = new Date(task.paused_at);
        return pausedTime < thirtyMinutesAgo;
      });
      
      // Check if there are new tasks to notify about
      const newNotifications = tasksOver30Min.filter(task => !pausedTaskNotifications.has(task.id));
      
      if (newNotifications.length > 0) {
        setPausedTasksOver30Min(tasksOver30Min);
        setShowPausedTaskAlert(true);
        
        // Mark these tasks as notified
        setPausedTaskNotifications(prev => {
          const newSet = new Set(prev);
          newNotifications.forEach(task => newSet.add(task.id));
          return newSet;
        });
        
        // Show toast notification
        toast({
          title: "Paused Tasks Alert",
          description: `${newNotifications.length} task(s) have been paused for over 30 minutes`,
          variant: "default",
        });
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkInterval);
  }, [pausedTasksByClient, pausedTaskNotifications, toast]);

  // Handle paste event for images
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            await uploadImageBlob(blob);
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [reportId]);

  // Update client live time every second
  useEffect(() => {
    const updateClientTime = () => {
      if (selectedClient && clientTimezone) {
        try {
          const now = new Date();
          const timeString = now.toLocaleTimeString('en-US', {
            timeZone: clientTimezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
          });
          setClientLiveTime(timeString);
        } catch (error) {
          console.error('Error formatting client time:', error);
          setClientLiveTime('');
        }
      } else {
        setClientLiveTime('');
      }
    };

    // Update immediately
    updateClientTime();

    // Then update every second
    const interval = setInterval(updateClientTime, 1000);

    return () => clearInterval(interval);
  }, [selectedClient, clientTimezone]);

  // Update total clocked hours every second
  useEffect(() => {
    const updateTotalHours = () => {
      if (selectedClient && clientClockIns[selectedClient] && !clientClockIns[selectedClient]?.clocked_out_at) {
        const clockedInAt = clientClockIns[selectedClient]?.clocked_in_at;
        if (clockedInAt) {
          const now = new Date();
          const clockInTime = new Date(clockedInAt);
          const diffMs = now.getTime() - clockInTime.getTime();
          
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
          
          setTotalClockedHours(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTotalClockedHours('');
        }
      } else {
        setTotalClockedHours('');
      }
    };

    // Update immediately
    updateTotalHours();

    // Then update every second
    const interval = setInterval(updateTotalHours, 1000);

    return () => clearInterval(interval);
  }, [selectedClient, clientClockIns]);

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate('/login');
      return;
    }
    setUser(authUser);
    loadToday();
  };

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const clientMap = new Map<string, { name: string; email?: string; timezone?: string }>();
      
      // First, check if user has assigned clients
      const { data: assignedClients, error: assignedError } = await (supabase as any)
        .from('user_client_assignments')
        .select('client_name, client_email, client_timezone')
        .eq('user_id', user.id);
      
      if (!assignedError && assignedClients && assignedClients.length > 0) {
        // User has assigned clients - fetch timezone from deals or companies table
        for (const client of assignedClients) {
          if (client.client_name) {
            // First, try to get timezone from deals table
            const { data: deals } = await supabase
              .from('deals')
              .select('timezone')
              .eq('name', client.client_name)
              .limit(1);
            
            const dealTimezone = deals && deals.length > 0 ? deals[0]?.timezone : null;
            
            // If not found in deals, try companies table
            let companyTimezone = null;
            if (!dealTimezone) {
              const { data: companies } = await supabase
                .from('companies')
                .select('timezone')
                .eq('name', client.client_name)
                .limit(1);
              
              companyTimezone = companies && companies.length > 0 ? companies[0]?.timezone : null;
            }
            
            clientMap.set(client.client_name, { 
              name: client.client_name, 
              email: client.client_email,
              timezone: dealTimezone || companyTimezone || client.client_timezone || 'America/Los_Angeles'
            });
          }
        }
      } else {
        // No assigned clients - show all clients (fallback)
        // Load from deals with contact emails and timezone
        const { data: deals, error: dealsError } = await supabase
        .from('deals')
          .select('name, timezone, companies(name, email, timezone), contacts(email)')
          .order('name')
          .limit(200);
        
        if (!dealsError && deals) {
          deals.forEach((deal: any) => {
            const dealEmail = deal.contacts?.email || deal.companies?.email;
            const dealTimezone = deal.timezone || deal.companies?.timezone || 'America/Los_Angeles';
            if (deal.name && !clientMap.has(deal.name)) {
              clientMap.set(deal.name, { name: deal.name, email: dealEmail, timezone: dealTimezone });
            }
            if (deal.companies?.name && !clientMap.has(deal.companies.name)) {
              clientMap.set(deal.companies.name, { 
                name: deal.companies.name, 
                email: deal.companies.email,
                timezone: deal.companies.timezone || 'America/Los_Angeles'
              });
            }
          });
        }

        // Load from companies
        const { data: companies, error: companiesError } = await supabase
        .from('companies')
          .select('name, email, timezone')
          .order('name')
          .limit(200);
        
        if (!companiesError && companies) {
          companies.forEach((c: any) => {
            if (c.name && !clientMap.has(c.name)) {
              clientMap.set(c.name, { name: c.name, email: c.email, timezone: c.timezone || 'America/Los_Angeles' });
            }
          });
        }
      }

      const clientArray = Array.from(clientMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      console.log('Loaded clients:', clientArray.length);
      setClients(clientArray);
      
      // Set first client as selected by default
      if (clientArray.length > 0 && !selectedClient) {
        setSelectedClient(clientArray[0].name);
      }
      
      // Load clock-in status for all clients - pass clientArray directly
      if (clientArray.length > 0) {
        loadClientClockIns(clientArray);
      }
    } catch (e) {
      console.error('Failed to load clients:', e);
      setClients([]); // Set empty array on error
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Get unread count from direct conversations
      const { data: conversations } = await (supabase as any)
        .from('conversation_participants')
        .select('conversation_id, last_read_at, conversations!inner(id)')
        .eq('user_id', currentUser.id);

      let directUnread = 0;
      if (conversations) {
        for (const conv of conversations) {
          const { count } = await (supabase as any)
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .gt('created_at', conv.last_read_at || '1970-01-01')
            .neq('sender_id', currentUser.id);
          
          directUnread += count || 0;
        }
      }

      // Get unread count from group chats
      const { data: groupMemberships } = await (supabase as any)
        .from('group_chat_members')
        .select('group_id, last_read_at')
        .eq('user_id', currentUser.id);

      let groupUnread = 0;
      if (groupMemberships) {
        for (const membership of groupMemberships) {
          const { count } = await (supabase as any)
            .from('group_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', membership.group_id)
            .gt('created_at', membership.last_read_at || '1970-01-01')
            .neq('sender_id', currentUser.id);
          
          groupUnread += count || 0;
        }
      }

      setUnreadCount(directUnread + groupUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const loadToday = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: report } = await supabase
        .from('eod_reports')
        .select('*')
        .eq('report_date', today)
        .maybeSingle();

      if (report) {
        setReportId(report.id);
        setSummary(report.summary || "");

        const { data: imgs } = await supabase
          .from('eod_report_images')
          .select('id, public_url')
          .eq('eod_id', report.id);
        setImages((imgs || []).map(i => ({ id: i.id, url: i.public_url || '' })));

        const { data: entries } = await (supabase as any)
          .from('eod_time_entries')
          .select('*')
          .eq('eod_id', report.id)
          .order('started_at', { ascending: false });
        
        // Group entries by client
        const allEntries = entries || [];
        const activeByClient: Record<string, TimeEntry | null> = {};
        const pausedByClient: Record<string, TimeEntry[]> = {};
        const completedByClient: Record<string, TimeEntry[]> = {};
        
        allEntries.forEach((entry: TimeEntry) => {
          const client = entry.client_name;
          
          if (!entry.ended_at && !entry.paused_at) {
            // Active task
            activeByClient[client] = entry;
          } else if (!entry.ended_at && entry.paused_at) {
            // Paused task
            if (!pausedByClient[client]) pausedByClient[client] = [];
            pausedByClient[client].push(entry);
          } else if (entry.ended_at) {
            // Completed task
            if (!completedByClient[client]) completedByClient[client] = [];
            completedByClient[client].push(entry);
          }
        });
        
        setActiveEntryByClient(activeByClient);
        setPausedTasksByClient(pausedByClient);
        setTimeEntriesByClient(completedByClient);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (clockIn && !clockIn.clocked_out_at) {
      toast({ title: 'Already clocked in', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('eod_clock_ins')
        .insert([{ 
          user_id: user.id, 
          clocked_in_at: now,
          date: today
        }])
        .select('*')
        .single();
      
      if (error) throw error;
      setClockIn(data);
      toast({ title: 'Clocked In', description: `Started at ${new Date(now).toLocaleTimeString()}` });
    } catch (e: any) {
      toast({ title: 'Failed to clock in', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!clockIn || clockIn.clocked_out_at) {
      toast({ title: 'Not clocked in', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('eod_clock_ins')
        .update({ clocked_out_at: now })
        .eq('id', clockIn.id);
      
      if (error) throw error;
      setClockIn({ ...clockIn, clocked_out_at: now });
      toast({ title: 'Clocked Out', description: `Ended at ${new Date(now).toLocaleTimeString()}` });
    } catch (e: any) {
      toast({ title: 'Failed to clock out', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Client-specific clock in/out functions
  const loadClientClockIns = async (clientList?: Array<{ name: string; email?: string; timezone?: string }>) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const today = new Date().toISOString().split('T')[0];
      
      const { data: clockIns, error } = await (supabase as any)
        .from('eod_clock_ins')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('date', today);

      if (error) throw error;

      // Use provided clientList or fall back to clients state
      const clientsToUse = clientList || clients;
      
      const clockInMap: Record<string, ClockIn | null> = {};
      clientsToUse.forEach(client => {
        const clientClockIn = clockIns?.find((c: any) => c.client_name === client.name);
        clockInMap[client.name] = clientClockIn || null;
      });

      setClientClockIns(clockInMap);
    } catch (e: any) {
      console.error('Failed to load client clock-ins:', e);
    }
  };

  const handleClientClockIn = async (clientName: string) => {
    const existing = clientClockIns[clientName];
    if (existing && !existing.clocked_out_at) {
      toast({ title: 'Already clocked in', description: `Already clocked in for ${clientName}`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const now = new Date().toISOString();
      
      const { data, error } = await (supabase as any)
        .from('eod_clock_ins')
        .insert([{
          user_id: user.id,
          client_name: clientName,
          clocked_in_at: now,
          date: today
        }])
        .select('*')
        .single();

      if (error) throw error;

      setClientClockIns(prev => ({
        ...prev,
        [clientName]: data
      }));

      toast({ title: 'Clocked In', description: `Clocked in for ${clientName} at ${new Date(now).toLocaleTimeString()}` });
    } catch (e: any) {
      toast({ title: 'Failed to clock in', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClientClockOut = async (clientName: string) => {
    const existing = clientClockIns[clientName];
    if (!existing || existing.clocked_out_at) {
      toast({ title: 'Not clocked in', description: `Not clocked in for ${clientName}`, variant: 'destructive' });
      return;
    }

    // Confirm before clocking out
    if (!window.confirm(`Are you sure you want to clock out from ${clientName}?`)) {
      return;
    }

    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      const { error } = await (supabase as any)
        .from('eod_clock_ins')
        .update({ clocked_out_at: now })
        .eq('id', existing.id);

      if (error) throw error;

      setClientClockIns(prev => ({
        ...prev,
        [clientName]: { ...existing, clocked_out_at: now }
      }));

      toast({ title: 'Clocked Out', description: `Clocked out from ${clientName} at ${new Date(now).toLocaleTimeString()}` });
    } catch (e: any) {
      toast({ title: 'Failed to clock out', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Load queue tasks from database
  const loadQueueTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from('eod_queue_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by client
      const tasksByClient: Record<string, QueuedTask[]> = {};
      data?.forEach((task: any) => {
        if (!tasksByClient[task.client_name]) {
          tasksByClient[task.client_name] = [];
        }
        tasksByClient[task.client_name].push({
          id: task.id,
          client_name: task.client_name,
          task_description: task.task_description,
          created_at: task.created_at
        });
      });

      setQueuedTasksByClient(tasksByClient);
    } catch (error) {
      console.error('Error loading queue tasks:', error);
    }
  };

  // Task Queue Functions
  const addTaskToQueue = async () => {
    if (!selectedClient) {
      toast({ title: 'Error', description: 'Please select a client first', variant: 'destructive' });
      return;
    }
    if (!taskDescription.trim()) {
      toast({ title: 'Error', description: 'Please enter a task description', variant: 'destructive' });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Save to database
      const { data, error } = await (supabase as any)
        .from('eod_queue_tasks')
        .insert([{
          user_id: user.id,
          client_name: selectedClient,
          task_description: taskDescription
        }])
        .select()
        .single();

      if (error) throw error;

      const newTask: QueuedTask = {
        id: data.id,
        client_name: data.client_name,
        task_description: data.task_description,
        created_at: data.created_at
      };

      setQueuedTasksByClient(prev => ({
        ...prev,
        [selectedClient]: [...(prev[selectedClient] || []), newTask]
      }));

      // Clear the task description after adding to queue
      setTaskDescription("");
      setShowQueue(true); // Show queue automatically
      toast({ title: 'Task Added', description: 'Task added to queue successfully' });
    } catch (error: any) {
      console.error('Error adding task to queue:', error);
      toast({ title: 'Error', description: 'Failed to add task to queue', variant: 'destructive' });
    }
  };

  const removeTaskFromQueue = async (taskId: string) => {
    if (!selectedClient) return;
    
    try {
      // Delete from database
      const { error } = await (supabase as any)
        .from('eod_queue_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setQueuedTasksByClient(prev => ({
        ...prev,
        [selectedClient]: (prev[selectedClient] || []).filter(t => t.id !== taskId)
      }));

      toast({ title: 'Task Removed', description: 'Task removed from queue' });
    } catch (error: any) {
      console.error('Error removing task from queue:', error);
      toast({ title: 'Error', description: 'Failed to remove task', variant: 'destructive' });
    }
  };

  const startTaskFromQueue = async (task: QueuedTask) => {
    if (activeEntry) {
      toast({ 
        title: 'Cannot Start Queue Task', 
        description: 'You need to pause current task to start queue task', 
        variant: 'destructive',
        duration: 5000
      });
      return;
    }

    // Remove from queue first
    removeTaskFromQueue(task.id);
    
    // Get client info
    const client = clients.find(c => c.name === task.client_name);
    
    // Start the timer automatically with client info and task description passed directly
    await startTimer(task.client_name, client?.email || "", task.task_description);
    
    toast({ title: 'Task Started', description: 'Task started automatically from queue' });
  };

  const startTimer = async (overrideClientName?: string, overrideClientEmail?: string, overrideTaskDescription?: string) => {
    const effectiveClientName = overrideClientName || clientName;
    const effectiveClientEmail = overrideClientEmail || clientEmail;
    const effectiveTaskDescription = overrideTaskDescription || taskDescription;
    
    if (!effectiveClientName) {
      toast({ title: 'Client required', variant: 'destructive' });
      return;
    }
    if (!effectiveTaskDescription) {
      toast({ title: 'Task description required', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      let eodId = reportId;
      if (!eodId) {
        const { data, error} = await supabase
          .from('eod_reports')
          .insert([{ user_id: user.id, started_at: new Date().toISOString() }])
          .select('*')
          .single();
        if (error) throw error;
        eodId = data.id;
        setReportId(eodId);
      }

      const { data: entry, error: entryError} = await (supabase as any)
        .from('eod_time_entries')
        .insert([{
          eod_id: eodId,
          user_id: user.id,
          client_name: effectiveClientName,
          client_email: effectiveClientEmail || null,
          client_timezone: clientTimezone,
          task_description: effectiveTaskDescription,
          task_link: null,
          comments: null,
          started_at: new Date().toISOString(),
          paused_at: null,
          status: 'in_progress'
        }])
        .select('*')
        .single();

      if (entryError) throw entryError;
      
      // Set active entry for this specific client
      if (selectedClient) {
        setActiveEntryByClient(prev => ({ ...prev, [selectedClient]: entry }));
        
        // Initialize active task details for this client
        setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: "in_progress" }));
        setActiveTaskImagesByClient(prev => ({ ...prev, [selectedClient]: [] }));
        setLiveDurationByClient(prev => ({ ...prev, [selectedClient]: 0 }));
        setLiveSecondsByClient(prev => ({ ...prev, [selectedClient]: 0 }));
      }
      
      setClientName("");
      setClientEmail("");
      setTaskDescription("");
      setTaskLink("");
      toast({ title: 'Timer started', description: `Working on: ${clientName}` });
    } catch (e: any) {
      toast({ title: 'Failed to start', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;
    
    // Require comments before stopping
    if (!activeTaskComments || !activeTaskComments.trim()) {
      toast({ 
        title: 'Comments Required', 
        description: 'Please add comments before stopping the task', 
        variant: 'destructive',
        duration: 5000
      });
      return;
    }
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const startTime = new Date(activeEntry.started_at).getTime();
      const endTime = new Date(now).getTime();
      const durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));

      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({ 
          ended_at: now, 
          duration_minutes: durationMinutes,
          comments: activeTaskComments || null,
          task_link: activeTaskLink || null,
          status: activeTaskStatus,
          comment_images: activeTaskImages.length > 0 ? activeTaskImages : null
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      
      setStoppedEntry({
        ...activeEntry,
        ended_at: now,
        duration_minutes: durationMinutes,
        started_at_formatted: new Date(activeEntry.started_at).toLocaleString(),
        ended_at_formatted: new Date(now).toLocaleString(),
        duration_formatted: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      });
      setStopDialog(true);
      
      // Clear active task details for this client
      if (selectedClient) {
        setActiveEntryByClient(prev => ({ ...prev, [selectedClient]: null }));
        setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: "in_progress" }));
        setActiveTaskImagesByClient(prev => ({ ...prev, [selectedClient]: [] }));
        setLiveDurationByClient(prev => ({ ...prev, [selectedClient]: 0 }));
        setLiveSecondsByClient(prev => ({ ...prev, [selectedClient]: 0 }));
      }
      
      await loadToday();
    } catch (e: any) {
      toast({ title: 'Failed to stop', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const pauseTimer = async () => {
    if (!activeEntry) return;
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Calculate accumulated time up to this pause
      const start = new Date(activeEntry.started_at);
      const pauseTime = new Date(now);
      const currentSessionSeconds = Math.floor((pauseTime.getTime() - start.getTime()) / 1000);
      const previousAccumulated = activeEntry.accumulated_seconds || 0;
      const totalAccumulated = previousAccumulated + currentSessionSeconds;
      
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({ 
          paused_at: now,
          accumulated_seconds: totalAccumulated,
          comments: activeTaskComments || null,
          task_link: activeTaskLink || null,
          status: activeTaskStatus,
          comment_images: activeTaskImages.length > 0 ? activeTaskImages : null
        })
        .eq('id', activeEntry.id);

      if (error) throw error;
      
      // Clear active task details for this client
      if (selectedClient) {
        setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: "in_progress" }));
        setActiveTaskImagesByClient(prev => ({ ...prev, [selectedClient]: [] }));
        setLiveDurationByClient(prev => ({ ...prev, [selectedClient]: 0 }));
        setLiveSecondsByClient(prev => ({ ...prev, [selectedClient]: 0 }));
      }
      
      // Reload to update state properly
      await loadToday();
      toast({ title: 'Task paused', description: 'You can start another task now' });
    } catch (e: any) {
      toast({ title: 'Failed to pause', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resumeTimer = async (task: TimeEntry) => {
    if (activeEntry) {
      toast({ title: 'Pause current task first', variant: 'destructive' });
      return;
    }
    
    setLoading(true);
    try {
      // Reset started_at to now so we can calculate new session time
      const now = new Date().toISOString();
      
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({ 
          paused_at: null,
          started_at: now  // Reset start time for new session
        })
        .eq('id', task.id);

      if (error) throw error;
      
      // Restore task details for this client
      if (selectedClient) {
        setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: task.comments || "" }));
        setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: task.task_link || "" }));
        setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: task.status || "in_progress" }));
        setActiveTaskImagesByClient(prev => ({ ...prev, [selectedClient]: task.comment_images || [] }));
      }
      
      // Reload to update state properly
      await loadToday();
      toast({ title: 'Task resumed' });
    } catch (e: any) {
      toast({ title: 'Failed to resume', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('eod_time_entries').delete().eq('id', id);
      if (error) throw error;
      setTimeEntries(prev => prev.filter(e => e.id !== id));
      setPausedTasks(prev => prev.filter(e => e.id !== id));
      if (activeEntry?.id === id) setActiveEntry(null);
      toast({ title: 'Entry deleted' });
    } catch (e: any) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    }
  };

  const startEditingComment = (entry: TimeEntry) => {
    setEditingCommentId(entry.id);
    setEditCommentText(entry.comments || '');
  };

  const openCommentDialog = (entry: TimeEntry) => {
    setEditingCommentId(entry.id);
    setEditCommentText(entry.comments || '');
    setCommentDialogOpen(true);
  };

  const cancelEditingComment = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const saveComment = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('eod_time_entries')
        .update({ comments: editCommentText || null })
        .eq('id', entryId);

      if (error) throw error;
      
      setTimeEntries(prev => prev.map(e => 
        e.id === entryId ? { ...e, comments: editCommentText || null } : e
      ));
      
      setEditingCommentId(null);
      setEditCommentText('');
      toast({ title: 'Comment saved' });
    } catch (e: any) {
      toast({ title: 'Failed to save comment', description: e.message, variant: 'destructive' });
    }
  };

  const loadSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('eod_submissions')
        .select('*')
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setSubmissions(data || []);
    } catch (e: any) {
      console.error('Failed to load submissions:', e);
    }
  };

  const loadSubmissionDetails = async (submission: any) => {
    setSelectedSubmission(submission);
    setDetailsOpen(true);

    try {
      const { data: tasksData } = await supabase
        .from('eod_submission_tasks')
        .select('*')
        .eq('submission_id', submission.id);
      setSubmissionTasks(tasksData || []);

      const { data: imagesData } = await supabase
        .from('eod_submission_images')
        .select('*')
        .eq('submission_id', submission.id);
      setSubmissionImages(imagesData || []);
    } catch (e: any) {
      toast({ title: 'Failed to load details', description: e.message, variant: 'destructive' });
    }
  };

  const submitEOD = async () => {
    if (!reportId) {
      toast({ title: 'No report to submit', description: 'Start working on tasks first', variant: 'destructive' });
      return;
    }
    
    // Check if user is still clocked in (warn but don't auto clock-out)
    if (clockIn && !clockIn.clocked_out_at) {
      const confirmSubmit = window.confirm('You are still clocked in. Do you want to submit your EOD without clocking out?');
      if (!confirmSubmit) {
        return;
      }
    }
    
    setLoading(true);
    try {
      // Calculate total hours from ALL client clock-ins for today (not task sum)
      let totalHours = 0;
      let earliestClockIn: string | null = null;
      let latestClockOut: string | null = null;
      
      // Sum up hours from all client clock-ins
      Object.values(clientClockIns).forEach(clockIn => {
        if (clockIn?.clocked_in_at) {
          const clockInTime = new Date(clockIn.clocked_in_at);
          const clockOutTime = clockIn.clocked_out_at 
            ? new Date(clockIn.clocked_out_at) 
            : new Date();
          const diffMs = clockOutTime.getTime() - clockInTime.getTime();
          totalHours += diffMs / (1000 * 60 * 60);
          
          // Track earliest clock-in and latest clock-out
          if (!earliestClockIn || clockIn.clocked_in_at < earliestClockIn) {
            earliestClockIn = clockIn.clocked_in_at;
          }
          if (clockIn.clocked_out_at && (!latestClockOut || clockIn.clocked_out_at > latestClockOut)) {
            latestClockOut = clockIn.clocked_out_at;
          }
        }
      });
      
      totalHours = parseFloat(totalHours.toFixed(2));
      
      // Create submission record
      const { data: submission, error: submissionError } = await supabase
        .from('eod_submissions')
        .insert([{
          user_id: user.id,
          report_id: reportId,
          clocked_in_at: earliestClockIn,
          clocked_out_at: latestClockOut || new Date().toISOString(),
          total_hours: totalHours,
        }])
        .select('*')
        .single();
      
      if (submissionError) throw submissionError;
      
      // Store task snapshots
      const tasksToInsert = timeEntries
        .filter(e => e.ended_at) // Only completed tasks
        .map(e => ({
          submission_id: submission.id,
          client_name: e.client_name,
          client_email: e.client_email || null,
          task_description: e.task_description,
          duration_minutes: e.duration_minutes || 0,
          comments: e.comments || null,
          task_link: e.task_link || null,
          status: e.status || 'completed',
          comment_images: e.comment_images && e.comment_images.length > 0 ? e.comment_images : null,
        }));
      
      if (tasksToInsert.length > 0) {
        const { error: tasksError } = await supabase
          .from('eod_submission_tasks')
          .insert(tasksToInsert);
        if (tasksError) throw tasksError;
      }
      
      // Store image snapshots
      if (images.length > 0) {
        const imagesToInsert = images.map(img => ({
          submission_id: submission.id,
          image_url: img.url,
        }));
        
        const { error: imagesError } = await supabase
          .from('eod_submission_images')
          .insert(imagesToInsert);
        if (imagesError) throw imagesError;
      }
      
      // Send email via Edge Function
      try {
        await supabase.functions.invoke('send-eod-email', {
          body: { 
            submission_id: submission.id,
            user_email: user?.email,
            user_name: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          },
        });
        
        // Mark email as sent
        await supabase
          .from('eod_submissions')
          .update({ email_sent: true, email_sent_at: new Date().toISOString() })
          .eq('id', submission.id);
          
      } catch (emailError) {
        console.log('Email sending failed (will continue):', emailError);
      }
      
      toast({ 
        title: 'DAR Submitted Successfully!', 
        description: `Report sent to miguel@migueldiaz.ca`
      });
      
      // Delete the old eod_reports and eod_time_entries data to prevent reload
      try {
        // Delete time entries first (foreign key constraint)
        await supabase
          .from('eod_time_entries')
          .delete()
          .eq('eod_id', reportId);
        
        // Delete images
        await supabase
          .from('eod_report_images')
          .delete()
          .eq('eod_id', reportId);
        
        // Delete the report
        await supabase
          .from('eod_reports')
          .delete()
          .eq('id', reportId);
        
        console.log('Cleaned up old EOD data');
      } catch (cleanupError) {
        console.error('Error cleaning up old data:', cleanupError);
        // Don't fail the submission if cleanup fails
      }
      
      // Clear the form
      setTimeEntries([]);
      setImages([]);
      setReportId(null);
      setActiveEntry(null);
      
      // Reload submissions and switch to history tab
      await loadSubmissions();
      setActiveTab('history');
      
    } catch (e: any) {
      toast({ title: 'Failed to submit', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      toast({ title: 'Required fields', description: 'Please fill in subject and message', variant: 'destructive' });
      return;
    }

    setSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('user_feedback')
        .insert([{
          user_id: user.id,
          subject: feedbackSubject,
          message: feedbackMessage,
          images: feedbackImages,
          status: 'new'
        }]);

      if (error) throw error;

      toast({ title: 'Feedback submitted', description: 'Thank you for your feedback!' });
      
      // Clear form
      setFeedbackSubject("");
      setFeedbackMessage("");
      setFeedbackImages([]);
      
    } catch (e: any) {
      toast({ title: 'Failed to submit feedback', description: e.message, variant: 'destructive' });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const uploadFeedbackImage = async (file: File) => {
    setUploadingFeedbackImage(true);
    try {
      const ext = file.name.split('.').pop();
      const name = `feedback-${Date.now()}.${ext}`;
      const path = `feedback/${user.id}/${name}`;
      
      const { error: upErr } = await supabase.storage.from('eod-images').upload(path, file);
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage.from('eod-images').getPublicUrl(path);
      setFeedbackImages([...feedbackImages, publicUrl]);
      
      toast({ title: 'Image uploaded', description: 'Image added to feedback' });
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' });
    } finally {
      setUploadingFeedbackImage(false);
    }
  };

  const handleFeedbackPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          setUploadingFeedbackImage(true);
          try {
            const ext = 'png';
            const name = `feedback-paste-${Date.now()}.${ext}`;
            const path = `feedback/${user.id}/${name}`;
            
            const { error: upErr } = await supabase.storage.from('eod-images').upload(path, blob);
            if (upErr) throw upErr;
            
            const { data: { publicUrl } } = supabase.storage.from('eod-images').getPublicUrl(path);
            setFeedbackImages([...feedbackImages, publicUrl]);
            
            toast({ title: 'Image pasted', description: 'Image added to feedback' });
          } catch (err: any) {
            toast({ title: 'Paste failed', description: err.message, variant: 'destructive' });
          } finally {
            setUploadingFeedbackImage(false);
          }
        }
      }
    }
  };

  const uploadImageBlob = async (blob: Blob) => {
    if (!reportId) {
      toast({ title: 'Start EOD first', description: 'Start timer before uploading', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const ext = 'png';
      const name = `paste-${Date.now()}.${ext}`;
      const path = `eod-${reportId}/${name}`;
      const { error: upErr } = await supabase.storage.from('eod-images').upload(path, blob);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('eod-images').getPublicUrl(path);
      const { data: row, error: rowErr } = await supabase
        .from('eod_report_images')
        .insert([{ eod_id: reportId, user_id: user.id, path, public_url: publicUrl }])
        .select('id')
        .single();
      if (rowErr) throw rowErr;
      setImages(prev => [...prev, { id: row.id, url: publicUrl }]);
      toast({ title: 'Image pasted successfully' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image', variant: 'destructive' });
      return;
    }
    await uploadImageBlob(file);
  };

  const handleActiveTaskImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image', variant: 'destructive' });
      return;
    }
    
    try {
      const ext = file.name.split('.').pop() || 'png';
      const name = `task-${activeEntry?.id}-${Date.now()}.${ext}`;
      const path = `eod-tasks/${name}`;
      
      const { error: upErr } = await supabase.storage
        .from('eod-images')
        .upload(path, file);
      
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage
        .from('eod-images')
        .getPublicUrl(path);
      
      setActiveTaskImages(prev => [...prev, publicUrl]);
      toast({ title: 'Image uploaded' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    }
  };

  const uploadCommentImage = async (entryId: string, file: File) => {
    setUploadingCommentImage(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const name = `comment-${entryId}-${Date.now()}.${ext}`;
      const path = `eod-comments/${name}`;
      
      const { error: upErr } = await supabase.storage
        .from('eod-images')
        .upload(path, file);
      
      if (upErr) throw upErr;
      
      const { data: { publicUrl } } = supabase.storage
        .from('eod-images')
        .getPublicUrl(path);
      
      // Add to local state
      setCommentImages(prev => ({
        ...prev,
        [entryId]: [...(prev[entryId] || []), publicUrl]
      }));
      
      toast({ title: 'Image attached', description: 'Image added to comment' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingCommentImage(false);
    }
  };

  const handleCommentImageUpload = async (entryId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please upload an image', variant: 'destructive' });
      return;
    }
    await uploadCommentImage(entryId, file);
  };

  const removeCommentImage = (entryId: string, imageUrl: string) => {
    setCommentImages(prev => ({
      ...prev,
      [entryId]: (prev[entryId] || []).filter(url => url !== imageUrl)
    }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: "Error", description: "Please fill in both password fields", variant: "destructive" });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast({ title: "Success", description: "Password changed successfully" });
      setNewPassword("");
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  const formatDuration = (minutes: number | null, startedAt?: string, endedAt?: string | null) => {
    // If duration is not set but we have start and end times, calculate it
    if (!minutes && startedAt && endedAt) {
      const startTime = new Date(startedAt).getTime();
      const endTime = new Date(endedAt).getTime();
      minutes = Math.floor((endTime - startTime) / (1000 * 60));
    }
    
    if (!minutes || minutes <= 0) return 'N/A';
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">DAR Portal</h2>
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Sidebar - Desktop and Mobile Drawer */}
      <div className={`
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:relative
        inset-y-0 left-0
        z-50 md:z-0
        w-64 md:w-64
        border-r bg-card
        flex flex-col
        transition-transform duration-300 ease-in-out
        ${mobileMenuOpen ? 'shadow-lg' : ''}
      `}>
        {/* Header - Desktop Only */}
        <div className="hidden md:block p-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Clock className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">DAR Portal</h2>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <Button
            variant={activeTab === "clients" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("clients");
              setMobileMenuOpen(false);
            }}
          >
            <Clock className="mr-2 h-4 w-4" />
            Clients
          </Button>
          <Button
            variant={activeTab === "messages" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("messages");
              setMobileMenuOpen(false);
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
            {unreadCount > 0 && (
              <Badge className="ml-auto bg-red-500 text-white px-2 py-0.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === "history" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("history");
              loadSubmissions();
              setMobileMenuOpen(false);
            }}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button
            variant={activeTab === "settings" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("settings");
              setMobileMenuOpen(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button
            variant={activeTab === "feedback" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              setActiveTab("feedback");
              setMobileMenuOpen(false);
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" />
            Feedback
          </Button>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "clients" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Client Selector Dropdown */}
            {clients.length > 0 ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b bg-background p-4">
                  <div className="max-w-md">
                    <label className="text-sm font-medium mb-2 block">Select Client</label>
                    <Select value={selectedClient} onValueChange={setSelectedClient}>
                      <SelectTrigger className="w-full">
                        <SelectValue>
                          {selectedClient && (
                            <div className="flex items-center gap-2">
                              {clientClockIns[selectedClient] && !clientClockIns[selectedClient]?.clocked_out_at && (
                                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                              )}
                              <span>{selectedClient}</span>
                            </div>
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => {
                          const isClockedIn = clientClockIns[client.name] && !clientClockIns[client.name]?.clocked_out_at;
                          return (
                            <SelectItem key={client.name} value={client.name}>
                              <div className="flex items-center gap-2">
                                {isClockedIn && (
                                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                                )}
                                <span>{client.name}</span>
                                {isClockedIn && (
                                  <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-300">
                                    Clocked In
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedClient && (() => {
                  const currentClient = clients.find(c => c.name === selectedClient);
                  if (!currentClient) return null;
                  
                  return (
                  <div className="flex-1 overflow-y-auto p-3 md:p-6">
                    <div className="max-w-6xl mx-auto space-y-4 md:space-y-6">
                      {/* Clock-in Status Banner */}
                      {clientClockIns[selectedClient] && !clientClockIns[selectedClient]?.clocked_out_at ? (
                        <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-start md:items-center gap-2 md:gap-3 flex-1">
                            <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse flex-shrink-0 mt-1 md:mt-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-green-900 text-sm md:text-base truncate">Currently Clocked In - {selectedClient}</p>
                                {clientLiveTime && (
                                  <span className="text-xs md:text-sm font-mono bg-green-100 text-green-800 px-2 py-1 rounded border border-green-300">
                                    {clientLiveTime}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <p className="text-xs md:text-sm text-green-700 break-words">
                                  Since: {clientClockIns[selectedClient]?.clocked_in_at ? new Date(clientClockIns[selectedClient]!.clocked_in_at).toLocaleString() : ''}
                                </p>
                                {totalClockedHours && (
                                  <p className="text-xs md:text-sm text-green-700 font-semibold">
                                    Total: {totalClockedHours}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleClientClockOut(selectedClient)} 
                            disabled={loading}
                            className="border-green-600 text-green-900 hover:bg-green-100 w-full md:w-auto"
                          >
                            Clock Out
                          </Button>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex items-start md:items-center gap-2 md:gap-3 flex-1">
                            <Clock className="h-4 w-4 md:h-5 md:w-5 text-gray-500 flex-shrink-0 mt-1 md:mt-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-gray-900 text-sm md:text-base truncate">Not Clocked In - {selectedClient}</p>
                                {clientLiveTime && (
                                  <span className="text-xs md:text-sm font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded border border-gray-300">
                                    {clientLiveTime}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs md:text-sm text-gray-600">Click "Clock In" to start tracking time</p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            variant="default" 
                            onClick={() => handleClientClockIn(selectedClient)} 
                            disabled={loading}
                            className="w-full md:w-auto"
                          >
                            <Clock className="mr-2 h-4 w-4" />
                            Clock In
                          </Button>
                        </div>
                      )}

                      {/* Task Tracking for this client */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Time Tracking - {selectedClient}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Task Description</label>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowQueue(!showQueue)}
                                className="text-xs"
                              >
                                <List className="h-3 w-3 mr-1" />
                                Queue ({queuedTasks.length})
                              </Button>
                            </div>
                            <Textarea 
                              value={taskDescription} 
                              onChange={(e) => setTaskDescription(e.target.value)} 
                              placeholder="What are you working on?"
                              disabled={!!activeEntry}
                              rows={2}
                            />
                          </div>

                          <div className="flex gap-2">
                            {!activeEntry ? (
                              <>
                                <Button 
                                  onClick={() => {
                                    // Pass client info directly to startTimer to avoid state timing issues
                                    startTimer(selectedClient, currentClient.email || "");
                                  }} 
                                  disabled={loading || !taskDescription.trim()}
                                  className="flex-1"
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Start Task
                                </Button>
                                <Button 
                                  variant="secondary"
                                  onClick={addTaskToQueue}
                                  disabled={loading}
                                >
                                  <ListPlus className="mr-2 h-4 w-4" />
                                  Add to Queue
                                </Button>
                              </>
                            ) : null}
                          </div>

                          {/* Task Queue Display */}
                          {showQueue && queuedTasks.length > 0 && (
                            <Card className="border-blue-200 bg-blue-50">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                  <List className="h-4 w-4" />
                                  Task Queue ({queuedTasks.length})
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-2">
                                {queuedTasks.map((task, index) => (
                                  <div key={task.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="text-xs">#{index + 1}</Badge>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(task.created_at).toLocaleTimeString()}
                                        </span>
                                      </div>
                                      <p className="text-sm">{task.task_description}</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => startTaskFromQueue(task)}
                                        disabled={!!activeEntry}
                                        title="Load this task"
                                      >
                                        <Play className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => removeTaskFromQueue(task.id)}
                                        title="Remove from queue"
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          )}

            {/* Active Task Details */}
            {activeEntry && (
              <Card className="border-2 border-primary">
                <CardHeader className="bg-gradient-primary text-white p-3 md:p-6">
                  <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4 md:h-5 md:w-5 animate-pulse flex-shrink-0" />
                      <span className="text-sm md:text-base">Active Task</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={pauseTimer} disabled={loading} size="sm" className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-600 flex-1 md:flex-none">
                        <Pause className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                        <span className="text-xs md:text-sm">Pause</span>
                      </Button>
                      <Button variant="destructive" onClick={stopTimer} disabled={loading} size="sm" className="flex-1 md:flex-none">
                        <Square className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                        <span className="text-xs md:text-sm">Stop</span>
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Client</Label>
                      <p className="text-sm mt-1 p-2 bg-accent rounded">{activeEntry.client_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Task</Label>
                      <p className="text-sm mt-1 p-2 bg-accent rounded">{activeEntry.task_description}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        Time Zone
                      </Label>
                      <p className="text-sm mt-1 p-2 bg-accent rounded">{clientTimezone}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Comments</Label>
                    <Textarea
                      value={activeTaskComments}
                      onChange={(e) => setActiveTaskComments(e.target.value)}
                      placeholder="Add comments about this task..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Screenshots (Ctrl+V to paste)
                    </Label>
                    <div 
                      className="mt-2 space-y-2 border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors"
                      onPaste={async (e) => {
                        const items = e.clipboardData?.items;
                        if (!items) return;
                        
                        for (let i = 0; i < items.length; i++) {
                          if (items[i].type.indexOf('image') !== -1) {
                            e.preventDefault();
                            const file = items[i].getAsFile();
                            if (file) {
                              await handleActiveTaskImageUpload({ target: { files: [file] } } as any);
                              toast({ title: 'Image pasted', description: 'Screenshot added to task' });
                            }
                            break;
                          }
                        }
                      }}
                      tabIndex={0}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleActiveTaskImageUpload}
                        className="hidden"
                        id="active-task-image"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById('active-task-image')?.click()}
                        className="w-full"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Screenshot or Paste Here
                      </Button>
                      {activeTaskImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {activeTaskImages.map((imgUrl, idx) => (
                            <div key={idx} className="relative group">
                              <img 
                                src={imgUrl} 
                                alt="screenshot" 
                                className="h-20 w-20 object-cover rounded border"
                              />
                              <Button
                                size="sm"
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                onClick={() => setActiveTaskImages(prev => prev.filter((_, i) => i !== idx))}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                </div>
              )}
                    </div>
            </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Started</Label>
                      <p className="text-sm mt-1 p-2 bg-accent rounded">
                        {new Date(activeEntry.started_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Duration (Live)</Label>
                      <p className="text-sm mt-1 p-2 bg-accent rounded font-mono font-bold text-primary">
                        {Math.floor(liveDuration / 60)}h {liveDuration % 60}m {liveSeconds}s
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Status</Label>
                      <Select value={activeTaskStatus} onValueChange={setActiveTaskStatus}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Task Link (Optional)
                    </Label>
                    <Input
                      type="url"
                      value={activeTaskLink}
                      onChange={(e) => setActiveTaskLink(e.target.value)}
                      placeholder="https://example.com/task/123"
                      className="mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paused Tasks */}
            {pausedTasks.length > 0 && (
              <Card className="border-2 border-yellow-500">
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <Pause className="h-5 w-5" />
                    Paused Tasks ({pausedTasks.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    {pausedTasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent">
                        <div className="flex-1">
                          <p className="font-medium">{task.client_name}</p>
                          <p className="text-sm text-muted-foreground">{task.task_description}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Paused at: {task.paused_at ? new Date(task.paused_at).toLocaleTimeString() : 'N/A'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resumeTimer(task)}
                          disabled={loading || !!activeEntry}
                          className="ml-4"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {timeEntries.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Link</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.map(entry => (
                      <Fragment key={entry.id}>
                      <TableRow>
                        <TableCell className="font-medium">{entry.client_name}</TableCell>
                        <TableCell>{entry.task_description}</TableCell>
                          <TableCell className="text-sm max-w-[250px]">
                            {editingCommentId === entry.id ? (
                              <div className="flex items-center gap-2">
                                <Textarea
                                  value={editCommentText}
                                  onChange={(e) => setEditCommentText(e.target.value)}
                                  placeholder="Add comments..."
                                  rows={2}
                                  className="text-sm"
                                />
                                <div className="flex flex-col gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => saveComment(entry.id)}>
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEditingComment}>
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground flex-1">
                                  {entry.comments || 'No comments'}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.innerWidth < 768 ? openCommentDialog(entry) : startEditingComment(entry)}
                                  className="opacity-100"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        <TableCell>
                          {entry.task_link ? (
                            <a 
                              href={entry.task_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <LinkIcon className="h-3 w-3" />
                              Link
                            </a>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(entry.started_at).toLocaleTimeString()}</TableCell>
                        <TableCell>{entry.ended_at ? formatDuration(entry.duration_minutes, entry.started_at, entry.ended_at) : '⏱️ Running...'}</TableCell>
                          <TableCell>
                            <Badge variant={
                              entry.status === 'completed' ? 'default' :
                              entry.status === 'blocked' ? 'destructive' :
                              entry.status === 'on_hold' ? 'secondary' :
                              'outline'
                            }>
                              {entry.status ? entry.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'In Progress'}
                            </Badge>
                          </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" onClick={() => deleteEntry(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                        {/* Display attached images row */}
                        {entry.comment_images && entry.comment_images.length > 0 && (
                          <TableRow key={`${entry.id}-images`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-3">
                              <div className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-muted-foreground">Attached Images:</span>
                              </div>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {entry.comment_images.map((imgUrl, idx) => (
                                  <img 
                                    key={idx}
                                    src={imgUrl} 
                                    alt={`Task image ${idx + 1}`}
                                    className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(imgUrl, '_blank')}
                                  />
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit DAR Button */}
        <div className="flex justify-end">
          <Button 
            onClick={submitEOD} 
            disabled={loading || !reportId || timeEntries.length === 0} 
            className="bg-gradient-primary"
            size="lg"
          >
            Submit DAR
          </Button>
        </div>
                    </div>
                  </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No clients assigned. Please contact your administrator.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "messages" && (
          <div className="h-full overflow-hidden">
            <EODMessaging />
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
                <CardTitle>EOD History</CardTitle>
          </CardHeader>
              <CardContent>
                {submissions.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground">No EOD reports submitted yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Clock In</TableHead>
                        <TableHead>Clock Out</TableHead>
                        <TableHead>Total Hours</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium">
                            {new Date(sub.submitted_at).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell>
                            {sub.clocked_in_at
                              ? new Date(sub.clocked_in_at).toLocaleTimeString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell>
                            {sub.clocked_out_at
                              ? new Date(sub.clocked_out_at).toLocaleTimeString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="font-semibold text-primary">
                            {sub.total_hours ? `${sub.total_hours}h` : '0h'}
                          </TableCell>
                          <TableCell>
                            {sub.email_sent ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Sent
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => loadSubmissionDetails(sub)}
                            >
                              View Details
            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
          </CardContent>
        </Card>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
            </CardTitle>
                <p className="text-sm text-muted-foreground">Update your password to keep your account secure</p>
          </CardHeader>
              <CardContent className="space-y-4 max-w-md">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                </div>
            </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
              </div>
                </div>

                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="w-full"
                >
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "feedback" && (
          <div className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Submit Feedback
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Report issues, suggest improvements, or share your thoughts with the admin team
                </p>
              </CardHeader>
              <CardContent className="space-y-4 max-w-2xl">
                <div className="space-y-2">
                  <Label htmlFor="feedback_subject">Subject *</Label>
                  <Input
                    id="feedback_subject"
                    value={feedbackSubject}
                    onChange={(e) => setFeedbackSubject(e.target.value)}
                    placeholder="Brief description of your feedback"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="feedback_message">Message *</Label>
                  <textarea
                    id="feedback_message"
                    value={feedbackMessage}
                    onChange={(e) => setFeedbackMessage(e.target.value)}
                    onPaste={handleFeedbackPaste}
                    placeholder="Describe your feedback in detail... (You can paste images here)"
                    className="w-full min-h-[200px] p-3 border rounded-md resize-y"
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Tip: You can paste images directly into this field (Ctrl+V or Cmd+V)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Attachments (Optional)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadFeedbackImage(file);
                      }}
                      disabled={uploadingFeedbackImage}
                      className="flex-1"
                    />
                    {uploadingFeedbackImage && (
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    )}
                  </div>
                  
                  {feedbackImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                      {feedbackImages.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img 
                            src={url} 
                            alt={`Feedback attachment ${idx + 1}`} 
                            className="w-full h-32 object-cover rounded border"
                          />
                          <Button
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setFeedbackImages(feedbackImages.filter((_, i) => i !== idx))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button 
                  onClick={submitFeedback} 
                  disabled={submittingFeedback || !feedbackSubject.trim() || !feedbackMessage.trim()}
                  className="w-full"
                >
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Submission Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              EOD Report Details - {selectedSubmission && new Date(selectedSubmission.submitted_at).toLocaleDateString()}
            </DialogTitle>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Work Hours</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Clocked In</p>
                    <p className="font-medium">
                      {selectedSubmission.clocked_in_at
                        ? new Date(selectedSubmission.clocked_in_at).toLocaleTimeString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clocked Out</p>
                    <p className="font-medium">
                      {selectedSubmission.clocked_out_at
                        ? new Date(selectedSubmission.clocked_out_at).toLocaleTimeString()
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Hours</p>
                    <p className="font-bold text-primary text-lg">
                      {selectedSubmission.total_hours}h
                    </p>
                  </div>
                </CardContent>
              </Card>

              {submissionTasks.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tasks Completed ({submissionTasks.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {submissionTasks.map((task: any) => (
                      <div key={task.id} className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{task.client_name}</p>
                            <p className="text-sm text-muted-foreground">{task.task_description}</p>
                          </div>
                          <Badge variant="secondary">
                            {Math.floor(task.duration_minutes / 60)}h {task.duration_minutes % 60}m
                          </Badge>
                        </div>
                        {task.comments && (
                          <p className="text-sm text-muted-foreground italic">
                            💬 {task.comments}
                          </p>
                        )}
                        {task.task_link && (
                          <a
                            href={task.task_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            🔗 {task.task_link}
                          </a>
                        )}
                      </div>
                    ))}
          </CardContent>
        </Card>
              )}

              {selectedSubmission.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{selectedSubmission.summary}</p>
                  </CardContent>
                </Card>
              )}

              {submissionImages.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Screenshots ({submissionImages.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {submissionImages.map((img: any) => (
                        <img
                          key={img.id}
                          src={img.image_url}
                          alt="Screenshot"
                          className="rounded border shadow-sm w-full h-48 object-cover"
                        />
                      ))}
      </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stop Timer Details Dialog */}
      <Dialog open={stopDialog} onOpenChange={setStopDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Time Entry Complete</DialogTitle>
            <DialogDescription>Here's a summary of your work session</DialogDescription>
          </DialogHeader>
          {stoppedEntry && (
            <div className="space-y-3">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Client:</span>
                  <span>{stoppedEntry.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Task:</span>
                  <span className="text-sm">{stoppedEntry.task_description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Started:</span>
                  <span className="text-sm">{stoppedEntry.started_at_formatted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Ended:</span>
                  <span className="text-sm">{stoppedEntry.ended_at_formatted}</span>
                </div>
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Duration:</span>
                  <span className="font-bold text-primary">{stoppedEntry.duration_formatted}</span>
                </div>
              </div>
              <Button onClick={() => setStopDialog(false)} className="w-full">Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Comment Dialog */}
      <Dialog open={commentDialogOpen} onOpenChange={setCommentDialogOpen}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Edit Comment</DialogTitle>
            <DialogDescription>Add or edit comments for this task</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editCommentText}
              onChange={(e) => setEditCommentText(e.target.value)}
              placeholder="Add comments..."
              rows={4}
              className="w-full"
            />

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (editingCommentId) saveComment(editingCommentId);
                  setCommentDialogOpen(false);
                }}
                className="flex-1"
              >
                Save Comment
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCommentDialogOpen(false);
                  cancelEditingComment();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Task to Queue Dialog */}
      <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListPlus className="h-5 w-5" />
              Add Task to Queue
            </DialogTitle>
            <DialogDescription>
              Add a task to your queue for {selectedClient}. You can start it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Description</Label>
              <Textarea
                value={queueTaskDescription}
                onChange={(e) => setQueueTaskDescription(e.target.value)}
                placeholder="Describe the task you want to queue..."
                rows={4}
                className="mt-2"
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={addTaskToQueue}
                disabled={!queueTaskDescription.trim()}
                className="flex-1"
              >
                <ListPlus className="mr-2 h-4 w-4" />
                Add to Queue
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setQueueDialogOpen(false);
                  setQueueTaskDescription("");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>

            {queuedTasks.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Current queue: {queuedTasks.length} task{queuedTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

