import { useState } from 'react';
import { Search, Settings, Edit, Menu, UserPlus } from 'lucide-react';
import { ChatWithDetails } from '@/hooks/useChats';
import { useUsers, PublicProfile } from '@/hooks/useUsers';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';

interface ChatListProps {
  chats: ChatWithDetails[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onNewChat: () => void;
  onStartChatWithUser?: (userId: string) => Promise<void>;
  loading?: boolean;
}

export const ChatList = ({ 
  chats, 
  selectedChatId, 
  onSelectChat, 
  onOpenSettings,
  onNewChat,
  onStartChatWithUser,
  loading 
}: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingChatWithUserId, setCreatingChatWithUserId] = useState<string | null>(null);
  const { user } = useAuth();
  const { users, searchUsers } = useUsers();

  const filteredChats = chats.filter((chat) => {
    const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
    const name = chat.is_group ? chat.group_name : otherParticipant?.display_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get users that match search query (excluding current user and users already in chats)
  const existingChatUserIds = chats
    .filter(c => !c.is_group)
    .map(c => c.participants.find(p => p.user_id !== user?.id)?.user_id)
    .filter(Boolean) as string[];

  const filteredUsers = searchQuery.trim() 
    ? searchUsers(searchQuery).filter(
        (u) => u.user_id !== user?.id && !existingChatUserIds.includes(u.user_id)
      )
    : [];

  const handleUserClick = async (userId: string) => {
    if (creatingChatWithUserId || !onStartChatWithUser) return;
    
    setCreatingChatWithUserId(userId);
    try {
      await onStartChatWithUser(userId);
      setSearchQuery('');
    } finally {
      setCreatingChatWithUserId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-muted transition-colors lg:hidden">
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Mask
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onOpenSettings}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
          <button 
            onClick={onNewChat}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Edit className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Users section (when searching) */}
            {filteredUsers.length > 0 && (
              <div>
                <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Пользователи
                </div>
                {filteredUsers.map((u) => {
                  const isCreating = creatingChatWithUserId === u.user_id;
                  return (
                    <button
                      key={u.user_id}
                      onClick={() => handleUserClick(u.user_id)}
                      disabled={creatingChatWithUserId !== null}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-all duration-200",
                        creatingChatWithUserId !== null && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Avatar
                        src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.user_id}`}
                        alt={u.display_name}
                        size="lg"
                        status={u.status as 'online' | 'offline' | 'away'}
                      />
                      <div className="flex-1 min-w-0 text-left">
                        <span className="font-medium truncate">{u.display_name}</span>
                        {u.username && (
                          <p className="text-sm text-muted-foreground">@{u.username}</p>
                        )}
                      </div>
                      {isCreating ? (
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Chats section */}
            {searchQuery.trim() && filteredChats.length > 0 && filteredUsers.length > 0 && (
              <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Чаты
              </div>
            )}
            
            {filteredChats.length === 0 && filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-muted-foreground">
                  {searchQuery ? 'Ничего не найдено' : 'Нет чатов'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={onNewChat}
                    className="mt-3 text-primary font-medium hover:underline"
                  >
                    Начать новый чат
                  </button>
                )}
              </div>
            ) : (
              filteredChats.map((chat) => {
                const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
                const isSelected = chat.id === selectedChatId;
                const displayName = chat.is_group ? chat.group_name : otherParticipant?.display_name;
                const avatarUrl = chat.is_group 
                  ? chat.group_avatar 
                  : otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.user_id}`;

                return (
                  <button
                    key={chat.id}
                    onClick={() => onSelectChat(chat.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-all duration-200',
                      isSelected && 'bg-accent'
                    )}
                  >
                    <Avatar
                      src={avatarUrl || ''}
                      alt={displayName || 'Chat'}
                      size="lg"
                      status={otherParticipant?.status as 'online' | 'offline' | 'away'}
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{displayName}</span>
                        {chat.lastMessage && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(chat.lastMessage.created_at), { 
                              addSuffix: false, 
                              locale: ru 
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-sm text-muted-foreground truncate pr-2">
                          {chat.lastMessage?.content || 'Нет сообщений'}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-medium text-primary-foreground bg-primary rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};
