import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CreateDealFormProps {
  contactId?: string;
  onSuccess?: () => void;
}

export function CreateDealForm({ contactId, onSuccess }: CreateDealFormProps) {
  const [loading, setLoading] = useState(false);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipelineStages, setSelectedPipelineStages] = useState<string[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    pipeline_id: "",
    stage: "",
    priority: "medium",
    close_date: "",
    primary_contact_id: contactId || "",
    company_id: "",
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
  });

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
  ];

  const leadSources = [
    "Website", "Referral", "LinkedIn", "Cold Outbound", "Webinar", "Email", "Other"
  ];

  useEffect(() => {
    fetchPipelines();
    fetchCompanies();
    fetchUsers();
  }, []);

  const fetchPipelines = async () => {
    const { data } = await supabase
      .from('pipelines')
      .select('id, name, stages')
      .order('name');
    setPipelines(data || []);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
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
      setFormData({ ...formData, pipeline_id: pipelineId, stage: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.pipeline_id || !formData.stage) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dealData = {
        name: formData.name,
        description: formData.description || null,
        amount: formData.amount ? parseFloat(formData.amount) : null,
        pipeline_id: formData.pipeline_id,
        stage: formData.stage,
        priority: formData.priority as 'low' | 'medium' | 'high',
        close_date: formData.close_date || null,
        primary_contact_id: formData.primary_contact_id || null,
        company_id: formData.company_id || null,
        timezone: formData.timezone || 'America/New_York',
        vertical: formData.vertical || null,
        country: formData.country || null,
        state: formData.state || null,
        city: formData.city || null,
        deal_owner_id: formData.deal_owner_id || null,
        setter_id: formData.setter_id || null,
        account_manager_id: formData.account_manager_id || null,
        industry: formData.industry || null,
        annual_revenue: formData.annual_revenue ? parseFloat(formData.annual_revenue) : null,
        currency: formData.currency || 'USD',
        product_segment: formData.product_segment || null,
        lead_source: formData.lead_source || null,
        referral_source: formData.referral_source || null,
        last_activity_date: new Date().toISOString(),
        deal_status: 'open' as const,
      };

      const { error } = await supabase
        .from('deals')
        .insert([dealData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Deal created successfully",
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error creating deal:', error);
      toast({
        title: "Error",
        description: "Failed to create deal. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Basic Information</h3>
        
        <div className="space-y-2">
          <Label htmlFor="name">Deal Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter deal name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Enter deal description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.value} value={currency.value}>
                    {currency.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Pipeline & Stage */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Pipeline & Stage</h3>
        
        <div className="space-y-2">
          <Label htmlFor="pipeline">Pipeline *</Label>
          <Select value={formData.pipeline_id} onValueChange={handlePipelineChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="stage">Stage *</Label>
          <Select 
            value={formData.stage} 
            onValueChange={(value) => setFormData({ ...formData, stage: value })}
            disabled={!selectedPipelineStages.length}
          >
            <SelectTrigger>
              <SelectValue placeholder={selectedPipelineStages.length ? "Select stage" : "Select pipeline first"} />
            </SelectTrigger>
            <SelectContent>
              {selectedPipelineStages.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {stage.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="close_date">Close Date</Label>
            <Input
              id="close_date"
              type="date"
              value={formData.close_date}
              onChange={(e) => setFormData({ ...formData, close_date: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Relationships */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Relationships</h3>
        
        <div className="space-y-2">
          <Label htmlFor="company">Company</Label>
          <Select value={formData.company_id} onValueChange={(value) => setFormData({ ...formData, company_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Team */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Team</h3>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="deal_owner">Deal Owner</Label>
            <Select value={formData.deal_owner_id} onValueChange={(value) => setFormData({ ...formData, deal_owner_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="setter">Setter</Label>
            <Select value={formData.setter_id} onValueChange={(value) => setFormData({ ...formData, setter_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select setter" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account_manager">Account Manager</Label>
            <Select value={formData.account_manager_id} onValueChange={(value) => setFormData({ ...formData, account_manager_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator />

      {/* Additional Details */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Additional Details</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Technology"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product_segment">Product Segment</Label>
            <Select value={formData.product_segment} onValueChange={(value) => setFormData({ ...formData, product_segment: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Remote Operator">Remote Operator</SelectItem>
                <SelectItem value="Website">Website</SelectItem>
                <SelectItem value="WebApp">WebApp</SelectItem>
                <SelectItem value="AI Adoption">AI Adoption</SelectItem>
                <SelectItem value="Consulting">Consulting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="annual_revenue">Annual Revenue ($)</Label>
            <Input
              id="annual_revenue"
              type="number"
              value={formData.annual_revenue}
              onChange={(e) => setFormData({ ...formData, annual_revenue: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead_source">Lead Source</Label>
            <Select value={formData.lead_source} onValueChange={(value) => setFormData({ ...formData, lead_source: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {leadSources.map((source) => (
                  <SelectItem key={source} value={source.toLowerCase().replace(' ', '_')}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="referral_source">Referral Source</Label>
          <Input
            id="referral_source"
            value={formData.referral_source}
            onChange={(e) => setFormData({ ...formData, referral_source: e.target.value })}
            placeholder="e.g., John Doe, Partner Name"
          />
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-2 pt-4 sticky bottom-0 bg-background pb-4 border-t">
        <Button 
          type="submit" 
          className="flex-1"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Deal'
          )}
        </Button>
      </div>
    </form>
  );
}

