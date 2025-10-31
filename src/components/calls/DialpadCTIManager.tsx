import { createContext, useContext, useState, ReactNode } from 'react';
import { DialpadMiniDialer } from './DialpadMiniDialer';

// Context for CTI state
interface CTIContextType {
  isOpen: boolean;
  phoneNumber: string | null;
  openCTI: (phoneNumber?: string) => void;
  closeCTI: () => void;
}

const CTIContext = createContext<CTIContextType | null>(null);

// Hook to use CTI
export function useCTIStore() {
  const context = useContext(CTIContext);
  if (!context) {
    throw new Error('useCTIStore must be used within CTIProvider');
  }
  return context;
}

// Provider component
export function CTIProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [key, setKey] = useState(0); // Force remount of CTI

  const openCTI = (phone?: string) => {
    // If CTI is already open with a different number, remount it
    if (isOpen && phone !== phoneNumber) {
      setIsOpen(false);
      setKey(prev => prev + 1); // Force remount
      setTimeout(() => {
        setPhoneNumber(phone || null);
        setIsOpen(true);
      }, 100);
    } else {
      setPhoneNumber(phone || null);
      setIsOpen(true);
    }
  };

  const closeCTI = () => {
    setIsOpen(false);
    // Clear phone number after a delay to allow animations
    setTimeout(() => {
      setPhoneNumber(null);
      setKey(prev => prev + 1); // Force remount next time
    }, 300);
  };

  return (
    <CTIContext.Provider value={{ isOpen, phoneNumber, openCTI, closeCTI }}>
      {children}
      {isOpen && (
        <DialpadMiniDialer
          key={key} // Force remount when key changes
          phoneNumber={phoneNumber || undefined}
          onClose={closeCTI}
        />
      )}
    </CTIContext.Provider>
  );
}

