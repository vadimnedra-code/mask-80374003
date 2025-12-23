import { useState } from 'react';
import { Search, Settings, Edit, Menu } from 'lucide-react';
import { Chat } from '@/types/chat';
import { Avatar } from './Avatar';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
  onOpenSettings: () => void;
}

export const ChatList = ({ chats, selectedChatId, onSelectChat, onOpenSettings }: ChatListProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChats = chats.filter((chat) => {
    const otherParticipant = chat.participants.find((p) => p.id !== 'user-1');
    return otherParticipant?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

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
          <button className="p-2 rounded-full hover:bg-muted transition-colors">
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
        {filteredChats.map((chat) => {
          const otherParticipant = chat.participants.find((p) => p.id !== 'user-1')!;
          const isSelected = chat.id === selectedChatId;

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
                src={otherParticipant.avatar}
                alt={otherParticipant.name}
                size="lg"
                status={otherParticipant.status}
              />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium truncate">{otherParticipant.name}</span>
                  {chat.lastMessage && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(chat.lastMessage.timestamp, { 
                        addSuffix: false, 
                        locale: ru 
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-sm text-muted-foreground truncate pr-2">
                    {chat.lastMessage?.content}
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
        })}
      </div>
    </div>
  );
};
