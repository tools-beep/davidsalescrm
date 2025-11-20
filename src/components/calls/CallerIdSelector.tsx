import { useState, useEffect } from "react";
import { Check, ChevronDown, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AVAILABLE_CALLER_IDS, DEFAULT_CALLER_ID, formatCallerNumber, CallerId } from "@/config/callerIds";

interface CallerIdSelectorProps {
  value?: string; // Selected caller ID (phone number)
  onChange: (callerId: CallerId) => void;
  disabled?: boolean;
}

export function CallerIdSelector({ value, onChange, disabled }: CallerIdSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<CallerId>(
    value ? AVAILABLE_CALLER_IDS.find(c => c.number === value) || DEFAULT_CALLER_ID : DEFAULT_CALLER_ID
  );

  // Load saved preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('staffly_caller_id');
    if (saved) {
      const found = AVAILABLE_CALLER_IDS.find(c => c.number === saved);
      if (found) {
        setSelectedId(found);
        onChange(found);
      }
    } else {
      onChange(DEFAULT_CALLER_ID);
    }
  }, []);

  const handleSelect = (callerId: CallerId) => {
    setSelectedId(callerId);
    onChange(callerId);
    localStorage.setItem('staffly_caller_id', callerId.number);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
          disabled={disabled}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">
                {formatCallerNumber(selectedId.number)}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {selectedId.location}
                {selectedId.isDefault && (
                  <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1">
                    DEFAULT
                  </Badge>
                )}
              </span>
            </div>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2" align="start">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Select Caller ID
          </div>
          {AVAILABLE_CALLER_IDS.map((callerId) => (
            <button
              key={callerId.id}
              onClick={() => handleSelect(callerId)}
              className="w-full flex items-center gap-3 px-2 py-2 text-sm rounded-md hover:bg-accent transition-colors"
            >
              <div className="flex-1 text-left">
                <div className="font-medium">
                  {formatCallerNumber(callerId.number)}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {callerId.name} • {callerId.location}
                  {callerId.isDefault && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      DEFAULT
                    </Badge>
                  )}
                </div>
              </div>
              {selectedId.id === callerId.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

