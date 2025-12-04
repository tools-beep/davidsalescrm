import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const dealSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  description: z.string().optional(),
  amount: z.string().optional(),
  pipeline_id: z.string().min(1, "Pipeline is required"),
  stage: z.string().min(1, "Stage is required"),
  priority: z.string().min(1, "Priority is required"),
  close_date: z.date().optional(),
  company_id: z.string().optional(),
  primary_contact_id: z.string().optional(),
  timezone: z.string().optional(),
  vertical: z.string().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  deal_owner_id: z.string().optional(),
  setter_id: z.string().optional(),
  account_manager_id: z.string().optional(),
  industry: z.string().optional(),
  annual_revenue: z.string().optional(),
  currency: z.string().optional(),
  product_segment: z.string().optional(),
  lead_source: z.string().optional(),
  referral_source: z.string().optional(),
});

type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

interface Pipeline {
  id: string;
  name: string;
  stages: string[];
}

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const currencies = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "JPY", label: "JPY - Japanese Yen" },
];

export function DealForm({ children, onSuccess }: DealFormProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [selectedPipelineStages, setSelectedPipelineStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      name: "",
      description: "",
      amount: "",
      pipeline_id: "",
      stage: "",
      priority: "medium",
      timezone: "America/New_York",
      vertical: "",
      country: "",
      state: "",
      city: "",
      deal_owner_id: "",
      setter_id: "",
      account_manager_id: "",
      industry: "",
      annual_revenue: "",
      currency: "USD",
      product_segment: "",
      lead_source: "",
      referral_source: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchCompanies();
      fetchContacts();
      fetchPipelines();
      fetchUsers();
    }
  }, [open]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
  };

  const fetchContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select('id, first_name, last_name')
      .order('first_name');
    setContacts(data || []);
  };

  const fetchPipelines = async () => {
    const { data } = await supabase
      .from('pipelines')
      .select('id, name, stages, stage_order')
      .eq('is_active', true)
      .order('name');
    
    // Parse stages properly
    const parsedPipelines = (data || []).map((p: any) => {
      let stages: string[] = [];
      
      // Try to parse stages from stage_order first (more reliable)
      if (p.stage_order) {
        try {
          const stageOrder = Array.isArray(p.stage_order) ? p.stage_order : JSON.parse(p.stage_order);
          stages = stageOrder
            .map((s: any) => s.name || s)
            .filter((s: string) => s && typeof s === 'string')
            .map((s: string) => s.toLowerCase().trim()); // Normalize to lowercase
        } catch (e) {
          console.error('Error parsing stage_order:', e);
        }
      }
      
      // Fallback to stages column
      if (stages.length === 0 && p.stages) {
        try {
          stages = Array.isArray(p.stages) ? p.stages : JSON.parse(p.stages);
          // Filter out any non-string values (like objects or UUIDs) and normalize to lowercase
          stages = stages
            .filter((s: any) => typeof s === 'string' && s.length > 0)
            .map((s: string) => s.toLowerCase().trim());
        } catch (e) {
          console.error('Error parsing stages:', e);
        }
      }
      
      return {
        id: p.id,
        name: p.name,
        stages: stages,
      };
    });
    
    setPipelines(parsedPipelines);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, email')
      .order('first_name');
    // Map to include full_name for display
    const usersWithFullName = (data || []).map(u => ({
      id: u.user_id,
      full_name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || 'Unknown'
    }));
    setUsers(usersWithFullName);
  };

  const handlePipelineChange = (pipelineId: string) => {
    const pipeline = pipelines.find(p => p.id === pipelineId);
    if (pipeline) {
      setSelectedPipelineStages(pipeline.stages || []);
      // Reset stage when pipeline changes
      form.setValue('stage', '');
    }
  };

  const onSubmit = async (data: DealFormData) => {
    setLoading(true);
    try {
      const dealData = {
        name: data.name,
        description: data.description || null,
        amount: data.amount ? parseFloat(data.amount) : null,
        pipeline_id: data.pipeline_id,
        stage: data.stage as any,
        priority: data.priority as 'low' | 'medium' | 'high',
        close_date: data.close_date ? data.close_date.toISOString().split('T')[0] : null,
        company_id: data.company_id || null,
        primary_contact_id: data.primary_contact_id || null,
        timezone: data.timezone || 'America/New_York',
        vertical: (data.vertical as any) || null,
        country: data.country || null,
        state: data.state || null,
        city: data.city || null,
        deal_owner_id: data.deal_owner_id || null,
        setter_id: data.setter_id || null,
        account_manager_id: data.account_manager_id || null,
        industry: data.industry || null,
        annual_revenue: data.annual_revenue || null,
        currency: data.currency || 'USD',
        product_segment: data.product_segment || null,
        lead_source: data.lead_source || null,
        referral_source: data.referral_source || null,
        last_activity_date: new Date().toISOString(),
      };

      console.log('[DealForm] Submitting deal data:', dealData);
      
      const { error } = await supabase
        .from('deals')
        .insert([dealData]);

      if (error) {
        console.error('[DealForm] Error creating deal:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Deal created successfully",
      });

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('[DealForm] Full error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create deal",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Create New Deal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter deal name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter deal description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., America/Los_Angeles" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vertical"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vertical</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vertical" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
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
                        ].map(v => (
                          <SelectItem key={v} value={v}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pipeline_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pipeline</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        handlePipelineChange(value);
                      }} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select pipeline" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pipelines.map((pipeline) => (
                          <SelectItem key={pipeline.id} value={pipeline.id}>
                            {pipeline.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={!selectedPipelineStages.length}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={selectedPipelineStages.length ? "Select stage" : "Select pipeline first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {selectedPipelineStages.map((stage) => (
                          <SelectItem key={stage} value={stage.toLowerCase()}>
                            {stage.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="close_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Close Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Location Fields */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., USA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., California" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Los Angeles" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select contact" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {contacts.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.first_name} {contact.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Team Section */}
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-semibold">Team</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="deal_owner_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal Owner</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select owner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="setter_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setter</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select setter" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="account_manager_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Manager</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Financial & Categorization Section */}
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-semibold">Financial Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Technology, Healthcare" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="product_segment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Segment</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select segment" />
                          </SelectTrigger>
                      </FormControl>
                        <SelectContent>
                          <SelectItem value="Remote Operator">Remote Operator</SelectItem>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="WebApp">WebApp</SelectItem>
                          <SelectItem value="AI Adoption">AI Adoption</SelectItem>
                          <SelectItem value="Consulting">Consulting</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="annual_revenue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annual Revenue</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select revenue range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="<100k">&lt;100k</SelectItem>
                          <SelectItem value="100-250k">100-250k</SelectItem>
                          <SelectItem value="251-500k">251-500k</SelectItem>
                          <SelectItem value="500k-1M">500k-1M</SelectItem>
                          <SelectItem value="1M+">1M+</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Source Tracking Section */}
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-semibold">Source Tracking</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="lead_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Source</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select source" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[
                            'Website', 'Referral', 'Social Media', 'Email Campaign',
                            'Cold Call', 'Trade Show', 'Partner', 'Advertisement',
                            'Direct', 'Other'
                          ].map((source) => (
                            <SelectItem key={source} value={source.toLowerCase().replace(' ', '_')}>
                              {source}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="referral_source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Referral Source</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., John Doe, Partner Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}