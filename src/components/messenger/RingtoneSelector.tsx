import { useState, useEffect } from 'react';
import { Phone, Play, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RingtoneType = 'classic' | 'chime' | 'gentle' | 'modern' | 'minimal';

export interface RingtoneOption {
  id: RingtoneType;
  name: string;
  description: string;
}

export const RINGTONE_OPTIONS: RingtoneOption[] = [
  { id: 'classic', name: 'Классический', description: 'Традиционный телефонный звонок' },
  { id: 'chime', name: 'Перезвон', description: 'Мягкие музыкальные ноты' },
  { id: 'gentle', name: 'Нежный', description: 'Спокойный и приятный тон' },
  { id: 'modern', name: 'Современный', description: 'Стильный электронный звук' },
  { id: 'minimal', name: 'Минимальный', description: 'Простой короткий сигнал' },
];

const STORAGE_KEY = 'call_ringtone';

export const getRingtoneType = (): RingtoneType => {
  if (typeof window === 'undefined') return 'chime';
  return (localStorage.getItem(STORAGE_KEY) as RingtoneType) || 'chime';
};

export const setRingtoneType = (type: RingtoneType) => {
  localStorage.setItem(STORAGE_KEY, type);
};

interface RingtoneSelectorProps {
  onPreview?: (type: RingtoneType) => void;
}

export const RingtoneSelector = ({ onPreview }: RingtoneSelectorProps) => {
  const [selectedRingtone, setSelectedRingtone] = useState<RingtoneType>('chime');

  useEffect(() => {
    setSelectedRingtone(getRingtoneType());
  }, []);

  const handleSelect = (type: RingtoneType) => {
    setSelectedRingtone(type);
    setRingtoneType(type);
    onPreview?.(type);
  };

  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Phone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Мелодия звонка</p>
          <p className="text-xs text-muted-foreground">
            Выберите звук для входящих звонков
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 mt-3">
        {RINGTONE_OPTIONS.map((ringtone) => (
          <button
            key={ringtone.id}
            onClick={() => handleSelect(ringtone.id)}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all group",
              selectedRingtone === ringtone.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-full transition-colors",
                selectedRingtone === ringtone.id 
                  ? "bg-primary/20" 
                  : "bg-muted group-hover:bg-primary/10"
              )}>
                <Play className={cn(
                  "w-3 h-3",
                  selectedRingtone === ringtone.id 
                    ? "text-primary" 
                    : "text-muted-foreground group-hover:text-primary"
                )} />
              </div>
              <div className="text-left">
                <span className={cn(
                  "text-sm block",
                  selectedRingtone === ringtone.id ? "font-medium text-primary" : ""
                )}>
                  {ringtone.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {ringtone.description}
                </span>
              </div>
            </div>
            {selectedRingtone === ringtone.id && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
