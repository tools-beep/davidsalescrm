import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Handshake, 
  BarChart3,
  Calendar,
  CheckSquare,
  MessageSquare,
  X,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

// White Sands CRM Logo Component
const WhiteSandsLogo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="sidebarGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#D4AF5C' }} />
        <stop offset="50%" style={{ stopColor: '#C9A962' }} />
        <stop offset="100%" style={{ stopColor: '#B8964F' }} />
      </linearGradient>
      <linearGradient id="sidebarDarkGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#1a1a1a' }} />
        <stop offset="100%" style={{ stopColor: '#0d0d0d' }} />
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#sidebarDarkGradient)" stroke="url(#sidebarGoldGradient)" strokeWidth="2"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#sidebarGoldGradient)" strokeWidth="0.5" opacity="0.5"/>
    <g>
      <path d="M15 58 Q30 48, 50 55 Q70 62, 85 52" fill="none" stroke="url(#sidebarGoldGradient)" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      <path d="M15 52 Q35 42, 55 50 Q75 58, 85 48" fill="none" stroke="url(#sidebarGoldGradient)" strokeWidth="3" strokeLinecap="round" opacity="0.7"/>
      <path d="M15 46 Q40 36, 60 45 Q80 54, 85 44" fill="none" stroke="url(#sidebarGoldGradient)" strokeWidth="3.5" strokeLinecap="round"/>
    </g>
    <text x="50" y="75" fontFamily="Cinzel, Georgia, serif" fontSize="14" fontWeight="600" fill="url(#sidebarGoldGradient)" textAnchor="middle" letterSpacing="4">WS</text>
  </svg>
);

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const adminNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Deals", href: "/deals", icon: Handshake },
  { name: "Contacts", href: "/contacts", icon: Users },
  { name: "Companies", href: "/companies", icon: Building2 },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Messages", href: "/messages", icon: MessageSquare },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Calendar", href: "/calendar", icon: Calendar },
];

const eodNavigation = [
  { name: "Smart DAR Dashboard", href: "/smart-dar-dashboard", icon: Activity },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps = {}) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkUserRole();
    loadUnreadCount();
    
    const channel = supabase
      .channel('sidebar-unread-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadUnreadCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_chat_messages' }, () => {
        loadUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      setUserRole(profile?.role || null);
    }
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      const { data: conversations } = await (supabase as any)
        .from('conversation_participants')
        .select('conversation_id, last_read_at, conversations!inner(id)')
        .eq('user_id', currentUser.id);

      let directUnread = 0;
      if (conversations) {
        for (const conv of conversations) {
          const { count } = await (supabase as any)
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.conversation_id)
            .gt('created_at', conv.last_read_at || '1970-01-01')
            .neq('sender_id', currentUser.id);
          
          directUnread += count || 0;
        }
      }

      const { data: groupMemberships } = await (supabase as any)
        .from('group_chat_members')
        .select('group_id, last_read_at')
        .eq('user_id', currentUser.id);

      let groupUnread = 0;
      if (groupMemberships) {
        for (const membership of groupMemberships) {
          const { count } = await (supabase as any)
            .from('group_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', membership.group_id)
            .gt('created_at', membership.last_read_at || '1970-01-01')
            .neq('sender_id', currentUser.id);
          
          groupUnread += count || 0;
        }
      }

      setUnreadCount(directUnread + groupUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const isStafflyHubUser = userRole && userRole !== 'eod_user';
  const isAdmin = userRole === 'admin';
  const navigation = isStafflyHubUser ? adminNavigation : eodNavigation;
  
  return (
    <div className={cn(
      "flex h-full w-64 flex-col bg-[hsl(0,0%,8%)] border-r border-[hsl(0,0%,18%)] transition-transform duration-300 ease-in-out",
      "fixed md:relative inset-y-0 left-0 z-50",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      {/* Logo Header */}
      <div className="flex h-20 items-center justify-between px-4 border-b border-[hsl(0,0%,18%)] bg-gradient-to-b from-[hsl(0,0%,12%)] to-[hsl(0,0%,8%)]">
        <div className="flex items-center space-x-3">
          <WhiteSandsLogo className="h-10 w-10" />
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-wide text-gold-gradient" style={{ fontFamily: 'Cinzel, serif' }}>
              WHITE SANDS
            </span>
            <span className="text-[10px] tracking-[0.3em] text-[hsl(40,50%,55%)] uppercase">
              CRM
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-[hsl(40,20%,90%)] hover:bg-[hsl(0,0%,15%)]"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      
      <TooltipProvider>
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "group flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-md transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-[hsl(40,50%,20%)] to-[hsl(40,40%,15%)] text-[hsl(40,60%,70%)] border-l-2 border-[hsl(40,50%,55%)] shadow-lg"
                    : "text-[hsl(40,10%,60%)] hover:bg-[hsl(0,0%,15%)] hover:text-[hsl(40,20%,85%)]"
                )
              }
            >
              <div className="flex items-center">
                <item.icon
                  className="mr-3 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                {item.name}
              </div>
              {item.name === "Messages" && unreadCount > 0 && (
                <Badge className="bg-[hsl(40,50%,55%)] text-[hsl(0,0%,5%)] px-2 py-0.5 text-xs font-semibold">
                  {unreadCount}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
        
        {isAdmin && (
          <nav className="grid items-start px-4 text-sm font-medium space-y-1 pb-4">
            <Link 
              to="/admin" 
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[hsl(40,10%,60%)] transition-all hover:bg-[hsl(0,0%,15%)] hover:text-[hsl(40,50%,70%)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3h18v18H3z"/>
                <path d="M7 7h10v10H7z"/>
              </svg>
              DAR Admin
            </Link>
          </nav>
        )}
      </TooltipProvider>
      
      {/* Footer branding */}
      <div className="px-4 py-4 border-t border-[hsl(0,0%,18%)]">
        <div className="text-center">
          <p className="text-[10px] text-[hsl(40,10%,40%)] tracking-wider uppercase">
            Premium CRM Solution
          </p>
        </div>
      </div>
    </div>
  );
}
