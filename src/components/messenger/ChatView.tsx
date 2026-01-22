import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Smile, 
  Mic, 
  Send, 
  ArrowLeft,
  Image,
  Camera,
  FileText
} from 'lucide-react';
import { Chat, Message } from '@/types/chat';
import { Avatar } from './Avatar';
import { MessageBubble } from './MessageBubble';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatViewProps {
  chat: Chat;
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
}

export const ChatView = ({ chat, onBack, onStartCall }: ChatViewProps) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);

  const otherParticipant = chat.participants.find((p) => p.id !== 'user-1')!;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const diffX = touchX - touchStartX.current;
    const diffY = touchY - touchStartY.current;

    // Determine swipe direction on first significant movement
    if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY);
    }

    // Only handle horizontal swipes from left edge (first 50px)
    if (!isHorizontalSwipe.current || touchStartX.current > 50) return;

    // Only allow swipe right (positive diffX)
    if (diffX > 0) {
      setSwipeOffset(Math.min(diffX * 0.5, 100));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (swipeOffset > 60) {
      onBack();
    }
    setSwipeOffset(0);
    isHorizontalSwipe.current = null;
  }, [swipeOffset, onBack]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'user-1',
      content: message,
      timestamp: new Date(),
      type: 'text',
      isRead: false,
    };

    setMessages([...messages, newMessage]);
    setMessage('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusText = () => {
    if (otherParticipant.status === 'online') {
      return 'в сети';
    }
    if (otherParticipant.lastSeen) {
      return `был(а) ${formatDistanceToNow(otherParticipant.lastSeen, { addSuffix: true, locale: ru })}`;
    }
    return 'не в сети';
  };

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-full bg-background transition-transform duration-150 ease-out md:transition-none"
      style={{ 
        transform: `translateX(${swipeOffset}px)`,
        opacity: 1 - (swipeOffset / 200)
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe indicator */}
      {swipeOffset > 0 && (
        <div 
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 transition-all"
          style={{ 
            opacity: Math.min(swipeOffset / 60, 1),
            transform: `translateX(${Math.min(swipeOffset / 2, 24)}px) translateY(-50%) scale(${0.5 + Math.min(swipeOffset / 120, 0.5)})`
          }}
        >
          <ArrowLeft className="w-5 h-5 text-primary" />
        </div>
      )}
      
      {/* Header - WhatsApp Style */}
      <div className="whatsapp-header flex items-center justify-between px-2 py-2 safe-area-top">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-primary/10 transition-colors active:scale-95 md:hidden tap-target flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-[hsl(var(--header-foreground))]" />
          </button>
          <Avatar
            src={otherParticipant.avatar}
            alt={otherParticipant.name}
            size="md"
            status={otherParticipant.status}
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-medium text-[15px] text-[hsl(var(--header-foreground))] truncate">{otherParticipant.name}</h2>
            <p className={cn(
              'text-xs truncate',
              otherParticipant.status === 'online' ? 'text-[hsl(var(--online))]' : 'text-[hsl(var(--header-foreground))]/70'
            )}>
              {getStatusText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button 
            onClick={() => onStartCall('video')}
            className="p-2 rounded-full hover:bg-primary/10 transition-colors active:scale-95 tap-target"
          >
            <Video className="w-5 h-5 text-[hsl(var(--header-foreground))]" />
          </button>
          <button 
            onClick={() => onStartCall('voice')}
            className="p-2 rounded-full hover:bg-primary/10 transition-colors active:scale-95 tap-target"
          >
            <Phone className="w-5 h-5 text-[hsl(var(--header-foreground))]" />
          </button>
          <button className="p-2 rounded-full hover:bg-primary/10 transition-colors active:scale-95 tap-target">
            <MoreVertical className="w-5 h-5 text-[hsl(var(--header-foreground))]" />
          </button>
        </div>
      </div>

      {/* Messages - WhatsApp Wallpaper */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scroll-smooth chat-wallpaper">
        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === 'user-1'}
            showAvatar={index === 0 || messages[index - 1]?.senderId !== msg.senderId}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - WhatsApp Style */}
      <div className="px-2 py-2 bg-background safe-area-bottom">
        <div className="flex items-end gap-2">
          <div className="flex-1 flex items-center gap-1 bg-card rounded-full px-3 py-1">
            <button className="p-1.5 hover:scale-110 transition-transform active:scale-95">
              <Smile className="w-5 h-5 text-muted-foreground" />
            </button>
            <input
              ref={inputRef}
              type="text"
              placeholder="Сообщение"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 py-2 bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
            />
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-1.5 hover:scale-110 transition-transform active:scale-95"
              >
                <Paperclip className="w-5 h-5 text-muted-foreground rotate-45" />
              </button>
              
              {/* Attachment Menu */}
              {showAttachMenu && (
                <div className="absolute bottom-full right-0 mb-2 p-2 bg-card rounded-2xl shadow-lg border border-border animate-scale-in z-10">
                  <div className="flex gap-1">
                    <button className="p-3 rounded-xl hover:bg-muted transition-colors active:scale-95 group tap-target">
                      <Image className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <button className="p-3 rounded-xl hover:bg-muted transition-colors active:scale-95 group tap-target">
                      <Camera className="w-5 h-5 text-pink-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <button className="p-3 rounded-xl hover:bg-muted transition-colors active:scale-95 group tap-target">
                      <FileText className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button className="p-1.5 hover:scale-110 transition-transform active:scale-95">
              <Camera className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <button
            onClick={message.trim() ? handleSendMessage : undefined}
            className="p-3 rounded-full bg-primary transition-all duration-200 flex-shrink-0 tap-target active:scale-95"
          >
            {message.trim() ? (
              <Send className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Mic className="w-5 h-5 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
