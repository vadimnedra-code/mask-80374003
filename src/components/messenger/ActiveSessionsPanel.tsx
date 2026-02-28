import { X, Monitor, Smartphone, Globe, Clock, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUserSessions } from '@/hooks/useUserSessions';
import { format, formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActiveSessionsPanelProps {
  onClose: () => void;
}

export const ActiveSessionsPanel = ({ onClose }: ActiveSessionsPanelProps) => {
  const { sessions, loading, currentSessionId } = useUserSessions();

  const getDeviceIcon = (device: string | null) => {
    if (device?.includes('Мобильн')) return Smartphone;
    return Monitor;
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-slide-in-right lg:relative lg:animate-none">
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Активные сессии</h1>
          <p className="text-xs text-muted-foreground">Устройства с доступом к аккаунту</p>
        </div>
      </div>

      <ScrollArea className="h-[calc(100%-65px)]">
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">Нет активных сессий</p>
          ) : (
            sessions.map((session) => {
              const DeviceIcon = getDeviceIcon(session.device_name);
              const isCurrent = session.id === currentSessionId || session.is_current;

              return (
                <div
                  key={session.id}
                  className={cn(
                    "p-4 rounded-xl border bg-card",
                    isCurrent ? "border-primary/30 bg-primary/5" : "border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isCurrent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <DeviceIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {session.browser || 'Неизвестный браузер'} • {session.os || 'Неизвестная ОС'}
                        </p>
                        {isCurrent && (
                          <span className="text-[10px] font-medium bg-primary/15 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                            Текущая
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {session.device_name || 'Устройство'}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(session.last_active_at), { addSuffix: true, locale: ru })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          <p className="text-xs text-muted-foreground text-center pt-4">
            {sessions.length} {sessions.length === 1 ? 'сессия' : sessions.length < 5 ? 'сессии' : 'сессий'}
          </p>
        </div>
      </ScrollArea>
    </div>
  );
};
