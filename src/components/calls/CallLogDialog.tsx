import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Search, User, Briefcase } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CallLogDialogProps {
  isOpen: boolean;
  onClose: () => void;
  callData: {
    phoneNumber: string;
    callId?: number;
    startTime?: Date;
    endTime?: Date;
    duration?: number; // in seconds
    dealId?: string;
    contactId?: string;
  };
}

export function CallLogDialog({ isOpen, onClose, callData }: CallLogDialogProps) {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    subject: "",
    outcome: "",
    notes: "",
    followUpDate: "",
    contactId: "",
    dealId: "",
    contactName: "",
    dealName: "",
  });

  const [contacts, setContacts] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [dealSearch, setDealSearch] = useState("");
  const [openContactSearch, setOpenContactSearch] = useState(false);
  const [openDealSearch, setOpenDealSearch] = useState(false);

  // Load contacts and deals
  useEffect(() => {
    if (isOpen) {
      loadContacts();
      loadDeals();
    }
  }, [isOpen]);

  // Pre-populate dealId and contactId from callData
  useEffect(() => {
    if (isOpen && callData) {
      // Set IDs immediately if available
      if (callData.dealId) {
        setFormData(prev => ({ ...prev, dealId: callData.dealId || '' }));
      }
      if (callData.contactId) {
        setFormData(prev => ({ ...prev, contactId: callData.contactId || '' }));
      }
    }
  }, [isOpen, callData]);

  // Update names once deals/contacts are loaded
  useEffect(() => {
    if (isOpen && callData && (deals.length > 0 || contacts.length > 0)) {
      if (callData.dealId) {
        const deal = deals.find(d => d.id === callData.dealId);
        if (deal) {
          setFormData(prev => ({ ...prev, dealName: deal.name || '' }));
        }
      }
      if (callData.contactId) {
        const contact = contacts.find(c => c.id === callData.contactId);
        if (contact) {
          setFormData(prev => ({ 
            ...prev, 
            contactName: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || '' 
          }));
        }
      }
    }
  }, [isOpen, callData, deals, contacts]);

  const loadContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email, phone')
        .order('first_name')
        .limit(100);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadDeals = async () => {
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('id, name, value, stage')
        .order('name')
        .limit(100);

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error loading deals:', error);
    }
  };

  const callOutcomes = [
    "Connected",
    "No Answer",
    "Voicemail",
    "Busy",
    "Wrong Number",
    "Call Back Requested",
    "Meeting Scheduled",
    "Not Interested",
    "Follow Up Required",
  ];

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleSave = async () => {
    if (!formData.subject || !formData.outcome) {
      toast({
        title: "Validation Error",
        description: "Subject and Call Outcome are required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Calculate duration if we have start and end times
      let duration = callData.duration;
      if (!duration && callData.startTime && callData.endTime) {
        duration = Math.floor((callData.endTime.getTime() - callData.startTime.getTime()) / 1000);
      }

      // Build notes with subject
      const fullNotes = `Subject: ${formData.subject}\n\n${formData.notes || ''}`.trim();

      // Save to calls table with correct column names
      const { error } = await supabase
        .from('calls')
        .insert({
          rep_id: user.id,
          related_contact_id: formData.contactId || null,
          related_deal_id: formData.dealId || null,
          caller_number: callData.phoneNumber || null,
          call_direction: 'outbound',
          call_status: 'completed',
          duration_seconds: duration || 0,
          outbound_type: 'outbound call', // Required enum field
          call_outcome: formData.outcome as any, // Required enum field
          notes: fullNotes,
          dialpad_call_id: callData.callId?.toString() || null,
          call_timestamp: callData.startTime?.toISOString() || new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Call logged successfully",
        description: "Call details have been saved.",
      });

      onClose();
      
      // Reset form
      setFormData({
        subject: "",
        outcome: "",
        notes: "",
        followUpDate: "",
        contactId: "",
        dealId: "",
        contactName: "",
        dealName: "",
      });
    } catch (error: any) {
      console.error("Error saving call log:", error);
      toast({
        title: "Error saving call log",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    onClose();
    setFormData({
      subject: "",
      outcome: "",
      notes: "",
      followUpDate: "",
      contactId: "",
      dealId: "",
      contactName: "",
      dealName: "",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log Call Details</DialogTitle>
          <DialogDescription>
            Record information about this call for future reference
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Call Summary */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Phone Number:</span>
              <span className="text-sm text-blue-700 dark:text-blue-300">{callData.phoneNumber}</span>
            </div>
            {callData.duration !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Duration:</span>
                <span className="text-sm text-blue-700 dark:text-blue-300">{formatDuration(callData.duration)}</span>
              </div>
            )}
            {callData.startTime && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Time:</span>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {callData.startTime.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">
              Subject <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              placeholder="e.g., Follow-up call, Sales inquiry, Support call"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            />
          </div>

          {/* Call Outcome */}
          <div className="space-y-2">
            <Label htmlFor="outcome">
              Call Outcome <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.outcome}
              onValueChange={(value) => setFormData({ ...formData, outcome: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                {callOutcomes.map((outcome) => (
                  <SelectItem key={outcome} value={outcome}>
                    {outcome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Call Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any important details from the conversation..."
              rows={4}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Follow-up Date */}
          <div className="space-y-2">
            <Label htmlFor="followUpDate">Follow-up Date (Optional)</Label>
            <Input
              id="followUpDate"
              type="date"
              value={formData.followUpDate}
              onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
            />
          </div>

          {/* Optional: Link to Contact/Deal */}
          <div className="grid grid-cols-2 gap-4">
            {/* Contact Search */}
            <div className="space-y-2">
              <Label>Link to Contact (Optional)</Label>
              <Popover open={openContactSearch} onOpenChange={setOpenContactSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openContactSearch}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {formData.contactName || "Search contacts..."}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search contacts..." 
                      value={contactSearch}
                      onValueChange={setContactSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No contact found.</CommandEmpty>
                      <CommandGroup>
                        {contacts
                          .filter(c => {
                            const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
                            return fullName.includes(contactSearch.toLowerCase()) ||
                                   c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
                                   c.phone?.includes(contactSearch);
                          })
                          .slice(0, 10)
                          .map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={contact.id}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  contactId: contact.id,
                                  contactName: `${contact.first_name} ${contact.last_name}`
                                });
                                setOpenContactSearch(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {contact.first_name} {contact.last_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {contact.email || contact.phone}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.contactName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, contactId: "", contactName: "" })}
                  className="h-6 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Deal Search */}
            <div className="space-y-2">
              <Label>Link to Deal (Optional)</Label>
              <Popover open={openDealSearch} onOpenChange={setOpenDealSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openDealSearch}
                    className="w-full justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      {formData.dealName || "Search deals..."}
                    </span>
                    <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Search deals..." 
                      value={dealSearch}
                      onValueChange={setDealSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No deal found.</CommandEmpty>
                      <CommandGroup>
                        {deals
                          .filter(d => d.name.toLowerCase().includes(dealSearch.toLowerCase()))
                          .slice(0, 10)
                          .map((deal) => (
                            <CommandItem
                              key={deal.id}
                              value={deal.id}
                              onSelect={() => {
                                setFormData({
                                  ...formData,
                                  dealId: deal.id,
                                  dealName: deal.name
                                });
                                setOpenDealSearch(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{deal.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ${deal.value?.toLocaleString()} • {deal.stage}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {formData.dealName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, dealId: "", dealName: "" })}
                  className="h-6 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={saving}
          >
            Skip
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !formData.subject || !formData.outcome}
          >
            {saving ? "Saving..." : "Save Call Log"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

