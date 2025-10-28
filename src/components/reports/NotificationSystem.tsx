import { useState, useEffect } from "react";
import { Bell, Mail, Phone, Calendar, CheckCircle, X, Clock, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: 'task_started' | 'clock_in' | 'feedback' | 'email_opened' | 'email_clicked' | 'task_due' | 'meeting_reminder' | 'call_missed' | 'eod_submitted' | 'task_created';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  user_id?: string;
  redirect_url?: string;
  is_read?: boolean;
  created_at?: string;
}

const notificationIcons = {
  task_started: CheckCircle,
  clock_in: Clock,
  feedback: MessageCircle,
  email_opened: Mail,
  email_clicked: Mail,
  task_due: CheckCircle,
  meeting_reminder: Calendar,
  call_missed: Phone,
  eod_submitted: CheckCircle,
  task_created: CheckCircle,
};

export function NotificationSystem() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const cleanup = setupRealtimeSubscriptions();
    return cleanup;
  }, []);

  const fetchNotifications = async () => {
    try {
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const isAdmin = profile?.role === 'admin';

      // For admins: Fetch from admin_notifications table
      if (isAdmin) {
        const { data: adminNotifications, error } = await (supabase as any)
          .from('admin_notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) {
          console.error('Error fetching admin notifications:', error);
          return;
        }

        const formattedNotifications: Notification[] = (adminNotifications || []).map((n: any) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          read: n.is_read,
          actionUrl: n.redirect_url,
          redirect_url: n.redirect_url,
          user_id: n.user_id,
          is_read: n.is_read,
          created_at: n.created_at
        }));

        setNotifications(formattedNotifications);
        setUnreadCount(formattedNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to admin_notifications table for real-time updates
    const notificationChannel = supabase
      .channel('admin-notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_notifications'
      }, (payload) => {
        console.log('New notification received:', payload.new);
        const newNotif = payload.new as any;
        
        const formattedNotification: Notification = {
          id: newNotif.id,
          type: newNotif.type,
          title: newNotif.title,
          message: newNotif.message,
          timestamp: newNotif.created_at,
          read: newNotif.is_read,
          actionUrl: newNotif.redirect_url,
          redirect_url: newNotif.redirect_url,
          user_id: newNotif.user_id,
          is_read: newNotif.is_read,
          created_at: newNotif.created_at
        };
        
        setNotifications(prev => [formattedNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast notification
        toast(newNotif.title, {
          description: newNotif.message,
          duration: 5000,
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'admin_notifications'
      }, () => {
        // Refresh notifications when one is marked as read
        fetchNotifications();
      })
      .subscribe();

    return () => {
      notificationChannel.unsubscribe();
    };
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await (supabase as any)
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      
      if (unreadIds.length > 0) {
        await (supabase as any)
          .from('admin_notifications')
          .update({ is_read: true })
          .in('id', unreadIds);
      }

      setNotifications(notifications.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    try {
      // Delete from database
      await (supabase as any)
        .from('admin_notifications')
        .delete()
        .eq('id', notificationId);

      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to the redirect URL
    if (notification.redirect_url) {
      setOpen(false);
      navigate(notification.redirect_url);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)}h ago`;
    return `${Math.floor(diffMinutes / 1440)}d ago`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(!open)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>

      {open && (
        <Card className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto z-50 shadow-large">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <CardTitle className="text-base">Notifications</CardTitle>
            <div className="flex items-center space-x-2">
              {unreadCount > 0 && (
                <Button size="sm" variant="ghost" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="mx-auto h-12 w-12 mb-2" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="space-y-1">
                {notifications.map((notification) => {
                  const IconComponent = notificationIcons[notification.type] || Bell;
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start space-x-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-primary/5 border-l-2 border-l-primary' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className={`p-1 rounded-full ${
                        notification.type === 'task_started' ? 'bg-green-100 text-green-600' :
                        notification.type === 'clock_in' ? 'bg-blue-100 text-blue-600' :
                        notification.type === 'feedback' ? 'bg-purple-100 text-purple-600' :
                        notification.type === 'email_opened' ? 'bg-blue-100 text-blue-600' :
                        notification.type === 'email_clicked' ? 'bg-green-100 text-green-600' :
                        notification.type === 'task_due' ? 'bg-orange-100 text-orange-600' :
                        notification.type === 'meeting_reminder' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="font-medium text-sm">{notification.title}</p>
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-muted-foreground">
                              {formatTimeAgo(notification.timestamp)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}