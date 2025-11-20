import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Building2, Mail, Phone, Check, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Company {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
}

interface LinkCompanyDialogProps {
  dealId: string;
  currentCompanyId?: string;
  onSuccess: () => void;
  children?: React.ReactNode;
}

export function LinkCompanyDialog({ dealId, currentCompanyId, onSuccess, children }: LinkCompanyDialogProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchCompanies();
    }
  }, [open]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      toast({
        title: "Error",
        description: "Failed to load companies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkCompany = async () => {
    if (!selectedCompanyId) {
      toast({
        title: "Error",
        description: "Please select a company",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update the deal's company_id
      const { error } = await supabase
        .from('deals')
        .update({ company_id: selectedCompanyId })
        .eq('id', dealId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company linked to deal successfully",
      });

      setOpen(false);
      setSelectedCompanyId(null);
      onSuccess();
    } catch (error: any) {
      console.error('Error linking company:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link company",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getLocationDisplay = (company: Company) => {
    const parts = [company.city, company.state, company.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button size="sm" variant="outline">Add Company</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Existing Company</DialogTitle>
          <DialogDescription>
            Search and select an existing company to associate with this deal
          </DialogDescription>
        </DialogHeader>

        <Command className="border rounded-lg">
          <CommandInput placeholder="Search companies by name, location, or industry..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {loading ? "Loading companies..." : "No companies found"}
            </CommandEmpty>
            <CommandGroup>
              {companies.map((company) => {
                const isSelected = selectedCompanyId === company.id;
                const isCurrent = currentCompanyId === company.id;
                const location = getLocationDisplay(company);

                return (
                  <CommandItem
                    key={company.id}
                    value={`${company.name} ${location} ${company.industry || ''} ${company.email || ''}`}
                    onSelect={() => setSelectedCompanyId(company.id)}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <div className="h-8 w-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {company.name}
                        </span>
                        {isCurrent && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>

                      {company.industry && (
                        <div className="text-xs text-muted-foreground truncate">
                          {company.industry}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {location && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{location}</span>
                          </div>
                        )}
                        {company.email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{company.email}</span>
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{company.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setSelectedCompanyId(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLinkCompany}
            disabled={!selectedCompanyId || loading}
          >
            {loading ? "Linking..." : "Link Company"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

