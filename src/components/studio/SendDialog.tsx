import { useState } from 'react';
import { Mail, MessageSquare, Phone, Send, Loader2, Shield, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StudioArtifact } from '@/types/studio';
import { toast } from 'sonner';

interface SendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  channel: 'email' | 'sms' | 'voice';
  artifact: StudioArtifact | null;
  onChannelChange: (channel: 'email' | 'sms' | 'voice') => void;
}

export const SendDialog = ({
  isOpen,
  onClose,
  channel,
  artifact,
  onChannelChange,
}: SendDialogProps) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(artifact?.text_content?.slice(0, 500) || '');
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error('Укажите получателя');
      return;
    }

    // Show confirmation for first-time send
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsSending(true);
    
    try {
      // TODO: Call edge function to send via relay
      await new Promise(resolve => setTimeout(resolve, 1500)); // Mock
      
      toast.success(`${channel === 'email' ? 'Email' : channel === 'sms' ? 'SMS' : 'Звонок'} отправлен анонимно`);
      onClose();
      setShowConfirm(false);
      setRecipient('');
      setSubject('');
      setMessage('');
    } catch (error) {
      toast.error('Ошибка отправки');
    } finally {
      setIsSending(false);
    }
  };

  const channelIcons = {
    email: Mail,
    sms: MessageSquare,
    voice: Phone,
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Анонимная отправка
          </DialogTitle>
          <DialogDescription>
            Сообщение будет отправлено через MASK relay. Ваша личность скрыта.
          </DialogDescription>
        </DialogHeader>

        {/* Channel tabs */}
        <Tabs value={channel} onValueChange={(v) => onChannelChange(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Звонок
            </TabsTrigger>
          </TabsList>

          {/* Email content */}
          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Email получателя</Label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Тема</Label>
              <Input
                placeholder="Тема письма"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Сообщение</Label>
              <Textarea
                placeholder="Текст письма..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>
          </TabsContent>

          {/* SMS content */}
          <TabsContent value="sms" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Номер телефона</Label>
              <Input
                type="tel"
                placeholder="+7 999 123 45 67"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Сообщение (до 160 символов)</Label>
              <Textarea
                placeholder="Текст SMS..."
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 160))}
                rows={3}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/160
              </p>
            </div>
          </TabsContent>

          {/* Voice call content */}
          <TabsContent value="voice" className="space-y-4 mt-4">
            <Alert>
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>
                Звонок будет анонимным. Получатель увидит "Private Call" или номер MASK relay.
                Запись звонка отключена.
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label>Номер телефона</Label>
              <Input
                type="tel"
                placeholder="+7 999 123 45 67"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Confirmation alert */}
        {showConfirm && (
          <Alert className="border-primary/50 bg-primary/5">
            <Shield className="w-4 h-4 text-primary" />
            <AlertDescription>
              <strong>Подтверждение:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✓ Ваш номер/email скрыт</li>
                <li>✓ Получатель увидит relay@mask.app</li>
                <li>✓ Данные не сохраняются</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {showConfirm ? 'Подтвердить отправку' : 'Отправить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
