import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, Image, Film, Mic, File, ArrowLeft, UserPlus, Users, MessageSquare } from 'lucide-react';
import { useMessageSearch, FilterType, SearchResult } from '@/hooks/useMessageSearch';
import { useUsers, PublicProfile } from '@/hooks/useUsers';
import { useChats } from '@/hooks/useChats';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface SearchPanelProps {
  onClose: () => void;
  onSelectMessage: (chatId: string, messageId: string) => void;
  onStartChat?: (chatId: string) => void;
}

// Highlight matching text
const HighlightText = ({ text, query }: { text: string; query: string }) => {
  if (!query.trim() || !text) return <>{text}</>;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-primary/30 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
};

const MessageTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'image':
      return <Image className="w-4 h-4 text-blue-500" />;
    case 'video':
      return <Film className="w-4 h-4 text-purple-500" />;
    case 'voice':
      return <Mic className="w-4 h-4 text-green-500" />;
    case 'file':
      return <File className="w-4 h-4 text-orange-500" />;
    default:
      return <FileText className="w-4 h-4 text-muted-foreground" />;
  }
};

const FilterButton = ({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
      active
        ? "bg-primary text-primary-foreground"
        : "bg-muted text-muted-foreground hover:bg-muted/80"
    )}
  >
    {children}
  </button>
);

type SearchTab = 'users' | 'messages';

export const SearchPanel = ({ onClose, onSelectMessage, onStartChat }: SearchPanelProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const [creatingChatWithUserId, setCreatingChatWithUserId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { results, loading, query, filter, search, setFilter, clearSearch } = useMessageSearch();
  const { searchUsers } = useUsers();
  const { chats, createChat } = useChats();

  // Get users that match search query (excluding current user)
  const existingChatUserIds = chats
    .filter(c => !c.is_group)
    .map(c => c.participants.find(p => p.user_id !== user?.id)?.user_id)
    .filter(Boolean) as string[];

  const filteredUsers = searchInput.trim() 
    ? searchUsers(searchInput).filter((u) => u.user_id !== user?.id)
    : [];

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search for messages
  useEffect(() => {
    if (activeTab !== 'messages') return;
    
    const timer = setTimeout(() => {
      if (searchInput.trim()) {
        search(searchInput, filter);
      } else {
        clearSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, filter, search, clearSearch, activeTab]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    if (searchInput.trim()) {
      search(searchInput, newFilter);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onSelectMessage(result.chat_id, result.id);
    onClose();
  };

  const handleUserClick = async (userId: string) => {
    if (creatingChatWithUserId) return;
    
    setCreatingChatWithUserId(userId);
    try {
      // Check if chat already exists
      const existingChat = chats.find(
        (c) => !c.is_group && c.participants.some((p) => p.user_id === userId)
      );
      if (existingChat) {
        onStartChat?.(existingChat.id);
        onClose();
        return;
      }
      // Create new chat
      const { data, error } = await createChat([userId]);
      if (error) {
        console.error('Error creating chat:', error);
        toast.error('Не удалось создать чат');
        return;
      }
      if (data) {
        onStartChat?.(data.id);
        toast.success('Чат создан');
        onClose();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Произошла ошибка');
    } finally {
      setCreatingChatWithUserId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            placeholder={activeTab === 'users' ? "Поиск пользователей..." : "Поиск сообщений..."}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-muted rounded-xl text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                clearSearch();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-background/50"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-3 border-b border-border overflow-x-auto">
        <FilterButton
          active={activeTab === 'users'}
          onClick={() => setActiveTab('users')}
        >
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Пользователи
          </span>
        </FilterButton>
        <FilterButton
          active={activeTab === 'messages'}
          onClick={() => setActiveTab('messages')}
        >
          <span className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Сообщения
          </span>
        </FilterButton>
      </div>

      {/* Message Filters (only show when messages tab is active) */}
      {activeTab === 'messages' && (
        <div className="flex items-center gap-2 p-3 border-b border-border overflow-x-auto">
          <FilterButton
            active={filter === 'all'}
            onClick={() => handleFilterChange('all')}
          >
            Все
          </FilterButton>
          <FilterButton
            active={filter === 'text'}
            onClick={() => handleFilterChange('text')}
          >
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Текст
            </span>
          </FilterButton>
          <FilterButton
            active={filter === 'media'}
            onClick={() => handleFilterChange('media')}
          >
            <span className="flex items-center gap-1.5">
              <Image className="w-3.5 h-3.5" />
              Медиа
            </span>
          </FilterButton>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        {activeTab === 'users' ? (
          // Users tab
          filteredUsers.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredUsers.map((u) => {
                const isCreating = creatingChatWithUserId === u.user_id;
                const hasExistingChat = existingChatUserIds.includes(u.user_id);
                return (
                  <button
                    key={u.user_id}
                    onClick={() => handleUserClick(u.user_id)}
                    disabled={creatingChatWithUserId !== null}
                    className={cn(
                      "w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-all duration-200 text-left",
                      creatingChatWithUserId !== null && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Avatar
                      src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.user_id}`}
                      alt={u.display_name}
                      size="lg"
                      status={u.status as 'online' | 'offline' | 'away'}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">
                        <HighlightText text={u.display_name} query={searchInput} />
                      </span>
                      {u.username && (
                        <p className="text-sm text-muted-foreground">
                          @<HighlightText text={u.username} query={searchInput} />
                        </p>
                      )}
                      {u.bio && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {u.bio}
                        </p>
                      )}
                    </div>
                    {isCreating ? (
                      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    ) : hasExistingChat ? (
                      <MessageSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <UserPlus className="w-5 h-5 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : searchInput.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Пользователь не найден
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Попробуйте изменить запрос
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Users className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Найдите пользователя
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Введите имя или @username
              </p>
            </div>
          )
        ) : (
          // Messages tab
          loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-border">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <MessageTypeIcon type={result.message_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">
                        {result.chat_name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(result.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {result.sender_name}
                    </p>
                    <p className="text-sm mt-1 line-clamp-2">
                      {result.message_type === 'text' ? (
                        <HighlightText text={result.content || ''} query={query} />
                      ) : (
                        <span className="text-muted-foreground italic">
                          {result.message_type === 'image' && '📷 Изображение'}
                          {result.message_type === 'video' && '🎥 Видео'}
                          {result.message_type === 'voice' && '🎤 Голосовое сообщение'}
                          {result.message_type === 'file' && '📎 Файл'}
                        </span>
                      )}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : searchInput.trim() ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Ничего не найдено по запросу "{searchInput}"
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Попробуйте изменить запрос или фильтр
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">
                Введите текст для поиска
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Поиск по всем сообщениям в ваших чатах
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};
