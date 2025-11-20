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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Mail, Phone, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  primary_email?: string;
  primary_phone?: string;
  company_id?: string;
  companies?: {
    name: string;
  };
}

interface LinkContactDialogProps {
  dealId: string;
  currentContactId?: string;
  onSuccess: () => void;
  children?: React.ReactNode;
}

export function LinkContactDialog({ dealId, currentContactId, onSuccess, children }: LinkContactDialogProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchContacts();
    }
  }, [open]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          id,
          first_name,
          last_name,
          primary_email,
          primary_phone,
          company_id,
          companies (
            name
          )
        `)
        .order('first_name', { ascending: true });

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkContact = async () => {
    if (!selectedContactId) {
      toast({
        title: "Error",
        description: "Please select a contact",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update the deal's primary_contact_id
      const { error } = await supabase
        .from('deals')
        .update({ primary_contact_id: selectedContactId })
        .eq('id', dealId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact linked to deal successfully",
      });

      setOpen(false);
      setSelectedContactId(null);
      onSuccess();
    } catch (error: any) {
      console.error('Error linking contact:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to link contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getContactDisplay = (contact: Contact) => {
    const fullName = `${contact.first_name} ${contact.last_name}`;
    const company = contact.companies?.name;
    return { fullName, company };
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button size="sm" variant="outline">Add Contact</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Link Existing Contact</DialogTitle>
          <DialogDescription>
            Search and select an existing contact to associate with this deal
          </DialogDescription>
        </DialogHeader>

        <Command className="border rounded-lg">
          <CommandInput placeholder="Search contacts by name, email, or company..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {loading ? "Loading contacts..." : "No contacts found"}
            </CommandEmpty>
            <CommandGroup>
              {contacts.map((contact) => {
                const { fullName, company } = getContactDisplay(contact);
                const isSelected = selectedContactId === contact.id;
                const isCurrent = currentContactId === contact.id;

                return (
                  <CommandItem
                    key={contact.id}
                    value={`${fullName} ${contact.primary_email || ''} ${company || ''}`}
                    onSelect={() => setSelectedContactId(contact.id)}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {contact.first_name?.[0]}{contact.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {fullName}
                        </span>
                        {isCurrent && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>

                      {company && (
                        <div className="text-xs text-muted-foreground truncate">
                          {company}
                        </div>
                      )}

                      <div className="flex items-center gap-3 mt-1">
                        {contact.primary_email && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{contact.primary_email}</span>
                          </div>
                        )}
                        {contact.primary_phone && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{contact.primary_phone}</span>
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
              setSelectedContactId(null);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleLinkContact}
            disabled={!selectedContactId || loading}
          >
            {loading ? "Linking..." : "Link Contact"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

