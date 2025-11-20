import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCTIStore } from "./DialpadCTIManager";
import { CallerIdSelector } from "./CallerIdSelector";
import { CallerId, DEFAULT_CALLER_ID } from "@/config/callerIds";

interface ClickToCallProps {
  phoneNumber: string;
  contactId?: string;
  dealId?: string;
  companyId?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  label?: string;
}

export function ClickToCall({
  phoneNumber,
  contactId,
  dealId,
  companyId,
  variant = "outline",
  size = "sm",
  showIcon = true,
  label,
}: ClickToCallProps) {
  const { toast } = useToast();
  const { openCTI } = useCTIStore();
  const [showDialog, setShowDialog] = useState(false);
  const [selectedCallerId, setSelectedCallerId] = useState<CallerId>(DEFAULT_CALLER_ID);

  const handleCallClick = () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "No phone number available",
        variant: "destructive",
      });
      return;
    }

    // Show caller ID selection dialog
    setShowDialog(true);
  };

  const handleConfirmCall = () => {
    // Open the Dialpad CTI with the phone number, dealId, contactId, and selected caller ID
    openCTI(phoneNumber, dealId, contactId, selectedCallerId.number);
    
    toast({
      title: "Opening Dialpad",
      description: `Calling ${phoneNumber} from ${selectedCallerId.location}`,
    });

    setShowDialog(false);
  };

  return (
    <>
    <Button
      variant={variant}
      size={size}
      disabled={!phoneNumber}
      title={phoneNumber ? `Call ${phoneNumber}` : "No phone number"}
        onClick={handleCallClick}
    >
      {showIcon && <Phone className={label ? "mr-2 h-4 w-4" : "h-4 w-4"} />}
      {label || (size === "icon" ? "" : "Call")}
    </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Caller ID</DialogTitle>
            <DialogDescription>
              Choose which number to display when calling {phoneNumber}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <CallerIdSelector 
              value={selectedCallerId.number}
              onChange={setSelectedCallerId}
            />

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmCall}
                className="gap-2"
              >
                <Phone className="h-4 w-4" />
                Call Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
