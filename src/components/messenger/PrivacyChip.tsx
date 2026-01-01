import { Shield, Lock, Eye, EyeOff, Forward, Camera, Clock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type PrivacyLevel = 'open' | 'private' | 'secure';

interface PrivacySettings {
  level: PrivacyLevel;
  screenshots: boolean;
  forwarding: boolean;
  autoDelete: number | null; // minutes, null = disabled
  inviteOnly: boolean;
}

interface PrivacyChipProps {
  settings: PrivacySettings;
  onChange?: (settings: PrivacySettings) => void;
  readonly?: boolean;
}

const PRIVACY_CONFIG = {
  open: {
    label: 'Открытый',
    icon: Eye,
    description: 'Без ограничений',
  },
  private: {
    label: 'Частный',
    icon: EyeOff,
    description: 'Ограниченный доступ',
  },
  secure: {
    label: 'Защищённый',
    icon: Lock,
    description: 'Максимальная защита',
  },
};

export const PrivacyChip = ({ settings, onChange, readonly = true }: PrivacyChipProps) => {
  const config = PRIVACY_CONFIG[settings.level];
  const Icon = config.icon;

  const chipContent = (
    <div 
      className={cn(
        "privacy-chip cursor-pointer",
        settings.level === 'open' && "privacy-chip-open",
        settings.level === 'private' && "privacy-chip-private",
        settings.level === 'secure' && "privacy-chip-secure",
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
    </div>
  );

  if (readonly) {
    return chipContent;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {chipContent}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start" sideOffset={8}>
        <div className="p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Настройки приватности</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {config.description}
          </p>
        </div>
        
        <div className="p-2 space-y-1">
          <PrivacyToggle
            icon={Camera}
            label="Скриншоты"
            description={settings.screenshots ? "Разрешены" : "Запрещены"}
            enabled={settings.screenshots}
            onChange={(val) => onChange?.({ ...settings, screenshots: val })}
          />
          
          <PrivacyToggle
            icon={Forward}
            label="Пересылка"
            description={settings.forwarding ? "Разрешена" : "Запрещена"}
            enabled={settings.forwarding}
            onChange={(val) => onChange?.({ ...settings, forwarding: val })}
          />
          
          <PrivacyToggle
            icon={Clock}
            label="Автоудаление"
            description={settings.autoDelete ? `${settings.autoDelete} мин` : "Отключено"}
            enabled={settings.autoDelete !== null}
            onChange={(val) => onChange?.({ ...settings, autoDelete: val ? 60 : null })}
          />
          
          <PrivacyToggle
            icon={Users}
            label="Только по приглашению"
            description={settings.inviteOnly ? "Включено" : "Отключено"}
            enabled={settings.inviteOnly}
            onChange={(val) => onChange?.({ ...settings, inviteOnly: val })}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

interface PrivacyToggleProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

const PrivacyToggle = ({ icon: Icon, label, description, enabled, onChange }: PrivacyToggleProps) => (
  <button
    onClick={() => onChange(!enabled)}
    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
  >
    <div className={cn(
      "w-8 h-8 rounded-lg flex items-center justify-center",
      enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
    )}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 text-left">
      <span className="text-sm font-medium">{label}</span>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
    <div className={cn(
      "w-4 h-4 rounded-full border-2 transition-colors",
      enabled ? "bg-primary border-primary" : "border-muted-foreground/30"
    )} />
  </button>
);

// Default privacy settings helper
export const getDefaultPrivacySettings = (level: PrivacyLevel): PrivacySettings => {
  switch (level) {
    case 'open':
      return {
        level: 'open',
        screenshots: true,
        forwarding: true,
        autoDelete: null,
        inviteOnly: false,
      };
    case 'private':
      return {
        level: 'private',
        screenshots: false,
        forwarding: false,
        autoDelete: null,
        inviteOnly: true,
      };
    case 'secure':
      return {
        level: 'secure',
        screenshots: false,
        forwarding: false,
        autoDelete: 60,
        inviteOnly: true,
      };
  }
};
