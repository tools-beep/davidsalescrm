import { useState, useEffect, useRef } from "react";
import { X, Zap, Battery, BatteryLow, BatteryMedium } from "lucide-react";

interface EnergyCheckPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (energy: string) => void;
  onMissed?: () => void; // Called when survey auto-dismisses without answer
}

const ENERGY_LEVELS = [
  { icon: Zap, label: "High", value: "High", color: "#B8EBD0" },
  { icon: BatteryMedium, label: "Medium", value: "Medium", color: "#FAE8A4" },
  { icon: Battery, label: "Low", value: "Low", color: "#F8D4C7" },
  { icon: BatteryLow, label: "Drained", value: "Drained", color: "#F7C9D4" },
  { icon: Battery, label: "Recharging", value: "Recharging", color: "#C7B8EA" },
];

export function EnergyCheckPopup({ open, onClose, onSubmit, onMissed }: EnergyCheckPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const answeredRef = useRef(false); // Use ref to track answer state across closure
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      console.log('[EnergyCheckPopup] Opening popup...');
      setIsVisible(true);
      setCountdown(30);
      answeredRef.current = false;
      
      // Countdown timer (visual)
      countdownRef.current = setInterval(() => {
        setCountdown(prev => Math.max(0, prev - 1));
      }, 1000);
      
      // 🔥 AUTO-DISMISS after 30 seconds if not answered
      timerRef.current = setTimeout(() => {
        console.log('[EnergyCheckPopup] ⏰ Auto-dismissing (30s timeout)');
        if (!answeredRef.current) {
          // Survey was missed - log it
          if (onMissed) {
            console.log('[EnergyCheckPopup] 📊 Calling onMissed callback');
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
    setTimeout(() => onClose(), 300);
  };

  const handleEnergySelect = (energy: string) => {
    answeredRef.current = true; // Mark as answered to prevent "missed" log
    onSubmit(energy);
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
          borderColor: '#B8EBD0',
          boxShadow: '0 12px 40px rgba(184, 235, 208, 0.4)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: '#4B4B4B' }}>
            How's your energy level?
          </h3>
          <button
            onClick={handleClose}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" style={{ color: '#6F6F6F' }} />
          </button>
        </div>
        
        <div className="space-y-2">
          {ENERGY_LEVELS.map((level) => {
            const Icon = level.icon;
            return (
              <button
                key={level.value}
                onClick={() => handleEnergySelect(level.value)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all duration-200 hover:scale-102 border-2"
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
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium" style={{ color: '#4B4B4B' }}>
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
