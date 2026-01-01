import { useState, useRef, useCallback } from 'react';
import { Search, Settings, Edit, Menu, UserPlus, Trash2, Pin, PinOff, RefreshCw } from 'lucide-react';
import { ChatWithDetails } from '@/hooks/useChats';
import { useUsers, PublicProfile } from '@/hooks/useUsers';
import { Avatar } from './Avatar';
import { MaskSwitch } from './MaskSwitch';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

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
  onRefresh?: () => Promise<void>;
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
  onRefresh,
  loading 
}: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites' | 'groups'>('all');
  const [creatingChatWithUserId, setCreatingChatWithUserId] = useState<string | null>(null);
  const [swipedChatId, setSwipedChatId] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [pinningChatId, setPinningChatId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const { user } = useAuth();
  const { users, searchUsers } = useUsers();

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
    }
  }, [onRefresh]);

  const { pullDistance, isPulling, isRefreshing, canRefresh, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 60,
    maxPull: 100,
  });

  const filteredChats = chats.filter((chat) => {
    const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
    const name = chat.is_group ? chat.group_name : otherParticipant?.display_name;
    const matchesSearch = (name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false);
    
    // Apply filter based on active tab
    if (activeFilter === 'unread') {
      return matchesSearch && chat.unreadCount > 0;
    }
    if (activeFilter === 'favorites') {
      return matchesSearch && !!chat.pinned_at;
    }
    if (activeFilter === 'groups') {
      return matchesSearch && chat.is_group;
    }
    return matchesSearch;
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
    <div className="flex flex-col h-full bg-background">
      {/* Header - WhatsApp Style */}
      <div className="whatsapp-header flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-[22px] font-bold text-white tracking-tight">
          Mask
        </h1>
        <div className="flex items-center gap-1">
          <button 
            onClick={onNewChat}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20"
          >
            <Edit className="w-[22px] h-[22px] text-white" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20"
          >
            <Menu className="w-[22px] h-[22px] text-white" />
          </button>
        </div>
      </div>

      {/* Search - WhatsApp Style */}
      <div className="px-2.5 py-2 bg-background">
        <button
          onClick={onOpenSearch}
          className="w-full relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-muted-foreground" />
          <div className="w-full pl-10 pr-4 py-2.5 bg-muted rounded-lg text-[15px] text-muted-foreground text-left cursor-pointer hover:bg-muted/80 transition-colors">
            Поиск или новый чат
          </div>
        </button>
      </div>

      {/* Filter Tabs - WhatsApp Style */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-background overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveFilter('all')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
            activeFilter === 'all' 
              ? "bg-primary/15 text-primary" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Все
        </button>
        <button 
          onClick={() => setActiveFilter('unread')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
            activeFilter === 'unread' 
              ? "bg-primary/15 text-primary" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Непрочитанное
        </button>
        <button 
          onClick={() => setActiveFilter('favorites')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
            activeFilter === 'favorites' 
              ? "bg-primary/15 text-primary" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Избранное
        </button>
        <button 
          onClick={() => setActiveFilter('groups')}
          className={cn(
            "px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors",
            activeFilter === 'groups' 
              ? "bg-primary/15 text-primary" 
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          Группы
        </button>
      </div>

      {/* Chat List */}
      <div 
        className="flex-1 overflow-y-auto scrollbar-thin relative"
        {...pullHandlers}
      >
        {/* Pull to refresh indicator */}
        <div 
          className={cn(
            "absolute left-0 right-0 flex items-center justify-center transition-all duration-200 overflow-hidden",
            pullDistance > 0 ? "opacity-100" : "opacity-0"
          )}
          style={{ 
            height: pullDistance,
            top: 0,
          }}
        >
          <div 
            className={cn(
              "flex items-center gap-2 text-sm transition-all",
              canRefresh ? "text-primary" : "text-muted-foreground"
            )}
          >
            <RefreshCw 
              className={cn(
                "w-5 h-5 transition-transform",
                isRefreshing && "animate-spin",
                canRefresh && !isRefreshing && "rotate-180"
              )} 
            />
            <span>
              {isRefreshing ? "Обновление..." : canRefresh ? "Отпустите для обновления" : "Потяните для обновления"}
            </span>
          </div>
        </div>

        <div style={{ transform: `translateY(${pullDistance}px)`, transition: isPulling ? 'none' : 'transform 0.2s ease-out' }}>
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
            'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-all duration-200 bg-background relative border-b border-border/30',
            isSelected && 'bg-muted/50',
            isSwiped && '-translate-x-32'
          )}
        >
          <div className="relative flex-shrink-0">
            <Avatar
              src={avatarUrl || ''}
              alt={displayName || 'Chat'}
              size="lg"
              status={otherParticipant?.status as 'online' | 'offline' | 'away'}
            />
            {isPinned && (
              <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                <Pin className="w-2 h-2 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate text-[15px]">{displayName}</span>
              {chat.lastMessage && (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(chat.lastMessage.created_at).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-0.5 gap-2">
              <p className="text-sm text-muted-foreground truncate flex-1">
                {chat.lastMessage?.sender_id === user?.id && (
                  <span className="text-primary mr-1">✓</span>
                )}
                {chat.lastMessage?.content || 'Нет сообщений'}
              </p>
              {chat.unreadCount > 0 && (
                <span className="flex-shrink-0 min-w-5 h-5 px-1.5 flex items-center justify-center text-xs font-medium text-primary-foreground bg-primary rounded-full">
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
