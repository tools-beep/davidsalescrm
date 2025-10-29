import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, X, Maximize2, Minimize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DialpadMiniDialerProps {
  onClose?: () => void;
  phoneNumber?: string; // Pre-fill phone number to call
  onCallStart?: (callId: number) => void;
  onCallEnd?: (callId: number) => void;
}

interface CallRingingPayload {
  state: 'on' | 'off';
  id: number;
  contact?: {
    id: string;
    phone: string;
    type: string;
    name?: string;
    email?: string;
  };
  target?: {
    id: number;
    phone: string;
    type: string;
    name?: string;
    email?: string;
  };
  internal_number: string;
  external_number: string;
}

export function DialpadMiniDialer({ 
  onClose, 
  phoneNumber,
  onCallStart,
  onCallEnd 
}: DialpadMiniDialerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentCallId, setCurrentCallId] = useState<number | null>(null);
  const { toast } = useToast();

  // Get Client ID from environment
  const clientId = import.meta.env.VITE_DIALPAD_CTI_CLIENT_ID;

  useEffect(() => {
    if (!clientId) {
      console.error('VITE_DIALPAD_CTI_CLIENT_ID is not set');
      toast({
        title: 'Configuration Error',
        description: 'Dialpad CTI Client ID is missing. Please contact support.',
        variant: 'destructive'
      });
      return;
    }

    // Listen for messages from Dialpad CTI
    const handleMessage = (event: MessageEvent) => {
      // Security: Verify message is from Dialpad
      if (event.origin !== 'https://dialpad.com') {
        return;
      }

      const { api, version, method, payload } = event.data;

      // Verify it's a Dialpad CTI message
      if (api !== 'opencti_dialpad' || version !== '1.0') {
        return;
      }

      console.log('Dialpad CTI Message:', method, payload);

      switch (method) {
        case 'user_authentication':
          handleUserAuthentication(payload);
          break;
        case 'call_ringing':
          handleCallRinging(payload);
          break;
        default:
          console.log('Unknown Dialpad CTI method:', method);
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [clientId, toast]);

  useEffect(() => {
    // If authenticated and phone number provided, initiate call
    if (isAuthenticated && phoneNumber && iframeRef.current) {
      initiateCall(phoneNumber);
    }
  }, [isAuthenticated, phoneNumber]);

  const handleUserAuthentication = (payload: { user_authenticated: boolean; user_id: number }) => {
    console.log('User authentication:', payload);
    setIsAuthenticated(payload.user_authenticated);

    if (payload.user_authenticated) {
      toast({
        title: 'Dialpad Connected',
        description: `Logged in as user ${payload.user_id}`,
      });

      // Enable this tab for calling
      enableCurrentTab();
    } else {
      toast({
        title: 'Dialpad Disconnected',
        description: 'Please log in to use Dialpad',
        variant: 'destructive'
      });
    }
  };

  const handleCallRinging = (payload: CallRingingPayload) => {
    console.log('Call ringing:', payload);

    if (payload.state === 'on') {
      setCurrentCallId(payload.id);
      if (onCallStart) {
        onCallStart(payload.id);
      }

      const contactName = payload.contact?.name || payload.external_number;
      toast({
        title: 'Incoming Call',
        description: `From: ${contactName}`,
      });
    } else if (payload.state === 'off') {
      if (onCallEnd && currentCallId) {
        onCallEnd(currentCallId);
      }
      setCurrentCallId(null);
    }
  };

  const enableCurrentTab = () => {
    if (!iframeRef.current) return;

    iframeRef.current.contentWindow?.postMessage({
      api: 'opencti_dialpad',
      version: '1.0',
      method: 'enable_current_tab'
    }, 'https://dialpad.com');

    console.log('Enabled current tab for calling');
  };

  const initiateCall = (phone: string) => {
    if (!iframeRef.current) {
      console.error('CTI iframe not ready');
      return;
    }

    // Format phone number to E.164 if needed
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      formattedPhone = `+1${phone.replace(/\D/g, '')}`; // Assume US/Canada
    }

    iframeRef.current.contentWindow?.postMessage({
      api: 'opencti_dialpad',
      version: '1.0',
      method: 'initiate_call',
      payload: {
        enable_current_tab: true,
        phone_number: formattedPhone,
        custom_data: JSON.stringify({
          source: 'staffly_crm',
          timestamp: new Date().toISOString()
        })
      }
    }, 'https://dialpad.com');

    toast({
      title: 'Initiating Call',
      description: `Calling ${formattedPhone}...`,
    });

    console.log('Initiated call to:', formattedPhone);
  };

  const hangUpAllCalls = () => {
    if (!iframeRef.current) return;

    iframeRef.current.contentWindow?.postMessage({
      api: 'opencti_dialpad',
      version: '1.0',
      method: 'hang_up_all_calls'
    }, 'https://dialpad.com');

    toast({
      title: 'Ending Calls',
      description: 'Hanging up all active calls...',
    });

    console.log('Hanging up all calls');
  };

  if (!clientId) {
    return (
      <Card className="fixed bottom-4 right-4 w-96 p-6 shadow-lg z-50 bg-red-50 border-red-200">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">Configuration Error</h3>
          </div>
          <p className="text-sm text-red-700">
            Dialpad CTI Client ID is not configured. Please add <code className="bg-red-100 px-1 py-0.5 rounded">VITE_DIALPAD_CTI_CLIENT_ID</code> to your environment variables.
          </p>
          <p className="text-xs text-red-600">
            Contact Dialpad support to get your Client ID.
          </p>
          {onClose && (
            <Button onClick={onClose} variant="outline" className="w-full">
              Close
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const ctiUrl = `https://dialpad.com/apps/${clientId}`;

  return (
    <Card 
      className={`fixed bottom-4 right-4 shadow-2xl z-50 bg-white transition-all duration-300 ${
        isExpanded ? 'w-[600px] h-[700px]' : 'w-[420px] h-[540px]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center gap-2 text-white">
          <Phone className="h-5 w-5" />
          <h3 className="font-semibold">Dialpad CTI</h3>
          {isAuthenticated && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-green-500 rounded-full">
              Connected
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onClose}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Dialpad CTI Iframe */}
      <div className={`${isExpanded ? 'h-[calc(100%-52px)]' : 'h-[calc(100%-52px)]'}`}>
        <iframe
          ref={iframeRef}
          src={ctiUrl}
          title="Dialpad Mini Dialer"
          allow="microphone; speaker-selection; autoplay; camera; display-capture; hid"
          sandbox="allow-popups allow-scripts allow-same-origin allow-forms"
          className="w-full h-full border-0"
          style={{ border: 'none' }}
        />
      </div>

      {/* Quick Actions (Optional) */}
      {isAuthenticated && currentCallId && (
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            onClick={hangUpAllCalls}
            variant="destructive"
            className="w-full"
          >
            End All Calls
          </Button>
        </div>
      )}
    </Card>
  );
}

