import { useState, useEffect } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  ListTodo
} from "lucide-react";
import { CallLogForm } from "@/components/calls/CallLogForm";
import { ClickToCall } from "@/components/calls/ClickToCall";
import { CallHistory } from "@/components/calls/CallHistory";
import { NotesEditor } from "@/components/deals/NotesEditor";
import { EmailManager } from "@/components/deals/EmailManager";
import { MeetingManager } from "@/components/deals/MeetingManager";
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
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  const leadSources = ['Website','Referral','LinkedIn','Cold Outbound','Webinar','Email','Other'];
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
      
      // Multiple attempts to ensure the dialog opens
      const openDialog = () => {
        setCallLogOpen(true);
        setActiveTab('calls');
        console.log('✅ Call log form opened, switched to calls tab');
      };
      
      // Immediate open
      openDialog();
      
      // Backup: Try again after a short delay in case of race conditions
      setTimeout(() => {
        if (!callLogOpen) {
          console.log('🔄 Retrying to open call log form (backup)');
          openDialog();
        }
      }, 300);
    };

    // Listen for the custom event
    window.addEventListener('dialpad:call:ended' as any, handleCallEnded);
    
    // Also set up the callback for backward compatibility
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
  }, [setCallEndCallback, setActiveTab, callLogOpen]);

  useEffect(() => {
    const fetchDealData = async () => {
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
    };

    fetchDealData();
  }, [id, navigate, toast]);

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
              {deal.name}
            </h1>
            <p className="text-muted-foreground flex items-center">
              <Building2 className="h-4 w-4 mr-1" />
              {company?.name || 'No company'}
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
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-sm">Task Queue</h3>
                <Badge variant="secondary" className="ml-2">
                  {queuedTasks.filter(t => t.deal_id === id).length} task{queuedTasks.filter(t => t.deal_id === id).length !== 1 ? 's' : ''} for this deal
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {queuedTasks.length} total in queue
                </Badge>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {queuedTasks.filter(t => t.deal_id === id).map((task, index) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-blue-100 hover:border-blue-300 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{index + 1}</Badge>
                      <h4 className="font-medium text-sm truncate">{task.title}</h4>
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
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
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRescheduleDialog(task)}
                      title="Reschedule task"
                      className="h-8"
                    >
                      <CalendarClock className="h-3 w-3 mr-1" />
                      Reschedule
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSkipTask(task)}
                      title="Skip this task"
                      className="h-8"
                    >
                      <SkipForward className="h-3 w-3 mr-1" />
                      Skip
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleCompleteTask(task)}
                      title="Mark as complete"
                      className="h-8 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Three-column layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar - Deal Info */}
        <div className="col-span-3 space-y-4 animate-scale-in">
          <Card className="shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
            <CardHeader className="bg-gradient-secondary">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-primary">Deal Information</CardTitle>
                {!isEditingDeal ? (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleEditDeal}
                    className="hover:bg-primary/10"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSaveDeal}
                      className="hover:bg-green-500/10 text-green-600"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCancelEdit}
                      className="hover:bg-red-500/10 text-red-600"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Deal Name */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Deal Name</Label>
                {isEditingDeal ? (
                  <Input
                    value={editedDeal.name || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, name: e.target.value })}
                    placeholder="Deal name"
                  />
                ) : (
                  <p className="text-sm font-semibold">{deal.name}</p>
                )}
              </div>

              <Separator />

              {/* Amount */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount</Label>
                {isEditingDeal ? (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <Input
                      type="number"
                      value={editedDeal.amount || ''}
                      onChange={(e) => setEditedDeal({ ...editedDeal, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span className="font-semibold">
                      ${deal.amount ? Number(deal.amount).toLocaleString() : '0'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Stage */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Stage</Label>
                {isEditingDeal ? (
                  <Select
                    value={editedDeal.stage}
                    onValueChange={(value) => setEditedDeal({ ...editedDeal, stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not contacted">Not Contacted</SelectItem>
                      <SelectItem value="no answer / gatekeeper">No Answer / Gatekeeper</SelectItem>
                      <SelectItem value="decision maker">Decision Maker</SelectItem>
                      <SelectItem value="nurturing">Nurturing</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="strategy call booked">Strategy Call Booked</SelectItem>
                      <SelectItem value="strategy call attended">Strategy Call Attended</SelectItem>
                      <SelectItem value="proposal / scope">Proposal / Scope</SelectItem>
                      <SelectItem value="closed won">Closed Won</SelectItem>
                      <SelectItem value="closed lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={stageColors[deal.stage as keyof typeof stageColors] || "secondary"}>
                    {deal.stage}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Close Date */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Close Date</Label>
                {isEditingDeal ? (
                  <Input
                    type="date"
                    value={editedDeal.close_date || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, close_date: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {deal.close_date ? new Date(deal.close_date).toLocaleDateString() : 'Not set'}
                  </p>
                )}
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                {isEditingDeal ? (
                  <Select
                    value={editedDeal.priority}
                    onValueChange={(value) => setEditedDeal({ ...editedDeal, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{deal.priority}</Badge>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                {isEditingDeal ? (
                  <Select
                    value={editedDeal.deal_status}
                    onValueChange={(value) => setEditedDeal({ ...editedDeal, deal_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={deal.deal_status === 'open' ? 'default' : 'secondary'}>
                    {deal.deal_status}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">About this deal</Label>
                {isEditingDeal ? (
                  <Textarea
                    value={editedDeal.description || ''}
                    onChange={(e) => setEditedDeal({ ...editedDeal, description: e.target.value })}
                    placeholder="Deal description"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {deal.description || 'No description provided'}
                  </p>
                )}
              </div>

              <Separator />

              {/* Location Fields */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Country</Label>
                  {isEditingDeal ? (
                    <Input
                      value={editedDeal.country || ''}
                      onChange={(e) => setEditedDeal({ ...editedDeal, country: e.target.value })}
                      placeholder="e.g., USA"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {deal.country || 'Not set'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">State</Label>
                  {isEditingDeal ? (
                    <Input
                      value={editedDeal.state || ''}
                      onChange={(e) => setEditedDeal({ ...editedDeal, state: e.target.value })}
                      placeholder="e.g., California"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {deal.state || 'Not set'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">City</Label>
                  {isEditingDeal ? (
                    <Input
                      value={editedDeal.city || ''}
                      onChange={(e) => setEditedDeal({ ...editedDeal, city: e.target.value })}
                      placeholder="e.g., Los Angeles"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {deal.city || 'Not set'}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Time Zone</span>
                  <p className="text-sm text-muted-foreground">{deal.timezone?.replace('UTC','PST') || 'PST'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Vertical</span>
                  {editingVertical ? (
                    <Select
                      value={deal.vertical || undefined}
                      onValueChange={async (value) => {
                        const previous = deal.vertical;
                        setDeal({ ...deal, vertical: value });
                        try {
                          const { error } = await supabase
                            .from('deals')
                            .update({ vertical: value as any })
                            .eq('id', id!);
                          if (error) {
                            setDeal({ ...deal, vertical: previous });
                            throw error;
                          }
                          toast({ title: 'Vertical updated' });
                        } catch (e) {
                          console.error(e);
                          toast({ title: 'Failed to update vertical', variant: 'destructive' });
                        }
                        setEditingVertical(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={deal.vertical || 'Select vertical'} />
                      </SelectTrigger>
                      <SelectContent>
                        {verticalOptions.map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{deal.vertical || 'Not set'}</p>
                      <Button variant="ghost" size="sm" onClick={() => setEditingVertical(true)}>Edit</Button>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Lead Source</span>
                  {editingLeadSource ? (
                    <Select
                      defaultValue={deal.source || undefined}
                      onValueChange={async (value) => {
                        try {
                          const { error } = await supabase
                            .from('deals')
                            .update({ source: value })
                            .eq('id', id!);
                          if (!error) setDeal({ ...deal, source: value });
                        } catch (e) { console.error(e); }
                        setEditingLeadSource(false);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={deal.source || 'Select source'} />
                      </SelectTrigger>
                      <SelectContent>
                        {leadSources.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">{deal.source || 'Not set'}</p>
                      <Button variant="ghost" size="sm" onClick={() => setEditingLeadSource(true)}>Edit</Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <MeetingManager 
                      dealId={id!} 
                      contactId={primaryContact?.id} 
                      companyId={company?.id} 
                    />
                  </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Recent Activity</h3>
                    <CallLogForm 
                      onSubmit={handleCallLogged}
                      open={callLogOpen}
                      onOpenChange={setCallLogOpen}
                    >
                      <Button size="sm">
                        <Phone className="mr-2 h-4 w-4" />
                        Log Call
                      </Button>
                    </CallLogForm>
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
                    <CallLogForm 
                      onSubmit={handleCallLogged}
                      open={callLogOpen}
                      onOpenChange={setCallLogOpen}
                    >
                      <Button size="sm">
                        <Phone className="mr-2 h-4 w-4" />
                        Log Call
                      </Button>
                    </CallLogForm>
                  </div>
                  <CallHistory 
                    contactId={primaryContact?.id} 
                    dealId={id} 
                    limit={20}
                  />
                </TabsContent>

                <TabsContent value="notes" className="space-y-4">
                  <NotesEditor dealId={id!} />
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
            <CardHeader className="bg-gradient-secondary">
              <CardTitle className="text-lg text-primary">Associated Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {primaryContact ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {primaryContact.first_name?.[0]}{primaryContact.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {primaryContact.first_name} {primaryContact.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">Primary Contact</p>
                    </div>
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

          <Card className="shadow-medium border-sky-100 hover:shadow-glow transition-all duration-300">
            <CardHeader className="bg-gradient-secondary">
              <CardTitle className="text-lg text-primary">Associated Companies</CardTitle>
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

          {/* Quick Call History in Sidebar */}
          {primaryContact && (
            <CallHistory 
              contactId={primaryContact.id} 
              dealId={id} 
              limit={5}
            />
          )}
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
    </div>
  );
}