import { useState, useEffect } from 'react';
import { Phone, Play, Check, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

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
const VOLUME_STORAGE_KEY = 'call_ringtone_volume';

export const getRingtoneType = (): RingtoneType => {
  if (typeof window === 'undefined') return 'chime';
  return (localStorage.getItem(STORAGE_KEY) as RingtoneType) || 'chime';
};

export const setRingtoneType = (type: RingtoneType) => {
  localStorage.setItem(STORAGE_KEY, type);
};

export const getRingtoneVolume = (): number => {
  if (typeof window === 'undefined') return 0.7;
  const stored = localStorage.getItem(VOLUME_STORAGE_KEY);
  return stored ? parseFloat(stored) : 0.7;
};

export const setRingtoneVolume = (volume: number) => {
  localStorage.setItem(VOLUME_STORAGE_KEY, volume.toString());
};

interface RingtoneSelectorProps {
  onPreview?: (type: RingtoneType) => void;
}

export const RingtoneSelector = ({ onPreview }: RingtoneSelectorProps) => {
  const [selectedRingtone, setSelectedRingtone] = useState<RingtoneType>('chime');
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    setSelectedRingtone(getRingtoneType());
    setVolume(getRingtoneVolume());
  }, []);

  const handleSelect = (type: RingtoneType) => {
    setSelectedRingtone(type);
    setRingtoneType(type);
    onPreview?.(type);
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setRingtoneVolume(newVolume);
  };

  const handleVolumeCommit = () => {
    onPreview?.(selectedRingtone);
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

      {/* Volume Slider */}
      <div className="flex items-center gap-3 py-2 px-1">
        <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <Slider
          value={[volume]}
          min={0}
          max={1}
          step={0.05}
          onValueChange={handleVolumeChange}
          onValueCommit={handleVolumeCommit}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground w-8 text-right">
          {Math.round(volume * 100)}%
        </span>
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
