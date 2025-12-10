import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailPassword } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Mail, LogIn, UserPlus, User } from "lucide-react";

// White Sands CRM Logo Component
const WhiteSandsLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="loginGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#D4AF5C' }} />
        <stop offset="50%" style={{ stopColor: '#C9A962' }} />
        <stop offset="100%" style={{ stopColor: '#B8964F' }} />
      </linearGradient>
      <linearGradient id="loginDarkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#1a1a1a' }} />
        <stop offset="100%" style={{ stopColor: '#0d0d0d' }} />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#loginDarkGradient)" stroke="url(#loginGoldGradient)" strokeWidth="2"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#loginGoldGradient)" strokeWidth="0.5" opacity="0.5"/>
    <g>
      <path d="M15 58 Q30 48, 50 55 Q70 62, 85 52" fill="none" stroke="url(#loginGoldGradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <path d="M15 52 Q35 42, 55 50 Q75 58, 85 48" fill="none" stroke="url(#loginGoldGradient)" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <path d="M15 46 Q40 36, 60 45 Q80 54, 85 44" fill="none" stroke="url(#loginGoldGradient)" strokeWidth="3.5" strokeLinecap="round"/>
    </g>
    <text x="50" y="75" fontFamily="Cinzel, Georgia, serif" fontSize="14" fontWeight="600" fill="url(#loginGoldGradient)" textAnchor="middle" letterSpacing="4">WS</text>
  </svg>
);

