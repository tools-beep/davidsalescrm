import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, ShieldCheck, Activity, Database, Trash2, UserPlus, Clock, Link as LinkIcon, Eye, EyeOff, Radio, Edit, Globe, Check, X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DARLiveContent } from "@/components/dar/DARLiveContent";

interface UserProfile {
  id: string;
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  is_active: boolean;
  timezone?: string | null;
}

interface DARReport {
  id: string;
  user_id: string;
  report_date: string;
  summary: string | null;
  started_at: string;  // maps to clocked_in_at
  submitted_at: string | null;
  total_hours?: number | null;
  clocked_in_at?: string;
  clocked_out_at?: string | null;
  user_profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

interface TimeEntry {
  id: string;
  eod_id: string;
  client_name: string;
  task_description: string;
  task_link: string | null;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalDeals: 0,
    totalCompanies: 0,
    totalContacts: 0,
    calls30d: 0,
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', first_name: '', last_name: '', password: '', role: 'eod_user' });
  const [showPassword, setShowPassword] = useState(false);
  const [darReports, setDarReports] = useState<DARReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<DARReport | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [reportImages, setReportImages] = useState<Array<{ id: string; url: string }>>([]);
  const [eodDateFilter, setEodDateFilter] = useState<string>('all');
  const [selectedUserForClients, setSelectedUserForClients] = useState<UserProfile | null>(null);
  const [clientAssignmentDialog, setClientAssignmentDialog] = useState(false);
  const [assignedClients, setAssignedClients] = useState<Array<{id: string, client_name: string, client_email: string, client_phone: string, client_timezone: string}>>([]);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientTimezone, setNewClientTimezone] = useState('America/Los_Angeles');
  const [availableClients, setAvailableClients] = useState<Array<{name: string, email?: string, phone?: string, timezone?: string}>>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [clientNameSearch, setClientNameSearch] = useState('');
  const [editingClient, setEditingClient] = useState<{id: string, client_name: string, client_email: string, client_phone: string, client_timezone: string} | null>(null);
  const { toast} = useToast();

  useEffect(() => {
    fetchMetrics();
    fetchUsers();
    fetchDARReports();
  }, [eodDateFilter]);

