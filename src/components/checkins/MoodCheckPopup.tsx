import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";

interface MoodCheckPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (mood: string) => void;
  onMissed?: () => void; // Called when survey auto-dismisses without answer
}

const MOODS = [
  { emoji: "😊", label: "Happy", value: "happy" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😣", label: "Stressed", value: "stressed" },
  { emoji: "🥱", label: "Tired", value: "tired" },
  { emoji: "🔥", label: "Energized", value: "energized" },
];

export function MoodCheckPopup({ open, onClose, onSubmit, onMissed }: MoodCheckPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const answeredRef = useRef(false); // Use ref to track answer state across closure
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      console.log('[MoodCheckPopup] Opening popup...');
      setIsVisible(true);
      setCountdown(30);
      answeredRef.current = false;
      
      // Countdown timer (visual)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      
      // 🔥 AUTO-DISMISS after 30 seconds if not answered
      timerRef.current = setTimeout(() => {
        console.log('[MoodCheckPopup] ⏰ Auto-dismissing (30s timeout)');
        if (!answeredRef.current) {
          // Survey was missed - log it
          if (onMissed) {
            console.log('[MoodCheckPopup] 📊 Calling onMissed callback');
            onMissed();
          }
        }
        handleClose();
      }, 30000); // 30 seconds
      
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    } else {
      setIsVisible(false);
    }
  }, [open, onMissed]);

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // Wait for animation
  };

  const handleMoodSelect = (moodValue: string) => {
    answeredRef.current = true; // Mark as answered to prevent "missed" log
    // Find the emoji for this mood value
    const selectedMood = MOODS.find(m => m.value === moodValue);
    // Submit the EMOJI, not the value (database expects emoji)
    onSubmit(selectedMood?.emoji || moodValue);
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
        
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            +2 points for answering
          </p>
          <p className="text-xs font-medium" style={{ color: countdown <= 10 ? '#EF4444' : '#9CA3AF' }}>
            {countdown}s
          </p>
        </div>
      </div>
    </div>
  );
}

