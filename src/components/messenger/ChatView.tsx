import { useState, useRef, useEffect } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const otherParticipant = chat.participants.find((p) => p.id !== 'user-1')!;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border shadow-soft">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Avatar
            src={otherParticipant.avatar}
            alt={otherParticipant.name}
            size="md"
            status={otherParticipant.status}
          />
          <div>
            <h2 className="font-semibold">{otherParticipant.name}</h2>
            <p className={cn(
              'text-xs',
              otherParticipant.status === 'online' ? 'text-status-online' : 'text-muted-foreground'
            )}>
              {getStatusText()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => onStartCall('voice')}
            className="p-2.5 rounded-full hover:bg-muted transition-colors"
          >
            <Phone className="w-5 h-5 text-muted-foreground" />
          </button>
          <button 
            onClick={() => onStartCall('video')}
            className="p-2.5 rounded-full hover:bg-muted transition-colors"
          >
            <Video className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="p-2.5 rounded-full hover:bg-muted transition-colors">
            <MoreVertical className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin bg-gradient-to-b from-background to-muted/20">
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

      {/* Input Area */}
      <div className="p-3 bg-card border-t border-border">
        <div className="flex items-end gap-2">
          <div className="relative">
            <button
              onClick={() => setShowAttachMenu(!showAttachMenu)}
              className="p-2.5 rounded-full hover:bg-muted transition-colors"
            >
              <Paperclip className="w-5 h-5 text-muted-foreground" />
            </button>
            
            {/* Attachment Menu */}
            {showAttachMenu && (
              <div className="absolute bottom-full left-0 mb-2 p-2 bg-card rounded-2xl shadow-medium border border-border animate-scale-in">
                <div className="flex gap-1">
                  <button className="p-3 rounded-xl hover:bg-muted transition-colors group">
                    <Image className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  </button>
                  <button className="p-3 rounded-xl hover:bg-muted transition-colors group">
                    <Camera className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  </button>
                  <button className="p-3 rounded-xl hover:bg-muted transition-colors group">
                    <FileText className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              placeholder="Сообщение..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full px-4 py-3 bg-muted rounded-2xl text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:scale-110 transition-transform">
              <Smile className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <button
            onClick={message.trim() ? handleSendMessage : undefined}
            className={cn(
              'p-3 rounded-full transition-all duration-200',
              message.trim()
                ? 'gradient-primary shadow-glow hover:scale-105'
                : 'bg-muted hover:bg-muted/80'
            )}
          >
            {message.trim() ? (
              <Send className="w-5 h-5 text-primary-foreground" />
            ) : (
              <Mic className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
