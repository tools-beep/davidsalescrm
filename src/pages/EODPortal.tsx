import { useEffect, useState, useRef, Fragment, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Clock, LogOut, Upload, Play, Square, Trash2, Link as LinkIcon, Image as ImageIcon, Search, History, Edit2, Check, X, MessageSquare, Settings, Eye, EyeOff, Key, ChevronDown, Pause, Globe, Menu, ListPlus, List, Bell, AlertCircle, MessageCircle, FileText, CheckCircle2, LayoutDashboard, Activity, Plus, RotateCcw, Edit3, Calendar, CalendarClock, Users, Tag } from "lucide-react";
import { EODMessaging } from "@/components/eod/EODMessaging";
import { EODHistoryList } from "@/components/eod/EODHistoryList";
import { EODHistoryCalendarFilter } from "@/components/eod/EODHistoryCalendarFilter";
import { InvoiceGenerator } from "@/components/invoices/InvoiceGenerator";
import { TaskSettingsModal, TaskSettings } from "@/components/tasks/TaskSettingsModal";
import { MoodCheckPopup } from "@/components/checkins/MoodCheckPopup";
import { EnergyCheckPopup } from "@/components/checkins/EnergyCheckPopup";
import { useSurveySafe } from "@/contexts/SurveyContext";
import { formatTimeEST, formatDateTimeEST, formatDateEST, nowEST, getDateKeyEST, startOfDayEST, endOfDayEST } from "@/utils/timezoneUtils";
import {
  calculateTimeBasedEfficiency,
  calculatePriorityCompletion,
  calculateEstimationAccuracyCompletion,
  calculateEnhancedCompletion,
  calculateEnhancedFocusScore,
  calculateEnhancedVelocity,
  calculateEnhancedRhythm,
  calculateEnhancedEnergy,
  calculateEnhancedUtilization,
  calculateEnhancedMomentum,
  calculateEnhancedConsistency,
  findPeakHour,
} from "@/utils/enhancedMetrics";
import { TaskEnjoymentPopup } from "@/components/checkins/TaskEnjoymentPopup";
import { initializeAudio, playNotificationSound } from "@/utils/notificationSound";
import { analyzeBehaviorPatterns } from "@/utils/behaviorAnalysis";
import { saveSmartDARSnapshot } from "@/utils/snapshotService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateCreatorForm } from "@/components/templates/TemplateCreatorForm";
import SmartDARDashboard from "@/pages/SmartDARDashboard";
import SmartDARHowItWorks from "@/components/dashboard/SmartDARHowItWorks";
import { ClockInModal } from "@/components/modals/ClockInModal";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { PointsBadge } from "@/components/points/PointsBadge";

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
  task_type?: string | null;
  goal_duration_minutes?: number | null;
  task_intent?: string | null;
  task_categories?: string[] | null;
  task_enjoyment?: number | null;
  task_priority?: string | null;
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

// 🎨 LUXURY MACAROON COLOR PALETTE (Premium, Rich Pastels)
const PASTEL_COLORS = {
  // Primary Macaroon Pastels (Rich & Soft)
  lavenderCloud: '#D8C8FF',
  blushPink: '#F8D6E0',
  honeyButter: '#FFE9B5',
  pistachioCream: '#CFF5D6',
  blueberryMilk: '#BFD9FF',
  peachSouffle: '#FBC7A7',
  mintMatcha: '#D6F7E2',
  
  // Accent Pastels (Buttons & Highlights)
  softPlum: '#A08CD9',
  roseLatte: '#E3A5C7',
  honeyGlow: '#F8C97F',
  oceanMist: '#8DB7E3',
  
  // Glass & Backgrounds
  cardGlass: 'rgba(255, 255, 255, 0.85)',
  white: '#FFFFFF',
  pageGradient: 'linear-gradient(135deg, #F8EFFF 0%, #FDF8FF 40%, #FFF9F3 100%)',
  
  // Text Colors
  darkText: '#2A2A2A',
  mutedText: '#6F6F6F',
  honeyText: '#7A5D00',
  pistachioText: '#0A7A32',
  peachText: '#7A3F1E',
  lavenderText: '#4A3F7A',
  roseText: '#7A3040',
  
  // Borders & Shadows
  border: 'rgba(0,0,0,0.06)',
  glassBorder: 'rgba(255,255,255,0.4)',
  shadowSoft: '0 4px 12px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)',
  shadowInset: 'inset 0 1px 4px rgba(0,0,0,0.04)',
  sidebarShadow: '4px 0 16px rgba(0,0,0,0.03)',
  shadow: '0 4px 12px rgba(0,0,0,0.04), 0 12px 24px rgba(0,0,0,0.06)', // Alias for shadowSoft
  
  // Premium Gradients
  activeTaskGradient: 'linear-gradient(120deg, #BFD9FF, #D8C8FF)',
  templateGradient: 'linear-gradient(135deg, #FFF4D9, #FFE9B5)',
  templateGradientAlt: 'linear-gradient(135deg, #F8D6E0, #FCEFF4)',
  sidebarActiveGradient: 'linear-gradient(135deg, #D8C8FF, #E8DDFF)',
  submitButtonGradient: 'linear-gradient(135deg, #8E7AB5, #A08CD9)', // Darker muted purple
  
  // Additional Color Aliases (for compatibility)
  lavender: '#D8C8FF', // Alias for lavenderCloud
  blue: '#BFD9FF', // Alias for blueberryMilk
  pink: '#F8D6E0', // Alias for blushPink
};

const normalizePriorityKey = (value?: string | null) => {
  if (!value) return "uncategorized";
  const cleaned = value.toString().trim().toLowerCase().replace(/\s+/g, "_");
  switch (cleaned) {
    case "immediate_impact":
    case "immediate_impact_task":
    case "critical_task":
      return "immediate_impact";
    case "daily":
    case "daily_task":
      return "daily";
    case "weekly":
    case "weekly_task":
      return "weekly";
    case "monthly":
    case "monthly_task":
      return "monthly";
    case "evergreen":
    case "evergreen_task":
      return "evergreen";
    case "trigger_based":
    case "trigger_task":
      return "trigger_based";
    default:
      return "uncategorized";
  }
};

const PRIORITY_GROUPS = [
  {
    key: "immediate_impact",
    label: "Immediate Impact Tasks",
    description: "Critical client escalations and blockers that must be handled now.",
    accent: "#F28B82",
  },
  {
    key: "daily",
    label: "Daily Tasks",
    description: "High-frequency routines that keep operations flowing every day.",
    accent: "#FCD34D",
  },
  {
    key: "weekly",
    label: "Weekly Tasks",
    description: "Cadence-based work such as reporting, reviews, or pipeline grooming.",
    accent: "#93C5FD",
  },
  {
    key: "monthly",
    label: "Monthly Tasks",
    description: "Monthly planning, invoicing, or cadence reviews.",
    accent: "#C4B5FD",
  },
  {
    key: "evergreen",
    label: "Evergreen Tasks",
    description: "Always-on initiatives without a fixed deadline.",
    accent: "#86EFAC",
  },
  {
    key: "trigger_based",
    label: "Trigger Tasks",
    description: "Reactive work kicked off when specific events happen.",
    accent: "#FBCFE8",
  },
  {
    key: "uncategorized",
    label: "Uncategorized",
    description: "Templates that do not yet have a default priority.",
    accent: "#E5E7EB",
  },
] as const;

