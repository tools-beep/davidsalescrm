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

  const openCTI = (phone?: string) => {
    setPhoneNumber(phone || null);
    setIsOpen(true);
  };

  const closeCTI = () => {
    setIsOpen(false);
    setPhoneNumber(null);
  };

  return (
    <CTIContext.Provider value={{ isOpen, phoneNumber, openCTI, closeCTI }}>
      {children}
      {isOpen && (
        <DialpadMiniDialer
          phoneNumber={phoneNumber || undefined}
          onClose={closeCTI}
        />
      )}
    </CTIContext.Provider>
  );
}

