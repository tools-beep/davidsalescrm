import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Search, CheckCircle2, X, Clock, Phone, Building2, User, Handshake, PlayCircle, Archive, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { NewTaskForm } from "@/components/tasks/NewTaskForm";
import { ClickToCall } from "@/components/calls/ClickToCall";
import { Link, useNavigate } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  due_date?: string;
  assigned_to?: string;
  created_at: string;
  deal_id?: string;
  contact_id?: string;
  company_id?: string;
  deals?: {
    id: string;
    name: string;
    stage: string;
    amount?: number;
  };
  contacts?: {
    id: string;
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
  };
  companies?: {
    id: string;
    name: string;
    phone?: string;
  };
}

const priorityColors = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
} as const;

const statusColors = {
  pending: "secondary",
  in_progress: "primary",
  completed: "success",
  cancelled: "destructive",
} as const;

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();

    // Set up real-time subscription for task changes
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        console.log('=== REAL-TIME TASK CHANGE DETECTED ===');
        console.log('Change type:', payload.eventType);
        console.log('Changed task:', payload.new || payload.old);
        console.log('Refreshing tasks...');
        fetchTasks();
      })
      .subscribe();

    console.log('Real-time subscription established for tasks');

    return () => {
      console.log('Cleaning up real-time subscription');
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      console.log('Fetching tasks...');
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          deals:deal_id (
            id,
            name,
            stage,
            amount
          ),
          contacts:contact_id (
            id,
            first_name,
            last_name,
            phone,
            email
          ),
          companies:company_id (
            id,
            name,
            phone
          )
        `)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      console.log('Tasks fetched:', data?.length);
      const cancelledCount = data?.filter(t => t.status === 'cancelled').length || 0;
      const inProgressCount = data?.filter(t => t.status === 'in_progress').length || 0;
      console.log('Cancelled tasks:', cancelledCount);
      console.log('In Progress tasks:', inProgressCount);

      setTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: newStatus as any,
          ...(newStatus === "completed" ? { completed_at: new Date().toISOString() } : {})
        })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, status: newStatus as any } : task
        )
      );

      toast.success(`Task marked as ${newStatus}`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: 'cancelled' as any })
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      toast.success("Task archived");
    } catch (error) {
      console.error("Error archiving task:", error);
      toast.error("Failed to archive task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to permanently delete this task?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
      toast.success("Task deleted");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  const filteredTasks = useMemo(() => {
    console.log('=== FILTERING TASKS ===');
    console.log('Active tab:', activeTab);
    console.log('Total tasks:', tasks.length);
    
    let filtered = tasks;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.deals?.name.toLowerCase().includes(searchLower) ||
          task.contacts?.first_name.toLowerCase().includes(searchLower) ||
          task.contacts?.last_name.toLowerCase().includes(searchLower) ||
          task.companies?.name.toLowerCase().includes(searchLower)
      );
    }

    if (activeTab === "overdue") {
      filtered = filtered.filter(
        (task) =>
          task.status !== "completed" &&
          task.due_date &&
          new Date(task.due_date) < new Date()
      );
    } else if (activeTab === "today") {
      const today = new Date().toDateString();
      filtered = filtered.filter(
        (task) =>
          task.status !== "completed" &&
          task.due_date &&
          new Date(task.due_date).toDateString() === today
      );
    } else if (activeTab === "in_progress") {
      // Queue tab - show only in_progress tasks
      console.log('Filtering for in_progress tasks');
      filtered = filtered.filter((task) => task.status === "in_progress");
    } else if (activeTab === "cancelled") {
      // Skipped tab - show only cancelled tasks
      console.log('Filtering for cancelled tasks');
      filtered = filtered.filter((task) => task.status === "cancelled");
      console.log('Cancelled tasks found:', filtered.length);
      if (filtered.length > 0) {
        console.log('Sample cancelled task:', filtered[0]);
      }
    } else if (activeTab !== "all") {
      filtered = filtered.filter((task) => task.status === activeTab);
    }

    console.log('Filtered tasks:', filtered.length);
    console.log('=== END FILTERING ===');

    return filtered;
  }, [tasks, searchTerm, activeTab]);

  const startTaskQueue = () => {
    setCurrentTaskIndex(0);
    setActiveTab("in_progress");
  };

  // Toggle task selection
  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // Select/deselect all tasks
  const toggleSelectAll = () => {
    if (selectedTasks.size === filteredTasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
    }
  };

  // Start queue with selected tasks
  const startSelectedQueue = async () => {
    if (selectedTasks.size === 0) {
      toast.error("Please select at least one task");
      return;
    }

    try {
      const selectedTasksArray = Array.from(selectedTasks);
      console.log('=== START QUEUE DEBUG ===');
      console.log('1. Selected task IDs:', selectedTasksArray);
      console.log('2. Total selected:', selectedTasksArray.length);
      
      // Get full task objects from filteredTasks (not tasks) to ensure we're getting the right ones
      const selectedTaskObjects = filteredTasks.filter(t => selectedTasks.has(t.id));
      console.log('3. Found task objects:', selectedTaskObjects.length);
      console.log('4. Task objects sample:', selectedTaskObjects.slice(0, 3).map(t => ({ 
        id: t.id, 
        title: t.title, 
        deal_id: t.deal_id,
        status: t.status 
      })));
      
      // Get the first task with a deal_id for navigation
      const tasksWithDeals = selectedTaskObjects.filter(task => task.deal_id);
      console.log('5. Tasks with deals:', tasksWithDeals.length);
      console.log('6. Tasks with deals sample:', tasksWithDeals.slice(0, 3).map(t => ({ 
        id: t.id, 
        deal_id: t.deal_id 
      })));

      if (tasksWithDeals.length === 0) {
        toast.error("Selected tasks don't have associated deals");
        return;
      }

      const firstTaskWithDeal = tasksWithDeals[0];
      console.log('7. First task with deal:', { id: firstTaskWithDeal.id, deal_id: firstTaskWithDeal.deal_id });
      
      // Update ALL selected tasks to "in_progress"
      console.log('8. Updating tasks in database...');
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: 'in_progress' })
        .in('id', selectedTasksArray)
        .select();

      console.log('9. Database update result:', { 
        updated_count: data?.length, 
        error: error,
        sample_updated: data?.slice(0, 3).map(t => ({ id: t.id, status: t.status }))
      });

      if (error) {
        console.error('Queue update error:', error);
        throw error;
      }

      // Clear selections after successful update
      setSelectedTasks(new Set());
      console.log('10. Cleared selections');

      // Refresh tasks to get updated statuses
      console.log('11. Refreshing tasks...');
      await fetchTasks();

      // Redirect to the first deal
      console.log('12. Navigating to deal:', firstTaskWithDeal.deal_id);
      navigate(`/deals/${firstTaskWithDeal.deal_id}`);
      toast.success(`Started queue with ${data?.length || selectedTasksArray.length} task${(data?.length || selectedTasksArray.length) > 1 ? 's' : ''}`);
      console.log('=== START QUEUE COMPLETE ===');
    } catch (error: any) {
      console.error('Error starting queue:', error);
      toast.error(error.message || "Failed to start queue");
    }
  };

  const handleTaskAction = async (action: "complete" | "skip" | "reschedule") => {
    const currentTask = filteredTasks[currentTaskIndex];
    
    if (action === "complete") {
      await updateTaskStatus(currentTask.id, "completed");
    } else if (action === "reschedule") {
      toast.info("Reschedule functionality coming soon");
    }

    if (currentTaskIndex < filteredTasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    } else {
      toast.success("All tasks completed!");
      setActiveTab("all");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3 md:p-6 space-y-4 md:space-y-6 bg-gradient-subtle">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage your tasks and follow up with deals
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {selectedTasks.size > 0 && activeTab !== "in_progress" && activeTab !== "cancelled" && (
            <Button onClick={startSelectedQueue} className="shadow-soft text-sm bg-green-600 hover:bg-green-700">
              <PlayCircle className="mr-2 h-4 w-4" />
              Start Queue ({selectedTasks.size})
            </Button>
          )}
          {activeTab !== "in_progress" && activeTab !== "cancelled" && selectedTasks.size === 0 && (
            <Button onClick={startTaskQueue} variant="outline" className="shadow-soft text-sm">
              <Clock className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Start Queue Mode</span>
              <span className="sm:hidden">Queue</span>
            </Button>
          )}
          <NewTaskForm onSuccess={fetchTasks}>
            <Button className="text-sm">
              <Calendar className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">New Task</span>
              <span className="sm:hidden">New</span>
            </Button>
          </NewTaskForm>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks, deals, contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="all" className="text-xs sm:text-sm">All Tasks</TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs sm:text-sm">Overdue</TabsTrigger>
          <TabsTrigger value="today" className="text-xs sm:text-sm">Today</TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs sm:text-sm">Queue</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs sm:text-sm">Skipped</TabsTrigger>
        </TabsList>

        <TabsContent value="in_progress" className="space-y-4">
          {filteredTasks.length > 0 && currentTaskIndex < filteredTasks.length ? (
            <Card className="shadow-elegant">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      Task {currentTaskIndex + 1} of {filteredTasks.length}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {filteredTasks[currentTaskIndex].title}
                    </CardDescription>
                  </div>
                  <Badge variant={priorityColors[filteredTasks[currentTaskIndex].priority as keyof typeof priorityColors]}>
                    {filteredTasks[currentTaskIndex].priority} priority
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {filteredTasks[currentTaskIndex].description && (
                  <p className="text-muted-foreground">
                    {filteredTasks[currentTaskIndex].description}
                  </p>
                )}

                {filteredTasks[currentTaskIndex].deals && (
                  <div className="p-4 bg-accent rounded-lg border space-y-2">
                    <div className="flex items-center space-x-2">
                      <Handshake className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Deal:</span>
                      <Link 
                        to={`/deals/${filteredTasks[currentTaskIndex].deals.id}`}
                        className="text-primary hover:underline"
                      >
                        {filteredTasks[currentTaskIndex].deals.name}
                      </Link>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span>Stage: {filteredTasks[currentTaskIndex].deals.stage}</span>
                      {filteredTasks[currentTaskIndex].deals.amount && (
                        <span>Value: ${filteredTasks[currentTaskIndex].deals.amount.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )}

                {filteredTasks[currentTaskIndex].contacts && (
                  <div className="p-4 bg-accent rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Contact:</span>
                        <span>
                          {filteredTasks[currentTaskIndex].contacts.first_name}{" "}
                          {filteredTasks[currentTaskIndex].contacts.last_name}
                        </span>
                      </div>
                      {filteredTasks[currentTaskIndex].contacts.phone && (
                        <ClickToCall 
                          phoneNumber={filteredTasks[currentTaskIndex].contacts.phone!}
                          contactId={filteredTasks[currentTaskIndex].contacts.id}
                          dealId={filteredTasks[currentTaskIndex].deals?.id}
                        />
                      )}
                    </div>
                    {filteredTasks[currentTaskIndex].contacts.email && (
                      <div className="text-sm text-muted-foreground">
                        Email: {filteredTasks[currentTaskIndex].contacts.email}
                      </div>
                    )}
                  </div>
                )}

                {filteredTasks[currentTaskIndex].companies && (
                  <div className="p-4 bg-accent rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Company:</span>
                        <span>{filteredTasks[currentTaskIndex].companies.name}</span>
                      </div>
                      {filteredTasks[currentTaskIndex].companies.phone && (
                        <ClickToCall 
                          phoneNumber={filteredTasks[currentTaskIndex].companies.phone!}
                          companyId={filteredTasks[currentTaskIndex].companies.id}
                          dealId={filteredTasks[currentTaskIndex].deals?.id}
                        />
                      )}
                    </div>
                  </div>
                )}

                {filteredTasks[currentTaskIndex].due_date && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Due: {new Date(filteredTasks[currentTaskIndex].due_date).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-4 border-t">
                  <Button
                    onClick={() => handleTaskAction("complete")}
                    className="flex-1 shadow-glow"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                  <Button
                    onClick={() => handleTaskAction("skip")}
                    variant="outline"
                    className="flex-1"
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={() => handleTaskAction("reschedule")}
                    variant="outline"
                    className="flex-1"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Reschedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">No tasks in queue</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {["all", "overdue", "today", "cancelled"].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {/* Select All Checkbox */}
            {filteredTasks.length > 0 && (
              <Card className="p-4 bg-blue-50/50 dark:bg-blue-900/20 border-blue-200">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all"
                    checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All ({filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''})
                  </label>
                  {selectedTasks.size > 0 && (
                    <span className="text-sm text-blue-600 dark:text-blue-400 ml-auto">
                      {selectedTasks.size} selected
                    </span>
                  )}
                </div>
              </Card>
            )}
            
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <Card key={task.id} className={`shadow-soft hover:shadow-medium transition-shadow ${selectedTasks.has(task.id) ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`task-${task.id}`}
                        checked={selectedTasks.has(task.id)}
                        onCheckedChange={() => toggleTaskSelection(task.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{task.title}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={statusColors[task.status as keyof typeof statusColors]}>
                          {task.status}
                        </Badge>
                        <Badge variant={priorityColors[task.priority as keyof typeof priorityColors]}>
                          {task.priority}
                        </Badge>
                      </div>
                    </div>
                    {task.description && (
                          <CardDescription className="mt-2">{task.description}</CardDescription>
                    )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {task.deals && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Handshake className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Deal:</span>
                        <Link 
                          to={`/deals/${task.deals.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {task.deals.name}
                        </Link>
                        <span className="text-muted-foreground">
                          ({task.deals.stage})
                        </span>
                      </div>
                    )}

                    {task.contacts && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Contact:</span>
                          <span className="font-medium">
                            {task.contacts.first_name} {task.contacts.last_name}
                          </span>
                        </div>
                        {task.contacts.phone && (
                          <ClickToCall 
                            phoneNumber={task.contacts.phone}
                            contactId={task.contacts.id}
                            dealId={task.deals?.id}
                          />
                        )}
                      </div>
                    )}

                    {task.companies && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Company:</span>
                        <span className="font-medium">{task.companies.name}</span>
                      </div>
                    )}

                    {task.due_date && (
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(task.due_date).toLocaleString()}</span>
                      </div>
                    )}

                    {task.status !== "completed" && (
                      <div className="flex items-center justify-between space-x-2 pt-2 border-t">
                        <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => updateTaskStatus(task.id, "completed")}
                          size="sm"
                          className="shadow-glow"
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Complete
                        </Button>
                        <Button
                          onClick={() => updateTaskStatus(task.id, "in_progress")}
                          size="sm"
                          variant="outline"
                        >
                          In Progress
                        </Button>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            onClick={() => handleArchiveTask(task.id)}
                            size="sm"
                            variant="ghost"
                            title="Archive task"
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteTask(task.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete task permanently"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">No tasks found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
