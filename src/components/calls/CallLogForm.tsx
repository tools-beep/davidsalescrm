import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const outboundTypes = [
  "outbound call",
  "inbound call",
  "strategy call",
  "operations audit",
  "candidate interview",
  "onboarding call"
];

const callOutcomes = [
  "do not call",
  "did not dial",
  "no answer",
  "gatekeeper",
  "voicemail",
  "DM introduction",
  "DM short story",
  "DM discovery",
  "DM presentation",
  "DM resume request",
  "discovery in progress",
  "strategy call booked",
  "strategy call attended",
  "strategy call no show",
  "strategy call rescheduled",
  "operations audit booked",
  "operations audit attended",
  "operations audit no show",
  "operations audit rescheduled",
  "candidate interview booked",
  "candidate interview attended",
  "candidate interview no show",
  "candidate interview rescheduled",
  "awaiting docs",
  "deal won",
  "not interested",
  "no show",
  "onboarding call booked",
  "onboarding call attended",
  "nurturing"
];

interface CallLogFormProps {
  onSubmit?: (data: any) => void;
  children?: React.ReactNode;
  open?: boolean;  // Controlled mode
  onOpenChange?: (open: boolean) => void;  // Controlled mode
  callData?: {
    phoneNumber?: string;
    callId?: number;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    dealId?: string;
    contactId?: string;
  };
}

export function CallLogForm({ onSubmit, children, open: controlledOpen, onOpenChange, callData }: CallLogFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    outboundType: "",
    callOutcome: "",
    durationSeconds: 0,
    notes: ""
  });

  // Use controlled or uncontrolled mode
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  // Pre-populate duration when call data is provided
  useEffect(() => {
    if (callData?.duration) {
      setFormData(prev => ({ ...prev, durationSeconds: callData.duration || 0 }));
    }
  }, [callData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.outboundType || !formData.callOutcome) {
      toast({
        title: "Validation Error",
        description: "Both Outbound Type and Call Outcome are required.",
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

      // Check if this call already exists (to avoid duplicates)
      let existingCall = null;
      if (callData?.callId) {
        const { data } = await supabase
          .from('calls')
          .select('id')
          .eq('dialpad_call_id', callData.callId.toString())
          .maybeSingle();
        existingCall = data;
      }

      // Save to database with correct column names
      if (existingCall) {
        // Update existing call
        const { error } = await supabase
          .from('calls')
          .update({
            outbound_type: formData.outboundType as any,
            call_outcome: formData.callOutcome as any,
            notes: formData.notes || null,
            duration_seconds: formData.durationSeconds || 0,
          })
          .eq('id', existingCall.id);

        if (error) throw error;
      } else {
        // Insert new call
        const { error } = await supabase
          .from('calls')
          .insert({
            rep_id: user.id,
            related_contact_id: callData?.contactId || null,
            related_deal_id: callData?.dealId || null,
            caller_number: callData?.phoneNumber || null,
            call_direction: 'outbound',
            call_status: 'completed',
            duration_seconds: formData.durationSeconds || 0,
            outbound_type: formData.outboundType as any,
            call_outcome: formData.callOutcome as any,
            notes: formData.notes || null,
            dialpad_call_id: callData?.callId?.toString() || null,
            call_timestamp: callData?.startTime?.toISOString() || new Date().toISOString(),
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Call logged successfully",
      });

      // Call the optional onSubmit callback
    onSubmit?.(formData);
      
    setOpen(false);
    setFormData({
      outboundType: "",
      callOutcome: "",
      durationSeconds: 0,
      notes: ""
    });
    } catch (error: any) {
      console.error("Error saving call log:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save call log",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Phone className="mr-2 h-4 w-4" />
            Log Call
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Log a Call</DialogTitle>
          <DialogDescription>
            Record the details of your call. Both outbound type and call outcome are required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="outbound-type">Outbound Type *</Label>
              <Select
                value={formData.outboundType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, outboundType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select outbound type" />
                </SelectTrigger>
                <SelectContent>
                  {outboundTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="call-outcome">Call Outcome *</Label>
              <Select
                value={formData.callOutcome}
                onValueChange={(value) => setFormData(prev => ({ ...prev, callOutcome: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select call outcome" />
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
            
            <div className="grid gap-2">
              <Label htmlFor="duration">Call Duration (seconds)</Label>
              <Input
                id="duration"
                type="number"
                value={formData.durationSeconds}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  durationSeconds: parseInt(e.target.value) || 0 
                }))}
                placeholder="0"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add your call notes here..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Call'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}