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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, ShieldCheck, Activity, Database, Trash2, UserPlus, Clock, Link as LinkIcon, Eye, EyeOff, Radio, Edit, Globe, Check, X, Search, MessageCircle, Bell, FileText, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DARLiveContent } from "@/components/dar/DARLiveContent";
import { AdminEODCalendarFilter } from "@/components/admin/AdminEODCalendarFilter";

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

interface FilterOptions {
  user: string;
  client: string;
  dateFrom: string;
  dateTo: string;
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
  const [reportFilters, setReportFilters] = useState<FilterOptions>({
    user: 'all',
    client: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string, name: string }>>([]);
  const [availableClientsForFilter, setAvailableClientsForFilter] = useState<Array<string>>([]);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
  
  // Helper function to format role display names
  const getRoleDisplayName = (role: string): string => {
    const roleMap: Record<string, string> = {
      'eod_user': 'Operator',
      'rep': 'Sales Rep',
      'manager': 'Account Manager',
      'admin': 'Admin'
    };
    return roleMap[role] || role;
  };
  
  // Invoice states
  const [invoices, setInvoices] = useState<Array<{
    id: string;
    invoice_number: string;
    user_id: string;
    client_name: string;
    client_email: string;
    start_date: string;
    end_date: string;
    total_hours: number;
    total_amount: number;
    currency: string;
    status: string;
    approved_at: string | null;
    approved_by_email: string | null;
    created_at: string;
    user_profiles?: {
      first_name: string | null;
      last_name: string | null;
      email: string | null;
    };
  }>>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<Array<{
    id: string;
    task_date: string;
    task_description: string;
    hours: number;
    rate: number;
    amount: number;
  }>>([]);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  
  // Feedback states
  const [feedbacks, setFeedbacks] = useState<Array<{
    id: string;
    user_id: string;
    subject: string;
    message: string;
    images: string[];
    status: string;
    admin_response: string | null;
    created_at: string;
    updated_at: string;
    user_email?: string;
    user_name?: string;
  }>>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [adminResponse, setAdminResponse] = useState('');
  const [updatingFeedback, setUpdatingFeedback] = useState(false);
  
  // Notification states
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    user_name: string;
    redirect_url: string;
    is_read: boolean;
    created_at: string;
  }>>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { toast} = useToast();

