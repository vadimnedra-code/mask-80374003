import { useState, useEffect } from 'react';
import { X, Check, Loader2, UserPen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EditNicknameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string | null;
  originalName: string;
  onSave: (nickname: string) => Promise<{ error: Error | null }>;
}

export const EditNicknameDialog = ({
  isOpen,
  onClose,
  currentNickname,
  originalName,
  onSave,
}: EditNicknameDialogProps) => {
  const [nickname, setNickname] = useState(currentNickname || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNickname(currentNickname || '');
    }
  }, [isOpen, currentNickname]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await onSave(nickname);
    setSaving(false);

    if (!error) {
      onClose();
    }
  };

  const handleReset = async () => {
    setNickname('');
    setSaving(true);
    await onSave('');
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-card rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <UserPen className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Имя для контакта</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Это имя будет отображаться только для вас
            </p>

            {/* Original Name Display */}
            <div className="text-xs text-muted-foreground mb-2">
              Настоящее имя: <span className="font-medium">{originalName}</span>
            </div>

            {/* Nickname Input */}
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Введите имя..."
              autoFocus
              className={cn(
                "w-full px-4 py-3 rounded-xl bg-muted border-0",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "text-base placeholder:text-muted-foreground/60"
              )}
              maxLength={50}
            />

            <div className="flex justify-end text-xs text-muted-foreground mt-1">
              {nickname.length}/50
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 p-4 pt-0">
            {currentNickname && (
              <button
                onClick={handleReset}
                disabled={saving}
                className={cn(
                  "flex-1 py-2.5 rounded-xl font-medium transition-colors",
                  "bg-muted text-muted-foreground hover:bg-muted/80",
                  saving && "opacity-50 cursor-not-allowed"
                )}
              >
                Сбросить
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className={cn(
                "flex-1 py-2.5 rounded-xl font-medium transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "flex items-center justify-center gap-2",
                saving && "opacity-50 cursor-not-allowed"
              )}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Сохранить
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