// Helper function to format DATE fields (YYYY-MM-DD) without timezone conversion
const formatDateOnly = (dateString: string | null, format: 'short' | 'long' = 'short') => {
  if (!dateString) return null;
  
  // Parse the date string as-is (YYYY-MM-DD)
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  
  if (format === 'long') {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Embedded Recurring Tasks Library Component
function RecurringTasksLibraryEmbed() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  
  // Available filter options
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [availablePriorities, setAvailablePriorities] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [templates, searchTerm, userFilter, priorityFilter, categoryFilter]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      
      // Verify admin access
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        toast({ title: 'Access Denied', description: 'Admin access required', variant: 'destructive' });
        return;
      }

      // Fetch all templates (without join)
      const { data: templatesData, error: templatesError } = await (supabase as any)
        .from('recurring_task_templates')
        .select('*')
        .order('updated_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch all user profiles separately
      const { data: usersData, error: usersError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name, email');

      if (usersError) throw usersError;

      // Create a map of user_id to user info
      const usersMap = new Map();
      usersData?.forEach((u: any) => {
        usersMap.set(u.user_id, u);
      });

      // Merge templates with user info
      const mergedData = templatesData?.map((template: any) => ({
        ...template,
        user_profiles: usersMap.get(template.user_id) || null
      })) || [];

      setTemplates(mergedData);
      
      // Extract unique values for filters
      extractFilterOptions(mergedData);
      
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({ 
        title: 'Failed to load templates', 
        description: error.message, 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const extractFilterOptions = (data: any[]) => {
    // Extract unique users
    const users = new Map<string, { id: string; name: string; email: string }>();
    data.forEach(template => {
      if (template.user_profiles) {
        const name = `${template.user_profiles.first_name || ''} ${template.user_profiles.last_name || ''}`.trim() || 'Unknown';
        users.set(template.user_id, {
          id: template.user_id,
          name,
          email: template.user_profiles.email || ''
        });
      }
    });
    setAvailableUsers(Array.from(users.values()));

    // Extract unique priorities
    const priorities = new Set<string>();
    data.forEach(template => {
      if (template.default_priority) {
        priorities.add(template.default_priority);
      }
    });
    setAvailablePriorities(Array.from(priorities).sort());

    // Extract unique categories
    const categories = new Set<string>();
    data.forEach(template => {
      if (template.default_categories) {
        template.default_categories.forEach((cat: string) => categories.add(cat));
      }
    });
    setAvailableCategories(Array.from(categories).sort());
  };

  const applyFilters = () => {
    let filtered = [...templates];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(template => 
        template.template_name.toLowerCase().includes(search) ||
        template.description.toLowerCase().includes(search) ||
        template.user_profiles?.first_name?.toLowerCase().includes(search) ||
        template.user_profiles?.last_name?.toLowerCase().includes(search) ||
        template.user_profiles?.email?.toLowerCase().includes(search)
      );
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(template => template.user_id === userFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(template => template.default_priority === priorityFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(template => 
        template.default_categories?.includes(categoryFilter)
      );
    }

    setFilteredTemplates(filtered);
  };

  const getPriorityBadgeColor = (priority: string | null) => {
    if (!priority) return 'bg-gray-100 text-gray-600';
    
    const colors: Record<string, string> = {
      'immediate_impact': 'bg-red-100 text-red-700',
      'daily': 'bg-blue-100 text-blue-700',
      'weekly': 'bg-purple-100 text-purple-700',
      'monthly': 'bg-green-100 text-green-700',
      'evergreen': 'bg-teal-100 text-teal-700',
      'trigger_based': 'bg-orange-100 text-orange-700',
    };
    
    return colors[priority] || 'bg-gray-100 text-gray-600';
  };

  const getPriorityDisplayName = (priority: string | null) => {
    if (!priority) return 'None';
    
    const names: Record<string, string> = {
      'immediate_impact': 'Immediate Impact',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'evergreen': 'Evergreen',
      'trigger_based': 'Trigger Tasks',
    };
    
    return names[priority] || priority;
  };

  const viewDetails = (template: any) => {
    setSelectedTemplate(template);
    setDetailsDialogOpen(true);
  };

  const getUserName = (template: any) => {
    if (!template.user_profiles) return 'Unknown User';
    const { first_name, last_name } = template.user_profiles;
    return `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <CalendarClock className="h-8 w-8" style={{ color: PASTEL_COLORS.lavenderText }} />
            Recurring Tasks Library
          </h1>
          <p className="text-gray-600 mt-1">View all users' recurring task templates</p>
        </div>
        <Badge 
          variant="outline" 
          className="text-lg px-4 py-2"
          style={{ 
            backgroundColor: PASTEL_COLORS.lavenderMist,
            color: PASTEL_COLORS.lavenderText,
            borderColor: PASTEL_COLORS.lavenderCloud
          }}
        >
          {filteredTemplates.length} Template{filteredTemplates.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Filters Card */}
      <Card style={{ 
        borderRadius: '20px', 
        boxShadow: PASTEL_COLORS.shadowMedium,
        border: 'none'
      }}>
        <CardHeader style={{ 
          background: `linear-gradient(135deg, ${PASTEL_COLORS.lavenderMist} 0%, ${PASTEL_COLORS.skyBreeze} 100%)`,
          borderRadius: '20px 20px 0 0'
        }}>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Search className="h-4 w-4" />
                Search
              </label>
              <Input
                placeholder="Template name, user, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="rounded-xl"
              />
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Users className="h-4 w-4" />
                User
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between rounded-xl"
                  >
                    {userFilter === "all" 
                      ? "All Users" 
                      : availableUsers.find(u => u.id === userFilter)?.name || "Select user..."}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandEmpty>No user found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      <CommandItem
                        value="all"
                        onSelect={() => setUserFilter("all")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            userFilter === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Users
                      </CommandItem>
                      {availableUsers.map(user => (
                        <CommandItem
                          key={user.id}
                          value={`${user.name} ${user.email}`}
                          onSelect={() => setUserFilter(user.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              userFilter === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {user.name} ({user.email})
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Priority
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between rounded-xl"
                  >
                    {priorityFilter === "all" 
                      ? "All Priorities" 
                      : getPriorityDisplayName(priorityFilter)}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search priorities..." />
                    <CommandEmpty>No priority found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      <CommandItem
                        value="all"
                        onSelect={() => setPriorityFilter("all")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            priorityFilter === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Priorities
                      </CommandItem>
                      {availablePriorities.map(priority => (
                        <CommandItem
                          key={priority}
                          value={getPriorityDisplayName(priority)}
                          onSelect={() => setPriorityFilter(priority)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              priorityFilter === priority ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {getPriorityDisplayName(priority)}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Tag className="h-4 w-4" />
                Category
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between rounded-xl"
                  >
                    {categoryFilter === "all" 
                      ? "All Categories" 
                      : categoryFilter}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search categories..." />
                    <CommandEmpty>No category found.</CommandEmpty>
                    <CommandGroup className="max-h-[300px] overflow-auto">
                      <CommandItem
                        value="all"
                        onSelect={() => setCategoryFilter("all")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            categoryFilter === "all" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Categories
                      </CommandItem>
                      {availableCategories.map(category => (
                        <CommandItem
                          key={category}
                          value={category}
                          onSelect={() => setCategoryFilter(category)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              categoryFilter === category ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {category}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card style={{ 
        borderRadius: '20px', 
        boxShadow: PASTEL_COLORS.shadowMedium,
        border: 'none'
      }}>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: PASTEL_COLORS.lavenderText }}></div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <CalendarClock className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">No templates found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">User</TableHead>
                    <TableHead className="font-semibold">Template Name</TableHead>
                    <TableHead className="font-semibold">Priority</TableHead>
                    <TableHead className="font-semibold">Categories</TableHead>
                    <TableHead className="font-semibold">Client</TableHead>
                    <TableHead className="font-semibold">Scheduled</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold">Last Edited</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{getUserName(template)}</span>
                          <span className="text-xs text-gray-500">{template.user_profiles?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900">{template.template_name}</div>
                          <div className="text-sm text-gray-500 truncate">{template.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadgeColor(template.default_priority)}>
                          {getPriorityDisplayName(template.default_priority)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {template.default_categories && template.default_categories.length > 0 ? (
                            template.default_categories.slice(0, 2).map((cat: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">None</span>
                          )}
                          {template.default_categories && template.default_categories.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.default_categories.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-700">
                          {template.default_client || <span className="text-gray-400">None</span>}
                        </span>
                      </TableCell>
                      <TableCell>
                        {template.scheduled_date ? (
                          <Badge className="bg-green-100 text-green-700">
                            {formatDateOnly(template.scheduled_date, 'short')}
                          </Badge>
                        ) : (
                          <span className="text-sm text-gray-400">Not scheduled</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          {formatDateEST(template.created_at, 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          {formatDateEST(template.updated_at, 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewDetails(template)}
                          className="rounded-xl"
                          style={{
                            backgroundColor: PASTEL_COLORS.skyBreeze,
                            color: PASTEL_COLORS.skyText
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl" style={{ borderRadius: '24px' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <CalendarClock className="h-6 w-6" style={{ color: PASTEL_COLORS.lavenderText }} />
              Template Details
            </DialogTitle>
            <DialogDescription>
              Read-only view of recurring task template
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && (
            <div className="space-y-6 py-4">
              {/* User Info */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: PASTEL_COLORS.lavenderMist }}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5" style={{ color: PASTEL_COLORS.lavenderText }} />
                  <h3 className="font-semibold text-gray-900">User Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium text-gray-900">{getUserName(selectedTemplate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium text-gray-900">{selectedTemplate.user_profiles?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Template Info */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Template Name</label>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{selectedTemplate.template_name}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Description</label>
                  <p className="text-gray-900 mt-1 p-3 rounded-lg bg-gray-50">{selectedTemplate.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Client/Project</label>
                    <p className="text-gray-900 mt-1">{selectedTemplate.default_client || 'Not specified'}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Task Type</label>
                    <p className="text-gray-900 mt-1">{selectedTemplate.default_task_type || 'Not specified'}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Priority</label>
                  <div className="mt-1">
                    <Badge className={getPriorityBadgeColor(selectedTemplate.default_priority)}>
                      {getPriorityDisplayName(selectedTemplate.default_priority)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Categories</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTemplate.default_categories && selectedTemplate.default_categories.length > 0 ? (
                      selectedTemplate.default_categories.map((cat: string, idx: number) => (
                        <Badge key={idx} variant="outline">
                          {cat}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500">No categories</span>
                    )}
                  </div>
                </div>

                {selectedTemplate.scheduled_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Scheduled Date</label>
                    <div className="mt-1">
                      <Badge className="bg-green-100 text-green-700">
                        {formatDateOnly(selectedTemplate.scheduled_date, 'long')}
                      </Badge>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Created At</label>
                    <p className="text-gray-900 mt-1">{formatDateEST(selectedTemplate.created_at, 'PPpp')}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Last Modified</label>
                    <p className="text-gray-900 mt-1">{formatDateEST(selectedTemplate.updated_at, 'PPpp')}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setDetailsDialogOpen(false)}
                  className="rounded-xl"
                  style={{
                    backgroundColor: PASTEL_COLORS.lavenderCloud,
                    color: PASTEL_COLORS.lavenderText
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DARPortal() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // 🔥 GLOBAL SURVEY PROVIDER - Sync clock-in state for survey timing
  const surveyContext = useSurveySafe();
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
const [activeTab, setActiveTab] = useState<"clients" | "messages" | "history" | "settings" | "feedback" | "invoices" | "smartDashboard" | "smartGuide">("clients");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [clientClockIns, setClientClockIns] = useState<Record<string, ClockIn | null>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [allSubmissions, setAllSubmissions] = useState<any[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]); // Keep for backward compatibility
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [submissionTasks, setSubmissionTasks] = useState<any[]>([]);
  const [submissionImages, setSubmissionImages] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTaskPriorityByClient, setActiveTaskPriorityByClient] = useState<Record<string, string>>({});
  const [activeTaskImagesByClient, setActiveTaskImagesByClient] = useState<Record<string, string[]>>({});
  const [liveDurationByClient, setLiveDurationByClient] = useState<Record<string, number>>({});
  const [liveSecondsByClient, setLiveSecondsByClient] = useState<Record<string, number>>({});
  const [editingTaskTitle, setEditingTaskTitle] = useState(false);
  const [editedTaskTitle, setEditedTaskTitle] = useState("");
  
  // History task editing states
  const [editingHistoryTaskId, setEditingHistoryTaskId] = useState<string | null>(null);
  const [editedHistoryTaskTitle, setEditedHistoryTaskTitle] = useState("");
  
  // Task queue states
  const [queuedTasksByClient, setQueuedTasksByClient] = useState<Record<string, QueuedTask[]>>({});
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [queueTaskDescription, setQueueTaskDescription] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  
  // Recurring task templates states
  const [taskTemplates, setTaskTemplates] = useState<any[]>([]);
  const [templateFormOpen, setTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [expandedPriority, setExpandedPriority] = useState<string | null>(null);
  
  // Clock-in modal state
  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);
  
  // 🔥 DEBUG: Log modal state changes
  useEffect(() => {
    console.log('[MODAL STATE] clockInModalOpen:', clockInModalOpen);
  }, [clockInModalOpen]);
  
  // 🔔 Notification system
  const {
    notifications,
    unreadCount: notificationUnreadCount,
    markAsRead,
    markAllAsRead,
    logNotification,
  } = useNotifications(user?.id);
  
  // 💬 Message unread count (separate from notifications)
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  
  const templatesByPriority = useMemo(() => {
    const groups: Record<string, any[]> = {};
    PRIORITY_GROUPS.forEach(group => {
      groups[group.key] = [];
    });
    taskTemplates.forEach((template) => {
      const key = normalizePriorityKey(template.default_priority);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(template);
    });
    return groups;
  }, [taskTemplates]);

  const togglePrioritySection = (key: string) => {
    setExpandedPriority((prev) => (prev === key ? null : key));
  };
  
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
  
  // Task Settings Modal states
  const [taskSettingsModalOpen, setTaskSettingsModalOpen] = useState(false);
  const [pendingTaskSettings, setPendingTaskSettings] = useState<TaskSettings | null>(null);
  const [pendingQueueTaskId, setPendingQueueTaskId] = useState<string | null>(null);
  
  // Check-in popup states
  const [moodCheckOpen, setMoodCheckOpen] = useState(false);
  const [energyCheckOpen, setEnergyCheckOpen] = useState(false);
  const [taskEnjoymentOpen, setTaskEnjoymentOpen] = useState(false);
  const [completedTaskForEnjoyment, setCompletedTaskForEnjoyment] = useState<string>(""); // Task description
  const [completedTaskIdForEnjoyment, setCompletedTaskIdForEnjoyment] = useState<string>(""); // Task ID for DB update
  const [lastMoodCheckTime, setLastMoodCheckTime] = useState<number>(0);
  const [lastEnergyCheckTime, setLastEnergyCheckTime] = useState<number>(0);
  
  // Task progress notification tracking (to prevent spam)
  const [triggeredMilestones, setTriggeredMilestones] = useState<Record<string, Set<number>>>({});
  
  // Editing completed tasks
  const [editingCompletedTaskId, setEditingCompletedTaskId] = useState<string | null>(null);
  const [editedTaskData, setEditedTaskData] = useState<Partial<TimeEntry>>({});
  
  // Template scheduling
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [schedulingTemplate, setSchedulingTemplate] = useState<any | null>(null);
  const [selectedScheduleDate, setSelectedScheduleDate] = useState<string>("");
  
  // 🎯 Notification Cap System (5 per hour)
  // Excluded from cap: Clock-in, Task completion, ALL task goal reminders (20%, 40%, 50%, 60%, 75%, 80%, 90%, 100%, 110%, 120%)
  // Subject to cap (every 30 minutes): Mood checks, Energy checks
  const [notificationCount, setNotificationCount] = useState<number>(0);
  const [lastHourReset, setLastHourReset] = useState<number>(Date.now());
  
  // Store mood and energy entries
  const [moodEntries, setMoodEntries] = useState<Array<{ timestamp: string; mood_level: string }>>([]);
  const [energyEntries, setEnergyEntries] = useState<Array<{ timestamp: string; energy_level: string }>>([]);
  
  // Live client timezone time
  const [clientLiveTime, setClientLiveTime] = useState<string>("");
  
  // Live total clocked hours
  const [totalClockedHours, setTotalClockedHours] = useState<string>("");
  
  // Helper to get current client's active entry
  // 🔥 FIX: Get active entry for SELECTED CLIENT ONLY (not all clients)
  const activeEntry = selectedClient ? (activeEntryByClient[selectedClient] || null) : null;
  // 🔥 CRITICAL FIX: Show ALL paused and completed tasks across ALL clients, not just selected client
  // 🔥 CRITICAL FIX: Show ALL paused and completed tasks across ALL clients
  // This prevents tasks from disappearing when switching clients or after refresh
  const pausedTasks = Object.values(pausedTasksByClient).flat();
  const timeEntries = Object.values(timeEntriesByClient).flat();
  
  // 🔥 DEBUG: Log task counts
  console.log('[UI] pausedTasksByClient:', pausedTasksByClient);
  console.log('[UI] pausedTasks count:', pausedTasks.length);
  console.log('[UI] timeEntriesByClient:', timeEntriesByClient);
  console.log('[UI] timeEntries count:', timeEntries.length);
  const queuedTasks = selectedClient ? queuedTasksByClient[selectedClient] || [] : [];
  
  // 🔥 CRITICAL FIX: Get active task details from the client that has the active entry, not selectedClient
  const activeClientName = activeEntry ? activeEntry.client_name : selectedClient;
  const activeTaskComments = activeClientName ? activeTaskCommentsByClient[activeClientName] || "" : "";
  const activeTaskLink = activeClientName ? activeTaskLinkByClient[activeClientName] || "" : "";
  const activeTaskStatus = activeClientName ? activeTaskStatusByClient[activeClientName] || "in_progress" : "in_progress";
  const activeTaskPriority = activeClientName ? activeTaskPriorityByClient[activeClientName] || "" : "";
  const activeTaskImages = activeClientName ? activeTaskImagesByClient[activeClientName] || [] : [];
  const liveDuration = activeClientName ? liveDurationByClient[activeClientName] || 0 : 0;
  const liveSeconds = activeClientName ? liveSecondsByClient[activeClientName] || 0 : 0;
  const clientTimezone = selectedClient ? (clients.find(c => c.name === selectedClient)?.timezone || "America/Los_Angeles") : "America/Los_Angeles";

  // 🎯 NOTIFICATION CAP HELPERS (5 per hour, excluding clock-in & task completion)
  const canSendNotification = (): boolean => {
    const now = Date.now();
    
    // Reset counter if an hour has passed
    if (now - lastHourReset >= 60 * 60 * 1000) {
      console.log('[Notification Cap] Resetting counter - new hour');
      setNotificationCount(0);
      setLastHourReset(now);
      return true;
    }
    
    // Check if we've hit the cap
    if (notificationCount >= 5) {
      console.log('[Notification Cap] ❌ Limit reached (5/hour)');
      return false;
    }
    
    return true;
  };

  const incrementNotificationCount = () => {
    setNotificationCount(prev => {
      const newCount = prev + 1;
      console.log(`[Notification Cap] Count: ${newCount}/5`);
      return newCount;
    });
  };

  // Notification trigger function (to be connected to notification system)
  const triggerTaskProgressNotification = (entry: TimeEntry, progressPercent: number, currentMinutes: number) => {
    if (!entry.goal_duration_minutes) return;
    
    const goalMinutes = entry.goal_duration_minutes;
    const taskId = entry.id;
    
    // Get or create milestone set for this task
    const milestones = triggeredMilestones[taskId] || new Set<number>();
    
    // Check each milestone and trigger only once
    // ✅ ALL task milestones are UNLIMITED (don't count toward cap)
    const checkMilestone = (milestone: number, message: string, icon: string = '🎯') => {
      if (progressPercent >= milestone && !milestones.has(milestone)) {
        console.log(`[Notification] ${message} - ${currentMinutes}/${goalMinutes} minutes`);
        playNotificationSound();
        
        const taskDesc = entry.task_description.substring(0, 50) + (entry.task_description.length > 50 ? '...' : '');
        const actualProgress = Math.floor(progressPercent);
        
        // 🐛 FIX: Show toast notification popup with ACTUAL progress!
        toast({
          title: `${icon} Task Progress: ${actualProgress}%`,
          description: `${message}\n${currentMinutes} of ${goalMinutes} minutes • ${taskDesc}`,
          duration: 5000,
          style: {
            background: milestone >= 100 ? PASTEL_COLORS.pistachioCream : PASTEL_COLORS.blueberryMilk,
            borderColor: milestone >= 100 ? PASTEL_COLORS.pistachioText : PASTEL_COLORS.lavenderCloud,
            color: PASTEL_COLORS.darkText,
          }
        });
        
        // 🔔 Log to notification center with ACTUAL progress!
        logNotification(
          `${icon} Task Progress: ${actualProgress}% - ${message} (${currentMinutes}/${goalMinutes} min) - ${taskDesc}`,
          'task_progress',
          'milestone',
          entry.id,
          { 
            milestone, 
            progressPercent: actualProgress,
            currentMinutes,
            goalMinutes,
            taskDescription: entry.task_description
          }
        );
        
        // Don't count toward cap - these are task goal reminders!
        milestones.add(milestone);
        setTriggeredMilestones(prev => ({ ...prev, [taskId]: milestones }));
        return true;
      }
      return false;
    };
    
    // ✅ ALL task milestone notifications are UNLIMITED (don't count toward 5/hour cap)
    checkMilestone(20, 'Great start!', '🚀') ||
    checkMilestone(40, 'Keep going!', '💪') ||
    checkMilestone(50, 'Halfway there!', '⭐') ||
    checkMilestone(60, 'Making progress!', '🔥') ||
    checkMilestone(75, 'Almost there!', '⚡') ||
    checkMilestone(80, 'Final stretch!', '🎯') ||
    checkMilestone(90, 'Nearly done!', '🏃') ||
    checkMilestone(100, 'Goal reached! 🎉', '✅') ||
    checkMilestone(110, 'Running over goal - Consider wrapping up', '⏰') ||
    checkMilestone(120, 'Significantly over goal', '⚠️');
  };

  // Check-in handlers
  const handleMoodSubmit = async (mood: string) => {
    const entry = {
      timestamp: new Date().toISOString(),
      mood_level: mood
    };
    setMoodEntries(prev => [...prev, entry]);
    setLastMoodCheckTime(Date.now());
    console.log('[Check-in] Mood recorded:', mood);
    
    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Check-in] No authenticated user found');
        return;
      }
      
      const { error } = await (supabase as any)
        .from('mood_entries')
        .insert([{
          user_id: user.id,
          timestamp: entry.timestamp,
          mood_level: mood
        }]);
      
      if (error) {
        console.error('[Check-in] Error saving mood entry:', error);
      } else {
        console.log('[Check-in] ✅ Mood entry saved to database');
        
        // 🔔 Log notification - DIRECT DATABASE INSERT (bypassing hook)
        try {
          const { data: notifData, error: notifError } = await (supabase as any)
            .from('notification_log')
            .insert([{
              user_id: user.id,
              message: `😊 Mood check-in completed: ${mood}`,
              type: 'survey_completed',
              category: 'mood',
              metadata: { mood }
            }])
            .select()
            .single();
          
          if (notifError) {
            console.error('[Check-in] ERROR saving notification:', notifError);
          } else {
            console.log('[Check-in] ✅ Notification saved:', notifData);
          }
        } catch (e) {
          console.error('[Check-in] Exception saving notification:', e);
        }
        
        // 📊 Log to survey_events table for penalty tracking
        try {
          await (supabase as any)
            .from('survey_events')
            .insert([{
              user_id: user.id,
              type: 'mood',
              value: mood,
              responded: true,
              timestamp: entry.timestamp
            }]);
          console.log('[Check-in] ✅ Mood ANSWERED logged to survey_events');
        } catch (e) {
          console.error('[Check-in] Exception logging to survey_events:', e);
        }
        
        // 🎯 Award +2 points for completing survey
        try {
          // Insert points history
          await (supabase as any)
            .from('points_history')
            .insert([{
              user_id: user.id,
              points: 2,
              reason: 'Mood check-in completed',
              timestamp: entry.timestamp
            }]);
          
          // Update user profile points
          const { data: profile } = await (supabase as any)
            .from('user_profiles')
            .select('total_points, weekly_points, monthly_points')
            .eq('user_id', user.id)
            .single();
          
          if (profile) {
            await (supabase as any)
              .from('user_profiles')
              .update({
                total_points: (profile.total_points || 0) + 2,
                weekly_points: (profile.weekly_points || 0) + 2,
                monthly_points: (profile.monthly_points || 0) + 2,
              })
              .eq('user_id', user.id);
            
            console.log('[Check-in] ✅ +2 points awarded for mood survey');
          }
        } catch (e) {
          console.error('[Check-in] Exception awarding points:', e);
        }
      }
    } catch (e) {
      console.error('[Check-in] Exception saving mood entry:', e);
    }
  };

  const handleEnergySubmit = async (energy: string) => {
    const entry = {
      timestamp: new Date().toISOString(),
      energy_level: energy
    };
    setEnergyEntries(prev => [...prev, entry]);
    setLastEnergyCheckTime(Date.now());
    console.log('[Check-in] Energy recorded:', energy);
    
    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Check-in] No authenticated user found');
        return;
      }
      
      const { error } = await (supabase as any)
        .from('energy_entries')
        .insert([{
          user_id: user.id,
          timestamp: entry.timestamp,
          energy_level: energy
        }]);
      
      if (error) {
        console.error('[Check-in] Error saving energy entry:', error);
      } else {
        console.log('[Check-in] ✅ Energy entry saved to database');
        
        // 🔔 Log notification - DIRECT DATABASE INSERT (bypassing hook)
        try {
          const { data: notifData, error: notifError } = await (supabase as any)
            .from('notification_log')
            .insert([{
              user_id: user.id,
              message: `⚡ Energy check-in completed: ${energy}`,
              type: 'survey_completed',
              category: 'energy',
              metadata: { energy_level: energy }
            }])
            .select()
            .single();
          
          if (notifError) {
            console.error('[Check-in] ERROR saving notification:', notifError);
          } else {
            console.log('[Check-in] ✅ Notification saved:', notifData);
          }
        } catch (e) {
          console.error('[Check-in] Exception saving notification:', e);
        }
        
        // 📊 Log to survey_events table for penalty tracking
        try {
          await (supabase as any)
            .from('survey_events')
            .insert([{
              user_id: user.id,
              type: 'energy',
              value: energy,
              responded: true,
              timestamp: entry.timestamp
            }]);
          console.log('[Check-in] ✅ Energy ANSWERED logged to survey_events');
        } catch (e) {
          console.error('[Check-in] Exception logging to survey_events:', e);
        }
        
        // 🎯 Award +2 points for completing survey
        try {
          // Insert points history
          await (supabase as any)
            .from('points_history')
            .insert([{
              user_id: user.id,
              points: 2,
              reason: 'Energy check-in completed',
              timestamp: entry.timestamp
            }]);
          
          // Update user profile points
          const { data: profile } = await (supabase as any)
            .from('user_profiles')
            .select('total_points, weekly_points, monthly_points')
            .eq('user_id', user.id)
            .single();
          
          if (profile) {
            await (supabase as any)
              .from('user_profiles')
              .update({
                total_points: (profile.total_points || 0) + 2,
                weekly_points: (profile.weekly_points || 0) + 2,
                monthly_points: (profile.monthly_points || 0) + 2,
              })
              .eq('user_id', user.id);
            
            console.log('[Check-in] ✅ +2 points awarded for energy survey');
          }
        } catch (e) {
          console.error('[Check-in] Exception awarding points:', e);
        }
      }
    } catch (e) {
      console.error('[Check-in] Exception saving energy entry:', e);
    }
  };

  const handleTaskEnjoymentSubmit = async (enjoyment: number) => {
    console.log('[Check-in] Task enjoyment recorded:', enjoyment, 'for task ID:', completedTaskIdForEnjoyment);
    
    // Update the completed task with enjoyment rating
    if (completedTaskIdForEnjoyment) {
      try {
        const { error } = await (supabase as any)
          .from('eod_time_entries')
          .update({ task_enjoyment: enjoyment })
          .eq('id', completedTaskIdForEnjoyment);
        
        if (error) {
          console.error('[Check-in] Error saving task enjoyment:', error);
        } else {
          console.log('[Check-in] ✅ Task enjoyment saved to database');
          
          // 🔔 Log notification - DIRECT DATABASE INSERT (bypassing hook)
          const notifMessage = enjoyment >= 4 
            ? `😊 High Enjoyment! Rating: ${enjoyment}/5 (+2 pts)`
            : `📝 Task Enjoyment: ${enjoyment}/5`;
          const notifType = enjoyment >= 4 ? 'enjoyment_bonus' : 'enjoyment_recorded';
          const notifCategory = enjoyment >= 4 ? 'achievement' : 'survey_completed';
          
          try {
            const { data: notifData, error: notifError } = await (supabase as any)
              .from('notification_log')
              .insert([{
                user_id: user.id,
                message: notifMessage,
                type: notifType,
                category: notifCategory,
                related_id: completedTaskIdForEnjoyment,
                metadata: { enjoyment }
              }])
              .select()
              .single();
            
            if (notifError) {
              console.error('[Check-in] ERROR saving notification:', notifError);
            } else {
              console.log('[Check-in] ✅ Notification saved:', notifData);
            }
          } catch (e) {
            console.error('[Check-in] Exception saving notification:', e);
          }
          
          // 🎯 Trigger enjoyment bonus notification
          if (enjoyment >= 4) {
            // High enjoyment = bonus points!
            setTimeout(() => {
              toast({
                title: '😊 High Enjoyment Bonus!',
                description: `You loved this task! +2 Enjoyment Points`,
                duration: 5000,
                className: 'bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300'
              });
            }, 500);
          }
        }
      } catch (e) {
        console.error('[Check-in] Exception saving task enjoyment:', e);
      }
    } else {
      console.warn('[Check-in] No task ID available for enjoyment rating');
    }
    
    // Clear the task ID after submission
    setCompletedTaskIdForEnjoyment("");
  };

  // 🔥 SYNC CLOCK-IN STATE WITH GLOBAL SURVEY PROVIDER
  // This ensures surveys work across all tabs/pages
  useEffect(() => {
    if (!surveyContext) return;
    
    // Check if ANY client is clocked in
    const anyClientClockedIn = Object.values(clientClockIns).some(c => c && !c.clocked_out_at);
    
    if (anyClientClockedIn) {
      // Find the earliest active clock-in time
      const activeClockedInTimes = Object.values(clientClockIns)
        .filter(c => c && !c.clocked_out_at)
        .map(c => new Date(c!.clocked_in_at));
      
      if (activeClockedInTimes.length > 0) {
        const earliestClockIn = new Date(Math.min(...activeClockedInTimes.map(d => d.getTime())));
        console.log('[EODPortal] Syncing clock-in state with SurveyProvider:', earliestClockIn);
        surveyContext.setClockInState(true, earliestClockIn);
      }
    } else {
      console.log('[EODPortal] No active clock-ins, clearing SurveyProvider state');
      surveyContext.setClockInState(false);
    }
  }, [clientClockIns, surveyContext]);

  // Concurrent Notification Engine - runs every minute while clocked in
  useEffect(() => {
    // Check if ANY client is clocked in (client-specific system)
    const anyClientClockedIn = Object.values(clientClockIns).some(c => c && !c.clocked_out_at);
    
    if (!anyClientClockedIn) {
      console.log('[Notification Engine] Not running - no active clock-in found');
      return;
    }

    console.log('[Notification Engine] Starting - user is clocked in for at least one client');
    console.log(`[Notification Engine] Last mood check: ${lastMoodCheckTime}, Last energy check: ${lastEnergyCheckTime}`);

    const notificationEngine = setInterval(() => {
      const now = Date.now();
      console.log('[Notification Engine] Checking notifications...');
      
      // Check for mood check (every 30 minutes)
      const moodInterval = 30 * 60 * 1000; // 30 minutes
      if (lastMoodCheckTime > 0) {
        const timeSinceLastMood = now - lastMoodCheckTime;
        console.log(`[Notification Engine] Time since last mood check: ${Math.floor(timeSinceLastMood / 1000)}s (need ${moodInterval / 1000}s)`);
        if (timeSinceLastMood >= moodInterval && !moodCheckOpen && canSendNotification()) { // Check cap
          console.log('[Notification Engine] ✅ Triggering mood check');
          playNotificationSound();
          incrementNotificationCount();
          setMoodCheckOpen(true);
        }
      } else {
        console.log('[Notification Engine] Waiting for initial mood check to complete');
      }
      
      // Check for energy check (every 15 minutes for better testing)
      const energyInterval = 15 * 60 * 1000; // 15 minutes (reduced from 30 for better UX)
      if (lastEnergyCheckTime > 0) {
        const timeSinceLastEnergy = now - lastEnergyCheckTime;
        console.log(`[Notification Engine] Time since last energy check: ${Math.floor(timeSinceLastEnergy / 1000)}s (need ${energyInterval / 1000}s)`);
        if (timeSinceLastEnergy >= energyInterval && !energyCheckOpen && canSendNotification()) { // Check cap
          console.log('[Notification Engine] ✅ Triggering energy check');
          playNotificationSound();
          incrementNotificationCount();
          setEnergyCheckOpen(true);
        }
      } else {
        // First energy check - trigger after initial interval
        // Find the earliest active clock-in time from any client
        const activeClockedInTimes = Object.values(clientClockIns)
          .filter(c => c && !c.clocked_out_at)
          .map(c => new Date(c!.clocked_in_at).getTime());
        
        if (activeClockedInTimes.length > 0) {
          const earliestClockInTime = Math.min(...activeClockedInTimes);
          const timeSinceClockIn = now - earliestClockInTime;
          console.log(`[Notification Engine] Time since earliest clock-in: ${Math.floor(timeSinceClockIn / 1000)}s (need ${energyInterval / 1000}s for first energy check)`);
          if (timeSinceClockIn >= energyInterval && !energyCheckOpen && canSendNotification()) { // Check cap
            console.log('[Notification Engine] ✅ Triggering first energy check');
            playNotificationSound();
            incrementNotificationCount();
            setEnergyCheckOpen(true);
          }
        }
      }

      // Check task progress for ALL active tasks across clients
      Object.entries(activeEntryByClient).forEach(([client, entry]) => {
        if (entry && entry.goal_duration_minutes && !entry.paused_at) { // Only check active (non-paused) tasks
          const taskStartTime = new Date(entry.started_at).getTime();
          const currentSessionMinutes = (now - taskStartTime) / (60 * 1000);
          
          // Add accumulated time from previous sessions
          const accumulatedSeconds = entry.accumulated_seconds || 0;
          const totalMinutes = (accumulatedSeconds / 60) + currentSessionMinutes;
          
          const goalMinutes = entry.goal_duration_minutes;
          const progressPercent = (totalMinutes / goalMinutes) * 100;
          
          console.log(`[Notification Engine] Checking task progress for ${client}: ${Math.floor(progressPercent)}% (${Math.floor(totalMinutes)}/${goalMinutes} min)`);
          triggerTaskProgressNotification(entry, progressPercent, Math.floor(totalMinutes));
        }
      });

      // 🎯 IDLE TIME REMINDER - Disabled (user wants minimal notifications)
      // 🔥 MOMENTUM BOOST - Disabled (user wants minimal notifications)
      
    }, 120000); // Run every 120 seconds (2 minutes)

    return () => {
      console.log('[Notification Engine] Stopping');
      clearInterval(notificationEngine);
    };
  }, [clientClockIns, lastMoodCheckTime, lastEnergyCheckTime, activeEntryByClient, triggeredMilestones, moodCheckOpen, energyCheckOpen, notificationCount, lastHourReset]);

  // 🔥 CRITICAL FIX: Check database for recent mood/energy entries on page load
  // This prevents the mood check from triggering on every refresh
  useEffect(() => {
    const checkRecentSurveys = async () => {
      if (!user) return;
      
      try {
        const todayStart = startOfDayEST(nowEST());
        const todayEnd = endOfDayEST(nowEST());
        
        // Check for mood entries today
        const { data: recentMood } = await (supabase as any)
          .from('mood_entries')
          .select('timestamp')
          .eq('user_id', user.id)
          .gte('timestamp', todayStart.toISOString())
          .lte('timestamp', todayEnd.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);
        
        // Check for energy entries today
        const { data: recentEnergy } = await (supabase as any)
          .from('energy_entries')
          .select('timestamp')
          .eq('user_id', user.id)
          .gte('timestamp', todayStart.toISOString())
          .lte('timestamp', todayEnd.toISOString())
          .order('timestamp', { ascending: false })
          .limit(1);
        
        // If user has already done a mood check today, set the lastMoodCheckTime
        if (recentMood && recentMood.length > 0) {
          const lastMoodTime = new Date(recentMood[0].timestamp).getTime();
          console.log('[Survey Check] Found recent mood entry from today, setting lastMoodCheckTime');
          setLastMoodCheckTime(lastMoodTime);
        }
        
        // If user has already done an energy check today, set the lastEnergyCheckTime
        if (recentEnergy && recentEnergy.length > 0) {
          const lastEnergyTime = new Date(recentEnergy[0].timestamp).getTime();
          console.log('[Survey Check] Found recent energy entry from today, setting lastEnergyCheckTime');
          setLastEnergyCheckTime(lastEnergyTime);
        }
      } catch (error) {
        console.error('[Survey Check] Error checking recent surveys:', error);
      }
    };
    
    checkRecentSurveys();
  }, [user]);

  // Trigger mood check immediately on clock-in (ONLY ONCE per session)
  useEffect(() => {
    // Check if we should trigger mood check:
    // 1. User is clocked in
    // 2. No mood check has been done yet (lastMoodCheckTime === 0)
    // 3. Clock-in is recent (within last 2 minutes) to avoid triggering on page refresh
    // 4. We use a shorter window (2 minutes instead of 5) to be more conservative
    if (clockIn && !clockIn.clocked_out_at && lastMoodCheckTime === 0) {
      const clockInTime = new Date(clockIn.clocked_in_at).getTime();
      const now = Date.now();
      const minutesSinceClockIn = (now - clockInTime) / 1000 / 60;
      
      // Only trigger if clocked in within last 2 minutes (fresh clock-in, not page refresh)
      if (minutesSinceClockIn <= 2) {
        console.log('[Clock-in] Scheduling mood check in 2 seconds (fresh clock-in)');
        const timer = setTimeout(() => {
          console.log('[Clock-in] Triggering mood check popup');
          playNotificationSound();
          setMoodCheckOpen(true);
        }, 2000); // Show after 2 seconds
        
        return () => clearTimeout(timer); // Cleanup to prevent memory leaks
      } else {
        console.log('[Clock-in] Skipping mood check - clock-in is', minutesSinceClockIn.toFixed(1), 'minutes old (likely page refresh)');
        // Set a placeholder time so we don't keep checking
        // The notification engine will handle periodic checks
        setLastMoodCheckTime(clockInTime);
      }
    }
  }, [clockIn, lastMoodCheckTime]);
  
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
    // Initialize all data on mount
    const initializeData = async () => {
      await checkAuth();
      await loadClients();
      await loadQueueTasks();
      // Templates will be loaded when a client is selected
      await loadUnreadCount();
    };
    
    initializeData();
    
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eod_clock_ins' }, (payload) => {
        console.log('📡 Real-time clock-in update:', payload.eventType);
        // Only reload if the change is for the current user
        if (payload.new && payload.new.user_id === user?.id) {
          console.log('Reloading clock-ins due to real-time update');
          loadClientClockIns(undefined, false); // Don't force reload
        }
      })
      .subscribe();
    
    // Set up real-time subscription for queue task changes
    const queueChannel = supabase
      .channel('queue-task-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'eod_queue_tasks' }, () => {
        loadQueueTasks();
      })
      .subscribe();

    // NEW APPROACH: Use polling instead of visibility change events to avoid clock-out issues
    // Poll the database every 30 seconds to check for updates without affecting active states
    const pollInterval = setInterval(() => {
      if (!document.hidden) {
        console.log('🔄 Polling for updates (tab is active)');
        loadQueueTasks();
        // Polling for clock-ins is disabled to prevent button flickering
        // Real-time subscription will handle updates instead
      }
    }, 30000); // Poll every 30 seconds

    // AUTO CLOCK-OUT: Check for stale clock-ins every 5 minutes
    const autoClockOutInterval = setInterval(async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;

        const now = new Date();
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        
        // Get all active clock-ins (no clock-out) for current user
        const { data: activeClockIns, error } = await supabase
          .from('eod_clock_ins')
          .select('*')
          .eq('user_id', currentUser.id)
          .is('clocked_out_at', null)
          .lt('clocked_in_at', twelveHoursAgo.toISOString());

        if (!error && activeClockIns && activeClockIns.length > 0) {
          console.log('🕐 AUTO CLOCK-OUT: Found', activeClockIns.length, 'stale clock-ins (>12 hours)');
          
          // Auto clock-out these sessions
          for (const clockIn of activeClockIns) {
            await supabase
              .from('eod_clock_ins')
              .update({ clocked_out_at: now.toISOString() })
              .eq('id', clockIn.id);
            
            console.log('✅ Auto clocked out:', clockIn.client_name, 'after 12+ hours');
          }

          // Reload clock-ins to reflect changes
          await loadClientClockIns(undefined, true);
          
          toast({
            title: 'Auto Clock-Out',
            description: `${activeClockIns.length} stale session(s) automatically clocked out after 12+ hours`,
            duration: 5000
          });
        }
      } catch (error) {
        console.error('Error in auto clock-out check:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(clockInChannel);
      supabase.removeChannel(queueChannel);
      clearInterval(pollInterval);
      clearInterval(autoClockOutInterval);
    };
  }, []); // ✅ Empty dependency array - no infinite loops!

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

  // Load templates when selected client changes
  useEffect(() => {
    if (selectedClient) {
      loadTaskTemplates(selectedClient);
    }
  }, [selectedClient]);

  const checkAuth = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate('/login');
      return;
    }
    setUser(authUser);
    
    // Fetch user role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', authUser.id)
      .single();
    
    setUserRole(profile?.role || null);
    await loadToday(); // 🔥 CRITICAL FIX: Await to ensure tasks load before render
  };

  const loadClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      const clientMap = new Map<string, { name: string; email?: string; timezone?: string }>();
      
      // If admin, load ALL clients from deals and companies
      if (isAdmin) {
        // Load ALL deals (no limit for admins)
        const { data: deals, error: dealsError } = await supabase
          .from('deals')
          .select('name, timezone, companies(name, email, timezone), contacts(email)')
          .order('name');
        
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

        // Load ALL companies (no limit for admins)
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('name, email, timezone')
          .order('name');
        
        if (!companiesError && companies) {
          companies.forEach((c: any) => {
            if (c.name && !clientMap.has(c.name)) {
              clientMap.set(c.name, { name: c.name, email: c.email, timezone: c.timezone || 'America/Los_Angeles' });
            }
          });
        }
      } else {
        // Non-admin: check for assigned clients
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
          // No assigned clients - show limited clients (fallback)
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
      }

      const clientArray = Array.from(clientMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
      console.log('Loaded clients:', clientArray.length, isAdmin ? '(Admin - All clients)' : '(User - Assigned clients)');
      setClients(clientArray);
      
      // Set first client as selected by default
      if (clientArray.length > 0 && !selectedClient) {
        setSelectedClient(clientArray[0].name);
      }
      
      // Load clock-in status for all clients - pass clientArray directly
      if (clientArray.length > 0) {
        loadClientClockIns(clientArray, true); // Force reload on initial load
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
    console.log('[LOAD_TODAY] Starting data load...');
    
    // 🔥 CRITICAL FIX: Get user from auth, don't rely on state
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      console.error('[LOAD_TODAY] ❌ No authenticated user found!');
      return;
    }
    
    console.log('[LOAD_TODAY] User ID:', currentUser.id);
    setLoading(true);
    try {
      // Use EST date, not local timezone
      const today = getDateKeyEST(nowEST());
      console.log('[LOAD_TODAY] EST Date:', today);
      console.log('[LOAD_TODAY] Current time:', new Date().toISOString());
      
      // 🔥 CRITICAL FIX: Get the MOST RECENT report for today (there might be multiple)
      const { data: reports, error: reportError } = await supabase
        .from('eod_reports')
        .select('*')
        .eq('user_id', currentUser.id) // 🔒 SECURITY: Only load current user's reports
        .eq('report_date', today)
        .order('started_at', { ascending: false })
        .limit(1);
      
      console.log('[LOAD_TODAY] Query result - Reports found:', reports?.length || 0);
      console.log('[LOAD_TODAY] Query error:', reportError);
      console.log('[LOAD_TODAY] Reports data:', reports);
      
      const report = reports && reports.length > 0 ? reports[0] : null;

      if (reportError) {
        console.error('[LOAD_TODAY] Report query error:', reportError);
      }

      if (report) {
        console.log('[LOAD_TODAY] ✅ Found report:', report.id);
        console.log('[LOAD_TODAY] Report details:', {
          id: report.id,
          report_date: report.report_date,
          started_at: report.started_at,
          submitted: report.submitted
        });
        setReportId(report.id);
        setSummary(report.summary || "");

        const { data: imgs } = await supabase
          .from('eod_report_images')
          .select('id, public_url')
          .eq('eod_id', report.id);
        setImages((imgs || []).map(i => ({ id: i.id, url: i.public_url || '' })));

        const { data: entries, error: entriesError } = await (supabase as any)
          .from('eod_time_entries')
          .select('*')
          .eq('eod_id', report.id)
          .order('started_at', { ascending: false });
        
        console.log('[LOAD_TODAY] 📊 Entries query result:');
        console.log('[LOAD_TODAY] - Entries found:', entries?.length || 0);
        console.log('[LOAD_TODAY] - Query error:', entriesError);
        console.log('[LOAD_TODAY] - Entries data:', entries);
        
        if (entriesError) {
          console.error('[LOAD_TODAY] ❌ Entries query error:', entriesError);
        }
        
        // Group entries by client
        const allEntries = entries || [];
        const activeByClient: Record<string, TimeEntry | null> = {};
        const pausedByClient: Record<string, TimeEntry[]> = {};
        const completedByClient: Record<string, TimeEntry[]> = {};
        
        let activeCount = 0;
        let pausedCount = 0;
        let completedCount = 0;
        
        allEntries.forEach((entry: TimeEntry) => {
          const client = entry.client_name;
          
          console.log('[LOAD_TODAY] Processing entry:', {
            id: entry.id,
            description: entry.task_description,
            client: client,
            ended_at: entry.ended_at,
            paused_at: entry.paused_at,
            status: !entry.ended_at && !entry.paused_at ? 'ACTIVE' : 
                    !entry.ended_at && entry.paused_at ? 'PAUSED' : 
                    entry.ended_at ? 'COMPLETED' : 'UNKNOWN'
          });
          
          if (!entry.ended_at && !entry.paused_at) {
            // Active task
            activeByClient[client] = entry;
            activeCount++;
            console.log('[LOAD_TODAY] ✅ Categorized as ACTIVE');
          } else if (!entry.ended_at && entry.paused_at) {
            // Paused task
            if (!pausedByClient[client]) pausedByClient[client] = [];
            pausedByClient[client].push(entry);
            pausedCount++;
            console.log('[LOAD_TODAY] ✅ Categorized as PAUSED');
          } else if (entry.ended_at) {
            // Completed task
            if (!completedByClient[client]) completedByClient[client] = [];
            completedByClient[client].push(entry);
            completedCount++;
            console.log('[LOAD_TODAY] ✅ Categorized as COMPLETED');
          }
        });
        
        console.log('[LOAD_TODAY] Summary - Active:', activeCount, 'Paused:', pausedCount, 'Completed:', completedCount);
        
        setActiveEntryByClient(activeByClient);
        setPausedTasksByClient(pausedByClient);
        setTimeEntriesByClient(completedByClient);
        
        console.log('[LOAD_TODAY] ✅ State updated successfully');
      } else {
        console.log('[LOAD_TODAY] ⚠️ No report found for today');
        console.log('[LOAD_TODAY] ⚠️ This will clear all tasks!');
        console.log('[LOAD_TODAY] ⚠️ Query was: user_id =', user.id, ', report_date =', today);
        // Clear all state if no report
        setReportId(null);
        setActiveEntryByClient({});
        setPausedTasksByClient({});
        setTimeEntriesByClient({});
      }
    } catch (error) {
      console.error('[LOAD_TODAY] Unexpected error:', error);
    } finally {
      setLoading(false);
      console.log('[LOAD_TODAY] Complete');
    }
  };

  const handleClockIn = async () => {
    // 🔥 CRITICAL FIX: Check if user is already clocked in TODAY (using EST date)
    const today = getDateKeyEST(nowEST());
    
    try {
      const { data: existingClockIn, error } = await supabase
        .from('eod_clock_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .is('clocked_out_at', null)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned (which is fine)
        console.error('Error checking clock-in status:', error);
      }
      
      if (existingClockIn) {
        // 🚨 STALE CLOCK-IN DETECTED!
        // Check if it's been more than 30 minutes since clock-in
        const clockInTime = new Date(existingClockIn.clocked_in_at).getTime();
        const now = Date.now();
        const minutesSinceClockIn = (now - clockInTime) / (1000 * 60);
        
        console.log(`[Clock-In] Found existing clock-in from ${minutesSinceClockIn.toFixed(1)} minutes ago`);
        
        // 🔥 CRITICAL: Check if there's ANY work activity today
        const hasActiveTask = activeEntry !== null;
        const hasPausedTasks = Object.values(pausedTasksByClient).flat().length > 0;
        const hasCompletedTasks = Object.values(timeEntriesByClient).flat().length > 0;
        const hasAnyWorkActivity = hasActiveTask || hasPausedTasks || hasCompletedTasks;
        
        console.log(`[Clock-In] Work activity check:`, {
          hasActiveTask,
          hasPausedTasks,
          hasCompletedTasks,
          hasAnyWorkActivity
        });
        
        // Only auto-close if it's truly stale (old + no work at all)
        if (minutesSinceClockIn > 30 && !hasAnyWorkActivity) {
          console.log('[Clock-In] 🔧 AUTO-FIXING: Closing truly stale clock-in (no work activity detected)');
          
          // Auto-close the stale clock-in
          const { error: updateError } = await supabase
            .from('eod_clock_ins')
            .update({ clocked_out_at: nowEST().toISOString() })
            .eq('id', existingClockIn.id);
          
          if (updateError) {
            console.error('Error auto-closing stale clock-in:', updateError);
            toast({ 
              title: 'Error', 
              description: 'Could not close previous session. Please contact support.',
              variant: 'destructive' 
            });
            return;
          }
          
          toast({ 
            title: '🔧 Auto-fixed stale session', 
            description: 'Previous clock-in was automatically closed (no work activity detected). You can now clock in again.',
          });
          
          // Clear the stale clock-in from state
          setClockIn(null);
          setClientClockIns({});
          
          // Continue to show modal
        } else {
          // It's a legitimate clock-in - don't allow duplicate
          const reason = hasAnyWorkActivity 
            ? 'You have active or paused tasks.' 
            : `You clocked in ${minutesSinceClockIn.toFixed(0)} minutes ago.`;
          
          toast({ 
            title: 'Already clocked in', 
            description: `${reason} Please clock out first.`,
            variant: 'destructive' 
          });
          return;
        }
      }
    } catch (e: any) {
      console.error('Error in handleClockIn:', e);
    }
    
    // Show the clock-in modal to collect shift plan and task goal
    console.log('[Clock-In] Opening modal...');
    setClockInModalOpen(true);
  };

  const handleClockInSubmit = async (plannedShiftMinutes: number, dailyTaskGoal: number) => {
    setLoading(true);
    try {
      // Use EST date and time, not local timezone
      const today = getDateKeyEST(nowEST());
      const now = nowEST().toISOString();
      const { data, error} = await supabase
        .from('eod_clock_ins')
        .insert([{ 
          user_id: user.id, 
          clocked_in_at: now,
          date: today,
          planned_shift_minutes: plannedShiftMinutes,
          daily_task_goal: dailyTaskGoal,
          client_name: selectedClient // 🔥 STORE which client you clocked in for
        }])
        .select('*')
        .single();
      
      if (error) throw error;
      setClockIn(data);
      
      // 🔥 CRITICAL FIX: Only update the SELECTED client's clock-in
      // Other clients remain null (not clocked in)
      setClientClockIns(prev => ({
        ...prev,
        [selectedClient]: data
      }));
      
      // Close the modal
      setClockInModalOpen(false);
      
      // Initialize audio for notifications
      initializeAudio();
      console.log('[Clock-in] Audio initialized, mood check will appear in 2 seconds');
      
      toast({ 
        title: '🚀 Shift Started!', 
        description: `Clocked in at ${new Date(now).toLocaleTimeString()} • Goal: ${dailyTaskGoal} tasks in ${Math.floor(plannedShiftMinutes / 60)}h ${plannedShiftMinutes % 60}m` 
      });
      
      // 🔥 CRITICAL FIX: Trigger first mood check after 2 seconds
      setTimeout(() => {
        playNotificationSound();
        setMoodCheckOpen(true);
        setLastMoodCheckTime(Date.now());
      }, 2000);
      
      // 🔥 CRITICAL FIX: Initialize energy check timer (will trigger via notification engine)
      // Set lastEnergyCheckTime to "now" so the notification engine will trigger it in 30 minutes
      setLastEnergyCheckTime(Date.now());
      
      // 📅 Check for scheduled templates and auto-add to queue
      await checkScheduledTemplates();
      
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
      
      // Reset check-in times so they start fresh on next clock-in
      setLastMoodCheckTime(0);
      setLastEnergyCheckTime(0);
      
      // Clear all triggered milestones
      setTriggeredMilestones({});
      
      console.log('[Clock-out] Check-in times and milestones reset');
      toast({ title: 'Clocked Out', description: `Ended at ${new Date(now).toLocaleTimeString()}` });
    } catch (e: any) {
      toast({ title: 'Failed to clock out', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Client-specific clock in/out functions
  const loadClientClockIns = async (clientList?: Array<{ name: string; email?: string; timezone?: string }>, forceReload = false) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('No user found, skipping clock-ins load');
        return;
      }

      // Use EST date, not local timezone
      const today = getDateKeyEST(nowEST());
      
      console.log('=== LOADING CLIENT CLOCK-INS (EST) ===');
      console.log('Force reload:', forceReload);
      console.log('EST Today:', today);
      
      const { data: clockIns, error } = await (supabase as any)
        .from('eod_clock_ins')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('date', today);

      if (error) {
        console.error('Error querying clock-ins:', error);
        throw error;
      }

      console.log('Loaded clock-ins from database:', clockIns?.length || 0);

      // Use provided clientList or fall back to clients state
      const clientsToUse = clientList || clients;
      
      // 🔥 FIXED: Match clock-ins by client_name
      // Find the active clock-in for today
      const activeClockIn = clockIns?.find((c: any) => !c.clocked_out_at) || null;
      
      console.log('Active clock-in found:', activeClockIn ? 'YES' : 'NO');
      if (activeClockIn) {
        console.log('Clock-in for client:', activeClockIn.client_name);
        console.log('Clock-in time:', activeClockIn.clocked_in_at);
      }
      
      // Match each client to their clock-in by client_name
      const clockInMap: Record<string, ClockIn | null> = {};
      clientsToUse.forEach(client => {
        const clientClockIn = clockIns?.find((c: any) => 
          c.client_name === client.name && !c.clocked_out_at
        );
        clockInMap[client.name] = clientClockIn || null;
      });
      
      // Also update the global clockIn state (for any active clock-in)
      setClockIn(activeClockIn);

      // Update state - this will NOT clear existing clock-ins, only update them
      setClientClockIns(clockInMap);
      
      const activeCount = Object.values(clockInMap).filter(c => c && !c.clocked_out_at).length;
      console.log('Clock-in state updated for', Object.keys(clockInMap).length, 'clients, active:', activeCount);
      console.log('=== END LOAD CLOCK-INS ===');
    } catch (e: any) {
      console.error('Failed to load client clock-ins:', e);
      toast({
        title: 'Error Loading Clock-Ins',
        description: 'Failed to load clock-in status. Please refresh the page.',
        variant: 'destructive'
      });
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
      // Use EST date and time, not local timezone
      const today = getDateKeyEST(nowEST());
      const now = nowEST().toISOString();
      
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

      // Initialize audio for notifications (if not already initialized)
      initializeAudio();
      console.log('[Client Clock-in] Audio initialized for', clientName);
      
      // Trigger initial mood check after 2 seconds
      setTimeout(() => {
        console.log('[Client Clock-in] Triggering initial mood check for', clientName);
        playNotificationSound();
        setMoodCheckOpen(true);
        setLastMoodCheckTime(Date.now());
      }, 2000);

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
      if (!user) {
        console.log('No user found, skipping queue tasks load');
        return;
      }

      const { data, error } = await (supabase as any)
        .from('eod_queue_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error querying queue tasks:', error);
        throw error;
      }

      console.log('Loaded queue tasks from database:', data?.length || 0);

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
      toast({
        title: 'Error Loading Queue',
        description: 'Failed to load queued tasks. Please refresh the page.',
        variant: 'destructive'
      });
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

  const removeTaskFromQueue = async (taskId: string, clientName?: string) => {
    // 🔥 FIX: Don't require selectedClient - use clientName if provided, or find the task
    const targetClient = clientName || selectedClient;
    
    try {
      // Delete from database
      const { error } = await (supabase as any)
        .from('eod_queue_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Update local state - remove from all clients if no specific client
      setQueuedTasksByClient(prev => {
        const updated = { ...prev };
        if (targetClient) {
          updated[targetClient] = (prev[targetClient] || []).filter(t => t.id !== taskId);
        } else {
          // Remove from all clients if we don't know which one
          Object.keys(updated).forEach(client => {
            updated[client] = updated[client].filter(t => t.id !== taskId);
          });
        }
        return updated;
      });

      toast({ title: 'Task Removed', description: 'Task removed from queue' });
    } catch (error: any) {
      console.error('Error removing task from queue:', error);
      toast({ title: 'Error', description: 'Failed to remove task', variant: 'destructive' });
    }
  };

  // ✨ RECURRING TASK TEMPLATES Functions
  const loadTaskTemplates = async (clientFilter?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found, skipping templates load');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      // Load templates
      let templatesQuery = (supabase as any)
        .from('recurring_task_templates')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by client if provided
      if (clientFilter) {
        templatesQuery = templatesQuery.eq('default_client', clientFilter);
      }

      // If not admin, only show user's own templates
      if (!isAdmin) {
        templatesQuery = templatesQuery.eq('user_id', user.id);
      }

      const { data: templatesData, error: templatesError } = await templatesQuery;

      if (templatesError) {
        console.error('Error loading templates:', templatesError);
        throw templatesError;
      }

      // If admin, fetch user profiles for all template creators
      if (isAdmin && templatesData && templatesData.length > 0) {
        const userIds = [...new Set(templatesData.map((t: any) => t.user_id))] as string[];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, first_name, last_name, email')
          .in('user_id', userIds);

        if (!profilesError && profilesData) {
          // Create a map of user_id to profile
          const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
          
          // Attach profile data to each template
          const enrichedTemplates = templatesData.map((template: any) => ({
            ...template,
            profiles: profilesMap.get(template.user_id) || null
          }));
          
          console.log('Loaded task templates for client:', clientFilter || 'all', '- Count:', enrichedTemplates.length, '(All users - Admin view)');
          setTaskTemplates(enrichedTemplates);
          return;
        }
      }

      console.log('Loaded task templates for client:', clientFilter || 'all', '- Count:', templatesData?.length || 0, isAdmin ? '(All users - Admin view)' : '(Your templates)');
      setTaskTemplates(templatesData || []);
    } catch (error) {
      console.error('Error loading task templates:', error);
      toast({
        title: 'Error Loading Templates',
        description: 'Failed to load task templates. Please refresh the page.',
        variant: 'destructive'
      });
    }
  };

  const saveTaskTemplate = async (template: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (template.id) {
        // Update existing template
        const { error } = await (supabase as any)
          .from('recurring_task_templates')
          .update({
            template_name: template.template_name,
            description: template.description,
            default_client: template.default_client,
            default_task_type: template.default_task_type,
            default_categories: template.default_categories,
            default_priority: template.default_priority,
            auto_queue_enabled: template.auto_queue_enabled
          })
          .eq('id', template.id);

        if (error) throw error;

        toast({ title: 'Template Updated', description: 'Task template updated successfully' });
      } else {
        // Create new template
        const { error } = await (supabase as any)
          .from('recurring_task_templates')
          .insert([{
            user_id: user.id,
            template_name: template.template_name,
            description: template.description,
            default_client: template.default_client,
            default_task_type: template.default_task_type,
            default_categories: template.default_categories,
            default_priority: template.default_priority,
            auto_queue_enabled: template.auto_queue_enabled
          }]);

        if (error) throw error;

        toast({ 
          title: '✨ Template Created', 
          description: 'Task template saved successfully',
          className: 'bg-green-50 border-green-200'
        });
      }

      // Reload templates for current client
      await loadTaskTemplates(selectedClient);
    } catch (error: any) {
      console.error('Error saving template:', error);
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    }
  };

  const scheduleTemplate = async (template: any, scheduleDate: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('[Schedule Template] Scheduling:', {
        template_name: template.template_name,
        template_id: template.id,
        schedule_date: scheduleDate,
        user_id: user.id
      });

      // Update the template with the scheduled date
      const { error } = await (supabase as any)
        .from('recurring_task_templates')
        .update({ scheduled_date: scheduleDate })
        .eq('id', template.id)
        .eq('user_id', user.id); // 🔒 SECURITY: Only update own templates

      if (error) {
        console.error('[Schedule Template] Error:', error);
        throw error;
      }

      console.log('[Schedule Template] Successfully scheduled for:', scheduleDate);

      toast({
        title: '📅 Template Scheduled',
        description: `"${template.template_name}" will auto-add to your queue on ${new Date(scheduleDate).toLocaleDateString()}`,
        className: 'bg-blue-50 border-blue-200'
      });

      // Reload templates to show updated schedule
      await loadTaskTemplates(selectedClient);
      
      // Close dialog
      setScheduleDialogOpen(false);
      setSchedulingTemplate(null);
      setSelectedScheduleDate("");
    } catch (e: any) {
      console.error('[Schedule Template] Failed:', e);
      toast({ title: 'Failed to schedule template', description: e.message, variant: 'destructive' });
    }
  };

  const checkScheduledTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const todayEST = getDateKeyEST(nowEST());
      console.log('[Scheduled Templates] Checking for templates scheduled for:', todayEST);

      // Find templates scheduled for today
      const { data: scheduledTemplates, error } = await (supabase as any)
        .from('recurring_task_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('scheduled_date', todayEST);

      if (error) {
        console.error('[Scheduled Templates] Error fetching:', error);
        return;
      }

      console.log('[Scheduled Templates] Query result:', scheduledTemplates?.length || 0, 'templates found');

      if (scheduledTemplates && scheduledTemplates.length > 0) {
        console.log('[Scheduled Templates] Found templates:', scheduledTemplates.map(t => ({
          name: t.template_name,
          scheduled_date: t.scheduled_date,
          client: t.default_client
        })));
        
        // Add each scheduled template to the queue
        let addedCount = 0;
        for (const template of scheduledTemplates) {
          // Check if this template was already added today (prevent duplicates)
          const { data: existingTasks } = await (supabase as any)
            .from('eod_queue_tasks')
            .select('id')
            .eq('user_id', user.id)
            .eq('task_description', template.template_name || template.description)
            .gte('created_at', `${todayEST}T00:00:00`)
            .lte('created_at', `${todayEST}T23:59:59`);

          if (existingTasks && existingTasks.length > 0) {
            console.log('[Scheduled Templates] Template already added today, skipping:', template.template_name);
            // Still clear the schedule to prevent future attempts
            await (supabase as any)
              .from('recurring_task_templates')
              .update({ scheduled_date: null })
              .eq('id', template.id);
            continue;
          }

          console.log('[Scheduled Templates] Adding to queue:', template.template_name);
          await addTemplateToQueue(template);
          addedCount++;
          
          // Clear the scheduled_date after adding to queue
          console.log('[Scheduled Templates] Clearing schedule for:', template.template_name);
          await (supabase as any)
            .from('recurring_task_templates')
            .update({ scheduled_date: null })
            .eq('id', template.id);
        }

        // Only show notification if templates were actually added
        if (addedCount > 0) {

          // Show notification
          toast({
            title: `📅 ${addedCount} Scheduled Task${addedCount > 1 ? 's' : ''} Added`,
            description: `Your scheduled templates have been added to the queue`,
            className: 'bg-blue-50 border-blue-200',
            duration: 6000
          });

          // Log to notification center
          logNotification(
            `📅 ${addedCount} scheduled task${addedCount > 1 ? 's' : ''} auto-added to your queue`,
            'scheduled_tasks',
            'task'
          );
        }
        
        // Reload templates to update UI (button will turn blue)
        await loadTaskTemplates(selectedClient);
      } else {
        console.log('[Scheduled Templates] No templates scheduled for today');
      }
    } catch (e: any) {
      console.error('[Scheduled Templates] Error:', e);
    }
  };

  const deleteTaskTemplate = async (templateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 🔒 SECURITY: Check if user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      // Build delete query
      let deleteQuery = (supabase as any)
        .from('recurring_task_templates')
        .delete()
        .eq('id', templateId);

      // 🔒 SECURITY: Non-admins can only delete their own templates
      if (!isAdmin) {
        deleteQuery = deleteQuery.eq('user_id', user.id);
      }

      const { error } = await deleteQuery;

      if (error) throw error;

      setTaskTemplates(prev => prev.filter(t => t.id !== templateId));
      toast({ title: 'Template Deleted', description: 'Task template removed successfully' });
    } catch (error: any) {
      console.error('Error deleting template:', error);
      toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
    }
  };

  const addTemplateToQueue = async (template: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use template's default client or currently selected client
      const clientToUse = template.default_client || selectedClient;

      if (!clientToUse) {
        toast({ title: 'Error', description: 'Please select a client first', variant: 'destructive' });
        return;
      }

      // Create queued task from template
      const { data, error } = await (supabase as any)
        .from('eod_queue_tasks')
        .insert([{
          user_id: user.id,
          client_name: clientToUse,
          task_description: template.template_name || template.description || 'Scheduled Task'
        }])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const newTask: QueuedTask = {
        id: data.id,
        client_name: data.client_name,
        task_description: data.task_description,
        created_at: data.created_at
      };

      setQueuedTasksByClient(prev => ({
        ...prev,
        [clientToUse]: [...(prev[clientToUse] || []), newTask]
      }));

      // Auto-show the queue if we added to the current client
      if (clientToUse === selectedClient) {
        setShowQueue(true);
      }

      toast({ 
        title: '➕ Added to Queue', 
        description: `"${template.template_name}" added to your queue`,
        className: 'bg-green-50 border-green-200'
      });

      // If we added to a different client's queue, show a hint
      if (clientToUse !== selectedClient && selectedClient) {
        toast({
          title: 'Info',
          description: `Task added to ${clientToUse}'s queue. Switch clients to view it.`,
          className: 'bg-blue-50 border-blue-200'
        });
      }
    } catch (error: any) {
      console.error('Error adding template to queue:', error);
      toast({ title: 'Error', description: 'Failed to add task to queue', variant: 'destructive' });
    }
  };

  const handleSaveTaskTitle = async () => {
    if (!activeEntry || !editedTaskTitle.trim()) return;

    try {
      console.log('=== UPDATING TASK TITLE ===');
      console.log('Active entry ID:', activeEntry.id);
      console.log('Old title:', activeEntry.task_description);
      console.log('New title:', editedTaskTitle.trim());

      // Update the task title in the database
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({ task_description: editedTaskTitle.trim() })
        .eq('id', activeEntry.id)
        .eq('user_id', user.id); // 🔒 SECURITY: Verify ownership

      if (error) {
        console.error('Error updating task title:', error);
        throw error;
      }

      // Update the local state
      setActiveEntryByClient(prev => ({
        ...prev,
        [selectedClient]: {
          ...activeEntry,
          task_description: editedTaskTitle.trim()
        }
      }));

      console.log('✅ Task title updated successfully');
      
      // Close the edit mode
      setEditingTaskTitle(false);
      setEditedTaskTitle("");

      toast({ 
        title: 'Task Updated', 
        description: 'Task title has been updated successfully' 
      });
    } catch (error: any) {
      console.error('Error saving task title:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update task title', 
        variant: 'destructive' 
      });
    }
  };

  const handleSaveHistoryTaskTitle = async (taskId: string) => {
    if (!editedHistoryTaskTitle.trim()) return;

    try {
      console.log('=== UPDATING HISTORY TASK TITLE ===');
      console.log('Task ID:', taskId);
      console.log('New title:', editedHistoryTaskTitle.trim());

      // Update in eod_submission_tasks table (for completed/submitted tasks)
      const { error } = await (supabase as any)
        .from('eod_submission_tasks')
        .update({ task_description: editedHistoryTaskTitle.trim() })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating history task title:', error);
        throw error;
      }

      // Update local state
      setSubmissionTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, task_description: editedHistoryTaskTitle.trim() }
            : task
        )
      );

      console.log('✅ History task title updated successfully');
      
      // Close edit mode
      setEditingHistoryTaskId(null);
      setEditedHistoryTaskTitle("");

      toast({ 
        title: 'Task Updated', 
        description: 'Task title has been updated successfully' 
      });
    } catch (error: any) {
      console.error('Error saving history task title:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to update task title', 
        variant: 'destructive' 
      });
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

    // 🔥 FIX: Store the queue task ID so we can remove it AFTER successful task creation
    // Don't remove from queue yet - wait until task is successfully created
    setPendingQueueTaskId(task.id);
    
    // Get client info
    const client = clients.find(c => c.name === task.client_name);
    
    // Start the timer automatically with client info and task description passed directly
    // The queue task will be removed in startTimerWithSettings AFTER successful creation
    await startTimer(task.client_name, client?.email || "", task.task_description);
  };

  // Open task settings modal before starting timer
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
    
    // Store the task details temporarily and open the settings modal
    setPendingTaskSettings({
      clientName: effectiveClientName,
      clientEmail: effectiveClientEmail,
      taskDescription: effectiveTaskDescription,
    } as any);
    setTaskSettingsModalOpen(true);
  };

  // Actually create the task with settings
  const startTimerWithSettings = async (settings: TaskSettings) => {
    if (!pendingTaskSettings) return;
    
    const { clientName: effectiveClientName, clientEmail: effectiveClientEmail, taskDescription: effectiveTaskDescription } = pendingTaskSettings as any;
    
    setLoading(true);
    try {
      let eodId = reportId;
      if (!eodId) {
        // 🐛 FIX: Use EST date to match loadToday() query
        const now = nowEST();
        const reportDate = getDateKeyEST(now); // Use EST date key
        const { data, error} = await supabase
          .from('eod_reports')
          .insert([{ 
            user_id: user.id, 
            started_at: now.toISOString(),
            report_date: reportDate
          }])
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
          status: 'in_progress',
          task_type: settings.task_type,
          goal_duration_minutes: settings.goal_duration_minutes,
          task_intent: settings.task_intent,
          task_categories: settings.task_categories,
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
      
      // 🔥 FIX: Remove from queue AFTER successful task creation (not before)
      if (pendingQueueTaskId) {
        console.log('[QUEUE] Task started successfully, now removing from queue:', pendingQueueTaskId);
        try {
          const { error: deleteError } = await (supabase as any)
            .from('eod_queue_tasks')
            .delete()
            .eq('id', pendingQueueTaskId);
          
          if (deleteError) {
            console.error('[QUEUE] Error removing from queue:', deleteError);
          } else {
            console.log('[QUEUE] ✅ Successfully removed from queue');
            // Update local state
            setQueuedTasksByClient(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(client => {
                updated[client] = updated[client].filter(t => t.id !== pendingQueueTaskId);
              });
              return updated;
            });
          }
        } catch (queueError) {
          console.error('[QUEUE] Exception removing from queue:', queueError);
        }
        setPendingQueueTaskId(null);
        toast({ title: 'Task Started from Queue', description: `Working on: ${effectiveClientName}` });
      } else {
        toast({ title: 'Timer started', description: `Working on: ${effectiveClientName}` });
      }
      
      setPendingTaskSettings(null);
      setTaskSettingsModalOpen(false);
    } catch (e: any) {
      // 🔥 FIX: If task creation fails, clear the pending queue task ID but DON'T remove from queue
      setPendingQueueTaskId(null);
      toast({ title: 'Failed to start', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const stopTimer = async () => {
    if (!activeEntry) return;
    
    // Require comments before completing
    if (!activeTaskComments || !activeTaskComments.trim()) {
      toast({ 
        title: 'Comments Required', 
        description: 'Please add comments before completing the task', 
        variant: 'destructive',
        duration: 5000
      });
      return;
    }
    
    // Require task priority before completing
    if (!activeTaskPriority || !activeTaskPriority.trim()) {
      toast({ 
        title: 'Task Priority Required', 
        description: 'Please select a task priority before completing this task.', 
        variant: 'destructive',
        duration: 5000,
        className: 'bg-red-50 border-red-200'
      });
      return;
    }
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const startTime = new Date(activeEntry.started_at).getTime();
      const endTime = new Date(now).getTime();
      
      // Calculate current session duration in seconds
      const currentSessionSeconds = Math.floor((endTime - startTime) / 1000);
      
      // Add accumulated seconds from previous sessions (if task was paused/resumed)
      const accumulatedSeconds = activeEntry.accumulated_seconds || 0;
      const totalSeconds = currentSessionSeconds + accumulatedSeconds;
      
      // Ensure we always have at least 0 minutes (never negative or null)
      const durationMinutes = Math.max(0, Math.floor(totalSeconds / 60));

      console.log('=== COMPLETE TASK ===');
      console.log('Task:', activeEntry.task_description);
      console.log('Task ID:', activeEntry.id);
      console.log('EOD Report ID:', activeEntry.eod_id);
      console.log('Current session seconds:', currentSessionSeconds);
      console.log('Accumulated seconds:', accumulatedSeconds);
      console.log('Total seconds:', totalSeconds);
      console.log('Final duration (minutes):', durationMinutes);

      // 🔥 CRITICAL: Update with ALL fields to ensure data integrity
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({ 
          ended_at: now, 
          duration_minutes: durationMinutes, // Guaranteed to be >= 0
          accumulated_seconds: totalSeconds, // ✅ Save the actual accumulated time!
          comments: activeTaskComments || null,
          task_link: activeTaskLink || null,
          status: activeTaskStatus,
          task_priority: activeTaskPriority || null,
          comment_images: activeTaskImages.length > 0 ? activeTaskImages : null,
          // ✅ CRITICAL: Do NOT update task_description, client_name, eod_id - they should never change
        })
        .eq('id', activeEntry.id)
        .eq('user_id', user.id); // 🔒 SECURITY: Verify ownership

      if (error) {
        console.error('[COMPLETE] Database error:', error);
        throw error;
      }
      
      console.log('✅ Task completed successfully, duration saved:', durationMinutes, 'minutes');
      
      // 🔥 CRITICAL: Verify the task was actually saved
      const { data: verifyTask, error: verifyError } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .eq('id', activeEntry.id)
        .single();
      
      if (verifyError) {
        console.error('[COMPLETE] Verification error:', verifyError);
      } else {
        console.log('[COMPLETE] ✅ Verified task in database:', {
          id: verifyTask.id,
          description: verifyTask.task_description,
          ended_at: verifyTask.ended_at,
          duration_minutes: verifyTask.duration_minutes,
          accumulated_seconds: verifyTask.accumulated_seconds
        });
      }
      
      setStoppedEntry({
        ...activeEntry,
        ended_at: now,
        duration_minutes: durationMinutes,
        started_at_formatted: new Date(activeEntry.started_at).toLocaleString(),
        ended_at_formatted: new Date(now).toLocaleString(),
        duration_formatted: `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60}m`,
      });
      setStopDialog(true);
      
      // Trigger task enjoyment popup (no cleanup needed as component stays mounted)
      setCompletedTaskForEnjoyment(activeEntry.task_description);
      setCompletedTaskIdForEnjoyment(activeEntry.id); // Store ID for database update
      
      // Clear triggered milestones for this task (it's done)
      setTriggeredMilestones(prev => {
        const updated = { ...prev };
        delete updated[activeEntry.id];
        return updated;
      });
      
      setTimeout(() => {
        playNotificationSound();
        setTaskEnjoymentOpen(true);
      }, 1000); // Show 1 second after task completion dialog
      
      // Clear active task details for this client
      if (selectedClient) {
        setActiveEntryByClient(prev => ({ ...prev, [selectedClient]: null }));
        setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: "in_progress" }));
        setActiveTaskPriorityByClient(prev => ({ ...prev, [selectedClient]: "" })); // 🐛 FIX: Clear priority!
        setActiveTaskImagesByClient(prev => ({ ...prev, [selectedClient]: [] }));
        setLiveDurationByClient(prev => ({ ...prev, [selectedClient]: 0 }));
        setLiveSecondsByClient(prev => ({ ...prev, [selectedClient]: 0 }));
      }
      
      await loadToday();
      
      // 🔥 TASK COMPLETION EVENT ENGINE - Trigger all systems
      console.log('=== TASK COMPLETION ENGINE START ===');
      
      // 1️⃣ Log task completion to notification center
      logNotification(
        `✅ Task Completed: ${activeEntry.task_description.substring(0, 50)}${activeEntry.task_description.length > 50 ? '...' : ''} (${durationMinutes} min)`,
        'task_completed',
        'task',
        activeEntry.id
      );
      
      // 2️⃣ Calculate and display points (database trigger handles actual awarding)
      // Points are auto-calculated by the database trigger, but we show a notification
      const taskType = activeEntry.task_type || 'Standard Task';
      const taskPriority = activeTaskPriority || 'Daily Task';
      
      // Estimate points for display (actual calculation is in database)
      let estimatedPoints = 5; // Base for Standard Task
      if (taskType === 'Quick Task') estimatedPoints = 3;
      else if (taskType === 'Deep Work Task') estimatedPoints = 10;
      else if (taskType === 'Long Task') estimatedPoints = 12;
      else if (taskType === 'Very Long Task') estimatedPoints = 15;
      
      // Add priority bonus
      if (taskPriority === 'Immediate Impact Task') estimatedPoints += 5;
      else if (taskPriority === 'Daily Task') estimatedPoints += 3;
      else if (taskPriority === 'Weekly Task') estimatedPoints += 2;
      else if (taskPriority === 'Monthly Task' || taskPriority === 'Evergreen Task') estimatedPoints += 1;
      else if (taskPriority === 'Trigger Task') estimatedPoints += 3;
      
      // Show points notification
      setTimeout(() => {
        toast({
          title: `+${estimatedPoints} Points Earned! 🎯`,
          description: `${taskType} • ${taskPriority}`,
          duration: 5000,
          className: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300'
        });
      }, 500);
      
      // Log points to notification center
      logNotification(
        `🎯 +${estimatedPoints} Points: ${taskType} • ${taskPriority}`,
        'points_awarded',
        'points',
        activeEntry.id
      );
      
      // 3️⃣ Check goal accuracy and notify
      if (activeEntry.goal_duration_minutes && activeEntry.goal_duration_minutes > 0) {
        const goalMinutes = activeEntry.goal_duration_minutes;
        const actualMinutes = durationMinutes;
        const difference = Math.abs(actualMinutes - goalMinutes);
        const accuracyPercent = goalMinutes > 0 ? (difference / goalMinutes) * 100 : 0;
        
        if (accuracyPercent <= 20) {
          // Within ±20% - excellent accuracy!
          setTimeout(() => {
            playNotificationSound();
            toast({
              title: '⏱️ Perfect Timing!',
              description: `Goal: ${goalMinutes}min • Actual: ${actualMinutes}min • +3 Accuracy Bonus!`,
              duration: 6000,
              className: 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
            });
          }, 1500);
          
          logNotification(
            `⏱️ Accurate Estimation: ${actualMinutes}/${goalMinutes} min (+3 pts)`,
            'goal_accuracy',
            'achievement',
            activeEntry.id
          );
        } else if (actualMinutes > goalMinutes) {
          // Took longer than expected
          logNotification(
            `⏳ Task took longer: ${actualMinutes}/${goalMinutes} min (${Math.round(accuracyPercent)}% over)`,
            'goal_miss',
            'insight',
            activeEntry.id
          );
        } else {
          // Completed faster than expected
          logNotification(
            `⚡ Completed faster: ${actualMinutes}/${goalMinutes} min (${Math.round(100 - accuracyPercent)}% faster)`,
            'goal_beat',
            'achievement',
            activeEntry.id
          );
        }
      }
      
      // 4️⃣ Check for Daily Goal Achievement
      if (clockIn && (clockIn as any).daily_task_goal) {
        const dailyGoal = (clockIn as any).daily_task_goal;
        
        // Count completed tasks today (using ended_at for date filtering)
        // NOTE: eod_time_entries doesn't have a "date" column, use ended_at instead
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        const { data: completedToday } = await (supabase as any)
          .from('eod_time_entries')
          .select('id')
          .eq('user_id', user.id)
          .gte('ended_at', todayStart.toISOString())
          .not('ended_at', 'is', null);
        
        // No need to add +1 because this runs AFTER loadToday() which already loaded the completed task
        const completedCount = completedToday?.length || 0;
        
        console.log(`[Task Completion] Daily goal check: ${completedCount}/${dailyGoal} tasks completed today`);
        
        // Check if goal just met or exceeded
        if (completedCount === dailyGoal) {
          // Goal exactly met!
          setTimeout(() => {
            playNotificationSound();
            toast({
              title: '✨ Daily Goal Achieved!',
              description: `You completed ${completedCount}/${dailyGoal} tasks! +10 Points!`,
              duration: 8000,
              className: 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300'
            });
          }, 2000);
          
          logNotification(
            `✨ Daily Goal Achieved! ${completedCount}/${dailyGoal} tasks (+10 pts)`,
            'daily_goal_met',
            'achievement',
            null
          );
        } else if (completedCount === dailyGoal + 1) {
          // Goal exceeded for the first time!
          setTimeout(() => {
            playNotificationSound();
            toast({
              title: '🏆 You Beat Your Task Goal!',
              description: `${completedCount}/${dailyGoal} tasks completed! +15 Points!`,
              duration: 8000,
              className: 'bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300'
            });
          }, 2000);
          
          logNotification(
            `🏆 Goal Exceeded! ${completedCount}/${dailyGoal} tasks (+15 pts)`,
            'daily_goal_exceeded',
            'achievement',
            null
          );
        } else {
          // Show progress towards goal
          logNotification(
            `📊 Daily Progress: ${completedCount}/${dailyGoal} tasks completed`,
            'daily_goal_progress',
            'progress',
            null
          );
        }
      }
      
      // 5️⃣ Check for high-priority completion bonus
      if (taskPriority === 'Immediate Impact Task') {
        logNotification(
          `🔥 High-Priority Task Completed! (+5 priority bonus)`,
          'priority_completion',
          'achievement',
          activeEntry.id
        );
      }
      
      // 6️⃣ Check for deep work completion
      if (taskType === 'Deep Work Task' || taskType === 'Long Task' || taskType === 'Very Long Task') {
        logNotification(
          `🧠 Deep Work Completed: ${durationMinutes} minutes of focused work`,
          'deep_work',
          'achievement',
          activeEntry.id
        );
      }
      
      // 7️⃣ Log behavior data for metrics (momentum, consistency, energy)
      console.log('[Task Completion] Behavior data logged for metrics calculation');
      console.log('- Task Type:', taskType);
      console.log('- Priority:', taskPriority);
      console.log('- Duration:', durationMinutes, 'minutes');
      console.log('- Time of Day:', new Date().getHours());
      
      console.log('=== TASK COMPLETION ENGINE END ===');
    } catch (e: any) {
      toast({ title: 'Failed to complete', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const pauseTimer = async () => {
    if (!activeEntry) {
      console.error('[PAUSE] No active entry found');
      return;
    }
    
    console.log('[PAUSE] Starting pause for task:', activeEntry.task_description);
    console.log('[PAUSE] Task ID:', activeEntry.id);
    console.log('[PAUSE] Client:', selectedClient);
    
    setLoading(true);
    try {
      const now = new Date().toISOString();
      
      // Calculate accumulated time up to this pause
      const start = new Date(activeEntry.started_at);
      const pauseTime = new Date(now);
      const currentSessionSeconds = Math.floor((pauseTime.getTime() - start.getTime()) / 1000);
      const previousAccumulated = activeEntry.accumulated_seconds || 0;
      const totalAccumulated = previousAccumulated + currentSessionSeconds;
      
      console.log('[PAUSE] Current session seconds:', currentSessionSeconds);
      console.log('[PAUSE] Previous accumulated:', previousAccumulated);
      console.log('[PAUSE] Total accumulated:', totalAccumulated);
      
      // 🔥 CRITICAL: Update with ALL fields to prevent data loss
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({ 
          paused_at: now,
          accumulated_seconds: totalAccumulated,
          comments: activeTaskComments || null,
          task_link: activeTaskLink || null,
          status: activeTaskStatus,
          task_priority: activeTaskPriority || null,
          comment_images: activeTaskImages.length > 0 ? activeTaskImages : null,
          // ✅ CRITICAL: Do NOT update task_description - it should never change
        })
        .eq('id', activeEntry.id)
        .eq('user_id', user.id); // 🔒 SECURITY: Verify ownership

      if (error) {
        console.error('[PAUSE] Database error:', error);
        throw error;
      }
      
      console.log('[PAUSE] ✅ Database updated successfully');
      
      // DON'T clear triggered milestones on pause - keep them for when resumed
      // Task is still ongoing, just paused
      
      // Clear active task details for this client
      if (selectedClient) {
        console.log('[PAUSE] Clearing active state for client:', selectedClient);
        setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: "in_progress" }));
        setActiveTaskPriorityByClient(prev => ({ ...prev, [selectedClient]: "" }));
        setActiveTaskImagesByClient(prev => ({ ...prev, [selectedClient]: [] }));
        setLiveDurationByClient(prev => ({ ...prev, [selectedClient]: 0 }));
        setLiveSecondsByClient(prev => ({ ...prev, [selectedClient]: 0 }));
      }
      
      // 🔥 CRITICAL: Reload state to ensure UI reflects paused task
      console.log('[PAUSE] Reloading today\'s data...');
      await loadToday();
      console.log('[PAUSE] ✅ Data reloaded successfully');
      
      toast({ 
        title: '⏸️ Task Paused', 
        description: `${activeEntry.task_description.substring(0, 50)}... (${Math.floor(totalAccumulated / 60)}m accumulated)`,
        className: 'bg-yellow-50 border-yellow-200'
      });
    } catch (e: any) {
      console.error('[PAUSE] Error:', e);
      toast({ title: 'Failed to pause', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      console.log('[PAUSE] Complete');
    }
  };

  const resumeTimer = async (task: TimeEntry) => {
    if (activeEntry) {
      console.warn('[RESUME] Cannot resume - another task is active');
      toast({ title: 'Pause current task first', variant: 'destructive' });
      return;
    }
    
    console.log('[RESUME] Resuming task:', task.task_description);
    console.log('[RESUME] Task ID:', task.id);
    console.log('[RESUME] Accumulated seconds:', task.accumulated_seconds || 0);
    
    setLoading(true);
    try {
      // Reset started_at to now so we can calculate new session time
      const now = new Date().toISOString();
      
      // 🔥 CRITICAL: Only update paused_at and started_at - preserve ALL other data
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({ 
          paused_at: null,
          started_at: now  // Reset start time for new session
          // ✅ CRITICAL: Do NOT update any other fields - they should remain unchanged
        })
        .eq('id', task.id)
        .eq('user_id', user.id); // 🔒 SECURITY: Verify ownership

      if (error) {
        console.error('[RESUME] Database error:', error);
        throw error;
      }
      
      console.log('[RESUME] ✅ Database updated successfully');
      
      // Restore task details for this client
      if (selectedClient) {
        console.log('[RESUME] Restoring active state for client:', selectedClient);
        setActiveTaskCommentsByClient(prev => ({ ...prev, [selectedClient]: task.comments || "" }));
        setActiveTaskLinkByClient(prev => ({ ...prev, [selectedClient]: task.task_link || "" }));
        setActiveTaskStatusByClient(prev => ({ ...prev, [selectedClient]: task.status || "in_progress" }));
        setActiveTaskPriorityByClient(prev => ({ ...prev, [selectedClient]: task.task_priority || "" }));
        setActiveTaskImagesByClient(prev => ({ ...prev, [selectedClient]: task.comment_images || [] }));
      }
      
      // 🔥 CRITICAL: Reload state to ensure UI reflects active task
      console.log('[RESUME] Reloading today\'s data...');
      await loadToday();
      console.log('[RESUME] ✅ Data reloaded successfully');
      
      toast({ 
        title: '▶️ Task Resumed', 
        description: task.task_description.substring(0, 50) + '...',
        className: 'bg-green-50 border-green-200'
      });
    } catch (e: any) {
      console.error('[RESUME] Error:', e);
      toast({ title: 'Failed to resume', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
      console.log('[RESUME] Complete');
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('eod_time_entries').delete().eq('id', id).eq('user_id', user.id); // 🔒 SECURITY: Verify ownership
      if (error) throw error;
      setTimeEntries(prev => prev.filter(e => e.id !== id));
      setPausedTasks(prev => prev.filter(e => e.id !== id));
      if (activeEntry?.id === id) setActiveEntry(null);
      toast({ title: 'Entry deleted' });
    } catch (e: any) {
      toast({ title: 'Failed to delete', description: e.message, variant: 'destructive' });
    }
  };

  const startEditingCompletedTask = (entry: TimeEntry) => {
    setEditingCompletedTaskId(entry.id);
    setEditedTaskData({
      task_description: entry.task_description,
      task_link: entry.task_link,
      comments: entry.comments,
      task_type: entry.task_type,
      task_priority: entry.task_priority,
      task_categories: entry.task_categories,
      task_intent: entry.task_intent,
      goal_duration_minutes: entry.goal_duration_minutes,
    });
  };

  const cancelEditingCompletedTask = () => {
    setEditingCompletedTaskId(null);
    setEditedTaskData({});
  };

  const saveEditedCompletedTask = async (entryId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update(editedTaskData)
        .eq('id', entryId)
        .eq('user_id', user.id); // 🔒 SECURITY: Verify ownership
      
      if (error) throw error;

      // Update local state
      setTimeEntries(prev => prev.map(e => 
        e.id === entryId ? { ...e, ...editedTaskData } : e
      ));

      toast({ 
        title: '✅ Task updated',
        description: 'Your changes have been saved.'
      });
      
      cancelEditingCompletedTask();
    } catch (e: any) {
      toast({ 
        title: 'Failed to update task', 
        description: e.message, 
        variant: 'destructive' 
      });
    }
  };

  const resumeCompletedTask = async (entry: TimeEntry) => {
    if (!window.confirm(`Resume "${entry.task_description}"? This will reopen the task as active.`)) {
      return;
    }

    try {
      const now = nowEST();
      
      // Update the task to mark it as active again
      const { error } = await (supabase as any)
        .from('eod_time_entries')
        .update({
          ended_at: null,
          paused_at: null,
          status: 'in_progress',
          started_at: now.toISOString(), // Reset start time to now
        })
        .eq('id', entry.id)
        .eq('user_id', user.id); // 🔒 SECURITY: Verify ownership
      
      if (error) throw error;

      // Move from completed to active
      setTimeEntries(prev => prev.filter(e => e.id !== entry.id));
      
      // Set as active entry
      setActiveEntry({
        ...entry,
        ended_at: null,
        paused_at: null,
        status: 'in_progress',
        started_at: now.toISOString(),
      });

      toast({ 
        title: '▶️ Task resumed',
        description: `"${entry.task_description}" is now active.`
      });

      await loadToday();
    } catch (e: any) {
      toast({ 
        title: 'Failed to resume task', 
        description: e.message, 
        variant: 'destructive' 
      });
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
        .eq('user_id', user.id) // 🔒 CRITICAL FIX: Only load current user's submissions
        .order('submitted_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAllSubmissions(data || []);
      setFilteredSubmissions(data || []); // Initially show all
      setSubmissions(data || []); // Keep for backward compatibility
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
    
    // Verify the report exists in the database
    const { data: existingReport, error: reportCheckError } = await supabase
      .from('eod_reports')
      .select('id')
      .eq('id', reportId)
      .maybeSingle();
    
    if (reportCheckError || !existingReport) {
      console.error('Report not found in database:', reportId, reportCheckError);
      toast({ 
        title: 'Report not found', 
        description: 'The report was deleted. Please refresh and try again.', 
        variant: 'destructive' 
      });
      // Force reload to get fresh data
      await loadToday();
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
      // Calculate total hours based on earliest clock-in to latest clock-out
      let earliestClockIn: string | null = null;
      let latestClockOut: string | null = null;
      
      // Find earliest clock-in and latest clock-out across all client sessions
      Object.values(clientClockIns).forEach(clockIn => {
        if (clockIn?.clocked_in_at) {
          // Track earliest clock-in
          if (!earliestClockIn || clockIn.clocked_in_at < earliestClockIn) {
            earliestClockIn = clockIn.clocked_in_at;
          }
          // Track latest clock-out
          if (clockIn.clocked_out_at && (!latestClockOut || clockIn.clocked_out_at > latestClockOut)) {
            latestClockOut = clockIn.clocked_out_at;
          }
        }
      });
      
      // Calculate total hours from earliest clock-in to latest clock-out
      let totalHours = 0;
      if (earliestClockIn) {
        const clockInTime = new Date(earliestClockIn);
        const clockOutTime = latestClockOut 
          ? new Date(latestClockOut) 
          : new Date(); // Use current time if still clocked in
        const diffMs = clockOutTime.getTime() - clockInTime.getTime();
        totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
      
      // Calculate total active task seconds from all completed tasks
      const { data: completedTasks, error: tasksError } = await supabase
        .from('eod_time_entries')
        .select('accumulated_seconds')
        .eq('eod_id', reportId)
        .not('ended_at', 'is', null);
      
      const totalActiveSeconds = (completedTasks || []).reduce((sum, task) => {
        return sum + (task.accumulated_seconds || 0);
      }, 0);
      
      console.log('📊 EOD Submission - Total Active Seconds:', totalActiveSeconds);
      
      // 🔥 CRITICAL FIX: Fetch shift goals from clock-in record
      const today = getDateKeyEST(nowEST());
      const { data: clockInRecord } = await supabase
        .from('eod_clock_ins')
        .select('planned_shift_minutes, daily_task_goal')
        .eq('user_id', user.id)
        .eq('date', today)
        .order('clocked_in_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log('📊 EOD Submission - Shift Goals:', {
        planned_shift_minutes: clockInRecord?.planned_shift_minutes,
        daily_task_goal: clockInRecord?.daily_task_goal
      });
      
      // 🔥 CRITICAL FIX: Get fresh auth user to avoid RLS issues
      const { data: { user: freshAuthUser }, error: authCheckError } = await supabase.auth.getUser();
      
      if (authCheckError || !freshAuthUser) {
        console.error('Auth check failed during submission:', authCheckError);
        throw new Error('Authentication session expired. Please log in again.');
      }
      
      console.log('=== EOD SUBMISSION AUTH CHECK ===');
      console.log('State user ID:', user?.id);
      console.log('Fresh auth user ID:', freshAuthUser.id);
      console.log('IDs match:', user?.id === freshAuthUser.id);
      
      // Create submission record using fresh auth user
      const { data: submission, error: submissionError } = await supabase
        .from('eod_submissions')
        .insert([{
          user_id: freshAuthUser.id,  // ✅ Use fresh auth user to match RLS policy
          report_id: reportId,
          clocked_in_at: earliestClockIn,
          clocked_out_at: latestClockOut || new Date().toISOString(),
          total_hours: totalHours,
          total_active_seconds: totalActiveSeconds,
          planned_shift_minutes: clockInRecord?.planned_shift_minutes || null,
          daily_task_goal: clockInRecord?.daily_task_goal || null,
        }])
        .select('*')
        .single();
      
      if (submissionError) {
        console.error('=== EOD SUBMISSION ERROR ===');
        console.error('Error code:', submissionError.code);
        console.error('Error message:', submissionError.message);
        console.error('Error details:', submissionError.details);
        console.error('Error hint:', submissionError.hint);
        console.error('User ID:', freshAuthUser.id);
        console.error('Report ID:', reportId);
        
        // Log error to console for debugging
        console.error('Full error object:', JSON.stringify(submissionError, null, 2));
        
        throw submissionError;
      }
      
      console.log('✅ EOD submission created successfully:', submission.id);
      
      // Fetch ALL time entries for this report from database (not just current client)
      const { data: allTimeEntries, error: entriesError } = await (supabase as any)
        .from('eod_time_entries')
        .select('*')
        .eq('eod_id', reportId);
      
      if (entriesError) throw entriesError;
      
      console.log('=== SUBMIT DAR - TASK ANALYSIS ===');
      console.log('Total time entries:', allTimeEntries?.length || 0);
      console.log('Completed tasks:', allTimeEntries?.filter(e => e.ended_at).length || 0);
      console.log('Active/Paused tasks:', allTimeEntries?.filter(e => !e.ended_at).length || 0);
      
      // Store task snapshots - only completed tasks
      const tasksToInsert = (allTimeEntries || [])
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
        console.log('✅ Saved', tasksToInsert.length, 'completed tasks to submission');
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
      
      // 🎯 CRITICAL: Save COMPREHENSIVE Smart DAR metrics snapshot for historical viewing
      // Using external service to completely avoid any closure/hoisting issues
      try {
        await saveSmartDARSnapshot({
          supabase,
          userId: freshAuthUser.id,
          submissionId: submission.id,
          snapshotDate: today,
          allTimeEntries: allTimeEntries || [],
          earliestClockIn,
          latestClockOut,
          clockInRecord,
          totalHours,
        });
      } catch (snapshotErr) {
        console.error('⚠️ Error in snapshot service:', snapshotErr);
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
      
      // ⚠️ CRITICAL FIX: Only delete COMPLETED tasks, preserve active/paused tasks
      try {
        // Get IDs of completed tasks that were saved to submission
        const completedTaskIds = (allTimeEntries || [])
          .filter(e => e.ended_at) // Only completed tasks
          .map(e => e.id);
        
        console.log('=== DAR SUBMISSION CLEANUP ===');
        console.log('Total tasks:', allTimeEntries?.length || 0);
        console.log('Completed tasks to delete:', completedTaskIds.length);
        console.log('Active/Paused tasks to preserve:', (allTimeEntries?.length || 0) - completedTaskIds.length);
        
        // Only delete COMPLETED time entries that were saved to submission
        if (completedTaskIds.length > 0) {
          await supabase
            .from('eod_time_entries')
            .delete()
            .in('id', completedTaskIds);
          
          console.log('✅ Deleted', completedTaskIds.length, 'completed tasks');
        }
        
        // Delete images
        await supabase
          .from('eod_report_images')
          .delete()
          .eq('eod_id', reportId);
        
        // Mark report as submitted (don't delete to preserve foreign key relationship)
        await supabase
          .from('eod_reports')
          .update({ submitted: true, submitted_at: new Date().toISOString() })
          .eq('id', reportId);
        
        console.log('✅ Cleaned up EOD report images and marked report as submitted');
        console.log('✅ Active/paused tasks preserved in database');
      } catch (cleanupError) {
        console.error('Error cleaning up old data:', cleanupError);
        // Don't fail the submission if cleanup fails
      }
      
      // Reload today's data to show remaining active/paused tasks
      await loadToday();
      
      // Clear images since they were submitted
      setImages([]);
      
      console.log('✅ DAR submission complete, active tasks preserved');
      
      // Reload submissions and switch to history tab
      await loadSubmissions();
      setActiveTab('history');
      
    } catch (e: any) {
      console.error('=== EOD SUBMISSION FAILED ===');
      console.error('Error:', e);
      console.error('User:', user?.id);
      console.error('Report ID:', reportId);
      console.error('Stack:', e.stack);
      
      // Show detailed error to user
      const errorMessage = e.message || 'Unknown error occurred';
      const isAuthError = errorMessage.includes('Authentication') || errorMessage.includes('session');
      
      toast({ 
        title: 'Failed to submit EOD', 
        description: isAuthError 
          ? 'Your session expired. Please refresh the page and try again.' 
          : errorMessage,
        variant: 'destructive',
        duration: 8000
      });
      
      // If auth error, redirect to login after delay
      if (isAuthError) {
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
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
    if ((minutes === null || minutes === undefined) && startedAt && endedAt) {
      const startTime = new Date(startedAt).getTime();
      const endTime = new Date(endedAt).getTime();
      minutes = Math.floor((endTime - startTime) / (1000 * 60));
    }
    
    // If still no minutes after calculation, return N/A
    if (minutes === null || minutes === undefined) return 'N/A';
    
    // Allow 0 minutes - some tasks might be very short
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
  };

  const totalMinutes = timeEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0);

  // 🏆 Load user points from database
  const [userPoints, setUserPoints] = useState(0);
  
  useEffect(() => {
    // Guard: Don't run if user not loaded yet
    if (!user?.id) return;
    
    const loadPoints = async () => {
      try {
        const { data, error } = await (supabase as any)
          .from('user_profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .single();
        
        if (!error && data) {
          setUserPoints(data.total_points || 0);
        }
      } catch (e) {
        console.error('Error loading points:', e);
      }
    };
    
    loadPoints();
    
    // Subscribe to real-time updates
    const channel = (supabase as any)
      .channel('points-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadPoints();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return (
    <div 
      className="flex flex-col md:flex-row h-screen overflow-hidden"
      style={{ background: PASTEL_COLORS.pageGradient }}
    >
      {/* 🏆 Points Badge - Fixed Top Right */}
      <div 
        className="fixed top-4 right-4 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm cursor-pointer transition-all duration-300 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #D8C8FF, #E8DDFF)',
          border: '2px solid #C7B8EA',
          boxShadow: '0 4px 12px rgba(199, 184, 234, 0.2)',
        }}
        title="Points System Active - Click to view details"
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            border: '1px solid rgba(199, 184, 234, 0.5)',
          }}
        >
          <span className="text-lg">🏆</span>
        </div>
        <div className="flex flex-col items-start">
          <span className="font-bold text-[#4A3F7A] leading-none">
            {userPoints.toLocaleString()}
          </span>
          <span className="text-[10px] text-[#6F6F6F] leading-none mt-0.5">
            points
          </span>
        </div>
      </div>
      
      {/* Mobile Header */}
      <div 
        className="md:hidden flex items-center justify-between p-4"
        style={{
          backgroundColor: PASTEL_COLORS.white,
          borderBottom: `1px solid ${PASTEL_COLORS.border}`,
          boxShadow: PASTEL_COLORS.shadow,
        }}
      >
        <div className="flex items-center gap-2">
          <div 
            className="flex h-8 w-8 items-center justify-center"
            style={{
              borderRadius: '12px',
              background: PASTEL_COLORS.sidebarActiveGradient,
            }}
          >
            <Clock className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: PASTEL_COLORS.darkText }}>DAR Portal</h2>
            <p className="text-xs truncate max-w-[150px]" style={{ color: PASTEL_COLORS.mutedText }}>{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ color: PASTEL_COLORS.mutedText }}
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
        flex flex-col
        transition-transform duration-300 ease-in-out
      `}
      style={{
        background: PASTEL_COLORS.cardGlass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: `1px solid ${PASTEL_COLORS.glassBorder}`,
        boxShadow: mobileMenuOpen ? PASTEL_COLORS.shadowSoft : PASTEL_COLORS.sidebarShadow,
      }}>
        {/* Header - Desktop Only */}
        <div className="hidden md:block p-4" style={{ borderBottom: `1px solid ${PASTEL_COLORS.border}` }}>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="flex h-8 w-8 items-center justify-center flex-shrink-0"
                style={{
                  borderRadius: '12px',
                  background: PASTEL_COLORS.sidebarActiveGradient,
                }}
              >
                <Clock className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm" style={{ color: PASTEL_COLORS.darkText }}>DAR Portal</h2>
                <p className="text-xs truncate" style={{ color: PASTEL_COLORS.mutedText }}>{user?.email}</p>
              </div>
            </div>
            {/* 🔔 Notification Bell */}
            <NotificationBell
              unreadCount={notificationUnreadCount}
              onClick={() => setNotificationCenterOpen(true)}
            />
          </div>
        </div>

        {/* Quick switch to StafflyHub for admins, managers, and reps */}
        {userRole && userRole !== 'eod_user' && (
          <div className="p-2 border-b">
            <Button
              variant="ghost"
              className="w-full justify-start text-sm"
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
              }}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Switch to StafflyHub
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("clients");
              setMobileMenuOpen(false);
            }}
            style={{
              background: activeTab === "clients" ? PASTEL_COLORS.lavenderCloud : 'transparent',
              color: activeTab === "clients" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.mutedText,
              borderRadius: '14px',
              fontWeight: activeTab === "clients" ? '600' : '500',
            }}
          >
            <Clock className="mr-2 h-4 w-4" style={{ color: activeTab === "clients" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.softPlum }} />
            Clients
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("messages");
              setMobileMenuOpen(false);
            }}
            style={{
              background: activeTab === "messages" ? PASTEL_COLORS.lavenderCloud : 'transparent',
              color: activeTab === "messages" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.mutedText,
              borderRadius: '14px',
              fontWeight: activeTab === "messages" ? '600' : '500',
            }}
          >
            <MessageSquare className="mr-2 h-4 w-4" style={{ color: activeTab === "messages" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.softPlum }} />
            Messages
            {messageUnreadCount > 0 && (
              <Badge className="ml-auto px-2 py-0.5 text-xs border-0" style={{ backgroundColor: PASTEL_COLORS.blushPink, color: PASTEL_COLORS.roseText }}>
                {messageUnreadCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("history");
              loadSubmissions();
              setMobileMenuOpen(false);
            }}
            style={{
              background: activeTab === "history" ? PASTEL_COLORS.lavenderCloud : 'transparent',
              color: activeTab === "history" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.mutedText,
              borderRadius: '14px',
              fontWeight: activeTab === "history" ? '600' : '500',
            }}
          >
            <History className="mr-2 h-4 w-4" style={{ color: activeTab === "history" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.oceanMist }} />
            History
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("settings");
              setMobileMenuOpen(false);
            }}
            style={{
              background: activeTab === "settings" ? PASTEL_COLORS.lavenderCloud : 'transparent',
              color: activeTab === "settings" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.mutedText,
              borderRadius: '14px',
              fontWeight: activeTab === "settings" ? '600' : '500',
            }}
          >
            <Settings className="mr-2 h-4 w-4" style={{ color: activeTab === "settings" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.roseLatte }} />
            Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("feedback");
              setMobileMenuOpen(false);
            }}
            style={{
              background: activeTab === "feedback" ? PASTEL_COLORS.lavenderCloud : 'transparent',
              color: activeTab === "feedback" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.mutedText,
              borderRadius: '14px',
              fontWeight: activeTab === "feedback" ? '600' : '500',
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4" style={{ color: activeTab === "feedback" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.honeyGlow }} />
            Feedback
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("invoices");
              setMobileMenuOpen(false);
            }}
            style={{
              background: activeTab === "invoices" ? PASTEL_COLORS.lavenderCloud : 'transparent',
              color: activeTab === "invoices" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.mutedText,
              borderRadius: '14px',
              fontWeight: activeTab === "invoices" ? '600' : '500',
            }}
          >
            <FileText className="mr-2 h-4 w-4" style={{ color: activeTab === "invoices" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.roseLatte }} />
            Invoices
          </Button>
          {userRole === 'admin' && (
            <Button
              variant="ghost"
              className="w-full justify-start transition-all duration-200"
              onClick={() => {
                setActiveTab("recurringTasks");
                setMobileMenuOpen(false);
              }}
              style={{
                background: activeTab === "recurringTasks" ? PASTEL_COLORS.lavenderCloud : 'transparent',
                color: activeTab === "recurringTasks" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.mutedText,
                borderRadius: '14px',
                fontWeight: activeTab === "recurringTasks" ? '600' : '500',
              }}
            >
              <CalendarClock className="mr-2 h-4 w-4" style={{ color: activeTab === "recurringTasks" ? PASTEL_COLORS.lavenderText : PASTEL_COLORS.lavender }} />
              Recurring Tasks
            </Button>
          )}
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("smartDashboard");
              setMobileMenuOpen(false);
            }}
            style={{
              backgroundColor: 'transparent',
              color: PASTEL_COLORS.mutedText,
              borderRadius: '16px',
            }}
          >
            <Activity className="mr-2 h-4 w-4" style={{ color: PASTEL_COLORS.lavender }} />
            Smart DAR Dashboard
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start transition-all duration-200"
            onClick={() => {
              setActiveTab("smartGuide");
              setMobileMenuOpen(false);
            }}
            style={{
              backgroundColor: 'transparent',
              color: PASTEL_COLORS.mutedText,
              borderRadius: '16px',
            }}
          >
            <div className="mr-2 h-4 w-4 rounded-full border border-dashed flex items-center justify-center" style={{ borderColor: PASTEL_COLORS.softPlum, color: PASTEL_COLORS.softPlum }}>
              ?
            </div>
            How Smart DAR works
          </Button>
        </nav>

        {/* Footer */}
        <div className="p-2" style={{ borderTop: `1px solid ${PASTEL_COLORS.border}` }}>
          <Button 
            variant="ghost" 
            className="w-full transition-all duration-200" 
            onClick={handleLogout}
            style={{
              border: `1px solid ${PASTEL_COLORS.border}`,
              borderRadius: '16px',
              color: PASTEL_COLORS.mutedText,
            }}
          >
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
            {/* Client Selector - Searchable for Admins */}
            {clients.length > 0 ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="border-b bg-background p-4">
                  <div className="max-w-md">
                    <label className="text-sm font-medium mb-2 block">Select Client</label>
                    {userRole === 'admin' ? (
                      <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={clientSearchOpen}
                            className="w-full justify-between h-10 px-3"
                          >
                            {selectedClient ? (
                              <div className="flex items-center gap-2">
                                {clientClockIns[selectedClient] && !clientClockIns[selectedClient]?.clocked_out_at && (
                                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                                )}
                                <span className="truncate">{selectedClient}</span>
                              </div>
                            ) : (
                              "Select client..."
                            )}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search clients..." />
                            <CommandEmpty>No client found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-auto">
                              {clients.map((client) => {
                                const isClockedIn = clientClockIns[client.name] && !clientClockIns[client.name]?.clocked_out_at;
                                return (
                                  <CommandItem
                                    key={client.name}
                                    value={client.name}
                                    onSelect={() => {
                                      setSelectedClient(client.name);
                                      setClientSearchOpen(false);
                                    }}
                                  >
                                    <div className="flex items-center gap-2 w-full">
                                      {isClockedIn && (
                                        <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse flex-shrink-0" />
                                      )}
                                      <span className="flex-1">{client.name}</span>
                                      {isClockedIn && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                                          Clocked In
                                        </Badge>
                                      )}
                                    </div>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    ) : (
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
                    )}
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
                          <div className="flex gap-2 w-full md:w-auto">
                            <Button 
                              size="sm" 
                              onClick={handleClockIn}
                              disabled={loading}
                              className="flex-1 md:flex-initial border-0 font-semibold"
                              style={{
                                backgroundColor: PASTEL_COLORS.blueberryMilk,
                                color: PASTEL_COLORS.darkText,
                                borderRadius: '16px',
                                boxShadow: PASTEL_COLORS.shadowSoft,
                              }}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Clock In
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ✨ Recurring Task Templates Section */}
                      <Card 
                        className="border-0 transition-all duration-300 overflow-hidden"
                        style={{
                          background: PASTEL_COLORS.cardGlass,
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          borderRadius: '22px',
                          boxShadow: PASTEL_COLORS.shadowSoft,
                        }}
                      >
                        <CardHeader style={{
                          background: PASTEL_COLORS.templateGradient,
                          padding: '24px',
                        }}>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="text-xl font-semibold" style={{ color: PASTEL_COLORS.honeyText }}>
                                ✨ Recurring Task Templates
                              </CardTitle>
                              <p className="text-sm mt-1" style={{ color: '#6F6F6F' }}>
                                {userRole === 'admin' 
                                  ? `Templates created by all users for ${selectedClient}. Organized by priority.`
                                  : 'Save tasks you perform daily so you can quickly add them to your queue'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="text-xs border-0"
                                style={{
                                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                  color: PASTEL_COLORS.darkText,
                                  border: `1px solid ${PASTEL_COLORS.border}`,
                                  borderRadius: '12px',
                                }}
                              >
                                {showTemplates ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                                {showTemplates ? 'Hide' : `View (${taskTemplates.length})`}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setEditingTemplate(null);
                                  setTemplateFormOpen(true);
                                }}
                                className="border-0 font-semibold text-xs transition-all duration-300"
                                style={{
                                  backgroundColor: PASTEL_COLORS.mintMatcha,
                                  color: PASTEL_COLORS.darkText,
                                  borderRadius: '12px',
                                  boxShadow: PASTEL_COLORS.shadowSoft,
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                New Template
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        {showTemplates && (
                          <CardContent>
                            {taskTemplates.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-sm mb-4" style={{ color: '#6F6F6F' }}>
                                  No templates yet. Create your first recurring task template!
                                </p>
                                <Button
                                  onClick={() => {
                                    setEditingTemplate(null);
                                    setTemplateFormOpen(true);
                                  }}
                                  className="border-0 font-medium"
                                  style={{
                                    backgroundColor: '#B8EBD0',
                                    color: '#4B4B4B',
                                    borderRadius: '12px',
                                  }}
                                >
                                  <Plus className="h-4 w-4 mr-2" />
                                  Create First Template
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {PRIORITY_GROUPS.map((group) => {
                                  const templates = templatesByPriority[group.key] || [];
                                  const isOpen = expandedPriority === group.key;
                                  return (
                                    <div
                                      key={group.key}
                                      className="border border-dashed rounded-2xl px-4 py-3"
                                      style={{
                                        borderColor: `${group.accent}55`,
                                        background: `${group.accent}10`,
                                      }}
                                    >
                                      <button
                                        className="w-full flex items-center justify-between text-left"
                                        onClick={() => togglePrioritySection(group.key)}
                                      >
                                        <div>
                                          <p className="font-semibold" style={{ color: PASTEL_COLORS.darkText }}>
                                            {group.label}
                                          </p>
                                          <p className="text-xs" style={{ color: PASTEL_COLORS.mutedText }}>
                                            {group.description}
                                          </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Badge className="bg-white text-xs text-slate-700 border-0">
                                            {templates.length} templates
                                          </Badge>
                                          <ChevronDown
                                            className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                            style={{ color: PASTEL_COLORS.darkText }}
                                          />
                                        </div>
                                      </button>
                                      {isOpen && (
                                        <div className="mt-3 space-y-3">
                                          {templates.length === 0 ? (
                                            <p className="text-sm" style={{ color: PASTEL_COLORS.mutedText }}>
                                              No templates tagged for this priority yet.
                                            </p>
                                          ) : (
                                            templates.map((template: any) => (
                                              <div
                                                key={template.id}
                                                className="p-3 rounded-xl bg-white shadow-sm border"
                                                style={{ borderColor: `${group.accent}35` }}
                                              >
                                                <div className="flex flex-col gap-2">
                                                  <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                      <p className="font-medium" style={{ color: PASTEL_COLORS.darkText }}>
                                                        {template.template_name}
                                                      </p>
                                                      {userRole === 'admin' && template.profiles && (
                                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                                          {template.profiles.first_name} {template.profiles.last_name}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    {template.description && (
                                                      <p className="text-sm" style={{ color: PASTEL_COLORS.mutedText }}>
                                                        {template.description}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <div className="flex flex-wrap gap-1">
                                                    {template.default_task_type && (
                                                      <Badge variant="outline" className="text-xs border-0 bg-slate-100 text-slate-600">
                                                        {template.default_task_type}
                                                      </Badge>
                                                    )}
                                                    {template.default_categories?.map((category: string) => (
                                                      <Badge key={category} variant="outline" className="text-xs border-0 bg-slate-100 text-slate-600">
                                                        {category}
                                                      </Badge>
                                                    ))}
                                                  </div>
                                                  <div className="flex flex-wrap gap-2 pt-1">
                                                    <Button
                                                      size="sm"
                                                      className="text-xs border-0 font-semibold flex-1"
                                                      style={{
                                                        backgroundColor: PASTEL_COLORS.pistachioCream,
                                                        color: PASTEL_COLORS.pistachioText,
                                                        borderRadius: '12px',
                                                      }}
                                                      onClick={() => addTemplateToQueue(template)}
                                                    >
                                                      <Plus className="h-3 w-3 mr-1" />
                                                      Add to queue
                                                    </Button>
                                                    {/* 📅 Calendar button for non-daily tasks */}
                                                    {group.key !== 'daily' && (
                                                      <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-xs relative"
                                                        style={{
                                                          borderRadius: '12px',
                                                          border: template.scheduled_date ? `2px solid #10B981` : `1px solid #93C5FD`,
                                                          color: template.scheduled_date ? '#10B981' : '#3B82F6',
                                                          backgroundColor: template.scheduled_date ? '#ECFDF5' : 'transparent',
                                                        }}
                                                        onClick={() => {
                                                          setSchedulingTemplate(template);
                                                          setSelectedScheduleDate(template.scheduled_date || "");
                                                          setScheduleDialogOpen(true);
                                                        }}
                                                        title={template.scheduled_date ? `Scheduled for ${new Date(template.scheduled_date).toLocaleDateString()}` : "Schedule this template"}
                                                      >
                                                        <Calendar className="h-3 w-3" />
                                                        {template.scheduled_date && (
                                                          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500"></span>
                                                        )}
                                                      </Button>
                                                    )}
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="text-xs flex-1"
                                                      style={{
                                                        borderRadius: '12px',
                                                        border: `1px solid ${PASTEL_COLORS.border}`,
                                                      }}
                                                      onClick={() => {
                                                        setEditingTemplate(template);
                                                        setTemplateFormOpen(true);
                                                      }}
                                                    >
                                                      Edit
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="text-xs"
                                                      style={{
                                                        borderRadius: '12px',
                                                        border: `1px solid #FCA5A5`,
                                                        color: '#EF4444',
                                                      }}
                                                      onClick={() => {
                                                        if (window.confirm(`Delete template "${template.template_name}"?`)) {
                                                          deleteTaskTemplate(template.id);
                                                        }
                                                      }}
                                                    >
                                                      <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>

                      {/* Task Tracking for this client */}
                      <Card
                        className="border-0"
                        style={{
                          backgroundColor: PASTEL_COLORS.white,
                          borderRadius: '22px',
                          boxShadow: PASTEL_COLORS.shadow,
                        }}
                      >
                        <CardHeader style={{ paddingBottom: '16px' }}>
                          <CardTitle style={{ color: PASTEL_COLORS.darkText }}>Time Tracking - {selectedClient}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4" style={{ padding: '24px' }}>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium" style={{ color: PASTEL_COLORS.darkText }}>Task Description</label>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setShowQueue(!showQueue)}
                                className="text-xs transition-all duration-200"
                                style={{
                                  border: `1px solid ${PASTEL_COLORS.border}`,
                                  borderRadius: '12px',
                                  color: PASTEL_COLORS.mutedText,
                                }}
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
                              style={{
                                background: 'rgba(255, 255, 255, 0.7)',
                                border: `1px solid ${PASTEL_COLORS.border}`,
                                borderRadius: '16px',
                                padding: '12px 16px',
                                boxShadow: PASTEL_COLORS.shadowInset,
                                color: PASTEL_COLORS.darkText,
                              }}
                              className="focus:ring-2 focus:ring-offset-0 transition-all duration-200"
                            />
                          </div>

                          <div className="flex gap-2">
                            {!activeEntry ? (
                              <>
                                <Button 
                                  onClick={() => {
                                    // Pass client info and task description directly to startTimer to avoid state timing issues
                                    startTimer(selectedClient, currentClient.email || "", taskDescription);
                                  }} 
                                  disabled={loading || !taskDescription.trim()}
                                  className="flex-1 border-0 font-semibold transition-all duration-300 hover:brightness-105"
                                  style={{
                                    backgroundColor: PASTEL_COLORS.pistachioCream,
                                    color: PASTEL_COLORS.pistachioText,
                                    borderRadius: '16px',
                                    boxShadow: PASTEL_COLORS.shadowSoft,
                                  }}
                                >
                                  <Play className="mr-2 h-4 w-4" />
                                  Start Task
                                </Button>
                                <Button 
                                  onClick={addTaskToQueue}
                                  disabled={loading}
                                  className="border-0 font-semibold transition-all duration-300 hover:brightness-105"
                                  style={{
                                    backgroundColor: PASTEL_COLORS.lavenderCloud,
                                    color: PASTEL_COLORS.lavenderText,
                                    borderRadius: '16px',
                                    boxShadow: PASTEL_COLORS.shadowSoft,
                                  }}
                                >
                                  <ListPlus className="mr-2 h-4 w-4" />
                                  Add to Queue
                                </Button>
                              </>
                            ) : null}
                          </div>

                          {/* Task Queue Display */}
                          {showQueue && queuedTasks.length > 0 && (
                            <Card 
                              className="border-0"
                              style={{
                                backgroundColor: PASTEL_COLORS.blue + '15',
                                border: `1px solid ${PASTEL_COLORS.blue}30`,
                                borderRadius: '18px',
                              }}
                            >
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
              <Card 
                className="border-0 overflow-hidden"
                style={{
                  background: PASTEL_COLORS.cardGlass,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: '22px',
                  boxShadow: PASTEL_COLORS.shadowSoft,
                }}
              >
                <CardHeader 
                  className="p-3 md:p-6"
                  style={{
                    background: PASTEL_COLORS.activeTaskGradient,
                    borderRadius: '20px 20px 0 0',
                    padding: '18px 24px',
                  }}
                >
                  <CardTitle className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Play 
                        className="h-4 w-4 md:h-5 md:w-5 animate-pulse flex-shrink-0" 
                        style={{ color: 'white' }}
                      />
                      <span className="text-sm md:text-base font-semibold" style={{ color: 'white' }}>Active Task</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        onClick={pauseTimer} 
                        disabled={loading} 
                        size="sm" 
                        className="border-0 whitespace-nowrap px-3 md:px-4 font-semibold transition-all duration-300 hover:brightness-105"
                        style={{
                          backgroundColor: PASTEL_COLORS.honeyButter,
                          color: PASTEL_COLORS.honeyText,
                          borderRadius: '16px',
                          boxShadow: PASTEL_COLORS.shadowSoft,
                        }}
                      >
                        <Pause className="mr-2 h-4 w-4" />
                        Pause Task
                      </Button>
                      <Button 
                        onClick={stopTimer} 
                        disabled={loading} 
                        size="sm" 
                        className="border-0 whitespace-nowrap px-3 md:px-4 font-semibold transition-all duration-300 hover:brightness-105"
                        style={{
                          backgroundColor: PASTEL_COLORS.pistachioCream,
                          color: PASTEL_COLORS.pistachioText,
                          borderRadius: '16px',
                          boxShadow: PASTEL_COLORS.shadowSoft,
                        }}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Complete Task
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent 
                  className="space-y-4 pt-4"
                  style={{
                    backgroundColor: PASTEL_COLORS.white,
                    padding: '24px',
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Client</Label>
                      <p className="text-sm mt-1 p-2 bg-accent rounded">{activeEntry.client_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium flex items-center justify-between">
                        <span>Task</span>
                        {!editingTaskTitle && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTaskTitle(true);
                              setEditedTaskTitle(activeEntry.task_description);
                            }}
                            className="h-6 w-6 p-0"
                            title="Edit task title"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                        )}
                      </Label>
                      {editingTaskTitle ? (
                        <div className="flex gap-2 mt-1">
                          <Input
                            value={editedTaskTitle}
                            onChange={(e) => setEditedTaskTitle(e.target.value)}
                            className="text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveTaskTitle();
                              } else if (e.key === 'Escape') {
                                setEditingTaskTitle(false);
                                setEditedTaskTitle("");
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={handleSaveTaskTitle}
                            disabled={!editedTaskTitle.trim()}
                            className="px-2 border-0"
                            style={{
                              backgroundColor: PASTEL_COLORS.pistachioCream,
                              color: PASTEL_COLORS.pistachioText,
                              borderRadius: '12px',
                            }}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingTaskTitle(false);
                              setEditedTaskTitle("");
                            }}
                            className="px-2"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm mt-1 p-2 bg-accent rounded">{activeEntry.task_description}</p>
                      )}
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
                    <Label className="text-sm font-medium" style={{ color: PASTEL_COLORS.darkText }}>Comments</Label>
                    <Textarea
                      value={activeTaskComments}
                      onChange={(e) => setActiveTaskComments(e.target.value)}
                      placeholder="Add comments about this task..."
                      rows={3}
                      className="mt-1 focus:ring-2 focus:ring-offset-0"
                      style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: `1px solid ${PASTEL_COLORS.border}`,
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: PASTEL_COLORS.shadowInset,
                        color: PASTEL_COLORS.darkText,
                      }}
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
                    <Label className="text-sm font-medium flex items-center gap-2" style={{ color: PASTEL_COLORS.darkText }}>
                      <LinkIcon className="h-4 w-4" />
                      Task Link (Optional)
                    </Label>
                    <Input
                      type="url"
                      value={activeTaskLink}
                      onChange={(e) => setActiveTaskLink(e.target.value)}
                      placeholder="https://example.com/task/123"
                      className="mt-1 focus:ring-2 focus:ring-offset-0"
                      style={{
                        background: 'rgba(255, 255, 255, 0.7)',
                        border: `1px solid ${PASTEL_COLORS.border}`,
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: PASTEL_COLORS.shadowInset,
                        color: PASTEL_COLORS.darkText,
                      }}
                    />
                  </div>

                  {/* Task Priority Field - REQUIRED before completion */}
                  <div>
                    <Label className="text-sm font-medium flex items-center gap-2" style={{ color: PASTEL_COLORS.darkText }}>
                      <AlertCircle className="h-4 w-4" style={{ color: PASTEL_COLORS.pink }} />
                      Task Priority <span style={{ color: PASTEL_COLORS.pink }}>*</span>
                    </Label>
                    <Select
                      value={activeTaskPriority}
                      onValueChange={(value) => {
                        setActiveTaskPriorityByClient(prev => ({ ...prev, [selectedClient]: value }));
                        // Save priority to database immediately
                        if (activeEntry?.id) {
                          supabase
                            .from('eod_time_entries')
                            .update({ task_priority: value })
                            .eq('id', activeEntry.id)
                            .then(() => {
                              console.log('Task priority updated:', value);
                            });
                        }
                      }}
                    >
                      <SelectTrigger 
                        className={`mt-1`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.7)',
                          border: !activeTaskPriority ? `2px solid ${PASTEL_COLORS.blushPink}` : `1px solid ${PASTEL_COLORS.border}`,
                          borderRadius: '16px',
                          padding: '12px 16px',
                          boxShadow: PASTEL_COLORS.shadowInset,
                          color: PASTEL_COLORS.darkText,
                        }}
                      >
                        <SelectValue placeholder="Select task priority..." />
                      </SelectTrigger>
                      <SelectContent 
                        style={{
                          backgroundColor: PASTEL_COLORS.white,
                          border: `1px solid ${PASTEL_COLORS.border}`,
                          borderRadius: '18px',
                          boxShadow: PASTEL_COLORS.shadowSoft,
                        }}
                      >
                        <SelectItem value="Immediate Impact Task" style={{ borderRadius: '12px', margin: '2px 4px' }}>🔴 Immediate Impact Task</SelectItem>
                        <SelectItem value="Daily Task" style={{ borderRadius: '12px', margin: '2px 4px' }}>🟡 Daily Task</SelectItem>
                        <SelectItem value="Weekly Task" style={{ borderRadius: '12px', margin: '2px 4px' }}>🟢 Weekly Task</SelectItem>
                        <SelectItem value="Monthly Task" style={{ borderRadius: '12px', margin: '2px 4px' }}>🔵 Monthly Task</SelectItem>
                        <SelectItem value="Evergreen Task" style={{ borderRadius: '12px', margin: '2px 4px' }}>🟣 Evergreen Task</SelectItem>
                        <SelectItem value="Trigger Task" style={{ borderRadius: '12px', margin: '2px 4px' }}>🟠 Trigger Task</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Paused Tasks - ALWAYS SHOW FOR DEBUGGING */}
            <Card className="border-2 border-yellow-500">
              <CardHeader className="bg-yellow-50">
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <Pause className="h-5 w-5" />
                  Paused Tasks ({pausedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {pausedTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paused tasks</p>
                ) : (
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
                )}
              </CardContent>
            </Card>

            {/* Completed Tasks - ALWAYS SHOW FOR DEBUGGING */}
            <Card className="border-2" style={{ 
              borderColor: PASTEL_COLORS.pistachioCream,
              background: `linear-gradient(to bottom, ${PASTEL_COLORS.mintMatcha}, white)`
            }}>
              <CardHeader style={{ background: PASTEL_COLORS.mintMatcha }}>
                <CardTitle className="flex items-center gap-2" style={{ color: PASTEL_COLORS.pistachioText }}>
                  <CheckCircle2 className="h-5 w-5" />
                  Completed Tasks Today ({timeEntries.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {timeEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No completed tasks yet</p>
                ) : (
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
                        <TableHead className="w-[120px]">Actions</TableHead>
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
                            <Badge 
                              className="border-0 font-medium"
                              style={{
                                backgroundColor: 
                                  entry.status === 'completed' ? PASTEL_COLORS.pistachioCream :
                                  entry.status === 'blocked' ? PASTEL_COLORS.blushPink :
                                  entry.status === 'on_hold' ? PASTEL_COLORS.honeyButter :
                                  PASTEL_COLORS.blueberryMilk,
                                color: 
                                  entry.status === 'completed' ? PASTEL_COLORS.pistachioText :
                                  entry.status === 'blocked' ? PASTEL_COLORS.peachText :
                                  entry.status === 'on_hold' ? PASTEL_COLORS.honeyText :
                                  PASTEL_COLORS.darkText,
                                borderRadius: '12px',
                              }}
                            >
                              {entry.status ? entry.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'In Progress'}
                            </Badge>
                          </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => startEditingCompletedTask(entry)}
                              title="Edit task details"
                              className="h-8 w-8 p-0"
                            >
                              <Edit3 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => resumeCompletedTask(entry)}
                              title="Resume this task"
                              className="h-8 w-8 p-0"
                            >
                              <RotateCcw className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              onClick={() => deleteEntry(entry.id)}
                              title="Delete task"
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
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
                )}
                </CardContent>
              </Card>
          </CardContent>
        </Card>

        {/* Submit DAR Button */}
        <div className="flex justify-end">
          <Button 
            onClick={submitEOD} 
            disabled={loading || !reportId || timeEntries.length === 0} 
            size="lg"
            className="border-0 font-semibold"
            style={{
              background: PASTEL_COLORS.submitButtonGradient,
              color: 'white',
              borderRadius: '16px',
              boxShadow: PASTEL_COLORS.shadowSoft,
              padding: '12px 32px',
            }}
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

        {activeTab === "recurringTasks" && (
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className="max-w-7xl mx-auto">
              <RecurringTasksLibraryEmbed />
            </div>
          </div>
        )}

        {activeTab === "smartDashboard" && (
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
              <SmartDARDashboard />
            </div>
          </div>
        )}
        {activeTab === "smartGuide" && (
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
              <SmartDARHowItWorks />
            </div>
          </div>
        )}

        {activeTab === "messages" && (
          <div className="h-full overflow-hidden">
            <EODMessaging />
          </div>
        )}

        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">EOD History</h2>
                <p className="text-sm text-muted-foreground">View your past end-of-day reports with shift goals and utilization metrics</p>
              </div>
              
              {/* Calendar Filter */}
              <EODHistoryCalendarFilter
                allSubmissions={allSubmissions}
                onFilteredSubmissionsChange={setFilteredSubmissions}
              />
              
              {/* History List */}
              <EODHistoryList submissions={filteredSubmissions} onRefresh={loadSubmissions} />
            </div>
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
                  className="w-full border-0 font-semibold"
                  style={{
                    backgroundColor: PASTEL_COLORS.blueberryMilk,
                    color: PASTEL_COLORS.darkText,
                    borderRadius: '16px',
                    boxShadow: PASTEL_COLORS.shadowSoft,
                  }}
                >
                  {changingPassword ? 'Changing Password...' : 'Change Password'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "invoices" && (
          <div className="flex-1 overflow-y-auto p-6">
            <InvoiceGenerator />
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
                  className="w-full border-0 font-semibold"
                  style={{
                    backgroundColor: PASTEL_COLORS.blueberryMilk,
                    color: PASTEL_COLORS.darkText,
                    borderRadius: '16px',
                    boxShadow: PASTEL_COLORS.shadowSoft,
                  }}
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
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold">{task.client_name}</p>
                              {editingHistoryTaskId !== task.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditingHistoryTaskId(task.id);
                                    setEditedHistoryTaskTitle(task.task_description);
                                  }}
                                  className="h-6 w-6 p-0"
                                  title="Edit task title"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {editingHistoryTaskId === task.id ? (
                              <div className="flex gap-2 mt-1">
                                <Input
                                  value={editedHistoryTaskTitle}
                                  onChange={(e) => setEditedHistoryTaskTitle(e.target.value)}
                                  className="text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveHistoryTaskTitle(task.id);
                                    } else if (e.key === 'Escape') {
                                      setEditingHistoryTaskId(null);
                                      setEditedHistoryTaskTitle("");
                                    }
                                  }}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveHistoryTaskTitle(task.id)}
                                  className="px-2 border-0"
                                  style={{
                                    backgroundColor: PASTEL_COLORS.pistachioCream,
                                    color: PASTEL_COLORS.pistachioText,
                                    borderRadius: '12px',
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingHistoryTaskId(null);
                                    setEditedHistoryTaskTitle("");
                                  }}
                                  className="px-2"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">{task.task_description}</p>
                            )}
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
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

      {/* Edit Completed Task Dialog */}
      <Dialog open={editingCompletedTaskId !== null} onOpenChange={(open) => !open && cancelEditingCompletedTask()}>
        <DialogContent className="max-w-2xl mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-blue-600" />
              Edit Completed Task
            </DialogTitle>
            <DialogDescription>Update task details, description, link, comments, and settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label htmlFor="edit-task-description">Task Description *</Label>
              <Input
                id="edit-task-description"
                value={editedTaskData.task_description || ''}
                onChange={(e) => setEditedTaskData(prev => ({ ...prev, task_description: e.target.value }))}
                placeholder="What did you work on?"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-task-link">Task Link</Label>
              <Input
                id="edit-task-link"
                value={editedTaskData.task_link || ''}
                onChange={(e) => setEditedTaskData(prev => ({ ...prev, task_link: e.target.value }))}
                placeholder="https://..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="edit-task-comments">Comments</Label>
              <Textarea
                id="edit-task-comments"
                value={editedTaskData.comments || ''}
                onChange={(e) => setEditedTaskData(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Add any notes or comments..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-task-type">Task Type</Label>
                <Select
                  value={editedTaskData.task_type || ''}
                  onValueChange={(value) => setEditedTaskData(prev => ({ ...prev, task_type: value }))}
                >
                  <SelectTrigger id="edit-task-type" className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quick Task">⚡ Quick Task</SelectItem>
                    <SelectItem value="Standard Task">📋 Standard Task</SelectItem>
                    <SelectItem value="Deep Work">🧠 Deep Work</SelectItem>
                    <SelectItem value="Meeting">👥 Meeting</SelectItem>
                    <SelectItem value="Research">🔍 Research</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select
                  value={editedTaskData.task_priority || ''}
                  onValueChange={(value) => setEditedTaskData(prev => ({ ...prev, task_priority: value }))}
                >
                  <SelectTrigger id="edit-task-priority" className="mt-1">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily Task">📅 Daily Task</SelectItem>
                    <SelectItem value="Immediate Impact">🔥 Immediate Impact</SelectItem>
                    <SelectItem value="High Impact">⚡ High Impact</SelectItem>
                    <SelectItem value="Strategic">🎯 Strategic</SelectItem>
                    <SelectItem value="Low Priority">📝 Low Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-goal-duration">Goal Duration (minutes)</Label>
              <Input
                id="edit-goal-duration"
                type="number"
                value={editedTaskData.goal_duration_minutes || ''}
                onChange={(e) => setEditedTaskData(prev => ({ ...prev, goal_duration_minutes: parseInt(e.target.value) || null }))}
                placeholder="How long did you plan to spend?"
                className="mt-1"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={() => {
                  if (editingCompletedTaskId) saveEditedCompletedTask(editingCompletedTaskId);
                }}
                className="flex-1"
                disabled={!editedTaskData.task_description}
              >
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
              <Button 
                variant="outline" 
                onClick={cancelEditingCompletedTask}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
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
                className="flex-1 border-0 font-semibold"
                style={{
                  backgroundColor: PASTEL_COLORS.lavenderCloud,
                  color: PASTEL_COLORS.lavenderText,
                  borderRadius: '16px',
                  boxShadow: PASTEL_COLORS.shadowSoft,
                }}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Template Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {schedulingTemplate?.scheduled_date ? 'Update Schedule' : 'Schedule Template'}
            </DialogTitle>
            <DialogDescription>
              {schedulingTemplate && (
                <>
                  {schedulingTemplate.scheduled_date 
                    ? `"${schedulingTemplate.template_name}" is currently scheduled for ${new Date(schedulingTemplate.scheduled_date).toLocaleDateString()}. Update or clear the schedule below.`
                    : `Schedule "${schedulingTemplate.template_name}" to auto-add to your queue on a specific date.`
                  }
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {schedulingTemplate?.scheduled_date && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    Currently scheduled: {formatDateOnly(schedulingTemplate.scheduled_date, 'long')}
                  </span>
                </div>
              </div>
            )}
            
            <div>
              <Label htmlFor="schedule-date">Select Date</Label>
              <Input
                id="schedule-date"
                type="date"
                value={selectedScheduleDate}
                onChange={(e) => setSelectedScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                When you clock in on this date, the template will automatically be added to your queue with a notification.
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (schedulingTemplate && selectedScheduleDate) {
                    scheduleTemplate(schedulingTemplate, selectedScheduleDate);
                  }
                }}
                disabled={!selectedScheduleDate}
                className="flex-1 border-0 font-semibold"
                style={{
                  backgroundColor: '#93C5FD',
                  color: '#1E40AF',
                  borderRadius: '16px',
                }}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {schedulingTemplate?.scheduled_date ? 'Update' : 'Schedule'}
              </Button>
              {schedulingTemplate?.scheduled_date && (
                <Button 
                  variant="outline"
                  onClick={async () => {
                    if (schedulingTemplate) {
                      try {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user) return;

                        const { error } = await (supabase as any)
                          .from('recurring_task_templates')
                          .update({ scheduled_date: null })
                          .eq('id', schedulingTemplate.id)
                          .eq('user_id', user.id);

                        if (error) throw error;

                        toast({
                          title: '🗑️ Schedule Cleared',
                          description: `"${schedulingTemplate.template_name}" is no longer scheduled`,
                          className: 'bg-gray-50 border-gray-200'
                        });

                        await loadTaskTemplates(selectedClient);
                        setScheduleDialogOpen(false);
                        setSchedulingTemplate(null);
                        setSelectedScheduleDate("");
                      } catch (e: any) {
                        toast({ title: 'Error', description: e.message, variant: 'destructive' });
                      }
                    }
                  }}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Clear
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => {
                  setScheduleDialogOpen(false);
                  setSchedulingTemplate(null);
                  setSelectedScheduleDate("");
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

      {/* Task Settings Modal */}
      <TaskSettingsModal
        open={taskSettingsModalOpen}
        onClose={() => {
          setTaskSettingsModalOpen(false);
          setPendingTaskSettings(null);
          // 🔥 FIX: Clear pending queue task ID when modal is closed (task stays in queue)
          if (pendingQueueTaskId) {
            console.log('[QUEUE] Modal closed without starting - task remains in queue');
            setPendingQueueTaskId(null);
          }
        }}
        onConfirm={startTimerWithSettings}
      />

      {/* Check-in Popups */}
      <MoodCheckPopup
        open={moodCheckOpen}
        onClose={() => setMoodCheckOpen(false)}
        onSubmit={handleMoodSubmit}
        onMissed={async () => {
          console.log('[Survey] 📊 Mood survey MISSED (30s timeout)');
          setMoodCheckOpen(false);
          setLastMoodCheckTime(Date.now());
          
          // Log "missed" notification
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await (supabase as any)
                .from('notification_log')
                .insert([{
                  user_id: user.id,
                  message: '😔 Mood check-in missed',
                  type: 'survey_missed',
                  category: 'mood',
                  is_read: false,
                  created_at: new Date().toISOString()
                }]);
              console.log('[Survey] ✅ Mood survey MISSED logged to notification_log');
              
              // Also log to survey_events table for penalty tracking
              await (supabase as any)
                .from('survey_events')
                .insert([{
                  user_id: user.id,
                  type: 'mood',
                  value: null,
                  responded: false,
                  timestamp: new Date().toISOString()
                }]);
              console.log('[Survey] ✅ Mood MISSED logged to survey_events');
            }
          } catch (error) {
            console.error('[Survey] ❌ Failed to log missed mood survey:', error);
          }
        }}
      />

      <EnergyCheckPopup
        open={energyCheckOpen}
        onClose={() => setEnergyCheckOpen(false)}
        onSubmit={handleEnergySubmit}
        onMissed={async () => {
          console.log('[Survey] 📊 Energy survey MISSED (30s timeout)');
          setEnergyCheckOpen(false);
          setLastEnergyCheckTime(Date.now());
          
          // Log "missed" notification
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await (supabase as any)
                .from('notification_log')
                .insert([{
                  user_id: user.id,
                  message: '⚡ Energy check-in missed',
                  type: 'survey_missed',
                  category: 'energy',
                  is_read: false,
                  created_at: new Date().toISOString()
                }]);
              console.log('[Survey] ✅ Energy survey MISSED logged to notification_log');
              
              // Also log to survey_events table for penalty tracking
              await (supabase as any)
                .from('survey_events')
                .insert([{
                  user_id: user.id,
                  type: 'energy',
                  value: null,
                  responded: false,
                  timestamp: new Date().toISOString()
                }]);
              console.log('[Survey] ✅ Energy MISSED logged to survey_events');
            }
          } catch (error) {
            console.error('[Survey] ❌ Failed to log missed energy survey:', error);
          }
        }}
      />

      <TaskEnjoymentPopup
        open={taskEnjoymentOpen}
        onClose={() => {
          setTaskEnjoymentOpen(false);
          setCompletedTaskForEnjoyment("");
        }}
        onSubmit={handleTaskEnjoymentSubmit}
        onMissed={async () => {
          console.log('[Survey] 📊 Task enjoyment survey MISSED (30s timeout)');
          const taskDesc = completedTaskForEnjoyment;
          setTaskEnjoymentOpen(false);
          setCompletedTaskForEnjoyment("");
          
          // Log "missed" notification
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await (supabase as any)
                .from('notification_log')
                .insert([{
                  user_id: user.id,
                  message: `💭 Task Enjoyment Survey Missed: ${taskDesc.substring(0, 50)}${taskDesc.length > 50 ? '...' : ''}`,
                  type: 'survey_missed',
                  category: 'enjoyment',
                  is_read: false,
                  created_at: new Date().toISOString()
                }]);
              console.log('[Survey] ✅ Task enjoyment survey MISSED logged to notification_log');
            }
          } catch (error) {
            console.error('[Survey] ❌ Failed to log missed task enjoyment survey:', error);
          }
        }}
        taskDescription={completedTaskForEnjoyment}
      />

      {/* 🚀 Clock-In Modal with Shift Plan & Task Goal */}
      <ClockInModal
        open={clockInModalOpen}
        onClose={() => setClockInModalOpen(false)}
        onSubmit={handleClockInSubmit}
        loading={loading}
      />

      {/* ✨ Recurring Template Creator Form */}
      <TemplateCreatorForm
        open={templateFormOpen}
        onClose={() => {
          setTemplateFormOpen(false);
          setEditingTemplate(null);
        }}
        onSave={saveTaskTemplate}
        editingTemplate={editingTemplate}
        userClients={clients.map(c => c.name)}
      />

      {/* 🔔 Notification Center */}
      <NotificationCenter
        open={notificationCenterOpen}
        onClose={() => setNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </div>
  );
}

