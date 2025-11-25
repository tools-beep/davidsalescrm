import { useState, useEffect } from "react";
import { X, Heart, ThumbsUp, Meh, ThumbsDown, Frown } from "lucide-react";

interface TaskEnjoymentPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (enjoyment: number) => void;
  taskDescription?: string;
}

const ENJOYMENT_LEVELS = [
  { icon: Heart, label: "Loved it", value: 5, color: "#F7C9D4" },
  { icon: ThumbsUp, label: "Liked it", value: 4, color: "#B8EBD0" },
  { icon: Meh, label: "Neutral", value: 3, color: "#FAE8A4" },
  { icon: ThumbsDown, label: "Didn't enjoy", value: 2, color: "#F8D4C7" },
  { icon: Frown, label: "Hated it", value: 1, color: "#EDEDED" },
];

export function TaskEnjoymentPopup({ open, onClose, onSubmit, taskDescription }: TaskEnjoymentPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      console.log('[TaskEnjoymentPopup] Opening popup...');
      setIsVisible(true);
      // Sound is already played by EODPortal before opening this popup
      // Auto-dismiss after 30 seconds if no selection
      const timer = setTimeout(() => {
        console.log('[TaskEnjoymentPopup] Auto-dismissing after 30s timeout');
        handleClose();
      }, 30000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300);
  };

  const handleEnjoymentSelect = (enjoyment: number) => {
    onSubmit(enjoyment);
    handleClose();
  };

  if (!open && !isVisible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 transition-all duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <div
        className="rounded-3xl p-6 shadow-2xl border-2 max-w-sm"
        style={{
          backgroundColor: '#FFFCF9',
          borderColor: '#C7B8EA',
          boxShadow: '0 12px 40px rgba(199, 184, 234, 0.4)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold" style={{ color: '#4B4B4B' }}>
              How did you enjoy this task?
            </h3>
            {taskDescription && (
              <p className="text-xs mt-1 truncate" style={{ color: '#9CA3AF' }}>
                {taskDescription}
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors ml-2"
          >
            <X className="h-4 w-4" style={{ color: '#6F6F6F' }} />
          </button>
        </div>
        
        <div className="space-y-2">
          {ENJOYMENT_LEVELS.map((level) => {
            const Icon = level.icon;
            return (
              <button
                key={level.value}
                onClick={() => handleEnjoymentSelect(level.value)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 hover:scale-102 border-2"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#EDEDED',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = level.color;
                  e.currentTarget.style.borderColor = level.color;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#EDEDED';
                }}
              >
                <div className="p-2 rounded-xl" style={{ backgroundColor: level.color }}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium" style={{ color: '#4B4B4B' }}>
                  {level.label}
                </span>
              </button>
            );
          })}
        </div>
        
        <p className="text-xs mt-3 text-center" style={{ color: '#9CA3AF' }}>
          Auto-dismisses in 30s
        </p>
      </div>
    </div>
  );
}

