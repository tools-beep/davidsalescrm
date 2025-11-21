import { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Handshake, 
  BarChart3,
  Target,
  Calendar,
  CheckSquare,
  ClipboardList,
  MessageSquare,
  Clock,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

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
  { name: "DAR Portal", href: "/eod-portal", icon: Clock },
];

export function Sidebar({ isOpen = false, onClose }: SidebarProps = {}) {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkUserRole();
    loadUnreadCount();
    
    // Set up real-time subscription for unread count
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

      // Get unread count from direct conversations
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

      // Get unread count from group chats
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

  // Show full StafflyHub navigation for Admin, Manager, and Rep
  // Only show DAR Portal for Operators (eod_user)
  const isStafflyHubUser = userRole && userRole !== 'eod_user';
  const navigation = isStafflyHubUser ? adminNavigation : eodNavigation;
  
  return (
    <div className={cn(
      "flex h-full w-64 flex-col bg-card border-r border-border shadow-medium transition-transform duration-300 ease-in-out",
      "fixed md:relative inset-y-0 left-0 z-50",
      isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
    )}>
      <div className="flex h-16 items-center justify-between px-4 border-b border-border bg-gradient-secondary">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            StafflyHub
          </span>
        </div>
        {/* Close button for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Quick switch to DAR Portal for StafflyHub users */}
      {isStafflyHubUser && (
        <div className="px-4 py-3 border-b border-border">
          <Link
            to="/eod-portal"
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200 hover:scale-105"
          >
            <Clock className="h-4 w-4" />
            <span>Switch to DAR Portal</span>
          </Link>
        </div>
      )}
      
      <TooltipProvider>
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                cn(
                  "group flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105",
                  isActive
                    ? "bg-gradient-primary text-white shadow-glow"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-soft"
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
                <Badge className="bg-red-500 text-white px-2 py-0.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
        {userRole === 'admin' && (
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4 space-y-1">
            <Link to="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v18H3z"/><path d="M7 7h10v10H7z"/></svg>
              DAR Admin
            </Link>
          </nav>
        )}
      </TooltipProvider>
    </div>
  );
}