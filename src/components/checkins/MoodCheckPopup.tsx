import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface MoodCheckPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (mood: string) => void;
}

const MOODS = [
  { emoji: "😊", label: "Happy", value: "happy" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😣", label: "Stressed", value: "stressed" },
  { emoji: "🥱", label: "Tired", value: "tired" },
  { emoji: "🔥", label: "Energized", value: "energized" },
];

export function MoodCheckPopup({ open, onClose, onSubmit }: MoodCheckPopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      console.log('[MoodCheckPopup] Opening popup...');
      setIsVisible(true);
      // Sound is already played by EODPortal before opening this popup
      // Auto-dismiss after 30 seconds if no selection
      const timer = setTimeout(() => {
        console.log('[MoodCheckPopup] Auto-dismissing after 30s timeout');
        handleClose();
      }, 30000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // Wait for animation
  };

  const handleMoodSelect = (mood: string) => {
    onSubmit(mood);
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
          borderColor: '#F7C9D4',
          boxShadow: '0 12px 40px rgba(247, 201, 212, 0.4)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: '#4B4B4B' }}>
            How are you feeling?
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" style={{ color: '#6F6F6F' }} />
          </button>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {MOODS.map((mood) => (
            <button
              key={mood.value}
              onClick={() => handleMoodSelect(mood.value)}
              className="flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:scale-110 border-2 border-transparent hover:border-current"
              style={{
                backgroundColor: '#FFFFFF',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              }}
              title={mood.label}
            >
              <span className="text-3xl mb-1">{mood.emoji}</span>
              <span className="text-xs font-medium" style={{ color: '#6F6F6F' }}>
                {mood.label}
              </span>
            </button>
          ))}
        </div>
        
        <p className="text-xs mt-3 text-center" style={{ color: '#9CA3AF' }}>
          Auto-dismisses in 30s
        </p>
      </div>
    </div>
  );
}

