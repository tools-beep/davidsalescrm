// 🎯 Points Notification Component
// Displays animated point notifications with pastel macaroon styling

import { useEffect, useState } from 'react';
import { PointNotification } from '@/utils/pointsEngine';

interface PointsNotificationProps {
  notification: PointNotification;
  onDismiss: () => void;
}

// Pastel Macaroon Colors for Points
const NOTIFICATION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  completion: {
    bg: 'linear-gradient(135deg, #D8C8FF, #E8DDFF)',
    border: '#C7B8EA',
    text: '#4A3F7A',
  },
  focus: {
    bg: 'linear-gradient(135deg, #BFD9FF, #D6E9FF)',
    border: '#A7C7E7',
    text: '#2A5A8A',
  },
  accuracy: {
    bg: 'linear-gradient(135deg, #CFF5D6, #E3F9E8)',
    border: '#B8EBD0',
    text: '#0A7A32',
  },
  survey: {
    bg: 'linear-gradient(135deg, #F8D6E0, #FCEFF4)',
    border: '#F7C9D4',
    text: '#7A3040',
  },
  momentum: {
    bg: 'linear-gradient(135deg, #FFE9B5, #FFF4D9)',
    border: '#FAE8A4',
    text: '#7A5D00',
  },
  deepwork: {
    bg: 'linear-gradient(135deg, #D8C8FF, #C7B8EA)',
    border: '#A08CD9',
    text: '#4A3F7A',
  },
  priority: {
    bg: 'linear-gradient(135deg, #FBC7A7, #FFE0CC)',
    border: '#F8D4C7',
    text: '#7A3F1E',
  },
  goal_achieved: {
    bg: 'linear-gradient(135deg, #CFF5D6, #B8EBD0)',
    border: '#86EFAC',
    text: '#0A7A32',
  },
  goal_exceeded: {
    bg: 'linear-gradient(135deg, #FAE8A4, #FFE9B5)',
    border: '#F8C97F',
    text: '#7A5D00',
  },
  daily_streak: {
    bg: 'linear-gradient(135deg, #FBC7A7, #F8D4C7)',
    border: '#F28B82',
    text: '#7A3F1E',
  },
  weekly_streak: {
    bg: 'linear-gradient(135deg, #D8C8FF, #C7B8EA)',
    border: '#A08CD9',
    text: '#4A3F7A',
  },
};

export function PointsNotification({ notification, onDismiss }: PointsNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const colors = NOTIFICATION_COLORS[notification.type] || NOTIFICATION_COLORS.completion;
  
  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);
    
    // Auto-hide after 4 seconds
    const hideTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss();
      }, 300); // Match exit animation duration
    }, 4000);
    
    return () => clearTimeout(hideTimer);
  }, [onDismiss]);
  
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] pointer-events-auto"
      style={{
        transform: isVisible && !isExiting ? 'translateY(0)' : 'translateY(120%)',
        opacity: isVisible && !isExiting ? 1 : 0,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        className="relative px-6 py-4 rounded-[22px] shadow-lg backdrop-blur-sm"
        style={{
          background: colors.bg,
          border: `2px solid ${colors.border}`,
          boxShadow: `0 8px 24px rgba(0, 0, 0, 0.12), 0 0 20px ${colors.border}40`,
          minWidth: '280px',
          maxWidth: '400px',
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 rounded-[22px] opacity-50 blur-xl"
          style={{
            background: colors.bg,
            zIndex: -1,
          }}
        />
        
        {/* Content */}
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.4)',
              border: `1px solid ${colors.border}`,
            }}
          >
            {notification.icon}
          </div>
          
          {/* Message */}
          <div className="flex-1">
            <p
              className="font-semibold text-sm leading-tight"
              style={{ color: colors.text }}
            >
              {notification.message}
            </p>
          </div>
          
          {/* Close button */}
          <button
            onClick={() => {
              setIsExiting(true);
              setTimeout(onDismiss, 300);
            }}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
            style={{ color: colors.text }}
          >
            ×
          </button>
        </div>
        
        {/* Progress bar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 rounded-b-[22px] overflow-hidden"
          style={{ background: 'rgba(255, 255, 255, 0.3)' }}
        >
          <div
            className="h-full"
            style={{
              background: colors.border,
              animation: 'shrink 4s linear forwards',
            }}
          />
        </div>
      </div>
      
      <style>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}

// Container for managing multiple notifications
interface PointsNotificationContainerProps {
  notifications: PointNotification[];
  onDismiss: (index: number) => void;
}

export function PointsNotificationContainer({
  notifications,
  onDismiss,
}: PointsNotificationContainerProps) {
  return (
    <div className="fixed bottom-0 right-0 pointer-events-none z-[9999]">
      <div className="flex flex-col gap-3 p-6">
        {notifications.map((notification, index) => (
          <PointsNotification
            key={`${notification.type}-${index}-${Date.now()}`}
            notification={notification}
            onDismiss={() => onDismiss(index)}
          />
        ))}
      </div>
    </div>
  );
}

