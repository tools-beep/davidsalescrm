// Available caller IDs for outbound calls
export interface CallerId {
  id: string;
  name: string;
  number: string;
  location?: string;
  isDefault?: boolean;
}

export const AVAILABLE_CALLER_IDS: CallerId[] = [
  {
    id: 'default',
    name: 'Miguel Diaz',
    number: '+16049002048',
    location: 'Default',
    isDefault: true,
  },
  {
    id: 'california',
    name: 'Miguel Diaz',
    number: '+16612139593',
    location: 'California',
  },
  {
    id: 'new_york',
    name: 'Miguel Diaz',
    number: '+16463960687',
    location: 'New York',
  },
];

export const DEFAULT_CALLER_ID = AVAILABLE_CALLER_IDS.find(c => c.isDefault) || AVAILABLE_CALLER_IDS[0];

// Format phone number for display
export function formatCallerNumber(number: string): string {
  // Remove +1 and format as (XXX) XXX-XXXX
  const cleaned = number.replace(/^\+1/, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return number;
}

