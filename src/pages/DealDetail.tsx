import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Calendar, 
  MoreHorizontal,
  Building2,
  DollarSign,
  Target,
  Edit2,
  Save,
  X,
  CheckCircle2,
  SkipForward,
  CalendarClock,
  Clock,
  ListTodo,
  Plus,
  Eye,
  ArrowRightLeft,
  Copy,
  FileText,
  Tag,
  Users,
  Globe,
  MapPin,
  TrendingUp,
  Flag,
  Package,
  Link,
  UserCircle,
  Briefcase,
  Settings,
  CreditCard,
  AlertCircle,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { CallLogForm } from "@/components/calls/CallLogForm";
import { ClickToCall } from "@/components/calls/ClickToCall";
import { CallHistory } from "@/components/calls/CallHistory";
import { NotesEditor } from "@/components/deals/NotesEditor";
import { EmailManager } from "@/components/deals/EmailManager";
import { MeetingManager } from "@/components/deals/MeetingManager";
import { CalScheduler } from "@/components/deals/CalScheduler";
import { ContactInformation } from "@/components/contacts/ContactInformation";
import { ContactForm } from "@/components/contacts/ContactForm";
import { CompanyForm } from "@/components/companies/CompanyForm";
import { CreateDealForm } from "@/components/deals/CreateDealForm";
import { LinkContactDialog } from "@/components/deals/LinkContactDialog";
import { LinkCompanyDialog } from "@/components/deals/LinkCompanyDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCTIStore } from "@/components/calls/DialpadCTIManager";
import { cn } from "@/lib/utils";

const stageColors = {
  "not contacted": "secondary",
  "no answer / gatekeeper": "secondary", 
  "decision maker": "default",
  "nurturing": "secondary",
  "interested": "default",
  "strategy call booked": "default",
  "strategy call attended": "default", 
  "proposal / scope": "default",
  "closed won": "default",
  "closed lost": "destructive"
} as const;

