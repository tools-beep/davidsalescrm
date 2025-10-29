import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, X, Minimize2, Maximize2, RefreshCw } from "lucide-react";

interface DialpadIframeCTIProps {
  onCallStart?: (callData: any) => void;
  onCallEnd?: (callData: any) => void;
  onCallStatusChange?: (status: string) => void;
  onClose?: () => void;
}

/**
 * Dialpad Iframe CTI Component
 * 
 * Embeds Dialpad's web-based CTI directly in your application using an iframe.
 * This allows users to make and receive calls without the desktop app.
 * 
 * Features:
 * - Make outbound calls
 * - Receive inbound calls
 * - View call history
 * - Access contacts
 * - Full Dialpad interface
 */
export function DialpadIframeCTI({ 
  onCallStart, 
  onCallEnd, 
  onCallStatusChange,
  onClose 
}: DialpadIframeCTIProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [dialpadUrl, setDialpadUrl] = useState<string>("");
  const [currentCall, setCurrentCall] = useState<any>(null);

  useEffect(() => {
    checkAuthentication();
    setupMessageListener();
  }, []);

  const checkAuthentication = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No authenticated user");
        setIsLoading(false);
        return;
      }

      // Check if user has Dialpad token
      const { data: tokenData } = await (supabase as any)
        .from('dialpad_tokens')
        .select('access_token, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (tokenData && tokenData.access_token) {
        // Check if token is still valid
        const expiresAt = new Date(tokenData.expires_at);
        const now = new Date();
        
        if (expiresAt > now) {
          setAccessToken(tokenData.access_token);
          setIsAuthenticated(true);
          loadDialpadCTI(tokenData.access_token);
        } else {
          console.log("Dialpad token expired");
          setIsAuthenticated(false);
          setIsLoading(false);
          toast({
            title: "Dialpad Token Expired",
            description: "Please reconnect your Dialpad account",
            variant: "destructive",
          });
        }
      } else {
        console.log("No Dialpad token found");
        setIsAuthenticated(false);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error checking Dialpad authentication:", error);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  };

  const loadDialpadCTI = (token: string) => {
    // Dialpad's web app URL with embedded mode
    // This loads the full Dialpad interface in an iframe
    const baseUrl = 'https://dialpad.com/app';
    
    // Add parameters to optimize for embedding
    const params = new URLSearchParams({
      embed: 'true',
      compact: 'true',
      // Add access token if Dialpad supports it in URL (check their docs)
      // access_token: token,
    });

    const url = `${baseUrl}?${params.toString()}`;
    setDialpadUrl(url);
    setIsLoading(false);
  };

  const setupMessageListener = () => {
    const handleMessage = (event: MessageEvent) => {
      // Security: Only accept messages from Dialpad
      if (!event.origin.includes('dialpad.com')) {
        return;
      }

      console.log('Received message from Dialpad:', event.data);

      // Handle different message types from Dialpad
      if (event.data.type) {
        switch (event.data.type) {
          case 'call.started':
            setCurrentCall(event.data.call);
            onCallStart?.(event.data.call);
            onCallStatusChange?.('active');
            toast({
              title: "Call Started",
              description: `Connected to ${event.data.call?.to || 'number'}`,
            });
            break;

          case 'call.ended':
            setCurrentCall(null);
            onCallEnd?.(event.data.call);
            onCallStatusChange?.('idle');
            toast({
              title: "Call Ended",
              description: `Duration: ${event.data.call?.duration || 'N/A'}`,
            });
            break;

          case 'call.ringing':
            onCallStatusChange?.('ringing');
            break;

          case 'call.answered':
            onCallStatusChange?.('answered');
            break;

          case 'ready':
            console.log('Dialpad CTI is ready');
            setIsLoading(false);
            break;

          default:
            console.log('Unknown message type:', event.data.type);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  };

  const handleReload = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.src = dialpadUrl;
    }
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleConnect = async () => {
    try {
      // Use the same OAuth flow as DialpadConnectButton
      const clientId = (window as any).env?.DIALPAD_CLIENT_ID || import.meta.env.VITE_DIALPAD_CLIENT_ID;
      const redirectUri = (window as any).env?.DIALPAD_REDIRECT_URL || import.meta.env.VITE_DIALPAD_REDIRECT_URL || 'https://app.stafflyhq.ai/oauth/dialpad/callback';

      if (!clientId) {
        toast({ 
          title: 'Missing Dialpad Client ID', 
          description: 'Contact support to configure Dialpad integration.', 
          variant: 'destructive' 
        });
        return;
      }

      // Generate PKCE challenge
      const generatePKCE = async () => {
        const verifier = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        return { verifier, challenge };
      };

      const { verifier, challenge } = await generatePKCE();
      const state = crypto.randomUUID();
      
      // Store PKCE verifier and state for callback
      localStorage.setItem('dialpad_pkce_verifier', verifier);
      localStorage.setItem('dialpad_oauth_state', state);

      // Build OAuth URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'calls:write users:read',
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });

      // Redirect to Dialpad OAuth
      window.location.href = `https://dialpad.com/oauth2/authorize?${params.toString()}`;
    } catch (error) {
      console.error('Error initiating Dialpad OAuth:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to initiate Dialpad connection',
        variant: 'destructive'
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <Card className="fixed bottom-4 right-4 w-80 p-4 shadow-lg z-50 bg-card">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Dialpad CTI</h3>
            </div>
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            Connect your Dialpad account to make and receive calls directly in the app.
          </div>
          <Button onClick={handleConnect} className="w-full">
            <Phone className="mr-2 h-4 w-4" />
            Connect Dialpad
          </Button>
        </div>
      </Card>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full h-14 w-14 shadow-lg"
          size="icon"
        >
          <Phone className="h-6 w-6" />
          {currentCall && (
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-green-500 rounded-full animate-pulse" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[400px] h-[600px] shadow-2xl z-50 flex flex-col overflow-hidden bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-primary text-white">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          <h3 className="font-semibold">Dialpad CTI</h3>
          {currentCall && (
            <span className="flex items-center gap-1 text-xs bg-green-500 px-2 py-1 rounded-full">
              <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
              Active
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleReload}
            title="Reload"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
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

      {/* Iframe Container */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading Dialpad...</p>
            </div>
          </div>
        )}
        
        <iframe
          ref={iframeRef}
          src={dialpadUrl}
          className="w-full h-full border-0"
          allow="microphone; camera; autoplay; clipboard-read; clipboard-write"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
          onLoad={() => {
            setIsLoading(false);
            console.log('Dialpad iframe loaded');
          }}
          onError={(e) => {
            console.error('Iframe loading error:', e);
            setIsLoading(false);
            toast({
              title: "Loading Error",
              description: "Failed to load Dialpad. Please try again.",
              variant: "destructive",
            });
          }}
        />
      </div>

      {/* Footer - Quick Actions */}
      <div className="p-2 border-t bg-muted/50 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {currentCall ? `Call in progress` : 'Ready to dial'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => window.open('https://dialpad.com/app', '_blank')}
        >
          Open in New Tab
        </Button>
      </div>
    </Card>
  );
}