  const fetchMetrics = async () => {
    try {
      const [usersRes, activeRes, dealsRes, companiesRes, contactsRes, callsRes] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('is_active', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('deals').select('id', { count: 'exact', head: true }),
        supabase.from('companies').select('id', { count: 'exact', head: true }),
        supabase.from('contacts').select('id', { count: 'exact', head: true }),
        supabase.from('calls').select('id', { count: 'exact', head: true }).gte('call_timestamp', new Date(Date.now() - 30*24*60*60*1000).toISOString()),
      ]);

      setMetrics({
        totalUsers: usersRes.count || 0,
        activeUsers: activeRes.count || 0,
        totalDeals: dealsRes.count || 0,
        totalCompanies: companiesRes.count || 0,
        totalContacts: contactsRes.count || 0,
        calls30d: callsRes.count || 0,
      });
    } catch (e) {
      console.error('Failed to fetch admin metrics', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase.from('user_profiles').select('*').order('first_name');
      setUsers(data || []);
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  const fetchDARReports = async () => {
    try {
      console.log('=== FETCHING DAR REPORTS ===');
      console.log('Filter:', eodDateFilter);
      
      // Step 1: Check if table exists and get all data first
      const { data: allSubmissions, error: checkError, count } = await supabase
        .from('eod_submissions')
        .select('*', { count: 'exact' })
        .order('submitted_at', { ascending: false });

      console.log('Total submissions in database:', count);
      console.log('Fetched submissions:', allSubmissions?.length || 0);

      if (checkError) {
        console.error('ERROR fetching submissions:', checkError);
        toast({ 
          title: 'Database Error', 
          description: `Cannot fetch EOD submissions: ${checkError.message}`,
          variant: 'destructive' 
        });
        setDarReports([]);
        return;
      }

      if (!allSubmissions || allSubmissions.length === 0) {
        console.warn('⚠️ NO SUBMISSIONS FOUND IN DATABASE');
        console.warn('This means either:');
        console.warn('1. No users have submitted EODs yet, OR');
        console.warn('2. The eod_submissions table doesn\'t exist');
        setDarReports([]);
        toast({
          title: 'No EOD Reports',
          description: 'No users have submitted EOD reports yet.',
        });
        return;
      }

      console.log('Sample submission:', allSubmissions[0]);

      // Step 2: Apply date filter in JavaScript (more reliable)
      const now = new Date();
      let filteredSubmissions = allSubmissions;

      if (eodDateFilter === 'today') {
        const today = now.toISOString().split('T')[0];
        filteredSubmissions = allSubmissions.filter(s => 
          s.submitted_at && s.submitted_at.startsWith(today)
        );
        console.log(`Filtered to today (${today}):`, filteredSubmissions.length);
      } else if (eodDateFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredSubmissions = allSubmissions.filter(s => 
          s.submitted_at && new Date(s.submitted_at) >= weekAgo
        );
        console.log('Filtered to last 7 days:', filteredSubmissions.length);
      } else if (eodDateFilter === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredSubmissions = allSubmissions.filter(s => 
          s.submitted_at && new Date(s.submitted_at) >= monthAgo
        );
        console.log('Filtered to last 30 days:', filteredSubmissions.length);
      } else if (eodDateFilter === 'all') {
        // Show all submissions
        filteredSubmissions = allSubmissions;
        console.log('Showing all submissions:', filteredSubmissions.length);
      }

      if (filteredSubmissions.length === 0) {
        console.warn('No submissions match the date filter');
        setDarReports([]);
        return;
      }

      // Step 3: Get user info - try multiple methods
      const userIds = [...new Set(filteredSubmissions.map(s => s.user_id))];
      console.log('Unique user IDs:', userIds.length);

      // Method 1: Try user_profiles
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      console.log('User profiles found:', profiles?.length || 0);
      if (profileError) {
        console.error('Error fetching profiles:', profileError);
      }

      // Method 2: Try RPC function as fallback
      let allUsers: any[] = [];
      if (!profiles || profiles.length === 0) {
        console.log('No profiles found, trying RPC function...');
        const { data: rpcUsers, error: rpcError } = await supabase.rpc('get_all_users_for_eod');
        if (!rpcError && rpcUsers) {
          console.log('RPC users found:', rpcUsers.length);
          allUsers = rpcUsers;
        } else {
          console.error('RPC error:', rpcError);
        }
      }

      // Step 4: Map submissions to display format
      const reportsWithProfiles = filteredSubmissions.map(submission => {
        // Try to find user info from profiles or RPC
        let userInfo = profiles?.find(p => p.user_id === submission.user_id);
        
        if (!userInfo && allUsers.length > 0) {
          const rpcUser = allUsers.find(u => u.id === submission.user_id);
          if (rpcUser) {
            userInfo = {
              user_id: rpcUser.id,
              email: rpcUser.email,
              first_name: rpcUser.full_name?.split(' ')[0] || '',
              last_name: rpcUser.full_name?.split(' ').slice(1).join(' ') || '',
            };
          }
        }

        return {
          id: submission.id,
          user_id: submission.user_id,
          report_date: submission.submitted_at?.split('T')[0] || 'Unknown',
          summary: submission.summary,
          started_at: submission.clocked_in_at || submission.submitted_at,
          submitted_at: submission.submitted_at,
          total_hours: submission.total_hours,
          user_profiles: userInfo ? {
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            email: userInfo.email
          } : {
            first_name: 'Unknown',
            last_name: 'User',
            email: submission.user_id
          }
        };
      });

      console.log('✅ Final reports with profiles:', reportsWithProfiles.length);
      setDarReports(reportsWithProfiles);
      
      if (reportsWithProfiles.length > 0) {
        toast({
          title: 'EOD Reports Loaded',
          description: `Found ${reportsWithProfiles.length} report(s)`,
        });
      }
    } catch (e: any) {
      console.error('❌ CRITICAL ERROR in fetchEODReports:', e);
      console.error('Stack:', e.stack);
      toast({ 
        title: 'Critical Error', 
        description: e.message || 'Failed to load EOD reports',
        variant: 'destructive' 
      });
      setDarReports([]);
    }
  };

  const fetchReportDetails = async (report: DARReport) => {
    setSelectedReport(report);
    try {
      console.log('Fetching details for submission:', report.id);
      
      // Fetch tasks from new table
      const { data: tasks, error: tasksError } = await supabase
        .from('eod_submission_tasks')
        .select('*')
        .eq('submission_id', report.id)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      } else {
        console.log('Found tasks:', tasks?.length || 0);
      }

      // Convert tasks to time entries format for display
      const entries = (tasks || []).map(task => ({
        id: task.id,
        eod_id: task.submission_id,
        client_name: task.client_name,
        task_description: task.task_description,
        task_link: task.task_link,
        started_at: task.created_at,  // Use created_at as started_at
        ended_at: null,  // No ended_at in new schema
        duration_minutes: task.duration_minutes,
        comments: task.comments
      }));
      
      setTimeEntries(entries);

      // Fetch images from new table
      const { data: imgs, error: imgsError } = await supabase
        .from('eod_submission_images')
        .select('id, image_url')
        .eq('submission_id', report.id);

      if (imgsError) {
        console.error('Error fetching images:', imgsError);
      } else {
        console.log('Found images:', imgs?.length || 0);
      }

      setReportImages((imgs || []).map(i => ({ id: i.id, url: i.image_url || '' })));
    } catch (e) {
      console.error('Failed to fetch report details', e);
    }
  };

  const formatDuration = (minutes: number | null, startedAt?: string, endedAt?: string | null) => {
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

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter(u => (
      `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    ));
  }, [users, search]);

  const updateUser = async (id: string, updates: Partial<UserProfile>) => {
    try {
      const { error } = await supabase.from('user_profiles').update(updates).eq('id', id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
      toast({ title: 'User updated' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to update user', variant: 'destructive' });
    }
  };

  const openClientAssignment = async (user: UserProfile) => {
    setSelectedUserForClients(user);
    setClientAssignmentDialog(true);
    await loadUserClients(user.user_id);
    await loadAvailableClients();
  };

  const loadUserClients = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_client_assignments')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      setAssignedClients(data || []);
    } catch (error) {
      console.error('Error loading user clients:', error);
      toast({ title: 'Failed to load assigned clients', variant: 'destructive' });
    }
  };

  const loadAvailableClients = async () => {
    try {
      console.log('Loading available clients...');
      
      // Get unique clients from companies and deals
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('name, email, phone, timezone')
        .limit(500);
      
      if (companiesError) {
        console.error('Error loading companies:', companiesError);
      }
      
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('name, timezone')
        .limit(500);
      
      if (dealsError) {
        console.error('Error loading deals:', dealsError);
      }
      
      const clientSet = new Set<string>();
      const clientsWithEmail: Array<{name: string, email?: string, phone?: string, timezone?: string}> = [];
      
      // First, add companies (they have more complete data)
      companies?.forEach(c => {
        if (c.name && !clientSet.has(c.name)) {
          clientSet.add(c.name);
          clientsWithEmail.push({ 
            name: c.name, 
            email: c.email || undefined,
            phone: c.phone || undefined,
            timezone: c.timezone || 'America/Los_Angeles'  // Keep original for display
          });
        }
      });
      
      // Then add deals (only if not already in companies)
      deals?.forEach(d => {
        if (d.name && !clientSet.has(d.name)) {
          clientSet.add(d.name);
          clientsWithEmail.push({ 
            name: d.name, 
            timezone: d.timezone || 'America/Los_Angeles'  // Keep original for display
          });
        }
      });
      
      console.log(`Loaded ${clientsWithEmail.length} available clients`);
      setAvailableClients(clientsWithEmail.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error loading available clients:', error);
    }
  };

  const assignClient = async () => {
    if (!selectedUserForClients || !newClientName) {
      toast({ title: 'Please enter a client name', variant: 'destructive' });
      return;
    }

    try {
      // Check if client exists in companies table
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, name')
        .eq('name', newClientName)
        .maybeSingle();
      
      // If client doesn't exist, create it
      if (!existingCompany) {
        const { error: createError } = await supabase
          .from('companies')
          .insert([{
            name: newClientName,
            email: newClientEmail || null,
            phone: newClientPhone || null,
            timezone: newClientTimezone,
            created_at: new Date().toISOString()
          }]);
        
        if (createError) {
          console.error('Error creating company:', createError);
          // Continue anyway - we'll still assign the client
        } else {
          toast({ title: 'New client created in database', description: newClientName });
        }
      } else {
        // Client exists - update timezone, email, and phone if provided
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            email: newClientEmail || null,
            phone: newClientPhone || null,
            timezone: newClientTimezone
          })
          .eq('id', existingCompany.id);
        
        if (updateError) {
          console.error('Error updating company:', updateError);
        } else {
          console.log('Updated company timezone and contact info');
        }
      }

      // Assign client to user
      const { error } = await (supabase as any)
        .from('user_client_assignments')
        .insert([{
          user_id: selectedUserForClients.user_id,
          client_name: newClientName,
          client_email: newClientEmail || null,
          client_phone: newClientPhone || null,
          client_timezone: newClientTimezone,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        }]);
      
      if (error) throw error;
      
      await loadUserClients(selectedUserForClients.user_id);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientTimezone('America/Los_Angeles');
      setClientNameSearch('');
      toast({ title: 'Client assigned successfully' });
    } catch (error: any) {
      console.error('Error assigning client:', error);
      toast({ 
        title: 'Failed to assign client', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  const removeClientAssignment = async (assignmentId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('user_client_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (error) throw error;
      
      setAssignedClients(prev => prev.filter(c => c.id !== assignmentId));
      toast({ title: 'Client removed successfully' });
    } catch (error) {
      console.error('Error removing client:', error);
      toast({ title: 'Failed to remove client', variant: 'destructive' });
    }
  };

  const updateClientAssignment = async () => {
    if (!editingClient) return;

    try {
      const { error } = await (supabase as any)
        .from('user_client_assignments')
        .update({
          client_email: editingClient.client_email || null,
          client_phone: editingClient.client_phone || null,
          client_timezone: editingClient.client_timezone
        })
        .eq('id', editingClient.id);
      
      if (error) throw error;
      
      setAssignedClients(prev => 
        prev.map(c => c.id === editingClient.id ? editingClient : c)
      );
      setEditingClient(null);
      toast({ title: 'Client updated successfully' });
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({ 
        title: 'Failed to update client', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  };

  // Helper function to normalize timezone values
  const normalizeTimezone = (tz: string | undefined | null): string => {
    if (!tz) return 'America/Los_Angeles';
    
    const tzLower = tz.toLowerCase().trim();
    
    // Map common abbreviations to IANA timezone names
    const timezoneMap: Record<string, string> = {
      'pst': 'America/Los_Angeles',
      'pacific': 'America/Los_Angeles',
      'pt': 'America/Los_Angeles',
      'mst': 'America/Denver',
      'mountain': 'America/Denver',
      'mt': 'America/Denver',
      'cst': 'America/Chicago',
      'central': 'America/Chicago',
      'ct': 'America/Chicago',
      'est': 'America/New_York',
      'eastern': 'America/New_York',
      'et': 'America/New_York',
      'akst': 'America/Anchorage',
      'alaska': 'America/Anchorage',
      'hst': 'Pacific/Honolulu',
      'hawaii': 'Pacific/Honolulu',
      'gmt': 'Europe/London',
      'utc': 'Europe/London',
      'cet': 'Europe/Paris',
      'jst': 'Asia/Tokyo',
      'aest': 'Australia/Sydney',
      'aedt': 'Australia/Sydney'
    };
    
    // Check if it's an abbreviation
    if (timezoneMap[tzLower]) {
      return timezoneMap[tzLower];
    }
    
    // If it's already in IANA format, return as is
    if (tz.includes('/')) {
      return tz;
    }
    
    // Default to Pacific Time
    return 'America/Los_Angeles';
  };

  const handleClientSelect = async (clientName: string) => {
    console.log('Client selected:', clientName);
    setNewClientName(clientName);
    setClientNameSearch(clientName);
    
    // Auto-populate email, phone, and timezone from available clients
    const selectedClient = availableClients.find(c => c.name === clientName);
    console.log('Found client data:', selectedClient);
    
    if (selectedClient) {
      setNewClientEmail(selectedClient.email || '');
      setNewClientPhone(selectedClient.phone || '');
      
      // Normalize and set timezone
      const normalizedTimezone = normalizeTimezone(selectedClient.timezone);
      setNewClientTimezone(normalizedTimezone);
      
      console.log('Auto-filled:', {
        email: selectedClient.email,
        phone: selectedClient.phone,
        timezone: selectedClient.timezone,
        normalizedTimezone: normalizedTimezone
      });
    } else {
      console.log('Client not found in availableClients array');
    }
  };

  const createEODUser = async () => {
    if (!newUser.email || !newUser.first_name || !newUser.last_name || !newUser.password) {
      toast({ title: 'All fields including password are required', variant: 'destructive' });
      return;
    }
    if (newUser.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-eod-user', {
        body: {
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          password: newUser.password,
          role: newUser.role,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({ 
          title: 'User created successfully!', 
          description: `Account created for ${newUser.email}. They can now log in.` 
        });
        setNewUser({ email: '', first_name: '', last_name: '', password: '', role: 'eod_user' });
        setCreateDialogOpen(false);
        fetchUsers();
      } else {
        throw new Error(data?.error || 'Failed to create user');
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Failed to create user', description: e.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Admin</h1>
          <p className="text-muted-foreground mt-1">Manage users, roles, and system health.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">{metrics.activeUsers} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Data Footprint</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Deals: <span className="font-semibold">{metrics.totalDeals}</span></div>
              <div>Companies: <span className="font-semibold">{metrics.totalCompanies}</span></div>
              <div>Contacts: <span className="font-semibold">{metrics.totalContacts}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activity (30d)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.calls30d}</div>
            <p className="text-xs text-muted-foreground">Calls logged</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Access</TabsTrigger>
          <TabsTrigger value="eod">DAR Reports</TabsTrigger>
          <TabsTrigger value="live">
            <Radio className="h-4 w-4 mr-2 animate-pulse text-green-500" />
            DAR Live
          </TabsTrigger>
          <TabsTrigger value="ops">Operations</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="max-w-md" />
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create EOD User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create EOD User</DialogTitle>
                  <DialogDescription>
                    Create a complete account with login credentials. User can log in immediately after creation.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="user@company.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={newUser.first_name}
                      onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={newUser.last_name}
                      onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        placeholder="At least 6 characters"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUser.role} onValueChange={(role) => setNewUser({ ...newUser, role })}>
                      <SelectTrigger id="role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="eod_user">EOD User</SelectItem>
                        <SelectItem value="rep">Rep</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createEODUser} disabled={creating} className="w-full">
                    {creating ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unnamed'}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Select defaultValue={u.role || 'rep'} onValueChange={(role) => updateUser(u.id, { role })}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="rep">Rep</SelectItem>
                            <SelectItem value="eod_user">EOD User</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'success' : 'secondary'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                      </TableCell>
                      <TableCell>{u.timezone || 'PST'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {u.role === 'eod_user' && (
                          <Button variant="outline" size="sm" onClick={() => openClientAssignment(u)}>
                            Assign Clients
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => updateUser(u.id, { is_active: !u.is_active })}>{u.is_active ? 'Disable' : 'Enable'}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Role Policy</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Admins can manage users and settings. Managers can view reports and manage deals/users in their team. Reps can manage their deals and contacts.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eod" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  EOD Reports - Team Overview
                </CardTitle>
                <Select value={eodDateFilter} onValueChange={setEodDateFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Reports List */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">Reports ({darReports.length})</h3>
                  <div className="border rounded-lg max-h-[600px] overflow-auto">
                    {darReports.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No reports found for this period
                      </div>
                    ) : (
                      <div className="divide-y">
                        {darReports.map((report) => (
                          <div
                            key={report.id}
                            onClick={() => fetchReportDetails(report)}
                            className={`p-4 cursor-pointer hover:bg-accent transition-colors ${
                              selectedReport?.id === report.id ? 'bg-accent' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium">
                                  {report.user_profiles?.first_name} {report.user_profiles?.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {report.user_profiles?.email}
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                  {new Date(report.report_date).toLocaleDateString()}
                                </div>
                              </div>
                              <Badge variant={report.submitted_at ? "default" : "secondary"}>
                                {report.submitted_at ? "Submitted" : "Draft"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Details */}
                <div className="space-y-4">
                  {selectedReport ? (
                    <>
                      <div className="border rounded-lg p-4 space-y-4">
                        <div>
                          <h3 className="font-semibold mb-2">Report Details</h3>
                          <div className="text-sm space-y-1">
                            <div><strong>Date:</strong> {new Date(selectedReport.report_date).toLocaleDateString()}</div>
                            <div><strong>Started:</strong> {new Date(selectedReport.started_at).toLocaleString()}</div>
                            {selectedReport.submitted_at && (
                              <div><strong>Submitted:</strong> {new Date(selectedReport.submitted_at).toLocaleString()}</div>
                            )}
                          </div>
                        </div>

                        {selectedReport.summary && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Summary</h4>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.summary}</p>
                          </div>
                        )}

                        {/* Time Entries */}
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Time Entries</h4>
                          {timeEntries.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No time entries</p>
                          ) : (
                            <div className="space-y-2">
                              {timeEntries.map((entry) => {
                                const totalMinutes = entry.duration_minutes || 
                                  (entry.ended_at ? Math.floor((new Date(entry.ended_at).getTime() - new Date(entry.started_at).getTime()) / (1000 * 60)) : 0);
                                return (
                                  <div key={entry.id} className="border rounded p-3 space-y-1 text-sm">
                                    <div className="flex items-start justify-between">
                                      <div className="font-medium">{entry.client_name}</div>
                                      <div className="text-muted-foreground">{formatDuration(entry.duration_minutes, entry.started_at, entry.ended_at)}</div>
                                    </div>
                                    <div className="text-muted-foreground">{entry.task_description}</div>
                                    {entry.task_link && (
                                      <div>
                                        <a
                                          href={entry.task_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:underline flex items-center gap-1 text-xs"
                                        >
                                          <LinkIcon className="h-3 w-3" />
                                          View Task
                                        </a>
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                      {new Date(entry.started_at).toLocaleTimeString()} - {entry.ended_at ? new Date(entry.ended_at).toLocaleTimeString() : 'In Progress'}
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="pt-2 border-t">
                                <strong>Total: {formatDuration(timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0))}</strong>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Images */}
                        {reportImages.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Attached Images ({reportImages.length})</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {reportImages.map((img) => (
                                <a key={img.id} href={img.url} target="_blank" rel="noopener noreferrer">
                                  <img
                                    src={img.url}
                                    alt="Report attachment"
                                    className="w-full h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                                  />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="border rounded-lg p-8 text-center text-muted-foreground">
                      Select a report to view details
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="live" className="space-y-4">
          <DARLiveContent />
        </TabsContent>

        <TabsContent value="ops" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance</CardTitle>
            </CardHeader>
            <CardContent className="space-x-2">
              <Button variant="outline" onClick={fetchMetrics}>Refresh Metrics</Button>
              <Button variant="destructive"><Trash2 className="h-4 w-4 mr-1" /> Archive Old Logs</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Client Assignment Dialog */}
      <Dialog open={clientAssignmentDialog} onOpenChange={setClientAssignmentDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Assign Clients to {selectedUserForClients?.first_name} {selectedUserForClients?.last_name}
            </DialogTitle>
            <DialogDescription>
              Assign clients to this user. They will only see these clients in their DAR portal dropdown.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add New Client */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Add Client</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Client Name
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Type at least 2 characters to search existing clients
                  </p>
                  <div className="relative">
                    <Input
                      value={clientNameSearch}
                      onChange={(e) => {
                        setClientNameSearch(e.target.value);
                        setNewClientName(e.target.value);
                      }}
                      placeholder="Search or type client name..."
                      className="pr-10"
                    />
                    {clientNameSearch && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => {
                          setClientNameSearch('');
                          setNewClientName('');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {clientNameSearch.length >= 2 && (
                    <div className="mt-2 border rounded-md max-h-[200px] overflow-y-auto bg-white shadow-lg">
                      {availableClients
                        .filter(c => c.name.toLowerCase().includes(clientNameSearch.toLowerCase()))
                        .slice(0, 10).length > 0 ? (
                        availableClients
                          .filter(c => c.name.toLowerCase().includes(clientNameSearch.toLowerCase()))
                          .slice(0, 10)
                          .map((client, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
                              onClick={() => handleClientSelect(client.name)}
                            >
                              <div className="font-medium">{client.name}</div>
                              {(client.email || client.phone || client.timezone) && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {client.email && <span>{client.email}</span>}
                                  {client.phone && <span className="ml-2">📞 {client.phone}</span>}
                                  {client.timezone && <span className="ml-2">🌍 {client.timezone}</span>}
                                </div>
                              )}
                            </button>
                          ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No clients found. Type a custom name to create new.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Client Email (Optional)</Label>
                  <Input
                    type="email"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <Label>Client Phone (Optional)</Label>
                  <Input
                    type="tel"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Client Timezone
                  </Label>
                  <Select value={newClientTimezone} onValueChange={setNewClientTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                      <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                      <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                      <SelectItem value="Europe/London">London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={assignClient} className="w-full">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign Client
                </Button>
              </CardContent>
            </Card>

            {/* Assigned Clients List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Assigned Clients ({assignedClients.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {assignedClients.length > 0 && (
                  <Input
                    placeholder="Search assigned clients..."
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="w-full"
                  />
                )}
                {assignedClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No clients assigned yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignedClients
                      .filter(client => 
                        client.client_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
                        (client.client_email && client.client_email.toLowerCase().includes(clientSearch.toLowerCase()))
                      )
                      .map((client) => (
                      <div
                        key={client.id}
                        className="p-3 border rounded-lg hover:bg-accent"
                      >
                        {editingClient?.id === client.id ? (
                          // Edit mode
                          <div className="space-y-3">
                            <div>
                              <Label className="text-xs">Client Name</Label>
                              <p className="font-medium">{client.client_name}</p>
                            </div>
                            <div>
                              <Label className="text-xs">Email</Label>
                              <Input
                                type="email"
                                value={editingClient.client_email || ''}
                                onChange={(e) => setEditingClient({...editingClient, client_email: e.target.value})}
                                placeholder="client@example.com"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Phone</Label>
                              <Input
                                type="tel"
                                value={editingClient.client_phone || ''}
                                onChange={(e) => setEditingClient({...editingClient, client_phone: e.target.value})}
                                placeholder="+1 (555) 123-4567"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Timezone
                              </Label>
                              <Select 
                                value={editingClient.client_timezone} 
                                onValueChange={(val) => setEditingClient({...editingClient, client_timezone: val})}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                                  <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                                  <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                                  <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                                  <SelectItem value="America/Anchorage">Alaska Time (AKT)</SelectItem>
                                  <SelectItem value="Pacific/Honolulu">Hawaii Time (HT)</SelectItem>
                                  <SelectItem value="Europe/London">London (GMT)</SelectItem>
                                  <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                                  <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                                  <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                                  <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                                  <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={updateClientAssignment} className="flex-1">
                                <Check className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingClient(null)} className="flex-1">
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          // View mode
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{client.client_name}</p>
                              {client.client_email && (
                                <p className="text-sm text-muted-foreground">{client.client_email}</p>
                              )}
                              {client.client_phone && (
                                <p className="text-sm text-muted-foreground">{client.client_phone}</p>
                              )}
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Globe className="h-3 w-3" />
                                {client.client_timezone || 'America/Los_Angeles'}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingClient(client)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeClientAssignment(client.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


