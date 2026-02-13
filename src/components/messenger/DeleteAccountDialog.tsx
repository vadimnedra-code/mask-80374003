import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export const DeleteAccountDialog = ({ isOpen, onClose, userEmail }: DeleteAccountDialogProps) => {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmText !== 'УДАЛИТЬ') {
      toast.error('Введите "УДАЛИТЬ" для подтверждения');
      return;
    }

    setIsDeleting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Вы не авторизованы');
        return;
      }

      const response = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast.success('Аккаунт успешно удалён');
      
      // Sign out and redirect
      await supabase.auth.signOut();
      navigate('/auth');
      
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Не удалось удалить аккаунт');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl font-display font-semibold">Удаление аккаунта</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3 pt-4">
            <p>
              Вы собираетесь <strong>навсегда удалить</strong> свой аккаунт{' '}
              <span className="font-medium text-foreground">{userEmail}</span>.
            </p>
            <p className="text-destructive font-medium">
              Это действие необратимо! Будут удалены:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Все ваши сообщения и чаты</li>
              <li>Профиль и настройки</li>
              <li>Контакты и история звонков</li>
              <li>Все связанные данные</li>
            </ul>
            <div className="pt-4">
              <p className="text-sm mb-2">
                Для подтверждения введите <strong>УДАЛИТЬ</strong>:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="УДАЛИТЬ"
                className="font-mono"
                disabled={isDeleting}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Отмена
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={confirmText !== 'УДАЛИТЬ' || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Удаление...
              </>
            ) : (
              'Удалить навсегда'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
