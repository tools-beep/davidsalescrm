import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Search, Filter, Phone, Mail, Building2, MapPin, Grid3X3, List, Trash2, Edit, CheckSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ContactForm } from "@/components/contacts/ContactForm";
import { ContactListView } from "@/components/contacts/ContactListView";
import { BulkUploadDialog } from "@/components/contacts/BulkUploadDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  lifecycle_stage?: string;
  created_at: string;
  companies?: { name: string };
}

const stageColors = {
  lead: "secondary",
  prospect: "warning",
  qualified: "primary",
  customer: "success",
  evangelist: "success"
} as const;

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select(`
          *,
          companies(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contacts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.companies?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === filteredContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
    }
  };

  const handleDeleteSelected = async () => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .in('id', Array.from(selectedContacts));

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedContacts.size} contact(s)`,
      });

      setSelectedContacts(new Set());
      setSelectionMode(false);
      setDeleteDialogOpen(false);
      fetchContacts();
    } catch (error) {
      console.error('Error deleting contacts:', error);
      toast({
        title: "Error",
        description: "Failed to delete contacts",
        variant: "destructive",
      });
    }
  };

  const handleCardClick = async (e: React.MouseEvent, contact: Contact) => {
    if (selectionMode) {
      e.stopPropagation();
      handleSelectContact(contact.id);
    } else {
      // Navigate to the contact's most recent deal
      try {
        const { data: deals } = await supabase
          .from('deals')
          .select('id')
          .eq('primary_contact_id', contact.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (deals && deals.length > 0) {
          navigate(`/deals/${deals[0].id}`);
        } else {
          toast({
            title: "No Deal Found",
            description: "This contact has no associated deals yet.",
            variant: "default"
          });
        }
      } catch (error) {
        console.error('Error finding deal:', error);
        toast({
          title: "Error",
          description: "Failed to find deal for this contact",
          variant: "destructive"
        });
      }
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Manage your contact database and track interactions.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="text-xs sm:text-sm"
            >
              <Grid3X3 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="text-xs sm:text-sm"
            >
              <List className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs sm:text-sm"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  {selectedContacts.size === filteredContacts.length ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={selectedContacts.size === 0}
                  className="text-xs sm:text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete ({selectedContacts.size})
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedContacts(new Set());
                  }}
                  className="text-xs sm:text-sm"
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  className="text-xs sm:text-sm"
                >
                  <CheckSquare className="h-4 w-4 mr-1" />
                  Select
                </Button>
                <BulkUploadDialog />
                <ContactForm onSuccess={fetchContacts}>
                  <Button className="text-sm">
                    <Plus className="mr-2 h-4 w-4" />
                    New Contact
                  </Button>
                </ContactForm>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <Button variant="outline" className="w-full sm:w-auto">
          <Filter className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </Button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredContacts.map((contact) => (
            <Card
              key={contact.id}
              onClick={(e) => handleCardClick(e, contact)}
              className={`cursor-pointer hover:shadow-md transition-shadow ${highlightId === contact.id ? 'ring-2 ring-primary' : ''} ${selectedContacts.has(contact.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {selectionMode && (
                    <Checkbox
                      checked={selectedContacts.has(contact.id)}
                      onCheckedChange={() => handleSelectContact(contact.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                  )}
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {contact.first_name?.[0]}{contact.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div>
                      <h3 className="font-semibold">
                        {contact.first_name} {contact.last_name}
                      </h3>
                      {contact.companies?.name && (
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                          <Building2 className="h-3 w-3" />
                          <span>{contact.companies.name}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {contact.email && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center space-x-2 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{contact.phone}</span>
                        </div>
                      )}
                      {(contact.city || contact.state) && (
                        <div className="flex items-center space-x-2 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {[contact.city, contact.state].filter(Boolean).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {contact.lifecycle_stage && (
                        <Badge variant={stageColors[contact.lifecycle_stage as keyof typeof stageColors] || "secondary"}>
                          {contact.lifecycle_stage}
                        </Badge>
                      )}
                      {!selectionMode && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingContact(contact);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        <p>Added {new Date(contact.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <ContactListView contacts={filteredContacts} />
      )}

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-semibold">No contacts found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {searchTerm ? "Try adjusting your search terms." : "Get started by creating your first contact."}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedContacts.size} contact(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSelected} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Contact Dialog */}
      {editingContact && (
        <ContactForm
          contact={editingContact}
          onSuccess={() => {
            setEditingContact(null);
            fetchContacts();
          }}
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
        />
      )}
    </div>
  );
}