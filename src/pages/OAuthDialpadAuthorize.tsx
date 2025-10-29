import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function OAuthDialpadAuthorize() {
  const { toast } = useToast();

  useEffect(() => {
    const initiateOAuth = async () => {
      try {
        // Get environment variables
        const clientId = (window as any).env?.DIALPAD_CLIENT_ID || import.meta.env.VITE_DIALPAD_CLIENT_ID;
        const redirectUri = (window as any).env?.DIALPAD_REDIRECT_URL || import.meta.env.VITE_DIALPAD_REDIRECT_URL || 'https://app.stafflyhq.ai/oauth/dialpad/callback';

        if (!clientId) {
          toast({ 
            title: 'Configuration Error', 
            description: 'Dialpad Client ID is not configured. Please contact support.', 
            variant: 'destructive' 
          });
          // Redirect to home after 3 seconds
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
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
        console.log('Redirecting to Dialpad OAuth...');
        window.location.href = `https://dialpad.com/oauth2/authorize?${params.toString()}`;
      } catch (error) {
        console.error('Error initiating Dialpad OAuth:', error);
        toast({
          title: 'Connection Error',
          description: 'Failed to initiate Dialpad connection',
          variant: 'destructive'
        });
        // Redirect to home after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    initiateOAuth();
  }, [toast]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center p-8 bg-white rounded-lg shadow-xl max-w-md">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Connecting to Dialpad</h2>
        <p className="text-gray-600 mb-4">Please wait while we redirect you to Dialpad...</p>
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <svg className="animate-pulse h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
          </svg>
          <span>Initializing secure connection...</span>
        </div>
      </div>
    </div>
  );
}