export default function Login() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await signInWithEmailPassword(email, password);
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, first_name, last_name')
        .eq('user_id', user.id)
        .single();

      const userName = profile?.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : email.split('@')[0];

      if (profile?.role === 'eod_user') {
        toast({ 
          title: "Welcome Operator!", 
          description: `Signed in as ${userName}` 
        });
        navigate("/eod-portal");
      } else {
        const roleTitle = profile?.role === 'admin' 
          ? 'Admin' 
          : profile?.role === 'manager' 
            ? 'Account Manager' 
            : 'Sales Rep';
        
        toast({ 
          title: `Welcome ${roleTitle}!`, 
          description: `Signed in as ${userName}` 
        });
        navigate("/");
      }
    } catch (error: any) {
      toast({ 
        title: "Authentication error", 
        description: error?.message || "Invalid email or password.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Create the user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error("Failed to create user");

      // Create admin profile using the secure database function
      const { error: profileError } = await supabase.rpc('create_admin_profile', {
        p_user_id: authData.user.id,
        p_email: email,
        p_first_name: firstName,
        p_last_name: lastName
      });

      if (profileError) throw profileError;

      toast({
        title: "Admin Account Created!",
        description: "You can now sign in with your credentials.",
      });

      // Reset form and switch to login
      setMode('login');
      setFirstName("");
      setLastName("");
      setPassword("");
    } catch (error: any) {
      toast({
        title: "Signup Error",
        description: error?.message || "Failed to create account.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[hsl(0,0%,5%)] relative overflow-hidden">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(0,0%,8%)] via-[hsl(0,0%,5%)] to-[hsl(40,20%,8%)]" />
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        {/* Subtle gold accent lines */}
        <div className="absolute top-1/4 left-0 w-1/3 h-px bg-gradient-to-r from-transparent via-[hsl(40,50%,40%)] to-transparent opacity-30" />
        <div className="absolute top-1/3 right-0 w-1/4 h-px bg-gradient-to-l from-transparent via-[hsl(40,50%,40%)] to-transparent opacity-20" />
        <div className="absolute bottom-1/4 left-1/4 w-1/3 h-px bg-gradient-to-r from-transparent via-[hsl(40,50%,40%)] to-transparent opacity-25" />
        
        {/* Subtle glow orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-[hsl(40,50%,30%)] rounded-full filter blur-[150px] opacity-10" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-[hsl(40,50%,25%)] rounded-full filter blur-[120px] opacity-10" />
      </div>

      <div className="w-full max-w-md relative z-10 p-6">
        {/* Logo and Branding */}
        <div className="text-center mb-10 animate-fade-in">
          <WhiteSandsLogo className="w-24 h-24 mx-auto mb-6 animate-gold-glow" />
          <h1 
            className="text-3xl font-semibold tracking-wider mb-2"
            style={{ 
              fontFamily: 'Cinzel, serif',
              background: 'linear-gradient(135deg, #D4AF5C, #C9A962, #B8964F)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            WHITE SANDS
          </h1>
          <p className="text-[hsl(40,50%,55%)] text-sm tracking-[0.4em] uppercase font-medium">
            CRM
          </p>
        </div>

        {/* Login/Signup Card */}
        <Card className="bg-[hsl(0,0%,10%)] border-[hsl(0,0%,18%)] shadow-2xl backdrop-blur-sm animate-fade-in-up">
          <CardHeader className="space-y-1 pb-6">
            <h2 
              className="text-xl font-semibold text-center text-[hsl(40,20%,90%)]"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {mode === 'login' ? 'Welcome Back' : 'Create Admin Account'}
            </h2>
            <p className="text-sm text-[hsl(40,10%,50%)] text-center">
              {mode === 'login' 
                ? 'Enter your credentials to access your account'
                : 'Set up your admin account to get started'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === 'login' ? handleSubmit : handleSignup} className="space-y-5">
              {/* Name Fields (Signup only) */}
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-[hsl(40,20%,80%)]">
                      First Name
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[hsl(40,30%,45%)]" />
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        className="pl-10 h-12 bg-[hsl(0,0%,15%)] border-[hsl(0,0%,22%)] text-[hsl(40,20%,90%)] placeholder:text-[hsl(40,10%,40%)] focus:border-[hsl(40,50%,50%)] focus:ring-1 focus:ring-[hsl(40,50%,50%)] transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-[hsl(40,20%,80%)]">
                      Last Name
                    </Label>
                    <div className="relative">
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="h-12 bg-[hsl(0,0%,15%)] border-[hsl(0,0%,22%)] text-[hsl(40,20%,90%)] placeholder:text-[hsl(40,10%,40%)] focus:border-[hsl(40,50%,50%)] focus:ring-1 focus:ring-[hsl(40,50%,50%)] transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-[hsl(40,20%,80%)]">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[hsl(40,30%,45%)]" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-10 h-12 bg-[hsl(0,0%,15%)] border-[hsl(0,0%,22%)] text-[hsl(40,20%,90%)] placeholder:text-[hsl(40,10%,40%)] focus:border-[hsl(40,50%,50%)] focus:ring-1 focus:ring-[hsl(40,50%,50%)] transition-all duration-300"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-[hsl(40,20%,80%)]">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[hsl(40,30%,45%)]" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 h-12 bg-[hsl(0,0%,15%)] border-[hsl(0,0%,22%)] text-[hsl(40,20%,90%)] placeholder:text-[hsl(40,10%,40%)] focus:border-[hsl(40,50%,50%)] focus:ring-1 focus:ring-[hsl(40,50%,50%)] transition-all duration-300"
                    required
                    minLength={6}
                  />
                </div>
                {mode === 'signup' && (
                  <p className="text-xs text-[hsl(40,10%,45%)]">
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-[hsl(40,55%,55%)] to-[hsl(40,50%,45%)] hover:from-[hsl(40,60%,60%)] hover:to-[hsl(40,55%,50%)] text-[hsl(0,0%,5%)] font-semibold shadow-lg hover:shadow-xl transition-all duration-300 tracking-wide" 
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-[hsl(0,0%,15%)] border-t-transparent rounded-full animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {mode === 'login' ? (
                      <>
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4" />
                        Create Admin Account
                      </>
                    )}
                  </span>
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[hsl(0,0%,25%)] to-transparent" />
            </div>

            {/* Toggle Mode */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-sm text-[hsl(40,50%,55%)] hover:text-[hsl(40,60%,65%)] transition-colors"
              >
                {mode === 'login' 
                  ? "Need an admin account? Create one here"
                  : "Already have an account? Sign in"}
              </button>
            </div>

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="text-xs text-[hsl(40,10%,45%)]">
                Protected by enterprise-grade security
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="mt-8 text-center animate-fade-in">
          <p className="text-[10px] text-[hsl(40,10%,35%)] tracking-widest uppercase">
            Premium CRM Solution
          </p>
          <p className="text-xs text-[hsl(40,10%,30%)] mt-2">
            © 2025 White Sands. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
