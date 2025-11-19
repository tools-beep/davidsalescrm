import { createContext, useContext, useState, ReactNode } from 'react';
import { DialpadMiniDialer } from './DialpadMiniDialer';

// Context for CTI state
interface CTIContextType {
  isOpen: boolean;
  phoneNumber: string | null;
  dealId: string | null;
  contactId: string | null;
  openCTI: (phoneNumber?: string, dealId?: string, contactId?: string) => void;
  closeCTI: () => void;
  setCallEndCallback: (callback: ((callId: number) => void) | null) => void;
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
  const [dealId, setDealId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const [key, setKey] = useState(0); // Force remount of CTI
  const [callEndCallback, setCallEndCallback] = useState<((callId: number) => void) | null>(null);

  const openCTI = (phone?: string, deal?: string, contact?: string) => {
    // If CTI is already open with a different number, remount it
    if (isOpen && phone !== phoneNumber) {
      setIsOpen(false);
      setKey(prev => prev + 1); // Force remount
      setTimeout(() => {
        setPhoneNumber(phone || null);
        setDealId(deal || null);
        setContactId(contact || null);
        setIsOpen(true);
      }, 100);
    } else {
      setPhoneNumber(phone || null);
      setDealId(deal || null);
      setContactId(contact || null);
      setIsOpen(true);
    }
  };

  const closeCTI = () => {
    setIsOpen(false);
    // Clear phone number after a delay to allow animations
    setTimeout(() => {
      setPhoneNumber(null);
      setDealId(null);
      setContactId(null);
      setKey(prev => prev + 1); // Force remount next time
    }, 300);
  };

  const handleSetCallEndCallback = (callback: ((callId: number) => void) | null) => {
    setCallEndCallback(() => callback);
  };

  const handleCallEnd = (callId: number) => {
    if (callEndCallback) {
      callEndCallback(callId);
    }
  };

  return (
    <CTIContext.Provider value={{ isOpen, phoneNumber, dealId, contactId, openCTI, closeCTI, setCallEndCallback: handleSetCallEndCallback }}>
      {children}
      {isOpen && (
        <DialpadMiniDialer
          key={key} // Force remount when key changes
          phoneNumber={phoneNumber || undefined}
          dealId={dealId || undefined}
          contactId={contactId || undefined}
          onClose={closeCTI}
          onCallEnd={handleCallEnd}
        />
      )}
    </CTIContext.Provider>
  );
}

