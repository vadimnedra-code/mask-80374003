import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type MaskType = 'business' | 'personal' | 'family' | 'incognito';

export interface Mask {
  id: MaskType;
  name: string;
  description: string;
  icon: string;
  color: string;
  features: {
    hidePhone: boolean;
    hidePhoto: boolean;
    hideLastSeen: boolean;
    autoDelete: boolean;
  };
}

export const MASKS: Mask[] = [
  {
    id: 'personal',
    name: 'Личный',
    description: 'Общение с друзьями и близкими',
    icon: '😊',
    color: 'amber',
    features: {
      hidePhone: false,
      hidePhoto: false,
      hideLastSeen: false,
      autoDelete: false,
    },
  },
  {
    id: 'business',
    name: 'Рабочий',
    description: 'Профессиональный профиль',
    icon: '💼',
    color: 'blue',
    features: {
      hidePhone: true,
      hidePhoto: false,
      hideLastSeen: true,
      autoDelete: false,
    },
  },
  {
    id: 'family',
    name: 'Семья',
    description: 'Для близких родственников',
    icon: '🏠',
    color: 'green',
    features: {
      hidePhone: false,
      hidePhoto: false,
      hideLastSeen: false,
      autoDelete: false,
    },
  },
  {
    id: 'incognito',
    name: 'Инкогнито',
    description: 'Анонимный режим',
    icon: '🎭',
    color: 'purple',
    features: {
      hidePhone: true,
      hidePhoto: true,
      hideLastSeen: true,
      autoDelete: true,
    },
  },
];

interface MaskContextType {
  currentMask: Mask;
  setCurrentMask: (mask: MaskType) => void;
  masks: Mask[];
}

const MaskContext = createContext<MaskContextType | undefined>(undefined);

export const MaskProvider = ({ children }: { children: ReactNode }) => {
  const [currentMaskId, setCurrentMaskId] = useState<MaskType>(() => {
    const saved = localStorage.getItem('mask-current');
    return (saved as MaskType) || 'personal';
  });

  const currentMask = MASKS.find(m => m.id === currentMaskId) || MASKS[0];

  useEffect(() => {
    localStorage.setItem('mask-current', currentMaskId);
    // Apply mask to document for CSS variable switching
    document.documentElement.setAttribute('data-mask', currentMaskId);
  }, [currentMaskId]);

  // Initialize mask on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-mask', currentMaskId);
  }, []);

  const setCurrentMask = (maskId: MaskType) => {
    setCurrentMaskId(maskId);
  };

  return (
    <MaskContext.Provider value={{ currentMask, setCurrentMask, masks: MASKS }}>
      {children}
    </MaskContext.Provider>
  );
};

export const useMask = () => {
  const context = useContext(MaskContext);
  if (context === undefined) {
    throw new Error('useMask must be used within a MaskProvider');
  }
  return context;
};
