import { useState } from 'react';
import { Archive, Volume2, VolumeX, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useArchiveMute } from '@/hooks/useArchiveMute';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MuteDurationSelectorProps {
  chatId: string;
  isOpen: boolean;
  onClose: () => void;
  currentMutedUntil: string | null;
}

type MuteDuration = '8h' | '1w' | 'forever';

const MUTE_OPTIONS: { value: MuteDuration; label: string; description: string }[] = [
  { value: '8h', label: '8 часов', description: 'Уведомления вернутся через 8 часов' },
  { value: '1w', label: '1 неделя', description: 'Уведомления вернутся через неделю' },
  { value: 'forever', label: 'Навсегда', description: 'Уведомления не будут приходить' },
];

export const MuteDurationSelector = ({ 
  chatId, 
  isOpen, 
  onClose,
  currentMutedUntil
}: MuteDurationSelectorProps) => {
  const { muteChat, unmuteChat, isChatMuted } = useArchiveMute();
  const [updating, setUpdating] = useState(false);
  const isMuted = isChatMuted(currentMutedUntil);

  const handleSelect = async (duration: MuteDuration) => {
    setUpdating(true);
    const { error } = await muteChat(chatId, duration);
    setUpdating(false);

    if (error) {
      toast.error('Не удалось изменить настройки');
    } else {
      const label = MUTE_OPTIONS.find(o => o.value === duration)?.label;
      toast.success(`Уведомления отключены на ${label?.toLowerCase()}`);
      onClose();
    }
  };

  const handleUnmute = async () => {
    setUpdating(true);
    const { error } = await unmuteChat(chatId);
    setUpdating(false);

    if (error) {
      toast.error('Не удалось включить уведомления');
    } else {
      toast.success('Уведомления включены');
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
              {isMuted ? <VolumeX className="w-5 h-5 text-primary" /> : <Volume2 className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <h2 className="font-semibold">
                {isMuted ? 'Уведомления отключены' : 'Отключить уведомления'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isMuted ? 'Нажмите, чтобы включить' : 'Выберите длительность'}
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="px-2 pb-safe">
            {isMuted ? (
              <button
                onClick={handleUnmute}
                disabled={updating}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                  "bg-primary/10 hover:bg-primary/20",
                  updating && "opacity-50 cursor-not-allowed"
                )}
              >
                <Volume2 className="w-5 h-5 text-primary" />
                <div className="flex-1 text-left">
                  <p className="font-medium">Включить уведомления</p>
                  <p className="text-sm text-muted-foreground">Вы снова будете получать уведомления</p>
                </div>
              </button>
            ) : (
              MUTE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  disabled={updating}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-muted/50",
                    updating && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1 text-left">
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Badge for muted chat
export const MutedBadge = ({ mutedUntil }: { mutedUntil: string | null }) => {
  const { isChatMuted } = useArchiveMute();
  
  if (!isChatMuted(mutedUntil)) return null;

  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <VolumeX className="w-3.5 h-3.5" />
    </div>
  );
};
