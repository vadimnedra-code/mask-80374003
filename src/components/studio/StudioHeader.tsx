import { X, Settings, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import maskLogo from '@/assets/mask-logo.png';

interface StudioHeaderProps {
  isIncognito: boolean;
  onToggleIncognito: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

export const StudioHeader = ({
  isIncognito,
  onToggleIncognito,
  onOpenSettings,
  onClose,
}: StudioHeaderProps) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 flex items-center justify-center">
          <img src={maskLogo} alt="MASK" className="w-8 h-8 object-contain" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            AI Studio
            <Sparkles className="w-4 h-4 text-primary" />
          </h1>
          <p className="text-xs text-muted-foreground">
            Communication OS
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={isIncognito ? "default" : "ghost"}
          size="sm"
          onClick={onToggleIncognito}
          className={isIncognito ? "bg-primary/20 text-primary" : ""}
        >
          <Shield className="w-4 h-4 mr-1" />
          {isIncognito ? 'Incognito' : 'Normal'}
        </Button>

        <Button variant="ghost" size="icon" onClick={onOpenSettings}>
          <Settings className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
};
