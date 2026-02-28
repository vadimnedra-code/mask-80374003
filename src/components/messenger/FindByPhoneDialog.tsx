import { useState } from 'react';
import { X, Search, Phone, UserPlus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from './Avatar';
import { useContactDiscovery } from '@/hooks/useContactDiscovery';
import { useChats } from '@/hooks/useChats';
import { toast } from 'sonner';

interface FindByPhoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FindByPhoneDialog = ({ isOpen, onClose }: FindByPhoneDialogProps) => {
  const [phone, setPhone] = useState('');
  const { loading, results, findByPhone } = useContactDiscovery();
  const { createChat } = useChats();
  const [starting, setStarting] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (phone.trim().length < 5) {
      toast.error('Введите корректный номер телефона');
      return;
    }
    await findByPhone(phone.trim());
  };

  const handleStartChat = async (userId: string) => {
    setStarting(userId);
    try {
      await createChat([userId]);
      toast.success('Чат создан!');
      onClose();
    } catch {
      toast.error('Не удалось создать чат');
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background animate-slide-in-right lg:relative lg:animate-none">
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card">
        <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Поиск по номеру</h1>
          <p className="text-xs text-muted-foreground">Найти контакт по хешу телефона</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 999 123 45 67"
              className="pl-9"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} size="default">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Номер хешируется (SHA-256) на вашем устройстве — сервер никогда не видит настоящий номер.
        </p>

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Найденные контакты:</p>
            {results.map((contact) => (
              <div
                key={contact.user_id}
                className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={contact.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${contact.user_id}`}
                    alt={contact.display_name}
                    size="md"
                  />
                  <div>
                    <p className="font-medium text-sm">{contact.display_name}</p>
                    {contact.username && (
                      <p className="text-xs text-muted-foreground">@{contact.username}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStartChat(contact.user_id)}
                  disabled={starting === contact.user_id}
                >
                  {starting === contact.user_id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {!loading && results.length === 0 && phone.length > 4 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Контакт не найден. Возможно, пользователь не зарегистрирован или не добавил номер.
          </div>
        )}
      </div>
    </div>
  );
};
