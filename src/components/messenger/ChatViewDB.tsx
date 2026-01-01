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
  FileText,
  X,
  Loader2,
  Trash2,
  Reply,
  RefreshCw,
  Ban,
  CheckCircle
} from 'lucide-react';
import { ChatWithDetails, useChats } from '@/hooks/useChats';
import { Message, useMessages } from '@/hooks/useMessages';
import { Avatar } from './Avatar';
import { MessageBubble } from './MessageBubble';
import { SwipeableMessage } from './SwipeableMessage';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { EmojiPicker } from './EmojiPicker';
import { DateSeparator, shouldShowDateSeparator } from './DateSeparator';
import { PrivacyChip, getDefaultPrivacySettings } from './PrivacyChip';
import { MaskIndicator } from './MaskSwitch';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useBlockedUsers } from '@/hooks/useBlockedUsers';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useMessageReactions } from '@/hooks/useMessageReactions';
import { toast } from 'sonner';
import { useAudioRecorder, formatDuration } from '@/hooks/useAudioRecorder';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ChatViewDBProps {
  chat: ChatWithDetails;
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  highlightedMessageId?: string | null;
}

interface MessageToForward {
  content: string | null;
  type: 'text' | 'image' | 'video' | 'voice' | 'file';
  mediaUrl: string | null;
}

