import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  Target, 
  Award, 
  Flame, 
  AlertCircle,
  Zap,
  Clock
} from 'lucide-react';
import { Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

const NOTIFICATION_ICONS: Record<string, any> = {
  survey_completed: CheckCircle2,
  survey_missed: XCircle,
  task_progress: TrendingUp,
  goal_alert: Target,
  points_earned: Award,
  streak_milestone: Flame,
  idle_reminder: AlertCircle,
  deep_work_alert: Zap,
};

const NOTIFICATION_COLORS: Record<string, string> = {
  survey_completed: 'text-green-600 bg-green-50',
  survey_missed: 'text-red-600 bg-red-50',
  task_progress: 'text-blue-600 bg-blue-50',
  goal_alert: 'text-purple-600 bg-purple-50',
  points_earned: 'text-yellow-600 bg-yellow-50',
  streak_milestone: 'text-orange-600 bg-orange-50',
  idle_reminder: 'text-gray-600 bg-gray-50',
  deep_work_alert: 'text-indigo-600 bg-indigo-50',
};

export function NotificationCenter({
  open,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount} new</Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Your activity and alerts for today
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMarkAllAsRead}
              className="w-full"
            >
              Mark all as read
            </Button>
          )}

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No notifications yet today</p>
                  <p className="text-sm mt-1">
                    Your activity will appear here
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.type] || AlertCircle;
                  const colorClass = NOTIFICATION_COLORS[notification.type] || 'text-gray-600 bg-gray-50';

                  return (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-all ${
                        notification.is_read
                          ? 'bg-white border-gray-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                      onClick={() => !notification.is_read && onMarkAsRead(notification.id)}
                      style={{ cursor: notification.is_read ? 'default' : 'pointer' }}
                    >
                      <div className="flex gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${notification.is_read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                            {notification.category && (
                              <Badge variant="outline" className="text-xs">
                                {notification.category}
                              </Badge>
                            )}
                          </div>
                          {notification.metadata && (
                            <div className="mt-2 text-xs text-gray-600">
                              {notification.metadata.points && (
                                <span className="font-semibold text-yellow-600">
                                  +{notification.metadata.points} points
                                </span>
                              )}
                              {notification.metadata.streak && (
                                <span className="font-semibold text-orange-600">
                                  {notification.metadata.streak} day streak
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

