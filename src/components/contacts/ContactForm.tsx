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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  owner_id: z.string().optional(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  primary_email: z.string().email("Invalid email").optional().or(z.literal("")),
  secondary_email: z.string().email("Invalid email").optional().or(z.literal("")),
  primary_phone: z.string().optional(),
  secondary_phone: z.string().optional(),
  description: z.string().optional(),
  timezone: z.string().optional(),
  instagram_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  facebook_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  website_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  tiktok_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  x_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  linkedin_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  country: z.string().optional(),
  address: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  company_id: z.string().optional(),
  lifecycle_stage: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  children?: React.ReactNode;
  contact?: any; // Contact to edit
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const lifecycleStages = [
  { value: "lead", label: "Lead" },
  { value: "prospect", label: "Prospect" },
  { value: "qualified", label: "Qualified" },
  { value: "customer", label: "Customer" },
  { value: "evangelist", label: "Evangelist" },
];

export function ContactForm({ children, contact, onSuccess, open: controlledOpen, onOpenChange }: ContactFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string; role?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      owner_id: "",
      first_name: "",
      last_name: "",
      primary_email: "",
      secondary_email: "",
      primary_phone: "",
      secondary_phone: "",
      description: "",
      timezone: "America/New_York",
      instagram_url: "",
      facebook_url: "",
      website_url: "",
      tiktok_url: "",
      x_url: "",
      linkedin_url: "",
      country: "",
      address: "",
      state: "",
      city: "",
      zip_code: "",
      company_id: "",
      lifecycle_stage: "lead",
    },
  });

  useEffect(() => {
    if (open) {
      fetchCompanies();
      fetchUsers();
      // Load contact data if editing
      if (contact) {
        form.reset({
          owner_id: contact.owner_id || "",
          first_name: contact.first_name || "",
          last_name: contact.last_name || "",
          primary_email: contact.primary_email || contact.email || "",
          secondary_email: contact.secondary_email || "",
          primary_phone: contact.primary_phone || contact.phone || "",
          secondary_phone: contact.secondary_phone || "",
          description: contact.description || "",
          timezone: contact.timezone || "America/New_York",
          instagram_url: contact.instagram_url || "",
          facebook_url: contact.facebook_url || "",
          website_url: contact.website_url || "",
          tiktok_url: contact.tiktok_url || "",
          x_url: contact.x_url || "",
          linkedin_url: contact.linkedin_url || "",
          country: contact.country || "",
          address: contact.address || "",
          state: contact.state || "",
          city: contact.city || "",
          zip_code: contact.zip_code || "",
          company_id: contact.company_id || "",
          lifecycle_stage: contact.lifecycle_stage || "lead",
        });
      }
    }
  }, [open, contact]);

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
  };

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

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email, role')
      .order('first_name');
    
    console.log('Fetched users for owner dropdown:', data);
    console.log('Users fetch error:', error);
    
    if (data) {
      // Map to include full_name with role badge
      const usersWithFullName = data.map(user => ({
        id: user.id,
        full_name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}${user.role ? ` (${getRoleDisplayName(user.role)})` : ''}`
          : user.first_name || user.last_name || user.email || 'Unknown',
        role: user.role
      }));
      setUsers(usersWithFullName);
      console.log('Users with full names:', usersWithFullName);
    }
  };

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true);
    try {
      // Helper function to clean field values
      const cleanValue = (value: string | undefined): string | null => {
        // Check for various "empty" representations
        if (!value || value.trim() === '' || value === 'none' || value === 'undefined' || value === 'null') {
          return null;
        }
        return value.trim();
      };
      
      console.log('Raw form data:', data);

      const contactData = {
        owner_id: cleanValue(data.owner_id),
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        primary_email: cleanValue(data.primary_email),
        secondary_email: cleanValue(data.secondary_email),
        primary_phone: cleanValue(data.primary_phone),
        secondary_phone: cleanValue(data.secondary_phone),
        description: cleanValue(data.description),
        timezone: data.timezone || 'America/New_York',
        instagram_url: cleanValue(data.instagram_url),
        facebook_url: cleanValue(data.facebook_url),
        website_url: cleanValue(data.website_url),
        tiktok_url: cleanValue(data.tiktok_url),
        x_url: cleanValue(data.x_url),
        linkedin_url: cleanValue(data.linkedin_url),
        country: cleanValue(data.country),
        address: cleanValue(data.address),
        state: cleanValue(data.state),
        city: cleanValue(data.city),
        zip_code: cleanValue(data.zip_code),
        company_id: cleanValue(data.company_id),
        lifecycle_stage: (data.lifecycle_stage || 'lead') as 'lead' | 'prospect' | 'qualified' | 'customer' | 'evangelist',
      };

      console.log('Creating contact with data:', contactData);
      console.log('Available users:', users);
      console.log('Selected owner_id from form:', data.owner_id);
      console.log('Cleaned owner_id:', contactData.owner_id);

      // Only validate owner if one was actually selected (not null/undefined/"none")
      if (contactData.owner_id && contactData.owner_id !== 'none') {
        console.log('Validating owner_id:', contactData.owner_id);
        
        // Check if owner exists in user_profiles
        const { data: dbUser, error: userError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', contactData.owner_id)
          .maybeSingle();
        
        console.log('Owner validation result:', { dbUser, userError });
        
        if (userError) {
          console.error('Owner validation error:', userError);
          throw new Error(`Error validating owner: ${userError.message}`);
        }
        
        if (!dbUser) {
          console.error('Owner not found in user_profiles');
          throw new Error(`The selected owner does not exist in the system. Please select a different owner or leave it empty.`);
        }
      }

      // Only validate company if one was actually selected
      if (contactData.company_id && contactData.company_id !== 'none') {
        console.log('Validating company_id:', contactData.company_id);
        
        const { data: dbCompany, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('id', contactData.company_id)
          .maybeSingle();
        
        console.log('Company validation result:', { dbCompany, companyError });
        
        if (companyError) {
          console.error('Company validation error:', companyError);
          throw new Error(`Error validating company: ${companyError.message}`);
        }
        
        if (!dbCompany) {
          console.error('Company not found');
          throw new Error(`The selected company does not exist. Please select a different company or leave it empty.`);
        }
      }

      console.log('=== ABOUT TO INSERT/UPDATE ===');
      console.log('Final contactData:', JSON.stringify(contactData, null, 2));

      let error;
      let result;
      
      if (contact) {
        // Update existing contact
        console.log('Updating contact:', contact.id);
        result = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contact.id)
          .select();
        error = result.error;
        console.log('Update result:', result);
      } else {
        // Create new contact
        console.log('Creating new contact...');
        result = await supabase
          .from('contacts')
          .insert([contactData])
          .select();
        error = result.error;
        console.log('Insert result:', result);
      }

      if (error) {
        console.error('=== SUPABASE ERROR ===');
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Full error:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('=== SUCCESS ===');
      console.log('Created/Updated contact:', result.data);

      toast({
        title: "Success",
        description: contact ? "Contact updated successfully" : "Contact created successfully",
      });

      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating contact:', error);
      
      let errorMessage = "Failed to create contact";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.code === '23503') {
        // Foreign key constraint violation
        if (error.message?.includes('owner_id')) {
          errorMessage = "Invalid owner selected. Please select a valid owner or leave it empty.";
        } else if (error.message?.includes('company_id')) {
          errorMessage = "Invalid company selected. Please select a valid company or leave it empty.";
        } else {
          errorMessage = "Invalid reference detected. Please check all dropdown selections.";
        }
      } else if (error?.code === '23505') {
        errorMessage = "A contact with this email already exists.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && (
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">{contact ? 'Edit Contact' : 'Create New Contact'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            {/* Contact Owner */}
            <FormField
              control={form.control}
              name="owner_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Contact Owner (Optional)
                    {users.length > 0 && <span className="text-xs text-muted-foreground ml-2">({users.length} users available)</span>}
                  </FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      console.log('Owner changed to:', value);
                      field.onChange(value === "none" ? "" : value);
                    }} 
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No Owner</SelectItem>
                      {users.length === 0 ? (
                        <SelectItem value="loading" disabled>Loading users...</SelectItem>
                      ) : (
                        users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.full_name}
                        </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="primary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter primary email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter secondary email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="primary_phone"
                render={({ field}) => (
                  <FormItem>
                    <FormLabel>Primary Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter primary phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secondary_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secondary Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter secondary phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Social Media URLs */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Social Media & Website</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="instagram_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://instagram.com/..." {...field} />
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
                      <FormLabel>Facebook URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://facebook.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="website_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Website URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://example.com" {...field} />
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
                      <FormLabel>TikTok URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://tiktok.com/@..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="x_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>X (Twitter) URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://x.com/..." {...field} />
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
                      <FormLabel>LinkedIn URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://linkedin.com/in/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / About</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter contact description or bio..." {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                      <SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                      <SelectItem value="America/Phoenix">America/Phoenix (AZ)</SelectItem>
                      <SelectItem value="America/Anchorage">America/Anchorage (AK)</SelectItem>
                      <SelectItem value="Pacific/Honolulu">Pacific/Honolulu (HI)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address Fields */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Address</h3>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter street address" {...field} />
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
                      <FormLabel>City</FormLabel>
                      <FormControl>
                      <Input placeholder="Enter city" {...field} />
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
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter state/province" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <FormField
                  control={form.control}
                  name="zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ZIP Code</FormLabel>
                    <FormControl>
                        <Input placeholder="Enter ZIP code" {...field} />
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
                      <Input placeholder="Enter country" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="company_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Company</SelectItem>
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
                name="lifecycle_stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lifecycle Stage</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stage" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lifecycleStages.map((stage) => (
                          <SelectItem key={stage.value} value={stage.value}>
                            {stage.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading ? "Creating..." : "Create Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}