export const ChatViewDB = ({ chat, onBack, onStartCall, highlightedMessageId }: ChatViewDBProps) => {
  const [messageText, setMessageText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [messageToForward, setMessageToForward] = useState<MessageToForward | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number>(0);
  
  const { user } = useAuth();
  const { messages, loading, uploading, sendMessage, sendMediaMessage, sendVoiceMessage, markAsRead, editMessage, deleteMessage, refetch } = useMessages(chat.id);
  const { chats } = useChats();
  const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
  const { typingText, handleTypingStart, handleTypingStop } = useTypingIndicator(chat.id);
  const { fetchReactions, toggleReaction, getReactionGroups } = useMessageReactions(chat.id);

  const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
  const isOtherUserBlocked = otherParticipant ? isBlocked(otherParticipant.user_id) : false;

  const handleBlockUser = async () => {
    if (!otherParticipant) return;
    
    if (isOtherUserBlocked) {
      const { error } = await unblockUser(otherParticipant.user_id);
      if (error) {
        toast.error('Не удалось разблокировать пользователя');
      } else {
        toast.success('Пользователь разблокирован');
      }
    } else {
      const { error } = await blockUser(otherParticipant.user_id);
      if (error) {
        toast.error('Не удалось заблокировать пользователя');
      } else {
        toast.success('Пользователь заблокирован');
      }
    }
  };

  const handleForwardMessage = (msg: Message) => {
    setMessageToForward({
      content: msg.content,
      type: msg.message_type as 'text' | 'image' | 'video' | 'voice' | 'file',
      mediaUrl: msg.media_url,
    });
  };

  const handleForwardToChat = async (targetChatId: string) => {
    if (!messageToForward || !user) return;
    
    // Send message to target chat
    const { error } = await supabase.from('messages').insert({
      chat_id: targetChatId,
      sender_id: user.id,
      content: messageToForward.content ? `↪️ ${messageToForward.content}` : '↪️ Пересланное сообщение',
      message_type: messageToForward.type,
      media_url: messageToForward.mediaUrl,
    });
    
    if (error) {
      toast.error('Не удалось переслать сообщение');
    } else {
      toast.success('Сообщение переслано');
    }
    
    setMessageToForward(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    markAsRead();
    // Fetch reactions for visible messages
    if (messages.length > 0) {
      fetchReactions(messages.map(m => m.id));
    }
  }, [messages]);

  // Scroll to highlighted message
  useEffect(() => {
    if (highlightedMessageId) {
      const element = document.getElementById(`message-${highlightedMessageId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedMessageId]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Close attach menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showAttachMenu && attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

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

    handleTypingStop();
    await sendMessage(messageText.trim());
    setMessageText('');
    setReplyToMessage(null);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleStartRecording = async () => {
    try {
      await startRecording();
    } catch (error) {
      toast.error('Не удалось получить доступ к микрофону');
    }
  };

  const handleStopRecording = async () => {
    const audioBlob = await stopRecording();
    if (audioBlob && audioBlob.size > 0) {
      const { error } = await sendVoiceMessage(audioBlob, recordingDuration);
      if (error) {
        toast.error('Не удалось отправить голосовое сообщение');
      }
    }
  };

  const handleCancelRecording = () => {
    cancelRecording();
  };

  const handleReply = (msg: Message) => {
    setReplyToMessage(msg);
    inputRef.current?.focus();
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  // Pull to refresh handlers
  const handlePullStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const container = messagesContainerRef.current;
    if (container && container.scrollTop <= 0) {
      pullStartY.current = e.touches[0].clientY;
    }
  }, [isRefreshing]);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing || pullStartY.current === 0) return;
    const container = messagesContainerRef.current;
    if (!container || container.scrollTop > 0) {
      pullStartY.current = 0;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    
    if (diff > 0) {
      const distance = Math.min(diff * 0.5, 100);
      setPullDistance(distance);
    }
  }, [isRefreshing]);

  const handlePullEnd = useCallback(async () => {
    if (pullDistance >= 60 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(60);
      
      try {
        await refetch();
        toast.success('Обновлено');
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
    pullStartY.current = 0;
  }, [pullDistance, isRefreshing, refetch]);

  const getStatusText = () => {
    // Show typing indicator if someone is typing
    if (typingText) {
      return typingText;
    }
    
    if (chat.is_group) {
      const onlineCount = chat.participants.filter(p => p.status === 'online').length;
      const totalCount = chat.participants.length;
      if (onlineCount > 0) {
        return `${totalCount} участников, ${onlineCount} в сети`;
      }
      return `${totalCount} участников`;
    }
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
    ? (chat.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.group_name || 'Group'}`)
    : otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.user_id}`;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Forward Message Dialog */}
      {messageToForward && (
        <ForwardMessageDialog
          chats={chats.filter(c => c.id !== chat.id)}
          onClose={() => setMessageToForward(null)}
          onForward={handleForwardToChat}
          messagePreview={messageToForward.content || 'Медиафайл'}
        />
      )}
      
      {/* Header - WhatsApp Style */}
      <div className="whatsapp-header flex items-center gap-1 px-1 py-1.5 safe-area-top">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/10 transition-colors lg:hidden active:bg-white/20"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <Avatar
          src={avatarUrl || ''}
          alt={displayName || 'Chat'}
          size="md"
          status={otherParticipant?.status as 'online' | 'offline' | 'away'}
        />
        <div className="min-w-0 flex-1 ml-1">
          <h2 className="font-medium text-[16px] text-white truncate leading-tight">{displayName}</h2>
          <p className={cn(
            'text-[12px] truncate leading-tight',
            typingText 
              ? 'text-green-200 animate-pulse' 
              : !chat.is_group && otherParticipant?.status === 'online' 
                ? 'text-green-200' 
                : 'text-white/70'
          )}>
            {getStatusText()}
          </p>
        </div>
        <div className="flex items-center">
          <button 
            onClick={() => onStartCall('video')}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20"
            disabled={isOtherUserBlocked}
          >
            <Video className="w-[22px] h-[22px] text-white" />
          </button>
          <button 
            onClick={() => onStartCall('voice')}
            className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20"
            disabled={isOtherUserBlocked}
          >
            <Phone className="w-[22px] h-[22px] text-white" />
          </button>
          
          {/* Chat Menu */}
          {!chat.is_group && otherParticipant && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20">
                  <MoreVertical className="w-[22px] h-[22px] text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleBlockUser}>
                  {isOtherUserBlocked ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Разблокировать
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Заблокировать
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {chat.is_group && (
            <button className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20">
              <MoreVertical className="w-[22px] h-[22px] text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="flex items-center justify-center bg-muted/50 overflow-hidden transition-all"
          style={{ height: pullDistance }}
        >
          <div className={cn(
            'transition-all duration-200',
            pullDistance >= 60 ? 'scale-100 text-primary' : 'scale-75 text-muted-foreground'
          )}>
            <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
          </div>
        </div>
      )}

      {/* Messages - WhatsApp Wallpaper */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5 scrollbar-thin scroll-smooth chat-wallpaper"
        onTouchStart={handlePullStart}
        onTouchMove={handlePullMove}
        onTouchEnd={handlePullEnd}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Начните разговор
          </div>
        ) : (
          messages.map((msg, index) => {
            const currentDate = new Date(msg.created_at);
            const previousDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
            const showDateSeparator = shouldShowDateSeparator(currentDate, previousDate);

            return (
              <div key={msg.id}>
                {showDateSeparator && <DateSeparator date={currentDate} />}
                <div
                  id={`message-${msg.id}`}
                  className={cn(
                    'transition-all duration-500',
                    highlightedMessageId === msg.id && 'bg-primary/20 rounded-2xl -mx-2 px-2 py-1'
                  )}
                >
                  <SwipeableMessage 
                    isOwn={msg.sender_id === user?.id}
                    onSwipeReply={() => handleReply(msg)}
                  >
                    <MessageBubble
                      message={{
                        id: msg.id,
                        senderId: msg.sender_id,
                        content: msg.content || '',
                        timestamp: currentDate,
                        type: msg.message_type as 'text' | 'image' | 'video' | 'voice' | 'file',
                        mediaUrl: msg.media_url || undefined,
                        isRead: msg.is_read,
                        isDelivered: !msg.id.startsWith('temp-'),
                      }}
                      isOwn={msg.sender_id === user?.id}
                      onEdit={async (messageId, newContent) => {
                        await editMessage(messageId, newContent);
                      }}
                      onDelete={async (messageId) => {
                        await deleteMessage(messageId);
                      }}
                      onForward={() => handleForwardMessage(msg)}
                      reactions={getReactionGroups(msg.id)}
                      onReaction={(emoji) => toggleReaction(msg.id, emoji)}
                    />
                  </SwipeableMessage>
                </div>
              </div>
            );
          })
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

      {/* Voice Recording UI */}
      {isRecording && (
        <div className="p-3 bg-card border-t border-border">
          <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-2xl">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium">Запись голосового...</p>
              <p className="text-xs text-muted-foreground">{formatDuration(recordingDuration)}</p>
            </div>
            <button
              onClick={handleCancelRecording}
              className="p-2.5 rounded-full hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
            </button>
            <button
              onClick={handleStopRecording}
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

      {/* Input Area - WhatsApp Style */}
      {!selectedFile && !isRecording && (
        <div className="px-1.5 py-1.5 bg-[hsl(var(--chat-wallpaper))] safe-area-bottom">
          {/* Blocked user notice */}
          {isOtherUserBlocked && (
            <div className="flex items-center justify-center gap-2 py-3 text-muted-foreground">
              <Ban className="w-4 h-4" />
              <span className="text-sm">Пользователь заблокирован</span>
            </div>
          )}
          
          {!isOtherUserBlocked && (
            <>
          {/* Reply preview */}
          {replyToMessage && (
            <div className="flex items-center gap-2 mb-1.5 mx-1 p-2 bg-card rounded-lg animate-fade-in">
              <Reply className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
                <p className="text-xs text-primary font-medium">Ответ</p>
                <p className="text-sm text-muted-foreground truncate">
                  {replyToMessage.content || 'Медиафайл'}
                </p>
              </div>
              <button
                onClick={() => setReplyToMessage(null)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
          
          <div className="flex items-end gap-1.5">
            {/* Plus/Attachment button */}
            <div className="relative" ref={attachMenuRef}>
              <button
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="w-11 h-11 flex items-center justify-center rounded-full bg-card active:bg-muted transition-colors"
              >
                <Paperclip className="w-6 h-6 text-muted-foreground" />
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
                <div className="absolute bottom-full left-0 mb-2 p-2 bg-card rounded-2xl shadow-lg border border-border animate-scale-in z-50">
                  <div className="flex gap-1">
                    <button 
                      onClick={() => {
                        imageInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="p-3 rounded-xl hover:bg-muted transition-colors group tap-target"
                    >
                      <Image className="w-6 h-6 text-purple-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => {
                        imageInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="p-3 rounded-xl hover:bg-muted transition-colors group tap-target"
                    >
                      <Camera className="w-6 h-6 text-pink-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachMenu(false);
                      }}
                      className="p-3 rounded-xl hover:bg-muted transition-colors group tap-target"
                    >
                      <FileText className="w-6 h-6 text-blue-500 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main input area */}
            <div className="flex-1 flex items-center bg-card rounded-full px-1 min-h-[44px]">
              <div className="pl-2">
                <EmojiPicker 
                  onSelect={(emoji) => {
                    setMessageText(prev => prev + emoji);
                    inputRef.current?.focus();
                  }}
                  align="start"
                />
              </div>
              <input
                ref={inputRef}
                type="text"
                placeholder={replyToMessage ? 'Ответить...' : 'Введите сообщение'}
                value={messageText}
                onChange={(e) => {
                  setMessageText(e.target.value);
                  if (e.target.value.trim()) {
                    handleTypingStart();
                  }
                }}
                onKeyPress={handleKeyPress}
                onBlur={handleTypingStop}
                className="flex-1 py-2.5 px-2 bg-transparent text-[15px] placeholder:text-muted-foreground focus:outline-none"
              />
            </div>

            {/* Send/Mic button */}
            <button
              onClick={messageText.trim() ? handleSendMessage : handleStartRecording}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-primary transition-all duration-200 active:scale-95"
            >
              {messageText.trim() ? (
                <Send className="w-5 h-5 text-primary-foreground" />
              ) : (
                <Mic className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
          </div>
          </>
          )}
        </div>
      )}
    </div>
  );
};
