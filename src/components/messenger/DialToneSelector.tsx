import { useState, useEffect } from 'react';
import { PhoneOutgoing, Play, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DialToneType = 'standard' | 'soft' | 'double' | 'melody' | 'minimal';

export interface DialToneOption {
  id: DialToneType;
  name: string;
  description: string;
}

export const DIAL_TONE_OPTIONS: DialToneOption[] = [
  { id: 'standard', name: 'Стандартный', description: 'Классический гудок 425 Гц' },
  { id: 'soft', name: 'Мягкий', description: 'Приглушённый спокойный тон' },
  { id: 'double', name: 'Двойной', description: 'Два коротких гудка' },
  { id: 'melody', name: 'Мелодичный', description: 'Приятные переливающиеся ноты' },
  { id: 'minimal', name: 'Минимальный', description: 'Тихий едва заметный сигнал' },
];

const STORAGE_KEY = 'call_dial_tone';

export const getDialToneType = (): DialToneType => {
  if (typeof window === 'undefined') return 'standard';
  return (localStorage.getItem(STORAGE_KEY) as DialToneType) || 'standard';
};

export const setDialToneType = (type: DialToneType) => {
  localStorage.setItem(STORAGE_KEY, type);
};

interface DialToneSelectorProps {
  onPreview?: (type: DialToneType) => void;
}

export const DialToneSelector = ({ onPreview }: DialToneSelectorProps) => {
  const [selectedDialTone, setSelectedDialTone] = useState<DialToneType>('standard');

  useEffect(() => {
    setSelectedDialTone(getDialToneType());
  }, []);

  const handleSelect = (type: DialToneType) => {
    setSelectedDialTone(type);
    setDialToneType(type);
    onPreview?.(type);
  };

  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <PhoneOutgoing className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Гудок дозвона</p>
          <p className="text-xs text-muted-foreground">
            Звук при ожидании ответа на звонок
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 mt-3">
        {DIAL_TONE_OPTIONS.map((dialTone) => (
          <button
            key={dialTone.id}
            onClick={() => handleSelect(dialTone.id)}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all group",
              selectedDialTone === dialTone.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-full transition-colors",
                selectedDialTone === dialTone.id 
                  ? "bg-primary/20" 
                  : "bg-muted group-hover:bg-primary/10"
              )}>
                <Play className={cn(
                  "w-3 h-3",
                  selectedDialTone === dialTone.id 
                    ? "text-primary" 
                    : "text-muted-foreground group-hover:text-primary"
                )} />
              </div>
              <div className="text-left">
                <span className={cn(
                  "text-sm block",
                  selectedDialTone === dialTone.id ? "font-medium text-primary" : ""
                )}>
                  {dialTone.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {dialTone.description}
                </span>
              </div>
            </div>
            {selectedDialTone === dialTone.id && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
