import { useState } from 'react';
import { Search, X, Forward, Loader2 } from 'lucide-react';
import { ChatWithDetails } from '@/hooks/useChats';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

interface ForwardMessageDialogProps {
  chats: ChatWithDetails[];
  onClose: () => void;
  onForward: (chatId: string) => Promise<void>;
  messagePreview: string;
}

export const ForwardMessageDialog = ({ 
  chats, 
  onClose, 
  onForward,
  messagePreview 
}: ForwardMessageDialogProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [forwarding, setForwarding] = useState<string | null>(null);
  const { user } = useAuth();

  const filteredChats = chats.filter((chat) => {
    const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
    const name = chat.is_group ? chat.group_name : otherParticipant?.display_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
  });

  const handleForward = async (chatId: string) => {
    setForwarding(chatId);
    try {
      await onForward(chatId);
      onClose();
    } finally {
      setForwarding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-3xl shadow-medium border border-border overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Forward className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Переслать сообщение</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="px-4 py-3 bg-muted/50 border-b border-border">
          <p className="text-sm text-muted-foreground truncate">
            {messagePreview || 'Медиафайл'}
          </p>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск чатов..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Chats list */}
        <div className="max-h-64 overflow-y-auto scrollbar-thin">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
            </div>
          ) : (
            filteredChats.map((chat) => {
              const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
              const displayName = chat.is_group ? chat.group_name : otherParticipant?.display_name;
              const avatarUrl = chat.is_group 
                ? (chat.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.group_name || 'Group'}`)
                : otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.user_id}`;
              const isForwarding = forwarding === chat.id;

              return (
                <button
                  key={chat.id}
                  onClick={() => handleForward(chat.id)}
                  disabled={forwarding !== null}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors',
                    forwarding !== null && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <Avatar
                    src={avatarUrl || ''}
                    alt={displayName || 'Chat'}
                    size="md"
                    status={otherParticipant?.status as 'online' | 'offline' | 'away'}
                  />
                  <div className="flex-1 text-left">
                    <p className="font-medium truncate">{displayName}</p>
                    {chat.lastMessage && (
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.lastMessage.content || 'Медиафайл'}
                      </p>
                    )}
                  </div>
                  {isForwarding && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Cancel button */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium bg-muted hover:bg-muted/80 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};
