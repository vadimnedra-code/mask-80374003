import { useState, useCallback } from 'react';
import { X, Search, Hash, UserPlus, Loader2, ScanLine } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from './Avatar';
import { QRScannerDialog } from './QRScannerDialog';
import { useChats } from '@/hooks/useChats';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DiscoveredContact {
  phone_hash: string;
  user_id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
}

interface FindByPhoneDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FindByPhoneDialog = ({ isOpen, onClose }: FindByPhoneDialogProps) => {
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DiscoveredContact[]>([]);
  const [searched, setSearched] = useState(false);
  const { createChat } = useChats();
  const [starting, setStarting] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const handleQRScan = useCallback((value: string) => {
    setHash(value);
    setShowScanner(false);
    toast.success('QR-код отсканирован');
    // Auto-search after scan
    setTimeout(() => {
      const trimmed = value.trim();
      if (trimmed.length >= 8) {
        setLoading(true);
        setResults([]);
        setSearched(false);
        supabase.rpc('find_contacts_by_hash', { _hashes: [trimmed] })
          .then(({ data, error }) => {
            if (!error && data) setResults(data as DiscoveredContact[]);
            setLoading(false);
            setSearched(true);
          });
      }
    }, 100);
  }, []);

  if (!isOpen) return null;

  const handleSearch = async () => {
    const trimmed = hash.trim();
    if (trimmed.length < 8) {
      toast.error('Введите корректный хеш-код (минимум 8 символов)');
      return;
    }
    setLoading(true);
    setResults([]);
    setSearched(false);
    try {
      const { data, error } = await supabase.rpc('find_contacts_by_hash', {
        _hashes: [trimmed],
      });
      if (!error && data) {
        setResults(data as DiscoveredContact[]);
      }
    } finally {
      setLoading(false);
      setSearched(true);
    }
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
          <h1 className="text-lg font-semibold">Поиск по хеш-коду</h1>
          <p className="text-xs text-muted-foreground">Найти контакт по SHA-256 хешу</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              placeholder="Вставьте хеш-код контакта..."
              className="pl-9 font-mono text-xs"
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} size="default">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
          <Button onClick={() => setShowScanner(true)} variant="outline" size="default" title="Сканировать QR">
            <ScanLine className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Попросите контакт отправить вам свой хеш-код из профиля. Сервер никогда не видит настоящий номер телефона.
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

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Контакт не найден. Возможно, пользователь не зарегистрирован или не добавил номер.
          </div>
        )}
      </div>

      <QRScannerDialog
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleQRScan}
      />
    </div>
  );
};
