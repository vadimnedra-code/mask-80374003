import { useState, useEffect } from 'react';
import { X, Bell, Volume2, VolumeX, Music, Battery, ChevronRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNotificationSound, NOTIFICATION_SOUNDS, NotificationSoundType } from '@/hooks/useNotificationSound';
import { RingtoneSelector, RingtoneType } from './RingtoneSelector';
import { DialToneSelector, DialToneType } from './DialToneSelector';
import { VibrationPatternSelector } from './VibrationPatternSelector';
import { EnergySavingPanel } from './EnergySavingPanel';
import { useCallSounds } from '@/hooks/useCallSounds';
import { useCallVibration, VibrationPatternType } from '@/hooks/useCallVibration';
import { useEnergySavingContext } from '@/hooks/useEnergySaving';
import { cn } from '@/lib/utils';

interface NotificationSettingsPanelProps {
  onClose: () => void;
}

export const NotificationSettingsPanel = ({ onClose }: NotificationSettingsPanelProps) => {
  const { isEnabled, setEnabled, playMessageSound, getSoundType, setSoundType } = useNotificationSound();
  const { previewRingtone, previewDialTone } = useCallSounds();
  const { previewVibration } = useCallVibration();
  const { isEnergySavingEnabled } = useEnergySavingContext();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState<NotificationSoundType>('default');
  const [showEnergySaving, setShowEnergySaving] = useState(false);

  useEffect(() => {
    setSoundEnabled(isEnabled());
    setSelectedSound(getSoundType());
  }, [isEnabled, getSoundType]);

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    setEnabled(enabled);
    if (enabled) {
      playMessageSound();
    }
  };

  const handleSoundTypeChange = (type: NotificationSoundType) => {
    setSelectedSound(type);
    setSoundType(type);
    setTimeout(() => {
      playMessageSound();
    }, 50);
  };

  const handleRingtonePreview = (type: RingtoneType) => {
    previewRingtone(type);
  };

  const handleDialTonePreview = (type: DialToneType) => {
    previewDialTone(type);
  };

  const handleVibrationPreview = (type: VibrationPatternType) => {
    previewVibration(type);
  };

  if (showEnergySaving) {
    return <EnergySavingPanel onClose={() => setShowEnergySaving(false)} />;
  }

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
        <h1 className="text-xl font-display font-semibold">Уведомления</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-[env(safe-area-inset-bottom)]">
        <div className="space-y-6 max-w-md mx-auto">
          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
            <Bell className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Настройки уведомлений</p>
              <p className="text-xs text-muted-foreground mt-1">
                Управляйте звуками и вибрацией при получении сообщений и звонков
              </p>
            </div>
          </div>

          {/* Energy Saving Button */}
          <button
            onClick={() => setShowEnergySaving(true)}
            className={cn(
              "w-full flex items-center justify-between p-4 rounded-xl border transition-all group",
              isEnergySavingEnabled 
                ? "bg-primary/5 border-primary/20" 
                : "bg-card border-border hover:border-primary/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                isEnergySavingEnabled ? "bg-primary/10" : "bg-muted"
              )}>
                <Battery className={cn(
                  "w-5 h-5",
                  isEnergySavingEnabled ? "text-primary" : "text-muted-foreground"
                )} />
              </div>
              <div className="text-left">
                <p className="font-medium">Энергосбережение</p>
                <p className="text-xs text-muted-foreground">
                  {isEnergySavingEnabled ? 'Включено' : 'Экономия батареи'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </button>

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

          {/* Sound Type Selector */}
          {soundEnabled && (
            <div className="p-4 bg-card rounded-xl border border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Music className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Мелодия уведомления</p>
                  <p className="text-xs text-muted-foreground">
                    Выберите звук для новых сообщений
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-2 mt-3">
                {NOTIFICATION_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    onClick={() => handleSoundTypeChange(sound.id)}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-all",
                      selectedSound === sound.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <span className={cn(
                      "text-sm",
                      selectedSound === sound.id ? "font-medium text-primary" : ""
                    )}>
                      {sound.name}
                    </span>
                    {selectedSound === sound.id && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ringtone Selector */}
          <RingtoneSelector onPreview={handleRingtonePreview} />

          {/* Dial Tone Selector */}
          <DialToneSelector onPreview={handleDialTonePreview} />

          {/* Vibration Pattern Selector */}
          <VibrationPatternSelector onPreview={handleVibrationPreview} />

          {/* Note */}
          <p className="text-xs text-muted-foreground text-center px-4">
            Push-уведомления будут приходить, даже когда приложение закрыто
          </p>
        </div>
      </div>
    </div>
  );
};
