import { useState, useRef, useCallback, useMemo } from 'react';
import { Search, Settings, Edit, Menu, UserPlus, Trash2, Pin, PinOff, RefreshCw, Archive, VolumeX, Volume2, ArchiveRestore } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import maskLogo from '@/assets/mask-logo.png';
import { ChatWithDetails } from '@/hooks/useChats';
import { useUsers, PublicProfile } from '@/hooks/useUsers';
import { useContactNicknames } from '@/hooks/useContactNicknames';
import { Avatar } from './Avatar';
import { MaskSwitch } from './MaskSwitch';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useProfile } from '@/hooks/useProfile';
import { useChatsTypingStatus } from '@/hooks/useChatsTypingStatus';
import { useArchiveMute } from '@/hooks/useArchiveMute';
import { MuteDurationSelector, MutedBadge } from './MuteSelector';
import { toast } from 'sonner';

interface ChatListProps {
  chats: ChatWithDetails[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
  onOpenProfileEdit?: () => void;
  onNewChat: () => void;
  onOpenSearch?: () => void;
  onOpenAIChat?: () => void;
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
  onOpenProfileEdit,
  onNewChat,
  onOpenSearch,
  onOpenAIChat,
  onStartChatWithUser,
  onDeleteChat,
  onTogglePinChat,
  onRefresh,
  loading 
}: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'favorites' | 'groups' | 'archived'>('all');
  const [creatingChatWithUserId, setCreatingChatWithUserId] = useState<string | null>(null);
  const [swipedChatId, setSwipedChatId] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const [pinningChatId, setPinningChatId] = useState<string | null>(null);
  const [archivingChatId, setArchivingChatId] = useState<string | null>(null);
  const [muteDialogChatId, setMuteDialogChatId] = useState<string | null>(null);
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const { user } = useAuth();
  const { profile: currentUserProfile } = useProfile(user?.id);
  const { users, searchUsers } = useUsers();
  const { archiveChat, unarchiveChat, isChatMuted } = useArchiveMute();
  const { getDisplayName } = useContactNicknames();
  
  // Get typing status for all chats
  const chatIds = useMemo(() => chats.map(c => c.id), [chats]);
  const { getTypingText, typingByChatId } = useChatsTypingStatus(chatIds);

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

  // Find current user's participant record for each chat
  const getChatParticipant = useCallback((chat: ChatWithDetails) => {
    return chat.participants.find(p => p.user_id === user?.id);
  }, [user?.id]);

  const filteredChats = chats.filter((chat) => {
    const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
    const currentParticipant = getChatParticipant(chat);
    const name = chat.is_group ? chat.group_name : otherParticipant?.display_name;
    const matchesSearch = (name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false);
    const isArchived = !!currentParticipant?.archived_at;
    
    // Apply filter based on active tab
    if (activeFilter === 'archived') {
      return matchesSearch && isArchived;
    }
    
    // For non-archive tabs, exclude archived chats
    if (isArchived) return false;
    
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

  const handleArchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (archivingChatId) return;
    
    setArchivingChatId(chatId);
    try {
      const { error } = await archiveChat(chatId);
      if (error) {
        toast.error('Не удалось архивировать чат');
      } else {
        toast.success('Чат архивирован');
        setSwipedChatId(null);
        if (onRefresh) await onRefresh();
      }
    } finally {
      setArchivingChatId(null);
    }
  };

  const handleUnarchiveChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (archivingChatId) return;
    
    setArchivingChatId(chatId);
    try {
      const { error } = await unarchiveChat(chatId);
      if (error) {
        toast.error('Не удалось разархивировать чат');
      } else {
        toast.success('Чат разархивирован');
        setSwipedChatId(null);
        if (onRefresh) await onRefresh();
      }
    } finally {
      setArchivingChatId(null);
    }
  };

