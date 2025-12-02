import React, { useState, useEffect, useRef } from 'react';
import { X, Zap, Battery, BatteryMedium, BatteryLow } from 'lucide-react';
import { useSurveySafe } from '@/contexts/SurveyContext';

// ============================================================================
// GLOBAL SURVEY POPUPS COMPONENT
// ============================================================================
// This component renders the mood and energy check-in popups globally.
// It uses the SurveyContext for state management and handles:
// - 30-second auto-dismiss with missed survey logging
// - Smooth animations
// - Accessible UI
// ============================================================================

const MOODS = [
  { emoji: "😊", label: "Happy", value: "happy" },
  { emoji: "😐", label: "Neutral", value: "neutral" },
  { emoji: "😣", label: "Stressed", value: "stressed" },
  { emoji: "🥱", label: "Tired", value: "tired" },
  { emoji: "🔥", label: "Energized", value: "energized" },
];

const ENERGY_LEVELS = [
  { icon: Zap, label: "High", value: "High", color: "#B8EBD0" },
  { icon: BatteryMedium, label: "Medium", value: "Medium", color: "#FAE8A4" },
  { icon: Battery, label: "Low", value: "Low", color: "#F8D4C7" },
  { icon: BatteryLow, label: "Drained", value: "Drained", color: "#F7C9D4" },
  { icon: Battery, label: "Recharging", value: "Recharging", color: "#C7B8EA" },
];

export function GlobalSurveyPopups() {
  const survey = useSurveySafe();
  
  // If no survey context (not wrapped in provider), don't render
  if (!survey) return null;
  
  return (
    <>
      <MoodPopup
        open={survey.moodCheckOpen}
        onClose={() => survey.setMoodCheckOpen(false)}
        onSubmit={survey.handleMoodSubmit}
        onMissed={survey.handleMoodMissed}
      />
      <EnergyPopup
        open={survey.energyCheckOpen}
        onClose={() => survey.setEnergyCheckOpen(false)}
        onSubmit={survey.handleEnergySubmit}
        onMissed={survey.handleEnergyMissed}
      />
    </>
  );
}

// ============================================================================
// MOOD POPUP
// ============================================================================
interface PopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  onMissed: () => void;
}

function MoodPopup({ open, onClose, onSubmit, onMissed }: PopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const answeredRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      console.log('[MoodPopup] Opening...');
      setIsVisible(true);
      setCountdown(30);
      answeredRef.current = false;
      
      // Countdown timer (visual)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      
      // Auto-dismiss after 30 seconds
      timerRef.current = setTimeout(() => {
        console.log('[MoodPopup] ⏰ Auto-dismissing (30s timeout)');
        if (!answeredRef.current) {
          console.log('[MoodPopup] 📊 Survey MISSED - calling onMissed');
          onMissed();
        }
        handleClose();
      }, 30000);
      
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
    setTimeout(() => onClose(), 300);
  };

  const handleMoodSelect = (moodValue: string) => {
    answeredRef.current = true;
    const selectedMood = MOODS.find(m => m.value === moodValue);
    onSubmit(selectedMood?.emoji || moodValue);
    handleClose();
  };

  if (!open && !isVisible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] transition-all duration-300"
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

// ============================================================================
// ENERGY POPUP
// ============================================================================
function EnergyPopup({ open, onClose, onSubmit, onMissed }: PopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const answeredRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      console.log('[EnergyPopup] Opening...');
      setIsVisible(true);
      setCountdown(30);
      answeredRef.current = false;
      
      // Countdown timer (visual)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      
      // Auto-dismiss after 30 seconds
      timerRef.current = setTimeout(() => {
        console.log('[EnergyPopup] ⏰ Auto-dismissing (30s timeout)');
        if (!answeredRef.current) {
          console.log('[EnergyPopup] 📊 Survey MISSED - calling onMissed');
          onMissed();
        }
        handleClose();
      }, 30000);
      
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
    setTimeout(() => onClose(), 300);
  };

  const handleEnergySelect = (energy: string) => {
    answeredRef.current = true;
    onSubmit(energy);
    handleClose();
  };

  if (!open && !isVisible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] transition-all duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      }}
    >
      <div
        className="rounded-3xl p-6 shadow-2xl border-2 max-w-sm"
        style={{
          backgroundColor: '#FFFCF9',
          borderColor: '#B8EBD0',
          boxShadow: '0 12px 40px rgba(184, 235, 208, 0.4)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: '#4B4B4B' }}>
            What's your energy level?
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" style={{ color: '#6F6F6F' }} />
          </button>
        </div>
        
        <div className="grid grid-cols-5 gap-2">
          {ENERGY_LEVELS.map((level) => {
            const Icon = level.icon;
            return (
              <button
                key={level.value}
                onClick={() => handleEnergySelect(level.value)}
                className="flex flex-col items-center p-3 rounded-2xl transition-all duration-200 hover:scale-110 border-2 border-transparent"
                style={{
                  backgroundColor: level.color,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
                title={level.label}
              >
                <Icon className="h-6 w-6 mb-1" style={{ color: '#4B4B4B' }} />
                <span className="text-xs font-medium" style={{ color: '#4B4B4B' }}>
                  {level.label}
                </span>
              </button>
            );
          })}
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

export default GlobalSurveyPopups;

