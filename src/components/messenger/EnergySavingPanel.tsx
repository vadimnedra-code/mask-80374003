import { useState } from 'react';
import { 
  X, 
  Battery, 
  Zap, 
  Eye, 
  MessageSquare, 
  RefreshCw,
  Wifi,
  ChevronRight
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useEnergySavingContext } from '@/hooks/useEnergySaving';
import { cn } from '@/lib/utils';

interface EnergySavingPanelProps {
  onClose: () => void;
}

export const EnergySavingPanel = ({ onClose }: EnergySavingPanelProps) => {
  const { 
    settings, 
    toggleEnergySaving, 
    updateSetting 
  } = useEnergySavingContext();

  const formatInterval = (ms: number) => {
    if (ms >= 60000) {
      const mins = Math.floor(ms / 60000);
      return `${mins} мин`;
    }
    return `${ms / 1000} сек`;
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
        <h1 className="text-xl font-semibold">Энергосбережение</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-[env(safe-area-inset-bottom)]">
        <div className="space-y-6 max-w-md mx-auto">
          {/* Info */}
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <Battery className="w-5 h-5 text-amber-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-200">Режим энергосбережения</p>
              <p className="text-xs text-muted-foreground mt-1">
                Уменьшает нагрузку на батарею, ограничивая фоновую активность и анимации
              </p>
            </div>
          </div>

          {/* Main Toggle */}
          <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-full",
                settings.enabled ? "bg-amber-500/20" : "bg-muted"
              )}>
                <Zap className={cn(
                  "w-5 h-5",
                  settings.enabled ? "text-amber-500" : "text-muted-foreground"
                )} />
              </div>
              <div>
                <Label htmlFor="energy-saving" className="font-medium">
                  Включить энергосбережение
                </Label>
                <p className="text-xs text-muted-foreground">
                  {settings.enabled ? 'Активно' : 'Отключено'}
                </p>
              </div>
            </div>
            <Switch
              id="energy-saving"
              checked={settings.enabled}
              onCheckedChange={toggleEnergySaving}
            />
          </div>

          {/* Detailed Settings */}
          {settings.enabled && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-top-2 duration-200">
              {/* Disable Animations */}
              <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="disable-animations" className="font-medium">
                      Отключить анимации
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Убирает переходы и эффекты
                    </p>
                  </div>
                </div>
                <Switch
                  id="disable-animations"
                  checked={settings.disableAnimations}
                  onCheckedChange={(v) => updateSetting('disableAnimations', v)}
                />
              </div>

              {/* Disable Typing Indicators */}
              <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="disable-typing" className="font-medium">
                      Отключить «печатает...»
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Не показывать статус набора
                    </p>
                  </div>
                </div>
                <Switch
                  id="disable-typing"
                  checked={settings.disableTypingIndicators}
                  onCheckedChange={(v) => updateSetting('disableTypingIndicators', v)}
                />
              </div>

              {/* Reduce Realtime Updates */}
              <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Wifi className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="reduce-realtime" className="font-medium">
                      Реже обновлять данные
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Уменьшает частоту синхронизации
                    </p>
                  </div>
                </div>
                <Switch
                  id="reduce-realtime"
                  checked={settings.reduceRealtimeUpdates}
                  onCheckedChange={(v) => updateSetting('reduceRealtimeUpdates', v)}
                />
              </div>

              {/* Disable Auto Refresh */}
              <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <RefreshCw className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="disable-refresh" className="font-medium">
                      Отключить авто-обновление
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Обновлять вручную свайпом вниз
                    </p>
                  </div>
                </div>
                <Switch
                  id="disable-refresh"
                  checked={settings.disableAutoRefresh}
                  onCheckedChange={(v) => updateSetting('disableAutoRefresh', v)}
                />
              </div>

              {/* Polling Interval Slider */}
              {settings.reduceRealtimeUpdates && (
                <div className="p-4 bg-card rounded-xl border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="font-medium">Интервал обновления</Label>
                    <span className="text-sm text-primary font-medium">
                      {formatInterval(settings.reducedPollingInterval)}
                    </span>
                  </div>
                  <Slider
                    value={[settings.reducedPollingInterval]}
                    onValueChange={([v]) => updateSetting('reducedPollingInterval', v)}
                    min={30000}
                    max={300000}
                    step={30000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>30 сек</span>
                    <span>5 мин</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="p-4 bg-muted/50 rounded-xl space-y-2">
            <p className="text-sm font-medium">Советы по экономии батареи:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Уменьшите яркость экрана</li>
              <li>• Используйте тёмную тему</li>
              <li>• Закрывайте приложение когда не используете</li>
              <li>• Отключите вибрацию при звонках</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
