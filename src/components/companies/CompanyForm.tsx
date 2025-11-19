import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const companySchema = z.object({
  owner_id: z.string().optional(),
  name: z.string().min(1, "Company name is required"),
  vertical: z.string().optional(),
  domain: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  timezone: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  founder_full_name: z.string().optional(),
  founder_email: z.string().email("Invalid email").optional().or(z.literal("")),
  instagram_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  facebook_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  tiktok_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedin_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyFormProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function CompanyForm({ children, onSuccess }: CompanyFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const { toast } = useToast();

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
    'Other'
  ];

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email, role')
        .in('role', ['admin', 'manager', 'rep'])
        .order('first_name');

      if (error) throw error;
      if (data) {
        // Map to include full_name
        const usersWithFullName = data.map(user => ({
          id: user.id,
          full_name: user.first_name && user.last_name 
            ? `${user.first_name} ${user.last_name}`
            : user.first_name || user.last_name || user.email || 'Unknown',
          role: user.role
        }));
        setUsers(usersWithFullName);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      owner_id: "",
      name: "",
      vertical: "",
      domain: "",
      website: "",
      phone: "",
      email: "",
      timezone: "America/New_York",
      industry: "",
      description: "",
      founder_full_name: "",
      founder_email: "",
      instagram_url: "",
      facebook_url: "",
      tiktok_url: "",
      linkedin_url: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "",
    },
  });

  const onSubmit = async (data: CompanyFormData) => {
    setLoading(true);
    try {
      const companyData = {
        owner_id: data.owner_id || null,
        name: data.name,
        vertical: data.vertical || null,
        domain: data.domain || null,
        website: data.website || null,
        phone: data.phone || null,
        email: data.email || null,
        timezone: data.timezone || 'America/New_York',
        industry: data.industry || null,
        description: data.description || null,
        founder_full_name: data.founder_full_name || null,
        founder_email: data.founder_email || null,
        instagram_url: data.instagram_url || null,
        facebook_url: data.facebook_url || null,
        tiktok_url: data.tiktok_url || null,
        linkedin_url: data.linkedin_url || null,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        country: data.country || null,
      };

      const { error } = await supabase
        .from('companies')
        .insert([companyData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company created successfully",
      });

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: "Error",
        description: "Failed to create company. Please try again.",
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
          <DialogTitle className="text-lg sm:text-xl">Add New Company</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Basic Information</h3>
              
              {/* Company Owner */}
              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Owner</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select owner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Vertical */}
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
                      <SelectContent className="max-h-[200px]">
                        {verticalOptions.map((vertical) => (
                          <SelectItem key={vertical} value={vertical}>
                            {vertical}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="domain"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website/Domain</FormLabel>
                      <FormControl>
                        <Input placeholder="example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Website</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Email</FormLabel>
                      <FormControl>
                        <Input placeholder="contact@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Zone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {timezoneOptions.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
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
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the company..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Founder Information */}
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-semibold">Founder Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="founder_full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founder's Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="founder_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Founder's Email</FormLabel>
                      <FormControl>
                        <Input placeholder="founder@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Social Media */}
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-semibold">Social Media</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="instagram_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Instagram</FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="facebook_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Facebook</FormLabel>
                      <FormControl>
                        <Input placeholder="https://facebook.com/company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tiktok_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company TikTok</FormLabel>
                      <FormControl>
                        <Input placeholder="https://tiktok.com/@company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedin_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company LinkedIn</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/company/name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            {/* Address */}
            <div className="space-y-3 pt-3 border-t">
              <h3 className="text-sm font-semibold">Address</h3>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City/Region</FormLabel>
                      <FormControl>
                        <Input placeholder="Los Angeles" {...field} />
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
                      <FormLabel>State/Region</FormLabel>
                      <FormControl>
                        <Input placeholder="California" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                      <FormControl>
                        <Input placeholder="90001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl>
                        <Input placeholder="United States" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="w-full sm:w-auto"
              >
              Cancel
            </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto"
              >
              {loading ? "Creating..." : "Create Company"}
            </Button>
            </div>
        </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
