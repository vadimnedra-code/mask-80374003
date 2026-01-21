import { useState } from 'react';
import { ArrowLeft, AlertTriangle, Send } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReportUser, ReportReason } from '@/hooks/useReportUser';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface ReportUserDialogProps {
  userId: string;
  userName: string;
  userAvatar?: string;
  onClose: () => void;
}

const REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'spam', label: 'Спам', description: 'Нежелательные рекламные сообщения' },
  { value: 'harassment', label: 'Оскорбления', description: 'Угрозы, оскорбления, травля' },
  { value: 'illegal', label: 'Незаконный контент', description: 'Противозаконные материалы' },
  { value: 'other', label: 'Другое', description: 'Другая причина' },
];

export const ReportUserDialog = ({ userId, userName, userAvatar, onClose }: ReportUserDialogProps) => {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const { reportUser, loading } = useReportUser();

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error('Выберите причину жалобы');
      return;
    }

    const { error } = await reportUser(userId, selectedReason, description);
    
    if (error) {
      toast.error('Не удалось отправить жалобу');
    } else {
      toast.success('Жалоба отправлена анонимно');
      onClose();
    }
  };

  return (
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
        className="bg-card rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-semibold">Пожаловаться</h2>
          </div>
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 p-4 bg-muted/50">
          <Avatar
            src={userAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
            alt={userName}
            size="md"
          />
          <div>
            <p className="font-medium">{userName}</p>
            <p className="text-sm text-muted-foreground">Жалоба будет анонимной</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[50vh]">
          <div>
            <p className="text-sm font-medium mb-3">Выберите причину</p>
            <RadioGroup
              value={selectedReason || ''}
              onValueChange={(value) => setSelectedReason(value as ReportReason)}
            >
              {REASONS.map((reason) => (
                <div
                  key={reason.value}
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedReason(reason.value)}
                >
                  <RadioGroupItem value={reason.value} id={reason.value} className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor={reason.value} className="font-medium cursor-pointer">
                      {reason.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{reason.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium">
              Дополнительная информация (необязательно)
            </Label>
            <Textarea
              id="description"
              placeholder="Опишите ситуацию подробнее..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 min-h-[100px] resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleSubmit}
            disabled={!selectedReason || loading}
            className="w-full"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Отправить жалобу
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Ваша личность не будет раскрыта
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
