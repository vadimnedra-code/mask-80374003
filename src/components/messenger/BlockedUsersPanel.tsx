import { useState } from 'react';
import { X, Trash2, User, Clock, AlertTriangle } from 'lucide-react';
import { Avatar } from './Avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface BlockedUser {
  id: string;
  blocked_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
}

interface BlockedUsersPanelProps {
  onClose: () => void;
}

export const BlockedUsersPanel = ({ onClose }: BlockedUsersPanelProps) => {
  const { user } = useAuth();
  const { blockedUsers, unblockUser, refetch } = useBlockedUsers();
  const [blockedUsersList, setBlockedUsersList] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  // Fetch blocked users with their profiles
  useState(() => {
    const fetchBlockedUsers = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('blocked_users')
        .select('id, blocked_id, created_at')
        .eq('blocker_id', user.id);

      if (error) {
        console.error('Error fetching blocked users:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const blockedIds = data.map(b => b.blocked_id);
        
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('user_id, display_name, avatar_url')
          .in('user_id', blockedIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        
        const blockedWithProfiles = data.map(b => ({
          id: b.id,
          blocked_id: b.blocked_id,
          display_name: profilesMap.get(b.blocked_id)?.display_name || 'Неизвестный',
          avatar_url: profilesMap.get(b.blocked_id)?.avatar_url || null,
          created_at: b.created_at,
        }));

        setBlockedUsersList(blockedWithProfiles);
      }
      setLoading(false);
    };

    fetchBlockedUsers();
  });

  const handleUnblock = async (blockedId: string) => {
    setUnblocking(blockedId);
    const { error } = await unblockUser(blockedId);
    
    if (error) {
      toast.error('Не удалось разблокировать');
    } else {
      setBlockedUsersList(prev => prev.filter(b => b.blocked_id !== blockedId));
      toast.success('Пользователь разблокирован');
    }
    setUnblocking(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">Заблокированные</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : blockedUsersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              Нет заблокированных пользователей
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            <p className="text-xs text-muted-foreground px-2 mb-3">
              Заблокированные пользователи не могут писать вам и видеть ваш статус онлайн
            </p>
            
            {blockedUsersList.map((blocked) => (
              <div
                key={blocked.id}
                className="flex items-center gap-3 p-3 bg-card rounded-xl border border-border"
              >
                <Avatar
                  src={blocked.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${blocked.blocked_id}`}
                  alt={blocked.display_name}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{blocked.display_name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Заблокирован {formatDistanceToNow(new Date(blocked.created_at), { addSuffix: true, locale: ru })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(blocked.blocked_id)}
                  disabled={unblocking === blocked.blocked_id}
                >
                  {unblocking === blocked.blocked_id ? (
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : (
                    'Разблокировать'
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
