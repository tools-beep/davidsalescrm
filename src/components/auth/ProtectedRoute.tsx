import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false, adminOnly = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthorized(false);
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      setIsLoggedIn(true);

      if (requireAdmin || adminOnly) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (adminOnly) {
          // Only actual admins can access
          setIsAuthorized(profile?.role === 'admin');
        } else if (requireAdmin) {
          // StafflyHub access (admin, manager, rep)
          // Only Operators (eod_user) should be blocked
          const stafflyHubRoles = ['admin', 'manager', 'rep'];
          setIsAuthorized(stafflyHubRoles.includes(profile?.role || ''));
        }
      } else {
        setIsAuthorized(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthorized(false);
      setIsLoggedIn(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    // Not logged in at all - always go to login
    if (!isLoggedIn) {
      return <Navigate to="/login" replace />;
    }
    
    // Logged in but wrong role - redirect to their appropriate portal
    if (requireAdmin || adminOnly) {
      return <Navigate to="/eod-portal" replace />;
    }
    
    // Fallback
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

