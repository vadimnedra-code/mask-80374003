import { useState } from 'react';
import { useMask, MaskType, Mask } from '@/hooks/useMask';
import { cn } from '@/lib/utils';
import { ChevronDown, Check, Shield, Eye, EyeOff, Clock, Smartphone } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface MaskSwitchProps {
  compact?: boolean;
}

export const MaskSwitch = ({ compact = false }: MaskSwitchProps) => {
  const { currentMask, setCurrentMask, masks } = useMask();
  const [open, setOpen] = useState(false);
  const [showWash, setShowWash] = useState(false);

  const handleMaskChange = (maskId: MaskType) => {
    if (maskId !== currentMask.id) {
      // Trigger wash animation
      setShowWash(true);
      setTimeout(() => setShowWash(false), 600);
      
      setCurrentMask(maskId);
    }
    setOpen(false);
  };

  const getMaskColorClass = (mask: Mask) => {
    switch (mask.id) {
      case 'business': return 'bg-mask-business';
      case 'personal': return 'bg-mask-personal';
      case 'family': return 'bg-mask-family';
      case 'incognito': return 'bg-mask-incognito';
      default: return 'bg-primary';
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "mask-indicator relative overflow-hidden group",
            "hover:shadow-sm transition-all duration-200",
            compact ? "px-2 py-1" : "px-3 py-1.5"
          )}
        >
          {/* Wash animation overlay */}
          {showWash && (
            <div 
              className="absolute inset-0 bg-primary rounded-lg animate-mask-wash"
              style={{ transformOrigin: 'center' }}
            />
          )}
          
          <span className="text-sm relative z-10">{currentMask.icon}</span>
          {!compact && (
            <>
              <span className="text-xs font-medium relative z-10">{currentMask.name}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity relative z-10" />
            </>
          )}
        </button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-72 p-2" 
        align="start"
        sideOffset={8}
      >
        <div className="space-y-1">
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Выбрать маску
          </p>
          
          {masks.map((mask) => (
            <button
              key={mask.id}
              onClick={() => handleMaskChange(mask.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-xl transition-all duration-200",
                "hover:bg-muted/50",
                currentMask.id === mask.id && "bg-accent"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-lg",
                getMaskColorClass(mask),
                "text-white"
              )}>
                {mask.icon}
              </div>
              
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{mask.name}</span>
                  {currentMask.id === mask.id && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mask.description}
                </p>
                
                {/* Feature badges */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {mask.features.hidePhone && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                      <Smartphone className="w-3 h-3" />
                      Скрыт
                    </span>
                  )}
                  {mask.features.hideLastSeen && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                      <EyeOff className="w-3 h-3" />
                      Был(а)
                    </span>
                  )}
                  {mask.features.autoDelete && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Авто
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <div className="mt-2 pt-2 border-t border-border">
          <button className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Shield className="w-3.5 h-3.5" />
            Настроить маски
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Compact indicator for chat composer
export const MaskIndicator = () => {
  const { currentMask } = useMask();
  
  return (
    <div className="mask-indicator text-[10px]">
      <span>{currentMask.icon}</span>
      <span className="opacity-70">как {currentMask.name}</span>
    </div>
  );
};
