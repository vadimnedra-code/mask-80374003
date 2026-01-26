import { useState, useEffect } from 'react';
import { Mail, Send, Loader2, Shield } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { StudioArtifact } from '@/types/studio';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: StudioArtifact | null;
  pendingImageUrl?: string | null;
}

export const SendDialog = ({
  isOpen,
  onClose,
  artifact,
  pendingImageUrl,
}: SendDialogProps) => {
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Initialize message when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMessage(artifact?.text_content?.slice(0, 500) || '');
      setShowConfirm(false);
    }
  }, [isOpen, artifact]);

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
      const { data, error } = await supabase.functions.invoke('send-email-relay', {
        body: {
          to: recipient,
          subject: subject || 'Message via MASK',
          body: message,
          artifactId: artifact?.id,
          imageUrl: pendingImageUrl || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success('Email отправлен анонимно');
      
      onClose();
      setShowConfirm(false);
      setRecipient('');
      setSubject('');
      setMessage('');
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Ошибка отправки');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Анонимная отправка Email
          </DialogTitle>
          <DialogDescription>
            Сообщение будет отправлено через MASK relay. Ваша личность скрыта.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email получателя
            </Label>
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
        </div>

        {/* Confirmation alert */}
        {showConfirm && (
          <Alert className="border-primary/50 bg-primary/5">
            <Shield className="w-4 h-4 text-primary" />
            <AlertDescription>
              <strong>Подтверждение:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✓ Ваш email скрыт</li>
                <li>✓ Получатель увидит relay@mask.international</li>
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
