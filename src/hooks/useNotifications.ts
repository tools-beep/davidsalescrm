import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string;
  category?: string;
  related_id?: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()) // Today only
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notifications:', error);
        return;
      }

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (e) {
      console.error('Exception loading notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_log')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Exception marking notification as read:', e);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('notification_log')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('Error marking all as read:', error);
        return;
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error('Exception marking all as read:', e);
    }
  };

  const logNotification = async (
    message: string,
    type: string,
    category?: string,
    relatedId?: string,
    metadata?: any
  ) => {
    if (!userId) {
      console.error('[Notification] Cannot log notification - userId is undefined!', {
        message,
        type,
        category,
      });
      return;
    }

    console.log('[Notification] Logging:', { message, type, category, userId });

    try {
      const { data, error } = await supabase
        .from('notification_log')
        .insert([
          {
            user_id: userId,
            message,
            type,
            category,
            related_id: relatedId,
            metadata,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[Notification] Error logging notification:', error);
        return;
      }

      console.log('[Notification] ✅ Successfully logged:', data);

      // Add to local state
      setNotifications(prev => [data, ...prev]);
      setUnreadCount(prev => prev + 1);
    } catch (e) {
      console.error('[Notification] Exception logging notification:', e);
    }
  };

  useEffect(() => {
    loadNotifications();

    // Set up real-time subscription
    if (!userId) return;

    const channel = supabase
      .channel('notification-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_log',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    logNotification,
    refresh: loadNotifications,
  };
}

