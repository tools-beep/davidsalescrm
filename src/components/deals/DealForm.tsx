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

export function DealForm({ children, onSuccess }: DealFormProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [contacts, setContacts] = useState<{ id: string; first_name: string; last_name: string }[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
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
      timezone: "",
      vertical: "",
      country: "",
      state: "",
      city: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchCompanies();
      fetchContacts();
      fetchPipelines();
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
      .select('id, name, stages')
      .order('name');
    setPipelines(data || []);
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
        timezone: data.timezone || null,
        vertical: (data.vertical as any) || null,
        country: data.country || null,
        state: data.state || null,
        city: data.city || null,
      };

      const { error } = await supabase
        .from('deals')
        .insert([dealData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Deal created successfully",
      });

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating deal:', error);
      toast({
        title: "Error",
        description: "Failed to create deal",
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          <SelectItem key={stage} value={stage}>
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

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}