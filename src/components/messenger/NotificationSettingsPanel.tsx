import { useState, useEffect } from 'react';
import { X, Bell, Volume2, VolumeX, Vibrate } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotificationSound } from '@/hooks/useNotificationSound';

interface NotificationSettingsPanelProps {
  onClose: () => void;
}

export const NotificationSettingsPanel = ({ onClose }: NotificationSettingsPanelProps) => {
  const { isEnabled, setEnabled, playMessageSound } = useNotificationSound();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(isEnabled());
    const savedVibration = localStorage.getItem('notification_vibration');
    setVibrationEnabled(savedVibration !== 'false');
  }, [isEnabled]);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setEnabled(enabled);
    if (enabled) {
      playMessageSound();
    }
  };

  const handleVibrationToggle = (enabled: boolean) => {
    setVibrationEnabled(enabled);
    localStorage.setItem('notification_vibration', enabled ? 'true' : 'false');
    if (enabled && 'vibrate' in navigator) {
      navigator.vibrate(100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Уведомления</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-[env(safe-area-inset-bottom)]">
        <div className="space-y-6 max-w-md mx-auto">
          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
            <Bell className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Настройки уведомлений</p>
              <p className="text-xs text-muted-foreground mt-1">
                Управляйте звуками и вибрацией при получении сообщений
              </p>
            </div>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label htmlFor="sound" className="font-medium">
                  Звук сообщений
                </Label>
                <p className="text-xs text-muted-foreground">
                  Воспроизводить звук при новом сообщении
                </p>
              </div>
            </div>
            <Switch
              id="sound"
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>

          {/* Vibration */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Vibrate className="w-5 h-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="vibration" className="font-medium">
                  Вибрация
                </Label>
                <p className="text-xs text-muted-foreground">
                  Вибрировать при входящих звонках
                </p>
              </div>
            </div>
            <Switch
              id="vibration"
              checked={vibrationEnabled}
              onCheckedChange={handleVibrationToggle}
            />
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center px-4">
            Push-уведомления будут приходить, даже когда приложение закрыто
          </p>
        </div>
      </div>
    </div>
  );
};
