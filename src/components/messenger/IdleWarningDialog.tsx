import { useEffect, useState } from 'react';
import { AlertCircle, Clock } from 'lucide-react';

interface IdleWarningDialogProps {
  isOpen: boolean;
  onStayActive: () => void;
  onClose: () => void;
  timeRemaining?: number; // seconds until auto-close
}

export const IdleWarningDialog = ({
  isOpen,
  onStayActive,
  onClose,
  timeRemaining = 60,
}: IdleWarningDialogProps) => {
  const [countdown, setCountdown] = useState(timeRemaining);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(timeRemaining);
      return;
    }

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, timeRemaining, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 max-w-sm w-full bg-surface-elevated rounded-2xl shadow-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-primary/10 px-6 py-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <Clock className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Вы здесь?</h3>
            <p className="text-sm text-muted-foreground">Сессия неактивна</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          <p className="text-foreground/80 text-center">
            Приложение будет закрыто через{' '}
            <span className="font-bold text-primary">{countdown}</span> секунд
            из-за отсутствия активности.
          </p>
          
          {/* Progress bar */}
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / timeRemaining) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onStayActive}
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Остаться в приложении
          </button>
        </div>
      </div>
    </div>
  );
};
