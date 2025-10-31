import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCTIStore } from "./DialpadCTIManager";

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

  const handleCall = () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "No phone number available",
        variant: "destructive",
      });
      return;
    }

    // Open the Dialpad CTI with the phone number
    openCTI(phoneNumber);
    
    toast({
      title: "Opening Dialpad",
      description: `Preparing to call ${phoneNumber}`,
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      disabled={!phoneNumber}
      title={phoneNumber ? `Call ${phoneNumber}` : "No phone number"}
      onClick={handleCall}
    >
      {showIcon && <Phone className={label ? "mr-2 h-4 w-4" : "h-4 w-4"} />}
      {label || (size === "icon" ? "" : "Call")}
    </Button>
  );
}
