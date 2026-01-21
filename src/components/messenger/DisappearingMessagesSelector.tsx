import { useState } from 'react';
import { Timer, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDisappearingMessages, DisappearTimer } from '@/hooks/useDisappearingMessages';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DisappearingMessagesSelectorProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS: { value: DisappearTimer; label: string; description: string }[] = [
  { value: null, label: 'Выкл', description: 'Сообщения не удаляются автоматически' },
  { value: 86400, label: '24 часа', description: 'Сообщения удаляются через 24 часа' },
  { value: 604800, label: '7 дней', description: 'Сообщения удаляются через неделю' },
  { value: 7776000, label: '90 дней', description: 'Сообщения удаляются через 3 месяца' },
];

export const DisappearingMessagesSelector = ({ 
  chatId, 
  isOpen, 
  onClose 
}: DisappearingMessagesSelectorProps) => {
  const { ttlSeconds, setDisappearTimer, loading } = useDisappearingMessages(chatId);
  const [updating, setUpdating] = useState(false);

  const handleSelect = async (value: DisappearTimer) => {
    if (value === ttlSeconds) {
      onClose();
      return;
    }

    setUpdating(true);
    const { error } = await setDisappearTimer(value);
    setUpdating(false);

    if (error) {
      toast.error('Не удалось изменить настройки');
    } else {
      toast.success(
        value === null 
          ? 'Исчезающие сообщения отключены' 
          : `Сообщения будут удаляться через ${TIMER_OPTIONS.find(o => o.value === value)?.label}`
      );
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card rounded-t-2xl shadow-xl w-full max-w-lg overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center py-3">
            <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 pb-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Исчезающие сообщения</h2>
              <p className="text-sm text-muted-foreground">
                Новые сообщения будут автоматически удалены
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="px-2 pb-safe">
            {TIMER_OPTIONS.map((option) => {
              const isSelected = option.value === ttlSeconds;
              
              return (
                <button
                  key={option.value ?? 'off'}
                  onClick={() => handleSelect(option.value)}
                  disabled={updating || loading}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-muted/50",
                    (updating || loading) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    isSelected 
                      ? "border-primary bg-primary" 
                      : "border-muted-foreground/30"
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Info */}
          <div className="px-4 py-3 bg-muted/50 text-xs text-muted-foreground">
            <p>
              ⚠️ Эта настройка применяется только к новым сообщениям. 
              Существующие сообщения не будут удалены.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Simple indicator for chat header
export const DisappearingMessagesIndicator = ({ chatId }: { chatId: string }) => {
  const { isEnabled, getTimerLabel, ttlSeconds } = useDisappearingMessages(chatId);
  const [isOpen, setIsOpen] = useState(false);

  if (!isEnabled) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
      >
        <Timer className="w-3 h-3" />
        <span>{getTimerLabel(ttlSeconds)}</span>
      </button>
      
      <DisappearingMessagesSelector
        chatId={chatId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