  const handleMuteChat = (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMuteDialogChatId(chatId);
    setSwipedChatId(null);
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
  
  // Get archived count for badge
  const archivedCount = chats.filter(chat => {
    const currentParticipant = getChatParticipant(chat);
    return !!currentParticipant?.archived_at;
  }).length;

  const currentUserAvatarUrl = currentUserProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`;
  const currentUserDisplayName = currentUserProfile?.display_name || 'Вы';

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background via-background to-background/95">
      {/* Header - Premium Gold Style */}
      <div className="relative flex items-center justify-between px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
        {/* Premium gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="relative w-10 h-10 bg-logo overflow-hidden shadow-lg shadow-primary/10">
            <img 
              src={maskLogo} 
              alt="Mask" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 ring-1 ring-primary/20" />
          </div>
          <div>
            <h1 className="text-[24px] font-bold tracking-tight leading-none">
              <span className="text-gold-gradient animate-shimmer bg-[length:200%_100%]">
                Mask
              </span>
            </h1>
            <p className="text-[11px] text-primary/60 font-medium tracking-wider uppercase mt-0.5">
              Premium Messenger
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0.5 relative z-10">
          <button 
            onClick={onNewChat}
            className="p-3 rounded-xl hover:bg-primary/10 transition-all duration-300 active:scale-95 group"
          >
            <Edit className="w-[22px] h-[22px] text-primary/80 group-hover:text-primary transition-colors" />
          </button>
          <button 
            onClick={onOpenAIChat}
            className="p-2 rounded-xl hover:bg-primary/10 transition-all duration-300 active:scale-95 group relative"
            aria-label="AI Assistant"
          >
            <img src={maskLogo} alt="AI" className="w-7 h-7 object-contain" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </button>
          <button 
            onClick={onOpenSettings}
            className="p-3 rounded-xl hover:bg-primary/10 transition-all duration-300 active:scale-95 group"
          >
            <Menu className="w-[22px] h-[22px] text-primary/80 group-hover:text-primary transition-colors" />
          </button>
        </div>
      </div>

      {/* Search - Premium Style */}
      <div className="px-3 py-3">
        <button
          onClick={onOpenSearch}
          className="w-full relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-3 px-4 py-3.5 bg-muted/60 rounded-2xl border border-primary/10 group-hover:border-primary/20 transition-all duration-300">
            <Search className="w-[18px] h-[18px] text-primary/50 group-hover:text-primary/70 transition-colors" />
            <span className="text-[15px] text-muted-foreground/70">Поиск или новый чат</span>
          </div>
        </button>
      </div>

      {/* Filter Tabs - Premium Style */}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-none">
        <button 
          onClick={() => setActiveFilter('all')}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300",
            activeFilter === 'all' 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
              : "text-foreground/70 hover:bg-primary/10 border border-primary/10"
          )}
        >
          Все
        </button>
        <button 
          onClick={() => setActiveFilter('unread')}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300",
            activeFilter === 'unread' 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
              : "text-foreground/70 hover:bg-primary/10 border border-primary/10"
          )}
        >
          Непрочитанное
        </button>
        <button 
          onClick={() => setActiveFilter('favorites')}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300",
            activeFilter === 'favorites' 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
              : "text-foreground/70 hover:bg-primary/10 border border-primary/10"
          )}
        >
          Избранное
        </button>
        <button 
          onClick={() => setActiveFilter('groups')}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300",
            activeFilter === 'groups' 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
              : "text-foreground/70 hover:bg-primary/10 border border-primary/10"
          )}
        >
          Группы
        </button>
        <button 
          onClick={() => setActiveFilter('archived')}
          className={cn(
            "px-4 py-2 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1.5",
            activeFilter === 'archived' 
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" 
              : "text-foreground/70 hover:bg-primary/10 border border-primary/10"
          )}
        >
          <Archive className="w-3.5 h-3.5" />
          Архив
          {archivedCount > 0 && activeFilter !== 'archived' && (
            <span className="min-w-4 h-4 px-1.5 flex items-center justify-center text-[10px] font-bold text-primary-foreground bg-primary rounded-full">
              {archivedCount}
            </span>
          )}
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
                    <div className="px-4 py-3 text-[11px] font-semibold text-primary/70 uppercase tracking-widest flex items-center gap-2">
                      <Pin className="w-3 h-3" />
                      Закреплённые
                      <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
                    </div>
                    {pinnedChats.map((chat) => renderChatItem(chat))}
                  </>
                )}
                
                {/* Regular chats section */}
                {unpinnedChats.length > 0 && pinnedChats.length > 0 && (
                  <div className="px-4 py-3 text-[11px] font-semibold text-primary/70 uppercase tracking-widest flex items-center gap-2">
                    Все чаты
                    <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
                  </div>
                )}
                {unpinnedChats.map((chat) => renderChatItem(chat))}
              </>
            )}
          </>
        )}
        </div>
      </div>

      {/* Current User Profile - Premium Bottom Section */}
      <div 
        onClick={onOpenProfileEdit || onOpenSettings}
        className="relative flex items-center gap-3.5 px-4 py-4 cursor-pointer group pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        {/* Premium background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          <Avatar
            src={currentUserAvatarUrl}
            alt={currentUserDisplayName}
            size="md"
            status="online"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-primary to-primary/70 rounded-full ring-2 ring-background" />
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <p className="font-semibold text-[15px] truncate text-foreground">{currentUserDisplayName}</p>
          {currentUserProfile?.username && (
            <p className="text-sm text-primary/60 truncate">@{currentUserProfile.username}</p>
          )}
        </div>
        <div className="relative z-10 p-2 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Settings className="w-5 h-5 text-primary/70 group-hover:text-primary transition-colors" />
        </div>
      </div>

      {/* Mute Duration Selector */}
      {muteDialogChatId && (
        <MuteDurationSelector
          chatId={muteDialogChatId}
          isOpen={!!muteDialogChatId}
          onClose={() => setMuteDialogChatId(null)}
          currentMutedUntil={
            chats.find(c => c.id === muteDialogChatId)?.participants.find(p => p.user_id === user?.id)?.muted_until || null
          }
        />
      )}
    </div>
  );
  
  function renderChatItem(chat: ChatWithDetails) {
    const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
    const currentParticipant = getChatParticipant(chat);
    const isSelected = chat.id === selectedChatId;
    const isSwiped = swipedChatId === chat.id;
    const isDeleting = deletingChatId === chat.id;
    const isPinning = pinningChatId === chat.id;
    const isArchiving = archivingChatId === chat.id;
    const isPinned = !!chat.pinned_at;
    const isArchived = !!currentParticipant?.archived_at;
    const isMuted = isChatMuted(currentParticipant?.muted_until || null);
    const originalName = chat.is_group ? chat.group_name : otherParticipant?.display_name;
    const displayName = chat.is_group 
      ? chat.group_name 
      : (otherParticipant ? getDisplayName(otherParticipant.user_id, otherParticipant.display_name) : originalName);
    const avatarUrl = chat.is_group 
      ? (chat.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.group_name || 'Group'}`)
      : otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.user_id}`;

    return (
      <div key={chat.id} className="relative overflow-hidden">
        {/* Action buttons background - different for archived view */}
        <div 
          className={cn(
            "absolute right-0 top-0 bottom-0 flex items-center transition-all duration-200",
            isSwiped ? (isArchived ? "w-32 opacity-100" : "w-48 opacity-100") : "w-0 opacity-0"
          )}
        >
          {isArchived ? (
            <>
              {/* Unarchive button */}
              <button
                onClick={(e) => handleUnarchiveChat(chat.id, e)}
                disabled={isArchiving}
                className="w-16 h-full flex items-center justify-center bg-primary text-primary-foreground"
              >
                {isArchiving ? (
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <ArchiveRestore className="w-5 h-5" />
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
            </>
          ) : (
            <>
              {/* Mute button */}
              <button
                onClick={(e) => handleMuteChat(chat.id, e)}
                className="w-12 h-full flex items-center justify-center bg-muted-foreground text-background"
              >
                {isMuted ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              {/* Archive button */}
              <button
                onClick={(e) => handleArchiveChat(chat.id, e)}
                disabled={isArchiving}
                className="w-12 h-full flex items-center justify-center bg-primary text-primary-foreground"
              >
                {isArchiving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Archive className="w-5 h-5" />
                )}
              </button>
              {/* Pin/Unpin button */}
              <button
                onClick={(e) => handleTogglePinChat(chat.id, e)}
                disabled={isPinning}
                className="w-12 h-full flex items-center justify-center bg-primary text-primary-foreground"
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
                className="w-12 h-full flex items-center justify-center bg-destructive text-destructive-foreground"
              >
                {isDeleting ? (
                  <div className="w-5 h-5 border-2 border-destructive-foreground/30 border-t-destructive-foreground rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            </>
          )}
        </div>
        
        {/* Chat item - Premium Style */}
        <button
          onClick={() => handleChatClick(chat.id)}
          onTouchStart={(e) => handleTouchStart(chat.id, e)}
          onTouchMove={(e) => handleTouchMove(chat.id, e)}
          onTouchEnd={handleTouchEnd}
          className={cn(
            'w-full flex items-center gap-3.5 px-4 py-3 transition-all duration-300 bg-background relative group',
            isSelected && 'bg-gradient-to-r from-primary/10 via-primary/5 to-transparent',
            !isSelected && 'hover:bg-primary/5',
            isSwiped && (isArchived ? '-translate-x-32' : '-translate-x-48')
          )}
        >
          {/* Bottom border with gradient */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
          
          {/* Selected indicator */}
          {isSelected && (
            <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-gradient-to-b from-primary to-primary/70 rounded-r-full" />
          )}
          
          <div className="relative flex-shrink-0">
            <div className={cn(
              "rounded-full transition-all duration-300",
              isSelected && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
            )}>
              <Avatar
                src={avatarUrl || ''}
                alt={displayName || 'Chat'}
                size="lg"
                status={otherParticipant?.status as 'online' | 'offline' | 'away'}
              />
            </div>
            {isPinned && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                <Pin className="w-2.5 h-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "font-semibold truncate text-[15px] transition-colors",
                  isSelected ? "text-foreground" : "text-foreground group-hover:text-foreground"
                )}>{displayName}</span>
                {isMuted && <MutedBadge mutedUntil={currentParticipant?.muted_until || null} />}
              </div>
              {chat.lastMessage && (
                <span className={cn(
                  "text-xs flex-shrink-0 transition-colors",
                  isSelected ? "text-primary/70" : "text-muted-foreground"
                )}>
                  {new Date(chat.lastMessage.created_at).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between mt-1 gap-2">
              <AnimatePresence mode="wait">
                {typingByChatId[chat.id]?.length > 0 ? (
                  <motion.div
                    key={`typing-${chat.id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm text-primary truncate flex-1 flex items-center gap-1.5"
                  >
                    <span className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-typing" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-typing" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-primary rounded-full animate-typing" style={{ animationDelay: '300ms' }} />
                    </span>
                    <span className="font-medium">{getTypingText(chat.id)}</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`message-${chat.id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="text-sm text-muted-foreground/80 truncate flex-1"
                  >
                    {chat.lastMessage?.sender_id === user?.id && (
                      <span className="text-primary mr-1">✓</span>
                    )}
                    {chat.lastMessage?.content || 'Нет сообщений'}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence mode="wait">
                {chat.unreadCount > 0 && (
                  <motion.span
                    key={`unread-${chat.id}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 500, 
                      damping: 30,
                      duration: 0.2 
                    }}
                    className="flex-shrink-0 min-w-6 h-6 px-2 flex items-center justify-center text-xs font-bold text-primary-foreground bg-gradient-to-r from-primary to-primary/80 rounded-full shadow-lg shadow-primary/30"
                  >
                    {chat.unreadCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </button>
      </div>
    );
  }
};