export default function DealDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [deal, setDeal] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [primaryContact, setPrimaryContact] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [calls, setCalls] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]); // All users with Rep/Manager/Admin roles
  const [operators, setOperators] = useState<any[]>([]); // Operators (eod_user)
  const [loading, setLoading] = useState(true);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [transferring, setTransferring] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [editingVertical, setEditingVertical] = useState(false);
  const [editingLeadSource, setEditingLeadSource] = useState(false);
  const [isEditingDeal, setIsEditingDeal] = useState(false);
  const [editedDeal, setEditedDeal] = useState<any>({});
  const [queuedTasks, setQueuedTasks] = useState<any[]>([]);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [newDueDate, setNewDueDate] = useState("");
  const [callLogOpen, setCallLogOpen] = useState(false);
  const { setCallEndCallback } = useCTIStore();
  const [pendingCallLog, setPendingCallLog] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'deal' | 'contact'>('deal'); // Toggle between deal and contact view
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null); // Selected contact to view
  const [contactDeals, setContactDeals] = useState<any[]>([]); // Deals associated with selected contact
  const [hasAutoOpenedCallLog, setHasAutoOpenedCallLog] = useState(false); // Track if we've auto-opened
  const [showContactDeals, setShowContactDeals] = useState(false); // Show/hide contact deals list
  const [createDealSheetOpen, setCreateDealSheetOpen] = useState(false); // Create deal sidebar
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false); // Create task dialog
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium'
  });
  
  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<any>('');
  const [isSaving, setIsSaving] = useState(false);
  const [openUserPopover, setOpenUserPopover] = useState(false);
  
  const leadSources = ['Website','Referral','LinkedIn','Cold Outbound','Webinar','Email','Other'];
  
  const timezoneOptions = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'Pacific/Honolulu',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Asia/Singapore',
    'Asia/Tokyo',
    'Australia/Sydney',
  ];
  
  const verticalOptions = [
    'Real Estate', 'Dentals', 'Legal', 'Professional Services',
    'Accounting & Bookkeeping Firms', 'Financial Advisors / Wealth Management', 'Mortgage Brokers',
    'Consulting Firms (Business / Management / HR)', 'Recruiting & Staffing Agencies', 'Architecture Firms',
    'Engineering Firms', 'Property Management Companies',
    'Web Design & Development Agencies', 'Video Production Studios', 'E-commerce Brands / Shopify Stores',
    'Influencers & Personal Brands', 'Podcast Production Companies', 'PR & Communications Agencies',
    'Graphic Design / Branding Studios',
    'Medical Clinics (Private Practices)', 'Chiropractors', 'Physical Therapy Clinics', 'Nutritionists & Dietitians',
    'Mental Health Therapists / Coaches', 'Medical Billing Companies',
    'Cleaning Companies', 'HVAC / Plumbing / Electrical Contractors', 'Landscaping / Lawn Care Companies',
    'Construction & Renovation Firms', 'Pest Control Companies',
    'Online Course Creators / EdTech', 'Life Coaches & Business Coaches', 'Tutoring & Test Prep Centers',
    'Freight Brokerage / Dispatch Services', 'Wholesale & Distribution Companies', 'Automotive Dealerships or Brokers',
    'Other',
  ];

  // NEW APPROACH: Multiple layers of call end detection
  useEffect(() => {
    const handleCallEnded = (event: CustomEvent) => {
      console.log('=== CALL ENDED EVENT RECEIVED ===');
      console.log('Call data:', event.detail);
      console.log('Opening call log form...');
      
      // Store call data if available
      if (event.detail) {
        setPendingCallLog(event.detail);
      }
      
      // Open the dialog
      setCallLogOpen(true);
      setActiveTab('calls');
      console.log('✅ Call log form opened, switched to calls tab');
    };

    // Listen for the custom event
    window.addEventListener('dialpad:call:ended' as any, handleCallEnded);
    
    // Set up the callback ONCE on mount
    setCallEndCallback((callId: number) => {
      console.log('=== CALL END CALLBACK TRIGGERED ===');
      console.log('Call ID:', callId);
      
      // Dispatch custom event
      const event = new CustomEvent('dialpad:call:ended', {
        detail: { callId, timestamp: new Date() }
      });
      window.dispatchEvent(event);
    });

    return () => {
      window.removeEventListener('dialpad:call:ended' as any, handleCallEnded);
      setCallEndCallback(null);
    };
  }, []); // ✅ Empty dependency array - setCallEndCallback is stable from context

  // Extract fetchDealData as a useCallback so it can be reused
  const fetchDealData = useCallback(async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        
        // Fetch deal data
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (dealError) throw dealError;
        
        if (!dealData) {
          toast({
            title: "Deal not found",
            description: "The deal you're looking for doesn't exist.",
            variant: "destructive"
          });
          navigate('/deals');
          return;
        }

        setDeal(dealData);

        // Fetch company data
        if (dealData.company_id) {
          const { data: companyData } = await supabase
            .from('companies')
            .select('*')
            .eq('id', dealData.company_id)
            .maybeSingle();
          
          if (companyData) setCompany(companyData);
        }

        // Fetch primary contact
        if (dealData.primary_contact_id) {
          const { data: contactData } = await supabase
            .from('contacts')
            .select('*')
            .eq('id', dealData.primary_contact_id)
            .maybeSingle();

          if (contactData) setPrimaryContact(contactData);
        }

        // Fetch pipeline data
        if (dealData.pipeline_id) {
          const { data: pipelineData } = await supabase
            .from('pipelines')
            .select('id, name')
            .eq('id', dealData.pipeline_id)
            .maybeSingle();

          if (pipelineData) setPipeline(pipelineData);
        }

        // Fetch calls
        const { data: callsData } = await supabase
          .from('calls')
          .select('*')
          .eq('related_deal_id', id)
          .order('call_timestamp', { ascending: false });

        if (callsData) setCalls(callsData);

        // Fetch ALL queued tasks (not just for this deal) so we can navigate between deals
        const { data: allQueuedTasks } = await supabase
          .from('tasks')
          .select('*')
          .in('status', ['pending', 'in_progress'])
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true });

        console.log('Loaded all queued tasks:', allQueuedTasks?.length);
        console.log('Tasks for current deal:', allQueuedTasks?.filter(t => t.deal_id === id).length);

        if (allQueuedTasks) setQueuedTasks(allQueuedTasks);

      } catch (error) {
        console.error('Error fetching deal data:', error);
        toast({
          title: "Error",
          description: "Failed to load deal details",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
  }, [id, navigate, toast]);

  // Fetch data on mount and when id changes
  useEffect(() => {
    fetchDealData();
  }, [fetchDealData]);

  // Fetch all pipelines for transfer
  useEffect(() => {
    const fetchPipelines = async () => {
      const { data } = await supabase
        .from('pipelines')
        .select('id, name, stages')
        .eq('is_active', true)
        .order('name');
      
      if (data) setPipelines(data);
    };
    
    fetchPipelines();
  }, []);

  // Reset view to deal mode whenever the deal ID changes
  useEffect(() => {
    setViewMode('deal');
    setSelectedContactId(null);
    setShowContactDeals(false);
    setHasAutoOpenedCallLog(false); // Reset auto-open flag when deal changes
  }, [id]);

  // Auto-open call log after 5 seconds if there are tasks for this deal
  useEffect(() => {
    const tasksForThisDeal = queuedTasks.filter(t => t.deal_id === id);
    
    if (tasksForThisDeal.length > 0 && !hasAutoOpenedCallLog && !callLogOpen && primaryContact) {
      console.log('🕐 Tasks found for this deal, will auto-open call log in 5 seconds...');
      
      const timer = setTimeout(() => {
        console.log('✅ Auto-opening call log for task queue');
        setPendingCallLog({
          phoneNumber: primaryContact?.phone || '',
          dealId: id,
          contactId: primaryContact?.id,
        });
        setCallLogOpen(true);
        setHasAutoOpenedCallLog(true);
        setActiveTab('calls');
      }, 5000); // 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [queuedTasks, id, hasAutoOpenedCallLog, callLogOpen, primaryContact]);

  // Fetch users with Rep, Manager, Admin, and Operator roles
  useEffect(() => {
    const fetchUsers = async () => {
      // Fetch sales reps, managers, and admins
      const { data: staffUsers } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email, role')
        .in('role', ['rep', 'manager', 'admin'])
        .eq('is_active', true)
        .order('first_name');
      
      // Fetch operators
      const { data: operatorUsers } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email, role')
        .eq('role', 'eod_user')
        .eq('is_active', true)
        .order('first_name');
      
      if (staffUsers) setUsers(staffUsers);
      if (operatorUsers) setOperators(operatorUsers);
    };
    
    fetchUsers();
  }, []);

  const handleEditDeal = () => {
    setEditedDeal({
      name: deal.name,
      amount: deal.amount,
      stage: deal.stage,
      close_date: deal.close_date,
      priority: deal.priority,
      deal_status: deal.deal_status,
      description: deal.description,
      timezone: deal.timezone,
      vertical: deal.vertical,
      lead_source: deal.lead_source,
      country: deal.country,
      state: deal.state,
      city: deal.city,
    });
    setIsEditingDeal(true);
  };

  const handleCancelEdit = () => {
    setIsEditingDeal(false);
    setEditedDeal({});
  };

  const handleSaveDeal = async () => {
    try {
      const { error } = await supabase
        .from('deals')
        .update(editedDeal)
        .eq('id', id!);

      if (error) throw error;

      setDeal({ ...deal, ...editedDeal });
      setIsEditingDeal(false);
      setEditedDeal({});
      
      toast({
        title: "Success",
        description: "Deal updated successfully",
      });
    } catch (error) {
      console.error('Error updating deal:', error);
      toast({
        title: "Error",
        description: "Failed to update deal",
        variant: "destructive",
      });
    }
  };

  // Inline editing functions
  const handleStartEdit = (fieldName: string, currentValue: any) => {
    setEditingField(fieldName);
    // Use 'unassigned' instead of empty string for null/empty values
    setFieldValue(currentValue || 'unassigned');
  };

  // Note: Account Manager assignments are now handled directly via the account_manager_id field on deals
  // Real-time subscriptions in Deals.tsx will automatically update the Account Manager's pipeline

  const handleSaveField = async (fieldName: string, value: any, table: 'deals' | 'contacts' = 'deals') => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const recordId = table === 'deals' ? id : selectedContactId;
      const previousValue = table === 'deals' ? deal?.[fieldName] : primaryContact?.[fieldName];
      
      // Convert 'unassigned' to null for database
      const dbValue = value === 'unassigned' || !value ? null : value;
      
      const { error } = await supabase
        .from(table)
        .update({ [fieldName]: dbValue })
        .eq('id', recordId!);

      if (error) throw error;

      // Update local state with the actual database value
      if (table === 'deals') {
        setDeal({ ...deal, [fieldName]: dbValue });
      } else {
        setPrimaryContact({ ...primaryContact, [fieldName]: dbValue });
      }

      // Note: Account Manager assignments are automatically handled via real-time subscriptions
      // The assigned Account Manager will see the deal appear in their pipeline instantly

      setEditingField(null);
      setFieldValue('');
      
      toast({
        title: "Success",
        description: "Field updated successfully",
      });
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        title: "Error",
        description: "Failed to update field",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelFieldEdit = () => {
    setEditingField(null);
    setFieldValue('');
  };

  // Handle transfer pipeline
  const handleTransferPipeline = async () => {
    if (!selectedPipelineId || !selectedStage) {
      toast({
        title: "Missing Information",
        description: "Please select both a pipeline and a stage",
        variant: "destructive"
      });
      return;
    }

    setTransferring(true);
    try {
      const { error } = await supabase
        .from('deals')
        .update({
          pipeline_id: selectedPipelineId,
          stage: selectedStage.toLowerCase().trim() as any
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const newPipeline = pipelines.find(p => p.id === selectedPipelineId);
      setPipeline(newPipeline);
      setDeal({ ...deal, pipeline_id: selectedPipelineId, stage: selectedStage.toLowerCase().trim() });

      toast({
        title: "Success",
        description: `Deal transferred to ${newPipeline?.name}`,
      });

      setTransferDialogOpen(false);
      setSelectedPipelineId('');
      setSelectedStage('');
    } catch (error) {
      console.error('Error transferring pipeline:', error);
      toast({
        title: "Error",
        description: "Failed to transfer pipeline",
        variant: "destructive"
      });
    } finally {
      setTransferring(false);
    }
  };

  // Handle viewing contact information
  const handleViewContact = async (contactId: string) => {
    setSelectedContactId(contactId);
    setViewMode('contact');
    setShowContactDeals(false);
    
    // Fetch deals for this contact
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('*, companies(name)')
        .eq('primary_contact_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContactDeals(data || []);
    } catch (error) {
      console.error('Error fetching contact deals:', error);
    }
  };

  // Handle returning to deal view
  const handleBackToDeal = () => {
    setViewMode('deal');
    setSelectedContactId(null);
    setShowContactDeals(false);
    setContactDeals([]);
  };

  // Task Queue Actions
  const handleCompleteTask = async (task: any) => {
    console.log('Complete button clicked for task:', task.id);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', task.id)
        .select();

      console.log('Complete update response:', { data, error });

      if (error) {
        console.error('Complete task error:', error);
        throw error;
      }

      // Remove completed task from queue locally first
      const updatedQueue = queuedTasks.filter(t => t.id !== task.id);
      setQueuedTasks(updatedQueue);

      toast({
        title: "Task Completed",
        description: `"${task.title}" has been marked as complete`
      });

      // Auto-navigate to next task's deal if available
      if (updatedQueue.length > 0) {
        const nextTask = updatedQueue[0];
        if (nextTask.deal_id) {
          // Always navigate to next deal (even if same deal, to refresh)
          console.log('Navigating to next task deal:', nextTask.deal_id);
          setTimeout(() => {
            navigate(`/deals/${nextTask.deal_id}`);
            toast({
              title: "Next Task",
              description: `${nextTask.deal_id === id ? 'Next task' : 'Moving to next deal'}: ${nextTask.title}`,
            });
          }, 800); // Slightly faster for better UX
        }
      } else {
        console.log('No more tasks in queue');
        toast({
          title: "Queue Complete",
          description: "All tasks completed!",
        });
      }
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete task",
        variant: "destructive"
      });
    }
  };

  const handleSkipTask = async (task: any) => {
    console.log('=== SKIP TASK DEBUG ===');
    console.log('Skip button clicked for task:', task.id);
    console.log('Task current status:', task.status);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', task.id)
        .select();

      console.log('Skip update response:', { data, error });
      if (data && data.length > 0) {
        console.log('Task updated successfully. New status:', data[0].status);
      }

      if (error) {
        console.error('Skip task error:', error);
        throw error;
      }

      // Remove skipped task from queue locally first
      const updatedQueue = queuedTasks.filter(t => t.id !== task.id);
      setQueuedTasks(updatedQueue);
      console.log('Updated queue length:', updatedQueue.length);

      toast({
        title: "Task Skipped",
        description: `"${task.title}" has been set to cancelled. Check Skipped tab in Tasks page.`
      });

      // Auto-navigate to next task's deal if available
      if (updatedQueue.length > 0) {
        const nextTask = updatedQueue[0];
        if (nextTask.deal_id) {
          // Always navigate to next deal (even if same deal, to refresh)
          console.log('Navigating to next task deal:', nextTask.deal_id);
          setTimeout(() => {
            navigate(`/deals/${nextTask.deal_id}`);
            toast({
              title: "Next Task",
              description: `${nextTask.deal_id === id ? 'Next task' : 'Moving to next deal'}: ${nextTask.title}`,
            });
          }, 800); // Slightly faster for better UX
        }
      } else {
        console.log('No more tasks in queue');
        toast({
          title: "Queue Complete",
          description: "All tasks processed!",
        });
      }
    } catch (error: any) {
      console.error('Error skipping task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to skip task",
        variant: "destructive"
      });
    }
  };

  const openRescheduleDialog = (task: any) => {
    setSelectedTask(task);
    setNewDueDate(task.due_date || '');
    setRescheduleDialogOpen(true);
  };

  const handleRescheduleTask = async () => {
    if (!selectedTask || !newDueDate) {
      toast({
        title: "Error",
        description: "Please select a new due date",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ due_date: newDueDate })
        .eq('id', selectedTask.id);

      if (error) throw error;

      setQueuedTasks(prev => 
        prev.map(t => t.id === selectedTask.id ? { ...t, due_date: newDueDate } : t)
      );

      setRescheduleDialogOpen(false);
      setSelectedTask(null);
      setNewDueDate('');

      toast({
        title: "Task Rescheduled",
        description: `"${selectedTask.title}" has been rescheduled`
      });
    } catch (error) {
      console.error('Error rescheduling task:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule task",
        variant: "destructive"
      });
    }
  };

  const handleCallLogged = async (callData: any) => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('calls')
        .insert([{
          outbound_type: callData.outboundType,
          call_outcome: callData.callOutcome,
          duration_seconds: callData.durationSeconds,
          notes: callData.notes || null,
          call_timestamp: new Date().toISOString(),
          related_deal_id: id,
          related_contact_id: primaryContact?.id,
          related_company_id: company?.id,
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Call logged successfully",
      });

      // Refresh calls data
      const { data: callsData } = await supabase
        .from('calls')
        .select('*')
        .eq('related_deal_id', id)
        .order('call_timestamp', { ascending: false });

      if (callsData) setCalls(callsData);
    } catch (error) {
      console.error('Error logging call:', error);
      toast({
        title: "Error",
        description: "Failed to log call",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="col-span-6">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!deal) return null;

  // Helper function to get user display name from user_id
  const getUserDisplayName = (userId: string | null): string => {
    if (!userId) return 'Not assigned';
    // Check in both users and operators arrays
    const user = users.find(u => u.user_id === userId) || operators.find(u => u.user_id === userId);
    if (!user) return 'Not assigned';
    return `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email || 'Unknown User';
  };

  // Render inline editable field
  const renderEditableField = (
    fieldName: string,
    label: string,
    currentValue: any,
    type: 'text' | 'number' | 'select' | 'textarea' | 'date' | 'user' | 'multiselect' = 'text',
    options?: string[],
    table: 'deals' | 'contacts' = 'deals',
    roleFilter?: string,
    icon?: React.ReactNode
  ) => {
    const isEditing = editingField === fieldName;
    const isEmpty = !currentValue || currentValue === 'Not set' || currentValue === '';
    
    // Filter users based on role if roleFilter is provided
    // For 'setter_id' (Sales Rep), show ALL users instead of just reps
    const filteredUsers = type === 'user' && roleFilter
      ? roleFilter === 'eod_user' 
        ? operators 
        : fieldName === 'setter_id' 
          ? users // Show all users for Sales Rep field
          : users.filter(u => u.role === roleFilter)
      : users;
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          {icon}
          {label}
        </Label>
        {isEditing ? (
          <div className="relative">
            {type === 'user' ? (
              <Popover open={openUserPopover} onOpenChange={setOpenUserPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openUserPopover}
                    className="w-full justify-between border-primary ring-2 ring-primary/20"
                  >
                    {fieldValue && fieldValue !== 'unassigned' ? getUserDisplayName(fieldValue) : 'Select user...'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      <CommandItem
                        value="unassigned"
                        onSelect={() => {
                          setFieldValue('unassigned');
                          handleSaveField(fieldName, 'unassigned', table);
                          setOpenUserPopover(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            fieldValue === 'unassigned' ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Not assigned
                      </CommandItem>
                      {filteredUsers.map((user) => {
                        const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
                        return (
                          <CommandItem
                            key={user.user_id}
                            value={`${userName} ${user.email} ${user.role}`}
                            onSelect={() => {
                              setFieldValue(user.user_id);
                              handleSaveField(fieldName, user.user_id, table);
                              setOpenUserPopover(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                fieldValue === user.user_id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{userName}</span>
                              <span className="text-xs text-muted-foreground">
                                {user.email} • {user.role}
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            ) : type === 'multiselect' ? (
              <div className="border-primary ring-2 ring-primary/20 rounded-md p-3 space-y-2 bg-background">
                {options?.map((option) => {
                  const selectedValues = fieldValue ? fieldValue.split(', ').filter(v => v && v !== 'Not set') : [];
                  const isChecked = selectedValues.includes(option);
                  
                  return (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${fieldName}-${option}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          let newValues: string[];
                          if (checked) {
                            newValues = [...selectedValues, option];
                          } else {
                            newValues = selectedValues.filter(v => v !== option);
                          }
                          const newValue = newValues.filter(Boolean).join(', ');
                          setFieldValue(newValue);
                          handleSaveField(fieldName, newValue, table);
                        }}
                      />
                      <label
                        htmlFor={`${fieldName}-${option}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {option}
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : type === 'select' ? (
              <Select
                value={fieldValue}
                onValueChange={(value) => {
                  setFieldValue(value);
                  handleSaveField(fieldName, value, table);
                }}
                onOpenChange={(open) => {
                  if (!open && !isSaving) {
                    handleCancelFieldEdit();
                  }
                }}
              >
                <SelectTrigger className="w-full border-primary ring-2 ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {options?.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : type === 'textarea' ? (
              <Textarea
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                onBlur={() => handleSaveField(fieldName, fieldValue, table)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleCancelFieldEdit();
                  }
                }}
                className="border-primary ring-2 ring-primary/20"
                autoFocus
                rows={3}
              />
            ) : type === 'date' ? (
              <Input
                type="date"
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                onBlur={() => handleSaveField(fieldName, fieldValue, table)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleCancelFieldEdit();
                  }
                }}
                className="border-primary ring-2 ring-primary/20"
                autoFocus
              />
            ) : (
              <Input
                type={type}
                value={fieldValue}
                onChange={(e) => setFieldValue(e.target.value)}
                onBlur={() => handleSaveField(fieldName, fieldValue, table)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    handleCancelFieldEdit();
                  } else if (e.key === 'Enter') {
                    handleSaveField(fieldName, fieldValue, table);
                  }
                }}
                className="border-primary ring-2 ring-primary/20"
                autoFocus
              />
            )}
            {isSaving && (
              <div className="absolute right-2 top-2 text-xs text-muted-foreground">
                Saving...
              </div>
            )}
          </div>
        ) : (
          <div
            className={`cursor-pointer p-3 rounded-lg border transition-all group ${
              isEmpty 
                ? 'bg-muted/30 border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/50' 
                : 'bg-background border-border hover:border-primary hover:shadow-sm'
            }`}
            onClick={() => handleStartEdit(fieldName, currentValue)}
            title="Click to edit"
          >
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${isEmpty ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                {type === 'user' ? getUserDisplayName(currentValue) : (currentValue || 'Not set')}
              </span>
              <div className="flex items-center gap-1">
                {isEmpty && <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                <Edit2 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-primary/5 via-sky-50 to-primary/5 p-6 rounded-lg border-2 border-sky-100 shadow-md">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigate("/deals")}
            className="hover:scale-105 transition-transform border-2 hover:border-primary hover:bg-primary hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-sky-600 bg-clip-text text-transparent flex items-center gap-2">
              {viewMode === 'contact' && selectedContactId && primaryContact
                ? `${primaryContact.first_name} ${primaryContact.last_name}`
                : deal.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-muted-foreground font-medium">
                {viewMode === 'contact' ? 'Contact Information' : (company?.name || 'No company')}
              </p>
              {pipeline && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <Badge variant="outline" className="font-semibold">
                    {pipeline.name}
                  </Badge>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {primaryContact?.phone && (
            <ClickToCall 
              phoneNumber={primaryContact.phone}
              dealId={id}
              contactId={primaryContact.id}
              label={`Call ${primaryContact.first_name}`}
              showIcon={true}
              size="sm"
            />
          )}
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform border-2 hover:border-primary hover:bg-primary hover:text-white font-semibold">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform border-2 hover:border-primary hover:bg-primary hover:text-white font-semibold">
            <Calendar className="mr-2 h-4 w-4" />
            Meeting
          </Button>
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform border-2 hover:border-primary">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Task Queue Section - Compact Bar */}
      {queuedTasks.filter(t => t.deal_id === id).length > 0 && (
        <Card className="shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ListTodo className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                <h3 className="font-semibold text-xs sm:text-sm">Task Queue</h3>
                <Badge variant="secondary" className="text-xs">
                  {queuedTasks.filter(t => t.deal_id === id).length} task{queuedTasks.filter(t => t.deal_id === id).length !== 1 ? 's' : ''} for this deal
                </Badge>
                <Badge variant="outline" className="text-xs hidden sm:inline-flex">
                  {queuedTasks.length} total in queue
                </Badge>
              </div>
            </div>
            <div className="mt-2 md:mt-3 space-y-2">
              {queuedTasks.filter(t => t.deal_id === id).map((task, index) => (
                <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                  <div className="flex-1 min-w-0 w-full">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                      <h4 className="font-medium text-xs sm:text-sm truncate">{task.title}</h4>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-2">
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                        {task.priority}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 w-full sm:w-auto">
                  <Button 
                    size="sm" 
                      variant="outline"
                      onClick={() => openRescheduleDialog(task)}
                      title="Reschedule task"
                      className="h-7 sm:h-8 text-xs flex-1 sm:flex-none"
                  >
                      <CalendarClock className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Reschedule</span>
                  </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleSkipTask(task)}
                      title="Skip this task"
                      className="h-7 sm:h-8 text-xs flex-1 sm:flex-none"
                    >
                      <SkipForward className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Skip</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => handleCompleteTask(task)}
                      title="Mark as complete"
                      className="h-7 sm:h-8 text-xs bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                    >
                      <CheckCircle2 className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">Complete</span>
                    </Button>
                  </div>
              </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
        {/* Left Sidebar - Deal Info / Contact Info (Dynamic) */}
        <div className="lg:col-span-3 space-y-3 md:space-y-4 animate-scale-in">
          {viewMode === 'contact' && selectedContactId ? (
            <ContactInformation 
              contactId={selectedContactId} 
              onClose={handleBackToDeal}
                  />
                ) : (
            <Card className="shadow-lg border-2 border-sky-100 hover:shadow-glow transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-sky-50 to-primary/5 border-b-2 border-sky-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Deal Information
                  </CardTitle>
                  <Badge 
                    variant={deal.stage?.toLowerCase().includes('won') ? 'default' : deal.stage?.toLowerCase().includes('lost') ? 'destructive' : 'secondary'}
                    className="capitalize font-semibold px-3 py-1"
                  >
                    {deal.stage}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                {/* 1. Deal Name */}
                {renderEditableField('name', 'Deal Name', deal.name, 'text', undefined, 'deals', undefined, <FileText className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 2. Deal Stage */}
                {renderEditableField('stage', 'Deal Stage', deal.stage, 'select', [
                  'uncontacted',
                  'no answer / gatekeeper',
                  'dm connected',
                  'discovery',
                  'strategy call booked',
                  'strategy call attended',
                  'nurturing',
                  'business audit booked',
                  'business audit attended',
                  'candidate interview booked',
                  'candidate interview attended',
                  'awaiting docs / signature',
                  'deal won',
                  'not interested',
                  'not qualified / disqualified',
                  'do not call'
                ], 'deals', undefined, <Target className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 3. Deal Description */}
                {renderEditableField('description', 'Deal Description', deal.description || '', 'textarea', undefined, 'deals', undefined, <FileText className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 4. Annual Revenue */}
                {renderEditableField('annual_revenue', 'Annual Revenue', deal.annual_revenue || 'Not set', 'select', ['<100k', '100-250k', '251-500k', '500k-1M', '1M+'], 'deals', undefined, <DollarSign className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 5. Priority */}
                {renderEditableField('priority', 'Priority', deal.priority, 'select', ['low', 'medium', 'high'], 'deals', undefined, <Flag className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 6. Product Segment */}
                {renderEditableField('product_segment', 'Product Segment', deal.product_segment || 'Not set', 'multiselect', [
                  'Remote Operator',
                  'Website',
                  'WebApp',
                  'AI Adoption',
                  'Consulting'
                ], 'deals', undefined, <Package className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 7. Deal Source */}
                {renderEditableField('source', 'Deal Source', deal.source || 'Not set', 'select', leadSources, 'deals', undefined, <Link className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 8. Deal Owner */}
                {renderEditableField('deal_owner_id', 'Deal Owner', deal.deal_owner_id, 'user', undefined, 'deals', undefined, <UserCircle className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 9. Sales Development Representative */}
                {renderEditableField('setter_id', 'Sales Development Representative', deal.setter_id, 'user', undefined, 'deals', 'rep', <Users className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 10. Account Manager */}
                {renderEditableField('account_manager_id', 'Account Manager', deal.account_manager_id, 'user', undefined, 'deals', 'manager', <Briefcase className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 11. Assigned Operator */}
                {renderEditableField('assigned_operator', 'Assigned Operator', deal.assigned_operator, 'user', undefined, 'deals', 'eod_user', <Settings className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 12. Currency */}
                {renderEditableField('currency', 'Currency', deal.currency || 'USD', 'select', ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'], 'deals', undefined, <CreditCard className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 13. Time Zone */}
                {renderEditableField('timezone', 'Time Zone', deal.timezone || 'America/New_York', 'select', timezoneOptions, 'deals', undefined, <Globe className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 15. Referral Source */}
                {renderEditableField('referral_source', 'Referral Source', deal.referral_source || 'Not set', 'text', undefined, 'deals', undefined, <TrendingUp className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 16. Expected Close Date */}
                {renderEditableField('close_date', 'Expected Close Date', deal.close_date ? new Date(deal.close_date).toISOString().split('T')[0] : '', 'date', undefined, 'deals', undefined, <CalendarClock className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 17. City/Region */}
                {renderEditableField('city', 'City/Region', deal.city || 'Not set', 'text', undefined, 'deals', undefined, <MapPin className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 18. State/Region */}
                {renderEditableField('state', 'State/Region', deal.state || 'Not set', 'text', undefined, 'deals', undefined, <MapPin className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 19. Country */}
                {renderEditableField('country', 'Country', deal.country || 'Not set', 'text', undefined, 'deals', undefined, <Globe className="h-4 w-4" />)}

                <Separator className="my-3" />

                {/* 20. Last Activity Date (Read Only) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last Activity Date
                  </Label>
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-sm font-medium text-foreground">
                      {deal.last_activity_date ? new Date(deal.last_activity_date).toLocaleString() : 'No activity yet'}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Transfer Pipeline Button */}
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-center gap-2 hover:bg-primary hover:text-white transition-all hover:shadow-md border-2"
                    onClick={() => setTransferDialogOpen(true)}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                    Transfer to Another Pipeline
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <span>Current Pipeline:</span>
                    <Badge variant="secondary" className="font-medium">
                      {pipeline?.name || 'Not assigned'}
                    </Badge>
                  </div>
                </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Center Content - Activities */}
        <div className="col-span-6 animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <Card className="shadow-lg border-2 border-sky-100 hover:shadow-glow transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-sky-50 to-primary/5 border-b-2 border-sky-100">
                <TabsList className="bg-white shadow-md border-2 border-sky-100 p-1">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all">Meeting</TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all">Activity</TabsTrigger>
                  <TabsTrigger value="notes" className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all">Notes</TabsTrigger>
                  <TabsTrigger value="calls" className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all">Calls</TabsTrigger>
                  <TabsTrigger value="tasks" className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all">Tasks</TabsTrigger>
                  <TabsTrigger value="emails" className="data-[state=active]:bg-primary data-[state=active]:text-white font-semibold transition-all">Emails</TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent>
                  <TabsContent value="overview" className="space-y-4">
                    <CalScheduler 
                      dealId={id!} 
                      contactId={primaryContact?.id} 
                      companyId={company?.id} 
                    />
                  </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Recent Activity</h3>
                    <Button 
                      size="sm"
                      onClick={() => {
                        // Create default call data if none exists
                        if (!pendingCallLog) {
                          setPendingCallLog({
                            phoneNumber: primaryContact?.phone || '',
                            dealId: id,
                            contactId: primaryContact?.id,
                          });
                        }
                        setCallLogOpen(true);
                      }}
                    >
                        <Phone className="mr-2 h-4 w-4" />
                        Log Call
                      </Button>
                  </div>
                  <div className="space-y-3">
                    {calls.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No activity yet
                      </p>
                    ) : (
                      calls.map((call) => (
                        <div key={call.id} className="border-l-2 border-muted pl-4 pb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">
                              Call - {call.call_outcome}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(call.call_timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {call.notes || 'No notes'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="calls" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Call History</h3>
                    <Button 
                      size="sm"
                      onClick={() => {
                        // Create default call data if none exists
                        if (!pendingCallLog) {
                          setPendingCallLog({
                            phoneNumber: primaryContact?.phone || '',
                            dealId: id,
                            contactId: primaryContact?.id,
                          });
                        }
                        setCallLogOpen(true);
                      }}
                    >
                        <Phone className="mr-2 h-4 w-4" />
                        Log Call
                      </Button>
                  </div>
                  <CallHistory 
                    contactId={primaryContact?.id} 
                    dealId={id} 
                    limit={20}
                  />
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <NotesEditor 
                    dealId={id!} 
                    dealNotes={deal.notes}
                    onDealNotesUpdate={(notes) => setDeal({ ...deal, notes })}
                  />
                </TabsContent>

                <TabsContent value="tasks" className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold">Follow-up Tasks</h3>
                    <Button 
                      size="sm"
                      onClick={() => setCreateTaskDialogOpen(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      New Task
                    </Button>
                  </div>

                  {/* Task List */}
                  <div className="space-y-3">
                    {queuedTasks.filter(t => t.deal_id === id).length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No tasks yet. Create a follow-up task to get started.
                      </p>
                    ) : (
                      queuedTasks.filter(t => t.deal_id === id).map((task) => (
                        <div key={task.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{task.title}</h4>
                                {task.priority && (
                                  <Badge variant={task.priority === 'high' ? 'destructive' : 'secondary'}>
                                    {task.priority}
                                  </Badge>
                                )}
                                {task.status && (
                                  <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                                    {task.status}
                                  </Badge>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                              )}
                              {task.due_date && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  Due: {new Date(task.due_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="emails" className="space-y-4">
                  <EmailManager 
                    dealId={id!} 
                    contactId={primaryContact?.id} 
                    companyId={company?.id} 
                    contactEmail={primaryContact?.email || ''} 
                  />
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>
        </div>

        {/* Right Sidebar - Associated Entities */}
        <div className="col-span-3 space-y-4 animate-slide-in-right">
          <Card className="shadow-lg border-2 border-sky-100 hover:shadow-glow transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-sky-50 to-primary/5 border-b-2 border-sky-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <Users className="h-5 w-5" />
                Associated Contacts
              </CardTitle>
              <LinkContactDialog 
                dealId={id!} 
                currentContactId={primaryContact?.id}
                onSuccess={() => fetchDealData()}
              >
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </LinkContactDialog>
            </CardHeader>
            <CardContent className="p-4">
              {primaryContact ? (
                <div className="space-y-3">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer hover:bg-primary/5 p-3 rounded-lg transition-all border-2 border-transparent hover:border-primary/20"
                    onClick={() => handleViewContact(primaryContact.id)}
                    title="Click to view contact details"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {primaryContact.first_name?.[0]}{primaryContact.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-primary hover:underline flex items-center gap-1">
                        {primaryContact.first_name} {primaryContact.last_name}
                      </p>
                      <Badge variant="outline" className="text-[10px] mt-1">Primary Contact</Badge>
                    </div>
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-2">
                    {(primaryContact.primary_email || primaryContact.email) && (
                      <div className="flex items-center justify-between group p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium truncate">{primaryContact.primary_email || primaryContact.email}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(primaryContact.primary_email || primaryContact.email!);
                            toast({ title: "Copied!", description: "Email copied to clipboard" });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    {(primaryContact.primary_phone || primaryContact.phone) && (
                      <div className="flex items-center justify-between group p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium">{primaryContact.primary_phone || primaryContact.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              navigator.clipboard.writeText(primaryContact.primary_phone || primaryContact.phone!);
                              toast({ title: "Copied!", description: "Phone copied to clipboard" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <ClickToCall 
                            phoneNumber={primaryContact.primary_phone || primaryContact.phone}
                            contactId={primaryContact.id}
                            dealId={id}
                            variant="ghost"
                            size="icon"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground font-medium">No primary contact assigned</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Actions Card - Separate Card for View Deals and Create New Deal */}
          {primaryContact && (
            <Card className="shadow-lg border-2 border-sky-100 hover:shadow-glow transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-primary/10 via-sky-50 to-primary/5 border-b-2 border-sky-100">
                <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                  <ListTodo className="h-5 w-5" />
                  Contact Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start border-2 hover:border-primary hover:bg-primary/5 font-semibold transition-all"
                  onClick={() => setShowContactDeals(!showContactDeals)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showContactDeals ? 'Hide' : 'View'} Deals ({contactDeals.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start bg-primary hover:bg-primary/90 font-semibold shadow-md hover:shadow-lg transition-all"
                  onClick={() => setCreateDealSheetOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Deal
                </Button>

                {/* Deals List for Contact */}
                {showContactDeals && contactDeals.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        <p className="text-xs font-semibold text-muted-foreground">
                          All Deals for {primaryContact.first_name}
                        </p>
                        {contactDeals.map((contactDeal) => (
                          <div 
                            key={contactDeal.id}
                            className={`p-2 rounded border cursor-pointer hover:bg-accent/50 transition-colors ${
                              contactDeal.id === id ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                            onClick={() => {
                              if (contactDeal.id !== id) {
                                // Different deal - reset view and navigate
                                setViewMode('deal');
                                setSelectedContactId(null);
                                setShowContactDeals(false);
                                navigate(`/deals/${contactDeal.id}`);
                              } else {
                                // Same deal - just reset view to show Deal Information
                                setViewMode('deal');
                                setSelectedContactId(null);
                                setShowContactDeals(false);
                              }
                            }}
                          >
                            <p className="text-sm font-medium">{contactDeal.name}</p>
                            {contactDeal.companies && (
                              <p className="text-xs text-muted-foreground">{contactDeal.companies.name}</p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {contactDeal.stage}
                              </Badge>
                              {contactDeal.amount && (
                                <span className="text-xs font-semibold">
                                  ${Number(contactDeal.amount).toLocaleString()}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg border-2 border-sky-100 hover:shadow-glow transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-sky-50 to-primary/5 border-b-2 border-sky-100 flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-bold text-primary flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Associated Companies
              </CardTitle>
              <LinkCompanyDialog 
                dealId={id!} 
                currentCompanyId={company?.id}
                onSuccess={() => fetchDealData()}
              >
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </LinkCompanyDialog>
            </CardHeader>
            <CardContent className="p-4">
              {company ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 border-2 border-transparent hover:border-primary/20 transition-all">
                    <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center ring-2 ring-primary/20">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{company.name}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">Primary Company</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {company.email && (
                      <div className="flex items-center justify-between group p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Mail className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium truncate">{company.email}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(company.email!);
                            toast({ title: "Copied!", description: "Email copied to clipboard" });
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                    {company.phone && (
                      <div className="flex items-center justify-between group p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-all">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium">{company.phone}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              navigator.clipboard.writeText(company.phone!);
                              toast({ title: "Copied!", description: "Phone copied to clipboard" });
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <ClickToCall 
                            phoneNumber={company.phone}
                            companyId={company.id}
                            dealId={id}
                            variant="ghost"
                            size="icon"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
                  <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground font-medium">No company assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reschedule Task Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Task</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-1">{selectedTask.title}</h4>
                {selectedTask.description && (
                  <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-due-date">New Due Date</Label>
                <Input
                  id="new-due-date"
                  type="datetime-local"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRescheduleTask}>
                  Reschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Task for Deal
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newTask.title) {
              toast({ title: "Error", description: "Task title is required", variant: "destructive" });
              return;
            }
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error("No authenticated user");

              const { data: profile } = await supabase
                .from('user_profiles')
                .select('id')
                .eq('user_id', user.id)
                .single();

              if (!profile) throw new Error("User profile not found");

              const { error } = await supabase
                .from('tasks')
                .insert({
                  title: newTask.title,
                  description: newTask.description || null,
                  priority: newTask.priority as 'high' | 'medium' | 'low',
                  due_date: newTask.due_date || null,
                  status: 'pending',
                  created_by: profile.id,
                  assigned_to: profile.id,
                  deal_id: id
                });

              if (error) throw error;

              toast({ title: "Task Created", description: "New task has been added to this deal" });
              setNewTask({ title: '', description: '', due_date: '', priority: 'medium' });
              setCreateTaskDialogOpen(false);
              
              // Refresh tasks
              const { data: allQueuedTasks } = await supabase
                .from('tasks')
                .select('*')
                .in('status', ['pending', 'in_progress'])
                .order('due_date', { ascending: true, nullsFirst: false })
                .order('created_at', { ascending: true });
              if (allQueuedTasks) setQueuedTasks(allQueuedTasks);
            } catch (error: any) {
              console.error('Error creating task:', error);
              toast({ title: "Error", description: error.message || "Failed to create task", variant: "destructive" });
            }
          }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="task-title">Task Title *</Label>
              <Input
                id="task-title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-description">Description</Label>
              <Input
                id="task-description"
                value={newTask.description}
                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                placeholder="Add more details..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="task-priority">Priority</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask({ ...newTask, priority: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="datetime-local"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Create Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Deal Sidebar Sheet */}
      <Sheet open={createDealSheetOpen} onOpenChange={setCreateDealSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Deal</SheetTitle>
            <SheetDescription>
              Create a new deal for {primaryContact?.first_name} {primaryContact?.last_name}
            </SheetDescription>
          </SheetHeader>
          <CreateDealForm 
            contactId={primaryContact?.id}
            onSuccess={async () => {
              setCreateDealSheetOpen(false);
              // Refresh contact deals list
              if (primaryContact?.id) {
                const { data } = await supabase
                  .from('deals')
                  .select('id, name, amount, stage, companies(name)')
                  .eq('primary_contact_id', primaryContact.id)
                  .order('created_at', { ascending: false });
                setContactDeals(data || []);
              }
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Transfer Pipeline Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Transfer to Different Pipeline
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Pipeline</Label>
              <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                {pipeline?.name || 'Not assigned'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Select New Pipeline *</Label>
              <Select value={selectedPipelineId} onValueChange={(value) => {
                setSelectedPipelineId(value);
                setSelectedStage(''); // Reset stage when pipeline changes
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.filter(p => p.id !== deal?.pipeline_id).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPipelineId && (
              <div className="space-y-2">
                <Label>Select Stage *</Label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const selectedPipeline = pipelines.find(p => p.id === selectedPipelineId);
                      const stages = selectedPipeline?.stages;
                      
                      if (!stages) return null;
                      
                      // Parse stages if it's a JSON string or array
                      let stageList: any[] = [];
                      if (typeof stages === 'string') {
                        try {
                          stageList = JSON.parse(stages);
                        } catch (e) {
                          console.error('Error parsing stages:', e);
                        }
                      } else if (Array.isArray(stages)) {
                        stageList = stages;
                      }
                      
                      return stageList.map((stage: any, index: number) => {
                        const stageName = typeof stage === 'string' ? stage : stage.name;
                        return (
                          <SelectItem key={index} value={stageName}>
                            {stageName}
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setTransferDialogOpen(false);
                  setSelectedPipelineId('');
                  setSelectedStage('');
                }}
                disabled={transferring}
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransferPipeline}
                disabled={!selectedPipelineId || !selectedStage || transferring}
              >
                {transferring ? 'Transferring...' : 'Transfer Deal'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Call Log Form - Opens after call ends or when manually triggered */}
      <CallLogForm
        open={callLogOpen}
        onOpenChange={(open) => {
          setCallLogOpen(open);
          if (!open) setPendingCallLog(null);
        }}
        callData={{
          phoneNumber: pendingCallLog?.phoneNumber || primaryContact?.phone || '',
          callId: pendingCallLog?.callId,
          startTime: pendingCallLog?.startTime,
          endTime: pendingCallLog?.endTime,
          duration: pendingCallLog?.duration,
          dealId: pendingCallLog?.dealId || id,
          contactId: pendingCallLog?.contactId || primaryContact?.id,
        }}
        onSubmit={() => {
          // Refresh data after logging
          fetchDealData();
        }}
      >
        {/* No trigger button - form opens programmatically */}
        <span style={{ display: 'none' }} />
      </CallLogForm>
    </div>
  );
}