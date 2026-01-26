import { useState, useEffect } from 'react';
import { Vibrate, Play, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  VibrationPatternType, 
  VIBRATION_PATTERN_OPTIONS,
  getVibrationPatternType,
  setVibrationPatternType 
} from '@/hooks/useCallVibration';

interface VibrationPatternSelectorProps {
  onPreview?: (type: VibrationPatternType) => void;
}

export const VibrationPatternSelector = ({ onPreview }: VibrationPatternSelectorProps) => {
  const [selectedPattern, setSelectedPattern] = useState<VibrationPatternType>('standard');

  useEffect(() => {
    setSelectedPattern(getVibrationPatternType());
  }, []);

  const handleSelect = (type: VibrationPatternType) => {
    setSelectedPattern(type);
    setVibrationPatternType(type);
    onPreview?.(type);
  };

  return (
    <div className="p-4 bg-card rounded-xl border border-border space-y-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Vibrate className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="font-medium">Вибрация звонка</p>
          <p className="text-xs text-muted-foreground">
            Паттерн вибрации при входящем звонке
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 mt-3">
        {VIBRATION_PATTERN_OPTIONS.map((pattern) => (
          <button
            key={pattern.id}
            onClick={() => handleSelect(pattern.id)}
            className={cn(
              "flex items-center justify-between p-3 rounded-lg border transition-all group",
              selectedPattern === pattern.id
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-full transition-colors",
                selectedPattern === pattern.id 
                  ? "bg-primary/20" 
                  : "bg-muted group-hover:bg-primary/10"
              )}>
                <Play className={cn(
                  "w-3 h-3",
                  selectedPattern === pattern.id 
                    ? "text-primary" 
                    : "text-muted-foreground group-hover:text-primary"
                )} />
              </div>
              <div className="text-left">
                <span className={cn(
                  "text-sm block",
                  selectedPattern === pattern.id ? "font-medium text-primary" : ""
                )}>
                  {pattern.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {pattern.description}
                </span>
              </div>
            </div>
            {selectedPattern === pattern.id && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
