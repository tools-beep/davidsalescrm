import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Eye, Search, Filter, User, Clock, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDateEST } from "@/utils/timezoneUtils";

interface RecurringTemplate {
  id: string;
  user_id: string;
  template_name: string;
  description: string;
  default_client: string | null;
  default_task_type: string | null;
  default_categories: string[] | null;
  default_priority: string | null;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  };
}

const PASTEL_COLORS = {
  lavenderMist: '#E6E6FA',
  lavenderCloud: '#DCD0FF',
  lavenderText: '#6B46C1',
  mintFresh: '#E0F2F1',
  mintCloud: '#B2DFDB',
  mintText: '#00695C',
  peachGlow: '#FFE5D9',
  peachCloud: '#FFCCBC',
  peachText: '#BF360C',
  skyBreeze: '#E3F2FD',
  skyCloud: '#BBDEFB',
  skyText: '#1565C0',
  roseBlush: '#FCE4EC',
  roseCloud: '#F8BBD0',
  roseText: '#880E4F',
  shadowSoft: '0 2px 8px rgba(0,0,0,0.08)',
  shadowMedium: '0 4px 12px rgba(0,0,0,0.12)',
};

export default function RecurringTasksLibrary() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<RecurringTemplate | null>(null);
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

      // Fetch all templates with user info
      const { data, error } = await (supabase as any)
        .from('recurring_task_templates')
        .select(`
          *,
          user_profiles!inner (
            first_name,
            last_name,
            email
          )
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
      
      // Extract unique values for filters
      extractFilterOptions(data || []);
      
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

  const extractFilterOptions = (data: RecurringTemplate[]) => {
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
        template.default_categories.forEach(cat => categories.add(cat));
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

  const viewDetails = (template: RecurringTemplate) => {
    setSelectedTemplate(template);
    setDetailsDialogOpen(true);
  };

  const getUserName = (template: RecurringTemplate) => {
    if (!template.user_profiles) return 'Unknown User';
    const { first_name, last_name } = template.user_profiles;
    return `${first_name || ''} ${last_name || ''}`.trim() || 'Unknown User';
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(135deg, #F5F7FA 0%, #E8EAF6 100%)' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calendar className="h-8 w-8" style={{ color: PASTEL_COLORS.lavenderText }} />
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
              <Filter className="h-5 w-5" />
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
                  <User className="h-4 w-4" />
                  User
                </label>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {availableUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Priority
                </label>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    {availablePriorities.map(priority => (
                      <SelectItem key={priority} value={priority}>
                        {getPriorityDisplayName(priority)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Category
                </label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Calendar className="h-16 w-16 mb-4 opacity-30" />
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
                              template.default_categories.slice(0, 2).map((cat, idx) => (
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
                              {formatDateEST(template.scheduled_date, 'MMM d, yyyy')}
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
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl" style={{ borderRadius: '24px' }}>
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Calendar className="h-6 w-6" style={{ color: PASTEL_COLORS.lavenderText }} />
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
                  <User className="h-5 w-5" style={{ color: PASTEL_COLORS.lavenderText }} />
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
                      selectedTemplate.default_categories.map((cat, idx) => (
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
                        {formatDateEST(selectedTemplate.scheduled_date, 'PPPP')}
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

