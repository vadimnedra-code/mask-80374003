import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lock, 
  Unlock, 
  Shield, 
  Trash2, 
  Key,
  AlertTriangle,
  Download
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { VaultStatus } from '@/hooks/useLocalVault';

interface VaultMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Date;
}

interface LocalVaultDialogProps {
  isOpen: boolean;
  onClose: () => void;
  status: VaultStatus;
  messageCount: number;
  onInitialize: (pin: string) => Promise<boolean>;
  onUnlock: (pin: string) => Promise<boolean>;
  onLock: () => void;
  onClear: () => Promise<boolean>;
  onDestroy: () => Promise<boolean>;
  onLoadMessages?: () => Promise<VaultMessage[]>;
}

type DialogMode = 'status' | 'create' | 'unlock' | 'confirm-destroy';

export const LocalVaultDialog = ({
  isOpen,
  onClose,
  status,
  messageCount,
  onInitialize,
  onUnlock,
  onLock,
  onClear,
  onDestroy,
  onLoadMessages,
}: LocalVaultDialogProps) => {
  const [mode, setMode] = useState<DialogMode>('status');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const resetState = () => {
    setPin('');
    setConfirmPin('');
    setError('');
    setMode('status');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleCreateVault = async () => {
    if (pin.length < 4) {
      setError('PIN должен быть минимум 4 символа');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN-коды не совпадают');
      return;
    }

    setIsLoading(true);
    setError('');

    const success = await onInitialize(pin);
    setIsLoading(false);

    if (success) {
      toast.success('Хранилище создано');
      resetState();
    } else {
      setError('Не удалось создать хранилище');
    }
  };

  const handleUnlock = async () => {
    if (!pin) {
      setError('Введите PIN');
      return;
    }

    setIsLoading(true);
    setError('');

    const success = await onUnlock(pin);
    setIsLoading(false);

    if (success) {
      toast.success('Хранилище разблокировано');
      resetState();
    } else {
      setError('Неверный PIN');
    }
  };

  const handleDestroy = async () => {
    setIsLoading(true);
    const success = await onDestroy();
    setIsLoading(false);

    if (success) {
      toast.success('Хранилище удалено');
      resetState();
    } else {
      toast.error('Ошибка удаления');
    }
  };

  const handleClear = async () => {
    setIsLoading(true);
    const success = await onClear();
    setIsLoading(false);

    if (success) {
      toast.success('История очищена');
    } else {
      toast.error('Ошибка очистки');
    }
  };

  const handleExport = async () => {
    if (!onLoadMessages) return;
    
    setIsLoading(true);
    try {
      const messages = await onLoadMessages();
      
      if (messages.length === 0) {
        toast.error('Нет сообщений для экспорта');
        setIsLoading(false);
        return;
      }

      // Format messages as text
      const lines = [
        '═══════════════════════════════════════',
        '       MASK AI - История чата',
        `       Экспорт: ${new Date().toLocaleString('ru-RU')}`,
        '═══════════════════════════════════════',
        '',
      ];

      messages.forEach((msg) => {
        const time = msg.createdAt.toLocaleString('ru-RU');
        const role = msg.role === 'user' ? '👤 Вы' : '🤖 AI';
        lines.push(`[${time}] ${role}:`);
        lines.push(msg.content);
        lines.push('');
        lines.push('---');
        lines.push('');
      });

      lines.push('═══════════════════════════════════════');
      lines.push(`Всего сообщений: ${messages.length}`);
      lines.push('═══════════════════════════════════════');

      const content = lines.join('\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `mask-ai-history-${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Экспортировано ${messages.length} сообщений`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Ошибка экспорта');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Local Vault
          </DialogTitle>
          <DialogDescription>
            Локальное хранилище AI с PIN-шифрованием
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {/* Status view */}
          {mode === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Status indicator */}
              <div className={cn(
                "flex items-center gap-3 p-4 rounded-xl",
                status === 'unlocked' && "bg-emerald-500/10",
                status === 'locked' && "bg-amber-500/10",
                status === 'uninitialized' && "bg-muted"
              )}>
                {status === 'unlocked' ? (
                  <Unlock className="w-8 h-8 text-emerald-400" />
                ) : status === 'locked' ? (
                  <Lock className="w-8 h-8 text-amber-400" />
                ) : (
                  <Shield className="w-8 h-8 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {status === 'unlocked' && 'Разблокировано'}
                    {status === 'locked' && 'Заблокировано'}
                    {status === 'uninitialized' && 'Не настроено'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {status === 'uninitialized' 
                      ? 'Создайте хранилище для сохранения истории AI'
                      : `${messageCount} сообщений в хранилище`
                    }
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {status === 'uninitialized' && (
                  <Button 
                    onClick={() => setMode('create')} 
                    className="w-full"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Создать хранилище
                  </Button>
                )}

                {status === 'locked' && (
                  <>
                    <Button 
                      onClick={() => setMode('unlock')} 
                      className="w-full"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Разблокировать
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setMode('confirm-destroy')}
                      className="w-full text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить хранилище
                    </Button>
                  </>
                )}

                {status === 'unlocked' && (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={onLock}
                      className="w-full"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Заблокировать
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleExport}
                      disabled={isLoading || messageCount === 0}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Экспорт истории
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleClear}
                      disabled={isLoading || messageCount === 0}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Очистить историю
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Create vault */}
          {mode === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground">
                Создайте PIN-код для защиты вашей истории AI. 
                Все данные будут зашифрованы и храниться только на вашем устройстве.
              </p>

              <div className="space-y-3">
                <Input
                  type="password"
                  placeholder="Введите PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  maxLength={8}
                />
                <Input
                  type="password"
                  placeholder="Повторите PIN"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  maxLength={8}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => { resetState(); setMode('status'); }}
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button 
                  onClick={handleCreateVault}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Создание...' : 'Создать'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Unlock vault */}
          {mode === 'unlock' && (
            <motion.div
              key="unlock"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                Введите PIN для разблокировки хранилища
              </p>

              <Input
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                className="text-center text-lg tracking-widest"
                maxLength={8}
                autoFocus
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => { resetState(); setMode('status'); }}
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button 
                  onClick={handleUnlock}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Проверка...' : 'Войти'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Confirm destroy */}
          {mode === 'confirm-destroy' && (
            <motion.div
              key="destroy"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10">
                <AlertTriangle className="w-8 h-8 text-destructive shrink-0" />
                <div>
                  <p className="font-medium text-destructive">Удаление хранилища</p>
                  <p className="text-sm text-muted-foreground">
                    Все зашифрованные данные будут удалены безвозвратно
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setMode('status')}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDestroy}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Удаление...' : 'Удалить'}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};
