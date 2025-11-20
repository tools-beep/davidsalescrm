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
  ArrowRightLeft
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCTIStore } from "@/components/calls/DialpadCTIManager";

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
  const [showContactDeals, setShowContactDeals] = useState(false); // Show/hide contact deals list
  const [createDealSheetOpen, setCreateDealSheetOpen] = useState(false); // Create deal sidebar
  
  // Inline editing state
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState<any>('');
  const [isSaving, setIsSaving] = useState(false);
  
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
  }, [id]);

  // Fetch users with Rep, Manager, or Admin roles
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email, role')
        .in('role', ['rep', 'manager', 'admin'])
        .eq('is_active', true)
        .order('first_name');
      
      if (data) setUsers(data);
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
    setFieldValue(currentValue || '');
  };

  const handleSaveField = async (fieldName: string, value: any, table: 'deals' | 'contacts' = 'deals') => {
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const recordId = table === 'deals' ? id : selectedContactId;
      
      const { error } = await supabase
        .from(table)
        .update({ [fieldName]: value || null })
        .eq('id', recordId!);

      if (error) throw error;

      // Update local state
      if (table === 'deals') {
        setDeal({ ...deal, [fieldName]: value });
      } else {
        setPrimaryContact({ ...primaryContact, [fieldName]: value });
      }

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
    const user = users.find(u => u.user_id === userId);
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
    table: 'deals' | 'contacts' = 'deals'
  ) => {
    const isEditing = editingField === fieldName;
    
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">{label}</Label>
        {isEditing ? (
          <div className="relative">
            {type === 'user' ? (
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
                  <SelectValue>
                    {fieldValue ? getUserDisplayName(fieldValue) : 'Not assigned'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not assigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email}
                      <span className="text-xs text-muted-foreground ml-2">({user.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            className="text-sm font-semibold cursor-pointer hover:bg-accent/50 p-2 rounded border border-transparent hover:border-border transition-all group"
            onClick={() => handleStartEdit(fieldName, currentValue)}
            title="Click to edit"
          >
            <div className="flex items-center justify-between">
              <span>
                {type === 'user' ? getUserDisplayName(currentValue) : (currentValue || 'Not set')}
              </span>
              <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/deals")}
            className="hover:scale-105 transition-transform"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {viewMode === 'contact' && selectedContactId && primaryContact
                ? `${primaryContact.first_name} ${primaryContact.last_name}`
                : deal.name}
            </h1>
            <p className="text-muted-foreground flex items-center">
              <Building2 className="h-4 w-4 mr-1" />
              {viewMode === 'contact' ? 'Contact Information' : (company?.name || 'No company')}
            </p>
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
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
            <Calendar className="mr-2 h-4 w-4" />
            Meeting
          </Button>
          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
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
            <Card className="shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
              <CardHeader className="bg-gradient-secondary">
                <CardTitle className="text-lg text-primary">Deal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
                {/* 1. Deal Name */}
                {renderEditableField('name', 'Deal Name', deal.name, 'text')}

                <Separator />

                {/* 2. Deal Stage */}
                {renderEditableField('stage', 'Deal Stage', deal.stage, 'select', [
                  'uncontacted',
                  'no answer/gatekeeper',
                  'dm connected',
                  'discovery',
                  'strategy call booked',
                  'strategy call attended',
                  'nurturing',
                  'business audit booked',
                  'business audit attended',
                  'candidate interview booked',
                  'candidate interview attended',
                  'awaiting docs/signature',
                  'deal won',
                  'not interested',
                  'not qualified / disqualified',
                  'do not call'
                ])}

                <Separator />

                {/* 3. Deal Description */}
                {renderEditableField('description', 'Deal Description', deal.description || '', 'textarea')}

                <Separator />

                {/* 4. Annual Revenue */}
                {renderEditableField('annual_revenue', 'Annual Revenue', deal.annual_revenue || 'Not set', 'select', ['<100k', '100-250k', '251-500k', '500k-1M', '1M+'])}

                <Separator />

                {/* 5. Priority */}
                {renderEditableField('priority', 'Priority', deal.priority, 'select', ['low', 'medium', 'high'])}

                <Separator />

                {/* 6. Product Segment */}
                {renderEditableField('product_segment', 'Product Segment', deal.product_segment || 'Not set', 'multiselect', [
                  'Remote Operator',
                  'Website',
                  'WebApp',
                  'AI Adoption',
                  'Consulting'
                ])}

                <Separator />

                {/* 7. Deal Source */}
                {renderEditableField('source', 'Deal Source', deal.source || 'Not set', 'select', leadSources)}

                <Separator />

                {/* 8. Deal Owner */}
                {renderEditableField('deal_owner_id', 'Deal Owner', deal.deal_owner_id, 'user')}

                <Separator />

                {/* 9. Sales Development Representative */}
                {renderEditableField('setter_id', 'Sales Development Representative', deal.setter_id, 'user')}

                <Separator />

                {/* 10. Account Manager */}
                {renderEditableField('account_manager_id', 'Account Manager', deal.account_manager_id, 'user')}

                <Separator />

                {/* 11. Assigned Operator */}
                {renderEditableField('assigned_operator', 'Assigned Operator', deal.assigned_operator || 'Not assigned', 'text')}

                <Separator />

                {/* 12. Currency */}
                {renderEditableField('currency', 'Currency', deal.currency || 'USD', 'select', ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])}

                <Separator />

                {/* 13. Time Zone */}
                {renderEditableField('timezone', 'Time Zone', deal.timezone || 'America/New_York', 'select', timezoneOptions)}

                <Separator />

                {/* 14. Deal Notes (Also shown in Notes tab) */}
                {renderEditableField('notes', 'Deal Notes', deal.notes || '', 'textarea')}

                <Separator />

                {/* 15. Referral Source */}
                {renderEditableField('referral_source', 'Referral Source', deal.referral_source || 'Not set', 'text')}

                <Separator />

                {/* 16. Expected Close Date */}
                {renderEditableField('close_date', 'Expected Close Date', deal.close_date ? new Date(deal.close_date).toISOString().split('T')[0] : '', 'date')}

                <Separator />

                {/* 17. City/Region */}
                {renderEditableField('city', 'City/Region', deal.city || 'Not set', 'text')}

                <Separator />

                {/* 18. State/Region */}
                {renderEditableField('state', 'State/Region', deal.state || 'Not set', 'text')}

                <Separator />

                {/* 19. Country */}
                {renderEditableField('country', 'Country', deal.country || 'Not set', 'text')}

                <Separator />

                {/* 20. Last Activity Date (Read Only) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Last Activity Date</Label>
                  <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    {deal.last_activity_date ? new Date(deal.last_activity_date).toLocaleString() : 'No activity yet'}
                  </p>
                </div>
            </CardContent>
          </Card>
          )}
        </div>

        {/* Center Content - Activities */}
        <div className="col-span-6 animate-fade-in">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <Card className="shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
              <CardHeader className="bg-gradient-secondary">
                <TabsList className="bg-white shadow-soft">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">Overview</TabsTrigger>
                  <TabsTrigger value="activity" className="data-[state=active]:bg-primary data-[state=active]:text-white">Activity</TabsTrigger>
                  <TabsTrigger value="notes" className="data-[state=active]:bg-primary data-[state=active]:text-white">Notes</TabsTrigger>
                  <TabsTrigger value="calls" className="data-[state=active]:bg-primary data-[state=active]:text-white">Calls</TabsTrigger>
                  <TabsTrigger value="emails" className="data-[state=active]:bg-primary data-[state=active]:text-white">Emails</TabsTrigger>
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
          <Card className="shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
            <CardHeader className="bg-gradient-secondary flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-primary">Associated Contacts</CardTitle>
              <ContactForm onSuccess={() => fetchDealData()}>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </ContactForm>
            </CardHeader>
            <CardContent>
              {primaryContact ? (
                <div className="space-y-3">
                  <div 
                    className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-lg transition-colors"
                    onClick={() => handleViewContact(primaryContact.id)}
                    title="Click to view contact details"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {primaryContact.first_name?.[0]}{primaryContact.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-primary hover:underline">
                        {primaryContact.first_name} {primaryContact.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">Primary Contact</p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {primaryContact.email && (
                      <div className="flex items-center">
                        <Mail className="h-3 w-3 mr-2" />
                        {primaryContact.email}
                      </div>
                    )}
                    {primaryContact.phone && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Phone className="h-3 w-3 mr-2" />
                          {primaryContact.phone}
                        </div>
                        <ClickToCall 
                          phoneNumber={primaryContact.phone}
                          contactId={primaryContact.id}
                          dealId={id}
                          variant="ghost"
                          size="icon"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No primary contact assigned
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contact Actions Card - Separate Card for View Deals and Create New Deal */}
          {primaryContact && (
            <Card className="shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
              <CardHeader className="bg-gradient-secondary">
                <CardTitle className="text-lg text-primary">Contact Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowContactDeals(!showContactDeals)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showContactDeals ? 'Hide' : 'View'} Deals ({contactDeals.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start"
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

          <Card className="shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
            <CardHeader className="bg-gradient-secondary flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-primary">Associated Companies</CardTitle>
              <CompanyForm onSuccess={() => fetchDealData()}>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </CompanyForm>
            </CardHeader>
            <CardContent>
              {company ? (
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-muted rounded flex items-center justify-center">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{company.name}</p>
                    <p className="text-xs text-muted-foreground">Primary</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No company assigned
                </p>
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