import { useState, useRef } from 'react';
import { Search, Settings, Edit, Menu, UserPlus, Trash2, Pin, PinOff } from 'lucide-react';
import { ChatWithDetails } from '@/hooks/useChats';
import { useUsers, PublicProfile } from '@/hooks/useUsers';
import { Avatar } from './Avatar';
import { MaskSwitch } from './MaskSwitch';
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
  onOpenSearch?: () => void;
  onStartChatWithUser?: (userId: string) => Promise<void>;
  onDeleteChat?: (chatId: string) => Promise<void>;
  onTogglePinChat?: (chatId: string) => Promise<void>;
  loading?: boolean;
}

export const ChatList = ({ 
  chats, 
  selectedChatId, 
  onSelectChat, 
  onOpenSettings,
  onNewChat,
  onOpenSearch,
  onStartChatWithUser,
  onDeleteChat,
  onTogglePinChat,
  loading 
}: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingChatWithUserId, setCreatingChatWithUserId] = useState<string | null>(null);
  const [swipedChatId, setSwipedChatId] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [pinningChatId, setPinningChatId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const { user } = useAuth();
  const { users, searchUsers } = useUsers();

  const filteredChats = chats.filter((chat) => {
    const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
    const name = chat.is_group ? chat.group_name : otherParticipant?.display_name;
    return (name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false);
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

  const handleTouchStart = (chatId: string, e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (chatId: string, e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    
    if (diff > 50) {
      setSwipedChatId(chatId);
    } else if (diff < -30) {
      setSwipedChatId(null);
    }
  };

  const handleTouchEnd = () => {
    // Keep the swiped state if it was set
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onDeleteChat || deletingChatId) return;
    
    setDeletingChatId(chatId);
    try {
      await onDeleteChat(chatId);
      setSwipedChatId(null);
    } finally {
      setDeletingChatId(null);
    }
  };

  const handleTogglePinChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onTogglePinChat || pinningChatId) return;
    
    setPinningChatId(chatId);
    try {
      await onTogglePinChat(chatId);
      setSwipedChatId(null);
    } finally {
      setPinningChatId(null);
    }
  };

  const handleChatClick = (chatId: string) => {
    if (swipedChatId === chatId) {
      setSwipedChatId(null);
    } else {
      onSelectChat(chatId);
    }
  };

  // Separate pinned and unpinned chats
  const pinnedChats = filteredChats.filter(c => c.pinned_at);
  const unpinnedChats = filteredChats.filter(c => !c.pinned_at);

  return (
    <div className="flex flex-col h-full layer-elevated">
      {/* Header - Lucid Layers */}
      <div className="flex items-center justify-between p-4 border-b border-border pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            MAsk
          </h1>
          <MaskSwitch />
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
        <button
          onClick={onOpenSearch}
          className="w-full relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <div className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-xl text-sm text-muted-foreground text-left cursor-pointer hover:bg-muted/80 transition-colors">
            Поиск...
          </div>
        </button>
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
              <>
                {/* Pinned chats section */}
                {pinnedChats.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Pin className="w-3 h-3" />
                      Закреплённые
                    </div>
                    {pinnedChats.map((chat) => renderChatItem(chat))}
                  </>
                )}
                
                {/* Regular chats section */}
                {unpinnedChats.length > 0 && pinnedChats.length > 0 && (
                  <div className="px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Все чаты
                  </div>
                )}
                {unpinnedChats.map((chat) => renderChatItem(chat))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
  
  function renderChatItem(chat: ChatWithDetails) {
    const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
    const isSelected = chat.id === selectedChatId;
    const isSwiped = swipedChatId === chat.id;
    const isDeleting = deletingChatId === chat.id;
    const isPinning = pinningChatId === chat.id;
    const isPinned = !!chat.pinned_at;
    const displayName = chat.is_group ? chat.group_name : otherParticipant?.display_name;
    const avatarUrl = chat.is_group 
      ? (chat.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.group_name || 'Group'}`)
      : otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.user_id}`;

    return (
      <div key={chat.id} className="relative overflow-hidden">
        {/* Action buttons background */}
        <div 
          className={cn(
            "absolute right-0 top-0 bottom-0 flex items-center transition-all duration-200",
            isSwiped ? "w-32 opacity-100" : "w-0 opacity-0"
          )}
        >
          {/* Pin/Unpin button */}
          <button
            onClick={(e) => handleTogglePinChat(chat.id, e)}
            disabled={isPinning}
            className="w-16 h-full flex items-center justify-center bg-primary text-primary-foreground"
          >
            {isPinning ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : isPinned ? (
              <PinOff className="w-5 h-5" />
            ) : (
              <Pin className="w-5 h-5" />
            )}
          </button>
          {/* Delete button */}
          <button
            onClick={(e) => handleDeleteChat(chat.id, e)}
            disabled={isDeleting}
            className="w-16 h-full flex items-center justify-center bg-destructive text-destructive-foreground"
          >
            {isDeleting ? (
              <div className="w-5 h-5 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Chat item */}
        <button
          onClick={() => handleChatClick(chat.id)}
          onTouchStart={(e) => handleTouchStart(chat.id, e)}
          onTouchMove={(e) => handleTouchMove(chat.id, e)}
          onTouchEnd={handleTouchEnd}
          className={cn(
            'w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-all duration-200 bg-card relative',
            isSelected && 'bg-accent',
            isSwiped && '-translate-x-32'
          )}
        >
          <div className="relative">
            <Avatar
              src={avatarUrl || ''}
              alt={displayName || 'Chat'}
              size="lg"
              status={otherParticipant?.status as 'online' | 'offline' | 'away'}
            />
            {isPinned && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <Pin className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
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
      </div>
    );
  }
};
