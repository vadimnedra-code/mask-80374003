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
  FileText,
  X,
  Loader2
} from 'lucide-react';
import { ChatWithDetails } from '@/hooks/useChats';
import { Message, useMessages } from '@/hooks/useMessages';
import { Avatar } from './Avatar';
import { MessageBubble } from './MessageBubble';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ChatViewDBProps {
  chat: ChatWithDetails;
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
}

export const ChatViewDB = ({ chat, onBack, onStartCall }: ChatViewDBProps) => {
  const [messageText, setMessageText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const { messages, loading, uploading, sendMessage, sendMediaMessage, markAsRead } = useMessages(chat.id);

  const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    markAsRead();
  }, [messages]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Файл слишком большой (максимум 10 МБ)');
      return;
    }

    setSelectedFile(file);
    setShowAttachMenu(false);

    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSendMedia = async () => {
    if (!selectedFile) return;

    const { error } = await sendMediaMessage(selectedFile);
    if (error) {
      toast.error('Не удалось отправить файл');
    }

    // Cleanup
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleCancelFile = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    await sendMessage(messageText.trim());
    setMessageText('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getStatusText = () => {
    if (otherParticipant?.status === 'online') {
      return 'в сети';
    }
    if (otherParticipant?.last_seen) {
      return `был(а) ${formatDistanceToNow(new Date(otherParticipant.last_seen), { addSuffix: true, locale: ru })}`;
    }
    return 'не в сети';
  };

  const displayName = chat.is_group ? chat.group_name : otherParticipant?.display_name;
  const avatarUrl = chat.is_group 
    ? chat.group_avatar 
    : otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.user_id}`;

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
            src={avatarUrl || ''}
            alt={displayName || 'Chat'}
            size="md"
            status={otherParticipant?.status as 'online' | 'offline' | 'away'}
          />
          <div>
            <h2 className="font-semibold">{displayName}</h2>
            {!chat.is_group && (
              <p className={cn(
                'text-xs',
                otherParticipant?.status === 'online' ? 'text-status-online' : 'text-muted-foreground'
              )}>
                {getStatusText()}
              </p>
            )}
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
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Начните разговор
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{
                id: msg.id,
                senderId: msg.sender_id,
                content: msg.content || '',
                timestamp: new Date(msg.created_at),
                type: msg.message_type as 'text' | 'image' | 'video' | 'voice' | 'file',
                mediaUrl: msg.media_url || undefined,
                isRead: msg.is_read,
              }}
              isOwn={msg.sender_id === user?.id}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Preview */}
      {selectedFile && (
        <div className="p-3 bg-card border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-8 h-8 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} КБ
              </p>
            </div>
            <button
              onClick={handleCancelFile}
              className="p-2 rounded-full hover:bg-background transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={handleSendMedia}
              disabled={uploading}
              className="p-3 rounded-full gradient-primary shadow-glow hover:scale-105 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!selectedFile && (
        <div className="p-3 bg-card border-t border-border">
          <div className="flex items-end gap-2">
            <div className="relative">
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="p-2.5 rounded-full hover:bg-muted transition-colors"
              >
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </button>
              
              {/* Hidden file inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'image')}
              />
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFileSelect(e, 'file')}
              />
              
              {/* Attachment Menu */}
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-card rounded-2xl shadow-medium border border-border animate-scale-in">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      className="p-3 rounded-xl hover:bg-muted transition-colors group"
                    >
                      <Image className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => imageInputRef.current?.click()}
                      className="p-3 rounded-xl hover:bg-muted transition-colors group"
                    >
                      <Camera className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 rounded-xl hover:bg-muted transition-colors group"
                    >
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
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 bg-muted rounded-2xl text-[15px] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:scale-110 transition-transform">
                <Smile className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <button
              onClick={messageText.trim() ? handleSendMessage : undefined}
              className={cn(
                'p-3 rounded-full transition-all duration-200',
                messageText.trim()
                  ? 'gradient-primary shadow-glow hover:scale-105'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {messageText.trim() ? (
                <Send className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Mic className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