  useEffect(() => {
    fetchMetrics();
    fetchUsers();
    loadFilterOptions();
    fetchDARReports();
    fetchFeedbacks();
    fetchNotifications();
    
    // Set up real-time subscription for notifications
    const notificationChannel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, (payload) => {
        console.log('New notification:', payload);
        fetchNotifications();
        // Show toast for new notification
        toast({
          title: (payload.new as any).title,
          description: (payload.new as any).message,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [eodDateFilter, reportFilters]);

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

  const loadFilterOptions = async () => {
    try {
      // Load users for filter
      const { data: usersData } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .order('first_name');
      
      if (usersData) {
        const usersList = usersData.map(u => ({
          id: u.user_id,
          name: `${u.first_name} ${u.last_name}`.trim()
        }));
        setAvailableUsers(usersList);
      }

      // Load unique clients from tasks
      const { data: clientsData } = await supabase
        .from('eod_submission_tasks')
        .select('client_name')
        .order('client_name');
      
      if (clientsData) {
        const uniqueClients = [...new Set(clientsData.map(t => t.client_name))].sort();
        setAvailableClientsForFilter(uniqueClients);
      }
    } catch (e) {
      console.error('Failed to load filter options:', e);
    }
  };

  const fetchDARReports = async () => {
    try {
      console.log('=== FETCHING DAR REPORTS ===');
      console.log('Filter:', eodDateFilter);
      console.log('Additional Filters:', reportFilters);
      
      // Step 1: Build query with filters
      let query = supabase
        .from('eod_submissions')
        .select(`
          *,
          eod_submission_tasks!inner(client_name)
        `, { count: 'exact' })
        .order('submitted_at', { ascending: false });

      // Apply user filter
      if (reportFilters.user && reportFilters.user !== 'all') {
        query = query.eq('user_id', reportFilters.user);
      }

      // Apply date range filters
      if (reportFilters.dateFrom) {
        query = query.gte('submitted_at', `${reportFilters.dateFrom}T00:00:00`);
      }
      if (reportFilters.dateTo) {
        query = query.lte('submitted_at', `${reportFilters.dateTo}T23:59:59`);
      }

      const { data: allSubmissions, error: checkError, count } = await query;

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
        console.warn('⚠️ NO SUBMISSIONS FOUND');
        setDarReports([]);
        toast({
          title: 'No EOD Reports',
          description: 'No reports match the selected filters.',
        });
        return;
      }

      // Step 2: Apply legacy date filter if no custom date range
      const now = new Date();
      let filteredSubmissions = allSubmissions;

      if (!reportFilters.dateFrom && !reportFilters.dateTo) {
        if (eodDateFilter === 'today') {
          const today = now.toISOString().split('T')[0];
          filteredSubmissions = allSubmissions.filter(s => 
            s.submitted_at && s.submitted_at.startsWith(today)
          );
        } else if (eodDateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          filteredSubmissions = allSubmissions.filter(s => 
            s.submitted_at && new Date(s.submitted_at) >= weekAgo
          );
        } else if (eodDateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          filteredSubmissions = allSubmissions.filter(s => 
            s.submitted_at && new Date(s.submitted_at) >= monthAgo
          );
        }
      }

      // Step 3: Apply client filter (client-side since it's in tasks)
      if (reportFilters.client && reportFilters.client !== 'all') {
        // For each submission, check if it has tasks with the selected client
        const submissionsWithClient: any[] = [];
        for (const submission of filteredSubmissions) {
          const { data: tasks } = await supabase
            .from('eod_submission_tasks')
            .select('client_name')
            .eq('submission_id', submission.id)
            .ilike('client_name', `%${reportFilters.client}%`)
            .limit(1);
          
          if (tasks && tasks.length > 0) {
            submissionsWithClient.push(submission);
          }
        }
        filteredSubmissions = submissionsWithClient;
      }

      if (filteredSubmissions.length === 0) {
        setDarReports([]);
        return;
      }

      // Step 4: Get user info
      const userIds = [...new Set(filteredSubmissions.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', userIds);

      let allUsers: any[] = [];
      if (!profiles || profiles.length === 0) {
        const { data: rpcUsers } = await supabase.rpc('get_all_users_for_eod');
        if (rpcUsers) allUsers = rpcUsers;
      }

      // Step 5: Map submissions to display format with clock hours
      const reportsWithProfiles = filteredSubmissions.map(submission => {
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
          clocked_in_at: submission.clocked_in_at,
          clocked_out_at: submission.clocked_out_at,
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

      console.log('✅ Final reports:', reportsWithProfiles.length);
      setDarReports(reportsWithProfiles);
    } catch (e: any) {
      console.error('❌ ERROR in fetchDARReports:', e);
      toast({ 
        title: 'Error', 
        description: e.message || 'Failed to load EOD reports',
        variant: 'destructive' 
      });
      setDarReports([]);
    }
  };

  const fetchInvoices = async () => {
    try {
      // Fetch invoices
      const { data: invoicesData, error: invoicesError } = await (supabase as any)
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch user profiles for these invoices
      const userIds = [...new Set(invoicesData?.map((inv: any) => inv.user_id) || [])];
      
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, email, first_name, last_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Merge the data
      const invoicesWithProfiles = (invoicesData || []).map((invoice: any) => {
        const profile = profiles?.find((p) => p.user_id === invoice.user_id);
        return {
          ...invoice,
          user_profiles: profile || null,
        };
      });

      setInvoices(invoicesWithProfiles);
    } catch (e: any) {
      console.error('Failed to fetch invoices:', e);
      toast({ title: 'Failed to load invoices', description: e.message, variant: 'destructive' });
    }
  };

  const fetchInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('task_date', { ascending: true });

      if (error) throw error;

      setInvoiceItems(data || []);
    } catch (e: any) {
      console.error('Failed to fetch invoice items:', e);
      toast({ title: 'Failed to load invoice details', description: e.message, variant: 'destructive' });
    }
  };

  const fetchFeedbacks = async () => {
    try {
      const { data, error } = await supabase
        .from('user_feedback')
        .select(`
          *,
          user_profiles!inner(email, first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedFeedbacks = (data || []).map((fb: any) => ({
        id: fb.id,
        user_id: fb.user_id,
        subject: fb.subject,
        message: fb.message,
        images: fb.images || [],
        status: fb.status,
        admin_response: fb.admin_response,
        created_at: fb.created_at,
        updated_at: fb.updated_at,
        user_email: fb.user_profiles?.email || 'Unknown',
        user_name: `${fb.user_profiles?.first_name || ''} ${fb.user_profiles?.last_name || ''}`.trim() || 'Unknown User'
      }));

      setFeedbacks(formattedFeedbacks);
    } catch (e: any) {
      console.error('Failed to fetch feedbacks:', e);
      toast({ title: 'Failed to load feedback', description: e.message, variant: 'destructive' });
    }
  };

  const updateFeedbackStatus = async (feedbackId: string, status: string, response?: string) => {
    setUpdatingFeedback(true);
    try {
      const updateData: any = { status };
      if (response !== undefined) {
        updateData.admin_response = response;
      }

      const { error } = await supabase
        .from('user_feedback')
        .update(updateData)
        .eq('id', feedbackId);

      if (error) throw error;

      toast({ title: 'Feedback updated', description: 'Status and response saved successfully' });
      await fetchFeedbacks();
      setFeedbackDialogOpen(false);
      setSelectedFeedback(null);
      setAdminResponse('');
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    } finally {
      setUpdatingFeedback(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Get last 50 notifications

      if (error) throw error;

      setNotifications(data || []);
      
      // Count unread
      const unread = (data || []).filter((n: any) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (e: any) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e: any) {
      console.error('Failed to mark notification as read:', e);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markNotificationAsRead(notification.id);
    
    // Close notification dropdown
    setShowNotifications(false);
    
    // Navigate to the appropriate page
    if (notification.redirect_url) {
      const url = new URL(notification.redirect_url, window.location.origin);
      const searchParams = new URLSearchParams(url.search);
      const tab = searchParams.get('tab');
      
      if (tab) {
        // If there's a tab parameter, we're already on admin page, just need to trigger tab change
        // This will be handled by updating the URL
        window.location.hash = '';
        window.location.search = `?tab=${tab}`;
        window.location.reload(); // Reload to ensure tab switches
      } else {
        navigate(notification.redirect_url);
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      
      if (unreadIds.length === 0) return;

      const { error } = await (supabase as any)
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
      
      toast({ title: 'All notifications marked as read' });
    } catch (e: any) {
      toast({ title: 'Failed to mark all as read', description: e.message, variant: 'destructive' });
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

  const deleteUser = async (user: UserProfile) => {
    // Confirm deletion
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${user.first_name} ${user.last_name} (${user.email})?\n\n` +
      `This will:\n` +
      `- Delete their account permanently\n` +
      `- Remove all their data (deals, calls, tasks, etc.)\n` +
      `- Cannot be undone\n\n` +
      `Type "DELETE" to confirm.`
    );
    
    if (!confirmDelete) return;

    const userConfirmation = window.prompt(
      `Type "DELETE" to permanently delete ${user.first_name} ${user.last_name}'s account:`
    );

    if (userConfirmation !== 'DELETE') {
      toast({ 
        title: 'Deletion cancelled', 
        description: 'User was not deleted' 
      });
      return;
    }

    try {
      // Delete user profile (this will cascade delete related data based on DB constraints)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user.user_id);

      if (profileError) throw profileError;

      // Delete auth user (requires admin privileges)
      const { error: authError } = await supabase.auth.admin.deleteUser(user.user_id);
      
      if (authError) {
        console.error('Failed to delete auth user:', authError);
        toast({ 
          title: 'Partial deletion', 
          description: 'Profile deleted but auth user remains. Contact support.',
          variant: 'destructive' 
        });
      }

      // Remove from local state
      setUsers(prev => prev.filter(u => u.id !== user.id));
      
      toast({ 
        title: 'User deleted successfully', 
        description: `${user.first_name} ${user.last_name}'s account has been permanently deleted` 
      });
    } catch (e: any) {
      console.error('Delete user error:', e);
      toast({ 
        title: 'Failed to delete user', 
        description: e.message || 'An error occurred',
        variant: 'destructive' 
      });
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
      console.log('🔄 Loading available clients...');
      
      // Get unique clients from companies and deals (no limit)
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('name, email, phone, timezone')
        .order('name');
      
      if (companiesError) {
        console.error('❌ Error loading companies:', companiesError);
        toast({ 
          title: 'Error loading companies', 
          description: companiesError.message,
          variant: 'destructive' 
        });
      }
      
      const { data: deals, error: dealsError } = await supabase
        .from('deals')
        .select('name, timezone')
        .order('name');
      
      if (dealsError) {
        console.error('❌ Error loading deals:', dealsError);
      }
      
      const clientSet = new Set<string>();
      const clientsWithEmail: Array<{name: string, email?: string, phone?: string, timezone?: string}> = [];
      
      // First, add companies (they have more complete data)
      console.log(`📊 Processing ${companies?.length || 0} companies...`);
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
      console.log(`📊 Processing ${deals?.length || 0} deals...`);
      deals?.forEach(d => {
        if (d.name && !clientSet.has(d.name)) {
          clientSet.add(d.name);
          clientsWithEmail.push({ 
            name: d.name, 
            timezone: d.timezone || 'America/Los_Angeles'  // Keep original for display
          });
        }
      });
      
      const sortedClients = clientsWithEmail.sort((a, b) => a.name.localeCompare(b.name));
      console.log(`✅ Loaded ${sortedClients.length} available clients`);
      console.log('First 5 clients:', sortedClients.slice(0, 5).map(c => c.name));
      
      setAvailableClients(sortedClients);
      
      toast({
        title: 'Clients loaded',
        description: `${sortedClients.length} clients available`,
      });
    } catch (error) {
      console.error('❌ Error loading available clients:', error);
      toast({
        title: 'Error loading clients',
        description: 'Failed to load available clients',
        variant: 'destructive'
      });
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

  const updateUserPassword = async () => {
    if (!selectedUserForPassword) return;
    
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Please enter and confirm the new password', variant: 'destructive' });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    
    setUpdatingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-user-password', {
        body: {
          user_id: selectedUserForPassword.user_id,
          new_password: newPassword,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast({ 
          title: 'Password updated successfully!', 
          description: `Password changed for ${selectedUserForPassword.email}` 
        });
        setPasswordDialogOpen(false);
        setSelectedUserForPassword(null);
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error(data?.error || 'Failed to update password');
      }
    } catch (e: any) {
      console.error('Password update error:', e);
      toast({ 
        title: 'Failed to update password', 
        description: e.message || 'An error occurred',
        variant: 'destructive' 
      });
    } finally {
      setUpdatingPassword(false);
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
          <TabsTrigger value="invoices" onClick={fetchInvoices}>
            <FileText className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="feedback">
            <MessageCircle className="h-4 w-4 mr-2" />
            Feedback
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
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create User</DialogTitle>
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
                        <SelectItem value="eod_user">Operator</SelectItem>
                        <SelectItem value="rep">Sales Rep</SelectItem>
                        <SelectItem value="manager">Account Manager</SelectItem>
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
                            <SelectItem value="manager">Account Manager</SelectItem>
                            <SelectItem value="rep">Sales Rep</SelectItem>
                            <SelectItem value="eod_user">Operator</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={u.is_active ? 'success' : 'secondary'}>{u.is_active ? 'Active' : 'Disabled'}</Badge>
                      </TableCell>
                      <TableCell>{u.timezone || 'PST'}</TableCell>
                      <TableCell className="text-right space-x-2">
                        {(u.role === 'eod_user' || u.role === 'manager' || u.role === 'rep') && (
                          <Button variant="outline" size="sm" onClick={() => openClientAssignment(u)}>
                            Assign Clients
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => updateUser(u.id, { is_active: !u.is_active })}>{u.is_active ? 'Disable' : 'Enable'}</Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={() => deleteUser(u)}
                          title="Permanently delete this user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                User Management
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage user passwords and security settings
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unnamed'}
                      </TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={
                          u.role === 'admin' ? 'default' :
                          u.role === 'manager' ? 'secondary' :
                          u.role === 'eod_user' ? 'outline' :
                          'secondary'
                        }>
                          {getRoleDisplayName(u.role || 'rep')}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUserForPassword(u);
                            setPasswordDialogOpen(true);
                          }}
                        >
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Reset Password
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(u)}
                          title="Permanently delete this user"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete User
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              {/* Calendar Filter */}
              <div className="mb-6">
                <AdminEODCalendarFilter
                  reportFilters={reportFilters}
                  onFilterChange={setReportFilters}
                />
              </div>

              {/* Advanced Filters */}
              <div className="mb-6 p-4 border rounded-lg bg-muted/30 space-y-4">
                <h3 className="font-semibold text-sm mb-3">Additional Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* User Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">DAR User</Label>
                    <Select
                      value={reportFilters.user}
                      onValueChange={(value) => setReportFilters({ ...reportFilters, user: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Users" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        {availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Filter */}
                  <div className="space-y-2">
                    <Label className="text-xs">Client</Label>
                    <Select
                      value={reportFilters.client}
                      onValueChange={(value) => setReportFilters({ ...reportFilters, client: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Clients" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="all">All Clients</SelectItem>
                        {availableClientsForFilter.map((client) => (
                          <SelectItem key={client} value={client}>
                            {client}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                </div>

                {/* Clear Filters Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReportFilters({ user: 'all', client: 'all', dateFrom: '', dateTo: '' })}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              </div>

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

                        {/* Clock In/Out Hours */}
                        {selectedReport.clocked_in_at && (
                          <div className="border-t pt-4">
                            <h4 className="font-semibold text-sm mb-2">Work Hours</h4>
                            <div className="text-sm space-y-1">
                              <div><strong>Clocked In:</strong> {new Date(selectedReport.clocked_in_at).toLocaleString()}</div>
                              {selectedReport.clocked_out_at && (
                                <div><strong>Clocked Out:</strong> {new Date(selectedReport.clocked_out_at).toLocaleString()}</div>
                              )}
                              {selectedReport.total_hours && (
                                <div className="mt-2 p-2 bg-blue-50 rounded">
                                  <strong>Total Hours Worked:</strong> {Number(selectedReport.total_hours).toFixed(2)}h
                                </div>
                              )}
                            </div>
                          </div>
                        )}

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
                                      Completed
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

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Hours</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {invoice.user_profiles?.first_name} {invoice.user_profiles?.last_name}
                            </div>
                            <div className="text-sm text-muted-foreground">{invoice.user_profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{invoice.client_name}</div>
                            <div className="text-sm text-muted-foreground">{invoice.client_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(invoice.start_date).toLocaleDateString()} - {new Date(invoice.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">{invoice.total_hours.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${invoice.total_amount.toFixed(2)}</TableCell>
                        <TableCell>
                          {invoice.status === 'approved' && (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                          {invoice.status === 'rejected' && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          )}
                          {invoice.status === 'pending' && (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              setSelectedInvoice(invoice);
                              await fetchInvoiceItems(invoice.id);
                              setInvoiceDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details Dialog */}
          <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Details - {selectedInvoice?.invoice_number}
                </DialogTitle>
                <DialogDescription>
                  Review complete invoice details and task breakdown
                </DialogDescription>
              </DialogHeader>

              {selectedInvoice && (
                <div className="space-y-6">
                  {/* Invoice Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">User</Label>
                      <div className="font-medium">
                        {selectedInvoice.user_profiles?.first_name} {selectedInvoice.user_profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{selectedInvoice.user_profiles?.email}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Client</Label>
                      <div className="font-medium">{selectedInvoice.client_name}</div>
                      <div className="text-sm text-muted-foreground">{selectedInvoice.client_email}</div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Period</Label>
                      <div className="font-medium">
                        {new Date(selectedInvoice.start_date).toLocaleDateString()} - {new Date(selectedInvoice.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        {selectedInvoice.status === 'approved' && (
                          <Badge className="bg-green-500">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        )}
                        {selectedInvoice.status === 'rejected' && (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        )}
                        {selectedInvoice.status === 'pending' && (
                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approval Info */}
                  {selectedInvoice.approved_at && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                        <CheckCircle className="h-4 w-4" />
                        {selectedInvoice.status === 'approved' ? 'Approved' : 'Rejected'} by {selectedInvoice.approved_by_email}
                      </div>
                      <div className="text-sm text-green-700">
                        on {new Date(selectedInvoice.approved_at).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {/* Task Breakdown */}
                  <div>
                    <h3 className="font-semibold mb-3">Task Breakdown</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Task Description</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-sm">{new Date(item.task_date).toLocaleDateString()}</TableCell>
                            <TableCell>{item.task_description}</TableCell>
                            <TableCell className="text-right">{item.hours.toFixed(2)}</TableCell>
                            <TableCell className="text-right">${item.rate.toFixed(2)}</TableCell>
                            <TableCell className="text-right font-medium">${item.amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell colSpan={2}>TOTAL</TableCell>
                          <TableCell className="text-right">{selectedInvoice.total_hours.toFixed(2)} hrs</TableCell>
                          <TableCell></TableCell>
                          <TableCell className="text-right text-lg">${selectedInvoice.total_amount.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                User Feedback
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                View and respond to feedback from DAR users
              </p>
            </CardHeader>
            <CardContent>
              {feedbacks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No feedback submitted yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feedbacks.map((fb) => (
                      <TableRow key={fb.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{fb.user_name}</div>
                            <div className="text-xs text-muted-foreground">{fb.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{fb.subject}</TableCell>
                        <TableCell>
                          <Badge variant={
                            fb.status === 'new' ? 'default' :
                            fb.status === 'in_progress' ? 'secondary' :
                            fb.status === 'resolved' ? 'outline' :
                            'destructive'
                          }>
                            {fb.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(fb.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedFeedback(fb);
                              setAdminResponse(fb.admin_response || '');
                              setFeedbackDialogOpen(true);
                            }}
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
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Client Name
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={loadAvailableClients}
                      className="h-7 text-xs"
                    >
                      🔄 Refresh List
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Type at least 2 characters to search existing clients ({availableClients.length} loaded)
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

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={(isOpen) => {
        setPasswordDialogOpen(isOpen);
        if (!isOpen) {
          setSelectedUserForPassword(null);
          setNewPassword('');
          setConfirmPassword('');
          setShowNewPassword(false);
          setShowConfirmPassword(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Reset User Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedUserForPassword?.first_name} {selectedUserForPassword?.last_name}
            </DialogDescription>
          </DialogHeader>

          {selectedUserForPassword && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm">
                  <div className="font-medium">{selectedUserForPassword.first_name} {selectedUserForPassword.last_name}</div>
                  <div className="text-muted-foreground">{selectedUserForPassword.email}</div>
                  <Badge variant="outline" className="mt-2">
                    {selectedUserForPassword.role || 'rep'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
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

              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Passwords do not match
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(false)}
                  disabled={updatingPassword}
                >
                  Cancel
                </Button>
                <Button
                  onClick={updateUserPassword}
                  disabled={updatingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                >
                  {updatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Feedback Details Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Feedback Details
            </DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <div className="font-medium">{selectedFeedback.user_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedFeedback.user_email}</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div className="mt-1">
                    <Select
                      value={selectedFeedback.status}
                      onValueChange={(value) => {
                        setSelectedFeedback({ ...selectedFeedback, status: value });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Submitted</Label>
                <div className="text-sm">
                  {new Date(selectedFeedback.created_at).toLocaleString()}
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Subject</Label>
                <div className="mt-1 text-base">{selectedFeedback.subject}</div>
              </div>

              <div>
                <Label className="text-sm font-semibold">Message</Label>
                <div className="mt-2 p-4 bg-muted rounded-md whitespace-pre-wrap">
                  {selectedFeedback.message}
                </div>
              </div>

              {selectedFeedback.images && selectedFeedback.images.length > 0 && (
                <div>
                  <Label className="text-sm font-semibold">Attachments</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                    {selectedFeedback.images.map((url: string, idx: number) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-32 object-cover rounded border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="admin_response" className="text-sm font-semibold">
                  Admin Response
                </Label>
                <textarea
                  id="admin_response"
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Write your response to the user..."
                  className="w-full min-h-[150px] p-3 border rounded-md resize-y mt-2"
                  rows={6}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFeedbackDialogOpen(false);
                    setSelectedFeedback(null);
                    setAdminResponse('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateFeedbackStatus(
                    selectedFeedback.id,
                    selectedFeedback.status,
                    adminResponse
                  )}
                  disabled={updatingFeedback}
                >
                  {updatingFeedback ? 'Saving...' : 'Save Response'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
