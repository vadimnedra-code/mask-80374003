import { useState, useEffect } from 'react';
import { Shield, Mail, MessageSquare, Phone, HardDrive, Cloud, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAISettings, type AIMemoryMode } from '@/hooks/useAISettings';
import { toast } from 'sonner';

interface StudioSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudioSettingsDialog = ({ isOpen, onClose }: StudioSettingsDialogProps) => {
  const { settings, updateSettings, loading } = useAISettings();
  
  const [allowEmail, setAllowEmail] = useState(false);
  const [allowSms, setAllowSms] = useState(false);
  const [allowCalls, setAllowCalls] = useState(false);
  const [allowFileAnalysis, setAllowFileAnalysis] = useState(true);
  const [alwaysConfirm, setAlwaysConfirm] = useState(true);
  const [memoryMode, setMemoryMode] = useState<AIMemoryMode>('none');

  // Load settings
  useEffect(() => {
    if (settings) {
      setAllowEmail((settings as any).allow_outbound_email ?? false);
      setAllowSms((settings as any).allow_outbound_sms ?? false);
      setAllowCalls((settings as any).allow_outbound_calls ?? false);
      setAllowFileAnalysis((settings as any).allow_file_analysis ?? true);
      setAlwaysConfirm((settings as any).always_confirm_before_send ?? true);
      setMemoryMode(settings.memory_mode);
    }
  }, [settings]);

  const handleSave = async () => {
    const { error } = await updateSettings({
      allow_outbound_email: allowEmail,
      allow_outbound_sms: allowSms,
      allow_outbound_calls: allowCalls,
      allow_file_analysis: allowFileAnalysis,
      always_confirm_before_send: alwaysConfirm,
      memory_mode: memoryMode,
    } as any);

    if (error) {
      toast.error('Ошибка сохранения');
    } else {
      toast.success('Настройки сохранены');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            AI Permissions
          </DialogTitle>
          <DialogDescription>
            Управление разрешениями и приватностью AI Studio
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Communication permissions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Коммуникации</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="allow-email">Email relay</Label>
              </div>
              <Switch
                id="allow-email"
                checked={allowEmail}
                onCheckedChange={setAllowEmail}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="allow-sms">SMS relay</Label>
              </div>
              <Switch
                id="allow-sms"
                checked={allowSms}
                onCheckedChange={setAllowSms}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <Label htmlFor="allow-calls">Voice calls</Label>
              </div>
              <Switch
                id="allow-calls"
                checked={allowCalls}
                onCheckedChange={setAllowCalls}
              />
            </div>
          </div>

          <Separator />

          {/* Analysis permissions */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Анализ</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allow-file">Анализ файлов</Label>
                <p className="text-xs text-muted-foreground">
                  Разрешить AI анализировать загруженные документы
                </p>
              </div>
              <Switch
                id="allow-file"
                checked={allowFileAnalysis}
                onCheckedChange={setAllowFileAnalysis}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="always-confirm">Подтверждение отправки</Label>
                <p className="text-xs text-muted-foreground">
                  Всегда спрашивать перед отправкой
                </p>
              </div>
              <Switch
                id="always-confirm"
                checked={alwaysConfirm}
                onCheckedChange={setAlwaysConfirm}
              />
            </div>
          </div>

          <Separator />

          {/* Memory mode */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-foreground">Память AI</h4>
            
            <RadioGroup value={memoryMode} onValueChange={(v) => setMemoryMode(v as AIMemoryMode)}>
              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer">
                <RadioGroupItem value="none" id="memory-none" className="mt-1" />
                <div>
                  <Label htmlFor="memory-none" className="cursor-pointer flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Без памяти
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    История не сохраняется. Максимальная приватность.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer">
                <RadioGroupItem value="local" id="memory-local" className="mt-1" />
                <div>
                  <Label htmlFor="memory-local" className="cursor-pointer flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Local Vault
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Зашифрованное хранение на устройстве с PIN.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 cursor-pointer">
                <RadioGroupItem value="cloud_encrypted" id="memory-cloud" className="mt-1" />
                <div>
                  <Label htmlFor="memory-cloud" className="cursor-pointer flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    Cloud Encrypted
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    E2E зашифрованное облачное хранение. Синхронизация между устройствами.
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Сохранить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
