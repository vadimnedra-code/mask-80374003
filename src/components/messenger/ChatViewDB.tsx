import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Paperclip, 
  Mic, 
  Send, 
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Image,
  Camera,
  FileText,
  X,
  Loader2,
  Trash2,
  Reply,
  RefreshCw,
  Ban,
  CheckCircle,
  MessageSquareX,
  ChevronLeft,
  Users,
  Timer,
  UserPen,
  UserPlus,
  Leaf,
  WifiOff
} from 'lucide-react';
import { useEnergySavingContext } from '@/hooks/useEnergySaving';
import maskLogo from '@/assets/mask-logo.png';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChatWithDetails } from '@/hooks/useChats';
import { Message } from '@/hooks/useMessages';
import { useEncryptedMessages } from '@/hooks/useEncryptedMessages';
import { useSavedMessages } from '@/hooks/useSavedMessages';
import { useDeleteForEveryone } from '@/hooks/useDeleteForEveryone';
import { useDisappearingMessages } from '@/hooks/useDisappearingMessages';
import { useContactNicknames } from '@/hooks/useContactNicknames';
import { Avatar } from './Avatar';
import { MessageBubble } from './MessageBubble';
import { SwipeableMessage } from './SwipeableMessage';
import { ForwardMessageDialog } from './ForwardMessageDialog';
import { EmojiPicker } from './EmojiPicker';
import { DateSeparator, shouldShowDateSeparator } from './DateSeparator';
import { E2EEIndicator } from './E2EEIndicator';
import { StartGroupCallDialog } from './StartGroupCallDialog';
import { DisappearingMessagesIndicator, DisappearingMessagesSelector } from './DisappearingMessagesSelector';
import { EditNicknameDialog } from './EditNicknameDialog';
import { AddToChatDialog } from './AddToChatDialog';
import { MediaItem } from './MediaGalleryLightbox';
import { AIActionsMenu } from '@/components/ai/AIActionsMenu';
import { CommandAutocomplete, useCommandAutocomplete, ChatCommand } from './CommandAutocomplete';
import { SendDialog } from '@/components/studio/SendDialog';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useWallpaper } from '@/hooks/useWallpaper';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChatViewDBProps {
  chat: ChatWithDetails;
  chats: ChatWithDetails[];
  onBack: () => void;
  onStartCall: (type: 'voice' | 'video') => void;
  onStartGroupCall?: (participantIds: string[], callType: 'voice' | 'video') => void;
  highlightedMessageId?: string | null;
  onOpenAIChat?: () => void;
}

interface MessageToForward {
  content: string | null;
  type: 'text' | 'image' | 'video' | 'voice' | 'file';
  mediaUrl: string | null;
}

export const ChatViewDB = ({ chat, chats, onBack, onStartCall, onStartGroupCall, highlightedMessageId, onOpenAIChat }: ChatViewDBProps) => {
  const [messageText, setMessageText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [messageToForward, setMessageToForward] = useState<MessageToForward | null>(null);
  const [showClearHistoryDialog, setShowClearHistoryDialog] = useState(false);
  const [isClearingHistory, setIsClearingHistory] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [showGroupCallDialog, setShowGroupCallDialog] = useState(false);
  const [showDisappearingSelector, setShowDisappearingSelector] = useState(false);
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [showAIActions, setShowAIActions] = useState(false);
  const [aiActionType, setAiActionType] = useState<'summarise' | 'extract_tasks' | 'draft_reply' | 'translate' | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showAddToChatDialog, setShowAddToChatDialog] = useState(false);
  const prevMessagesLengthRef = useRef(0);
  const prevFirstMessageIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);
  
  const isMobile = useIsMobile();
  const { isEnergySavingEnabled } = useEnergySavingContext();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef<number>(0);
  
  const { selectedIndex, setSelectedIndex, handleKeyDown: handleCommandKeyDown, getFilteredCommands } = useCommandAutocomplete();
  
  const { user } = useAuth();
  const otherParticipant = chat.participants.find((p) => p.user_id !== user?.id);
  
  // Use encrypted messages hook with E2EE support
  const { 
    messages, 
    loading, 
    uploading, 
    loadingMore,
    hasMore,
    loadMoreMessages,
    sendMessage, 
    sendMediaMessage, 
    sendVoiceMessage, 
    markAsRead, 
    editMessage, 
    deleteMessage, 
    refetch,
    isE2EEEnabled,
    recipientHasE2EE,
    getDisplayContent,
    isOnline,
    pendingCount,
  } = useEncryptedMessages(chat.id, {
    recipientId: otherParticipant?.user_id,
    enableE2EE: !chat.is_group // E2EE only for direct chats
  });
  
  const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } = useAudioRecorder();
  const { currentWallpaper } = useWallpaper();
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
  const { typingText, handleTypingStart, handleTypingStop } = useTypingIndicator(chat.id);
  const { fetchReactions, toggleReaction, getReactionGroups } = useMessageReactions(chat.id);
  
  // Phase 1 hooks
  const { saveMessage, unsaveMessage, isMessageSaved } = useSavedMessages();
  const { canDeleteForEveryone, deleteForEveryone, getRemainingTime } = useDeleteForEveryone();
  const { policy: disappearPolicy, isEnabled: isDisappearEnabled, getTimerLabel, setDisappearTimer } = useDisappearingMessages(chat.id);
  const { getNickname, setNickname, getDisplayName } = useContactNicknames();

  // Build list of all media items in chat for gallery navigation
  const allMediaItems: MediaItem[] = useMemo(() => {
    return messages
      .filter(msg => 
        (msg.message_type === 'image' || msg.message_type === 'video') && 
        msg.media_url
      )
      .map(msg => ({
        id: msg.id,
        url: msg.media_url!,
        type: msg.message_type as 'image' | 'video',
      }));
  }, [messages]);

  // Swipe right to go back (mobile only) - only from left edge
  const { offsetX, isSwiping, handlers: swipeHandlers } = useSwipeGesture({
    threshold: 60,
    maxSwipe: 120,
    edgeWidth: 25, // Only trigger from leftmost 25px
    onSwipeRight: onBack,
  });

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

  const handleClearHistory = async () => {
    setIsClearingHistory(true);
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('chat_id', chat.id);

      if (error) {
        toast.error('Не удалось очистить историю');
      } else {
        toast.success('История чата очищена');
        refetch();
      }
    } finally {
      setIsClearingHistory(false);
      setShowClearHistoryDialog(false);
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

  const scrollToBottomSmooth = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setNewMessagesCount(0);
  }, []);

  const scrollToBottomInstant = useCallback(() => {
    // Important: don't fight with user's manual scrolling
    // (smooth scrolling here can cause visible "jerks" in long chats)
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    setNewMessagesCount(0);
  }, []);

  // Check if scrolled to bottom or top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const threshold = 100;
    const isBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    const isTop = container.scrollTop < threshold;

    // Keep an up-to-date ref to avoid stale state in effects
    isAtBottomRef.current = isBottom;
    
    setIsAtBottom(isBottom);
    setIsAtTop(isTop);
    
    if (isBottom) {
      setNewMessagesCount(0);
    }

    // Load more messages when scrolled near top
    if (container.scrollTop < 200 && hasMore && !loadingMore) {
      loadMoreMessages();
    }
  }, [hasMore, loadingMore, loadMoreMessages]);

  const scrollToTop = useCallback(() => {
    messagesStartRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const prevLen = prevMessagesLengthRef.current;
    const prevFirstId = prevFirstMessageIdRef.current;
    const didAppend = messages.length > prevLen;
    const firstId = messages[0]?.id ?? null;
    const wasPrepend = didAppend && prevFirstId && firstId !== prevFirstId;

    const lastMessage = messages[messages.length - 1];
    const isOwnNewMessage = didAppend && !wasPrepend && lastMessage?.sender_id === user?.id;

    const container = messagesContainerRef.current;
    const threshold = 100;
    const atBottomNow = container
      ? container.scrollHeight - container.scrollTop - container.clientHeight < threshold
      : isAtBottomRef.current;

    isAtBottomRef.current = atBottomNow;

    if (wasPrepend && container) {
      // Preserve scroll position after prepending older messages
      // The browser will shift scroll automatically since content was added above
      // No action needed — the scroll offset stays correct relative to old content
    } else if (didAppend) {
      if (atBottomNow || isOwnNewMessage) {
        scrollToBottomInstant();
      } else {
        const newCount = messages.length - prevLen;
        setNewMessagesCount(prev => prev + newCount);
      }
    }

    prevMessagesLengthRef.current = messages.length;
    prevFirstMessageIdRef.current = firstId;
    markAsRead();
    
    if (messages.length > 0) {
      fetchReactions(messages.map(m => m.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, user?.id, scrollToBottomInstant]);

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

  const handleCommandSelect = useCallback((command: ChatCommand) => {
    setMessageText('');
    setSelectedIndex(0);
    
    switch (command.action) {
      case 'ai':
        onOpenAIChat?.();
        break;
      case 'translate':
        setAiActionType('translate');
        setShowAIActions(true);
        break;
      case 'summarise':
        setAiActionType('summarise');
        setShowAIActions(true);
        break;
      case 'tasks':
        setAiActionType('extract_tasks');
        setShowAIActions(true);
        break;
      case 'draft':
        setAiActionType('draft_reply');
        setShowAIActions(true);
        break;
      case 'email':
        setShowEmailDialog(true);
        break;
    }
  }, [onOpenAIChat, setSelectedIndex]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle command autocomplete keys first
    const handled = handleCommandKeyDown(e, messageText, handleCommandSelect);
    if (handled) return;
    
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

  // Pull to refresh handlers - more strict to avoid interfering with normal scrolling
  const handlePullStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const container = messagesContainerRef.current;
    // Only start pull if already at the very top (scrollTop === 0)
    if (container && container.scrollTop === 0) {
      pullStartY.current = e.touches[0].clientY;
    } else {
      pullStartY.current = 0;
    }
  }, [isRefreshing]);

  const handlePullMove = useCallback((e: React.TouchEvent) => {
    // Don't interfere if we're not in pull mode
    if (isRefreshing || pullStartY.current === 0) return;
    
    const container = messagesContainerRef.current;
    // If container has scrolled down at all, cancel pull mode
    if (!container || container.scrollTop > 0) {
      pullStartY.current = 0;
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartY.current;
    
    // Only activate pull if pulling down (positive diff) and beyond a minimum threshold
    if (diff > 20) {
      // Use a dampening factor to make pull feel natural
      const distance = Math.min((diff - 20) * 0.4, 100);
      setPullDistance(distance);
      
      // Prevent default only when actually pulling to refresh
      // Use a higher threshold to avoid breaking normal scrolling/overscroll.
      if (distance > 15 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      // If pulling up or minimal movement, cancel pull mode
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const handlePullEnd = useCallback(async () => {
    // Only trigger refresh if pulled far enough
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

  // Get display name with custom nickname support
  const originalDisplayName = chat.is_group ? chat.group_name : otherParticipant?.display_name;
  const displayName = chat.is_group 
    ? chat.group_name 
    : (otherParticipant ? getDisplayName(otherParticipant.user_id, otherParticipant.display_name) : originalDisplayName);
  const currentNickname = otherParticipant ? getNickname(otherParticipant.user_id) : null;
  
  const avatarUrl = chat.is_group 
    ? (chat.group_avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.group_name || 'Group'}`)
    : otherParticipant?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherParticipant?.user_id}`;

  const handleSaveNickname = async (nickname: string) => {
    if (!otherParticipant) return { error: new Error('No participant') };
    const result = await setNickname(otherParticipant.user_id, nickname);
    if (!result.error) {
      toast.success(nickname ? 'Имя контакта изменено' : 'Имя контакта сброшено');
    }
    return result;
  };

  return (
    <div 
      className="flex flex-col h-full bg-background relative overflow-hidden"
      {...swipeHandlers}
    >
      {/* Swipe back indicator */}
      <AnimatePresence>
        {offsetX > 10 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute left-0 top-0 bottom-0 z-50 flex items-center pointer-events-none lg:hidden"
            style={{ 
              width: Math.max(0, offsetX),
              background: `linear-gradient(to right, hsl(var(--primary) / ${Math.min(offsetX / 120, 0.25)}), transparent)`
            }}
          >
            <div 
              className={cn(
                "ml-2 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center transition-transform",
                offsetX > 60 ? "scale-110" : "scale-100"
              )}
            >
              <ChevronLeft className={cn(
                "w-6 h-6 text-primary transition-all",
                offsetX > 60 ? "scale-110" : "scale-100"
              )} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Forward Message Dialog */}
      {messageToForward && (
        <ForwardMessageDialog
          chats={chats.filter(c => c.id !== chat.id)}
          onClose={() => setMessageToForward(null)}
          onForward={handleForwardToChat}
          messagePreview={messageToForward.content || 'Медиафайл'}
        />
      )}

      {/* Clear History Confirmation Dialog */}
      <AlertDialog open={showClearHistoryDialog} onOpenChange={setShowClearHistoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить историю чата?</AlertDialogTitle>
            <AlertDialogDescription>
              Все сообщения в этом чате будут удалены безвозвратно. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearingHistory}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleClearHistory}
              disabled={isClearingHistory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearingHistory ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Очистить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Group Call Dialog */}
      {chat.is_group && onStartGroupCall && (
        <StartGroupCallDialog
          isOpen={showGroupCallDialog}
          onClose={() => setShowGroupCallDialog(false)}
          chatId={chat.id}
          chatParticipants={chat.participants}
          onStartCall={(participantIds, callType) => {
            onStartGroupCall(participantIds, callType);
            setShowGroupCallDialog(false);
          }}
        />
      )}

      {/* Add to Chat Dialog */}
      <AddToChatDialog
        isOpen={showAddToChatDialog}
        onClose={() => setShowAddToChatDialog(false)}
        chatId={chat.id}
        isGroup={chat.is_group}
        currentParticipantIds={chat.participants.map(p => p.user_id)}
        chatName={chat.is_group ? chat.group_name || undefined : undefined}
      />
      
      {/* Header - Premium Style */}
      <div className="whatsapp-header flex items-center gap-1 sm:gap-2 px-1 sm:px-3 py-1.5 sm:py-2 safe-area-top">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-amber-500/10 transition-all duration-200 lg:hidden active:scale-95 active:bg-amber-500/20"
        >
          <ArrowLeft className="w-6 h-6 text-amber-100" />
        </button>
        <Avatar
          src={avatarUrl || ''}
          alt={displayName || 'Chat'}
          size={isMobile ? "md" : "lg"}
          status={otherParticipant?.status as 'online' | 'offline' | 'away'}
        />
        <button 
          className="min-w-0 flex-1 ml-1 sm:ml-2 text-left hover:bg-amber-500/5 rounded-lg py-1 px-1.5 -ml-0.5 transition-all duration-200"
          onClick={() => !chat.is_group && setShowNicknameDialog(true)}
        >
          <div className="flex items-center gap-1.5">
            <h2 className="font-medium text-[15px] sm:text-[17px] text-amber-50 truncate leading-tight">{displayName}</h2>
            {currentNickname && !chat.is_group && (
              <span className="text-[11px] text-amber-200/40 truncate hidden sm:inline">
                ({otherParticipant?.display_name})
              </span>
            )}
            {!chat.is_group && (
              <E2EEIndicator
                isEnabled={isE2EEEnabled} 
                recipientHasE2EE={recipientHasE2EE} 
              />
            )}
            {/* Disappearing Messages Indicator */}
            <DisappearingMessagesIndicator chatId={chat.id} />
            {/* Energy Saving Indicator */}
            {isEnergySavingEnabled && (
              <div 
                className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300"
                title="Режим энергосбережения активен"
              >
                <Leaf className="w-3 h-3" />
              </div>
            )}
          </div>
          <p className={cn(
            'text-[11px] sm:text-[13px] truncate leading-tight',
            typingText 
              ? 'text-amber-300 animate-pulse' 
              : !chat.is_group && otherParticipant?.status === 'online' 
                ? 'text-emerald-300' 
                : 'text-amber-100/50'
          )}>
            {getStatusText()}
          </p>
        </button>
        <div className="flex items-center">
          {/* AI Actions Button */}
          <button 
            onClick={() => setShowAIActions(true)}
            className="p-1.5 sm:p-2 rounded-full hover:bg-primary/10 transition-all duration-200 active:scale-95 active:bg-primary/20 relative"
            title="AI Действия"
          >
            <img src={maskLogo} alt="AI" className="w-6 h-6 sm:w-7 sm:h-7 object-contain" />
          </button>
          
          {/* Call buttons - different for 1:1 and group chats */}
          {!chat.is_group ? (
            <>
              <button 
                onClick={() => onStartCall('video')}
                className="p-2 sm:p-2.5 rounded-full hover:bg-amber-500/10 transition-all duration-200 active:scale-95 active:bg-amber-500/20"
                disabled={isOtherUserBlocked}
                title="Видеозвонок"
              >
                <Video className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-amber-100" />
              </button>
              <button 
                onClick={() => onStartCall('voice')}
                className="p-2 sm:p-2.5 rounded-full hover:bg-amber-500/10 transition-all duration-200 active:scale-95 active:bg-amber-500/20"
                disabled={isOtherUserBlocked}
                title="Голосовой звонок"
              >
                <Phone className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-amber-100" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowGroupCallDialog(true)}
              className="p-2 sm:p-2.5 rounded-full hover:bg-amber-500/10 transition-all duration-200 active:scale-95 active:bg-amber-500/20"
              title="Групповой звонок"
            >
              <Users className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-amber-100" />
            </button>
          )}
          
          {/* Chat Menu */}
          {!chat.is_group && otherParticipant && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 sm:p-2.5 rounded-full hover:bg-amber-500/10 transition-all duration-200 active:scale-95 active:bg-amber-500/20">
                  <MoreVertical className="w-5 h-5 sm:w-[22px] sm:h-[22px] text-amber-100" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Edit Nickname option */}
                <DropdownMenuItem onClick={() => setShowNicknameDialog(true)}>
                  <UserPen className="w-4 h-4 mr-2" />
                  {currentNickname ? 'Изменить имя' : 'Задать имя'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddToChatDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Добавить в группу
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Disappearing Messages option */}
                <DropdownMenuItem onClick={() => setShowDisappearingSelector(true)}>
                  <Timer className="w-4 h-4 mr-2" />
                  Исчезающие сообщения
                  {isDisappearEnabled && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {getTimerLabel(disappearPolicy?.ttl_seconds ?? null)}
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowClearHistoryDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <MessageSquareX className="w-4 h-4 mr-2" />
                  Очистить историю
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          
          {chat.is_group && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2.5 rounded-full hover:bg-white/10 transition-colors active:bg-white/20">
                  <MoreVertical className="w-[22px] h-[22px] text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {/* Add participants to group */}
                <DropdownMenuItem onClick={() => setShowAddToChatDialog(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Добавить участников
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Disappearing Messages option for groups */}
                <DropdownMenuItem onClick={() => setShowDisappearingSelector(true)}>
                  <Timer className="w-4 h-4 mr-2" />
                  Исчезающие сообщения
                  {isDisappearEnabled && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {getTimerLabel(disappearPolicy?.ttl_seconds ?? null)}
                    </span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowClearHistoryDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <MessageSquareX className="w-4 h-4 mr-2" />
                  Очистить историю
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Disappearing Messages Selector */}
      <DisappearingMessagesSelector
        chatId={chat.id}
        isOpen={showDisappearingSelector}
        onClose={() => setShowDisappearingSelector(false)}
      />

      {/* Edit Nickname Dialog */}
      {!chat.is_group && otherParticipant && (
        <EditNicknameDialog
          isOpen={showNicknameDialog}
          onClose={() => setShowNicknameDialog(false)}
          currentNickname={currentNickname}
          originalName={otherParticipant.display_name}
          onSave={handleSaveNickname}
        />
      )}

      {/* AI Actions Menu */}
      <AIActionsMenu
        isOpen={showAIActions}
        onClose={() => {
          setShowAIActions(false);
          setAiActionType(null);
        }}
        chatContent={messages
          .slice(-50) // Last 50 messages for context
          .map(m => `${m.sender_id === user?.id ? 'Я' : displayName}: ${getDisplayContent(m)}`)
          .join('\n')
        }
        onInsertDraft={(text) => setMessageText(text)}
        initialAction={aiActionType}
      />

      {/* Email Relay Dialog */}
      <SendDialog
        isOpen={showEmailDialog}
        onClose={() => setShowEmailDialog(false)}
        artifact={null}
      />

      {/* Messages container */}
      <div className="relative flex-1 min-h-0">
        {/* Pull to Refresh Indicator (fixed position overlay) */}
        <AnimatePresence>
          {(pullDistance > 0 || isRefreshing) && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute left-1/2 top-2 z-20 -translate-x-1/2"
            >
              <div className={cn(
                'flex items-center justify-center h-10 w-10 rounded-full bg-card shadow-lg border border-border transition-all duration-200',
                pullDistance >= 60 ? 'scale-100 text-primary' : 'scale-90 text-muted-foreground'
              )}>
                <RefreshCw className={cn('w-5 h-5', isRefreshing && 'animate-spin')} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages - No transform to avoid scroll issues */}
        <div 
          ref={messagesContainerRef}
          className={cn(
            // NOTE: avoid `position: absolute` here — on some mobile WebViews it can
            // break native scrolling inside flex containers.
            "h-full min-h-0 overflow-y-auto py-2 space-y-[2px] scrollbar-thin touch-action-pan-y",
            currentWallpaper.id === 'default' && 'chat-wallpaper'
          )}
          style={{
            background: currentWallpaper.id !== 'default' ? currentWallpaper.value : undefined,
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
          onTouchStart={handlePullStart}
          onTouchMove={handlePullMove}
          onTouchEnd={handlePullEnd}
          onScroll={handleScroll}
        >
        {/* Offline banner */}
        {!isOnline && (
          <div className="sticky top-0 z-10 flex items-center justify-center gap-2 py-1.5 px-3 bg-destructive/10 border-b border-destructive/20 text-destructive text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            Нет подключения{pendingCount > 0 && ` • ${pendingCount} в очереди`}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col gap-3 p-4 animate-fade-in">
            {/* Loading skeleton messages */}
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "flex",
                  i % 3 === 0 ? "justify-start" : "justify-end"
                )}
              >
                <div 
                  className={cn(
                    "rounded-2xl p-3 space-y-2 animate-pulse",
                    i % 3 === 0 
                      ? "bg-card/80 rounded-tl-md" 
                      : "bg-primary/20 rounded-tr-md"
                  )}
                  style={{ 
                    width: `${Math.random() * 30 + 40}%`,
                    animationDelay: `${i * 100}ms`
                  }}
                >
                  <div className="h-3 bg-muted-foreground/20 rounded-full" style={{ width: '100%' }} />
                  {i % 2 === 0 && (
                    <div className="h-3 bg-muted-foreground/20 rounded-full" style={{ width: '70%' }} />
                  )}
                  <div className="flex justify-end">
                    <div className="h-2 w-10 bg-muted-foreground/10 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-center pt-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <span className="ml-2 text-sm text-muted-foreground">Загрузка сообщений...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Начните разговор
          </div>
        ) : (
          <>
            {loadingMore && (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="ml-2 text-xs text-muted-foreground">Загрузка...</span>
              </div>
            )}
            {!hasMore && messages.length >= 50 && (
              <div className="text-center py-2 text-xs text-muted-foreground">
                Начало беседы
              </div>
            )}
            <div ref={messagesStartRef} />
            {messages.map((msg, index) => {
            const currentDate = new Date(msg.created_at);
            const previousDate = index > 0 ? new Date(messages[index - 1].created_at) : null;
            const showDateSeparator = shouldShowDateSeparator(currentDate, previousDate);

            return (
              <div 
                key={msg.id}
                className="animate-fade-in"
                style={{ 
                  animationDelay: index >= messages.length - 3 ? `${(index - (messages.length - 3)) * 50}ms` : '0ms',
                  animationFillMode: 'backwards'
                }}
              >
                {showDateSeparator && <DateSeparator date={currentDate} />}
                <div
                  id={`message-${msg.id}`}
                  className={cn(
                    'transition-all duration-300',
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
                        content: getDisplayContent(msg),
                        timestamp: currentDate,
                        type: msg.message_type as 'text' | 'image' | 'video' | 'voice' | 'file',
                        mediaUrl: msg.media_url || undefined,
                        isRead: msg.is_read,
                        isDelivered: msg.is_delivered,
                        isEncrypted: msg.is_encrypted,
                      }}
                      isOwn={msg.sender_id === user?.id}
                      allMedia={allMediaItems}
                      onEdit={async (messageId, newContent) => {
                        await editMessage(messageId, newContent);
                      }}
                      onDelete={async (messageId) => {
                        await deleteMessage(messageId);
                      }}
                      onDeleteForEveryone={async (messageId) => {
                        const { error } = await deleteForEveryone(messageId);
                        if (error) {
                          toast.error('Не удалось удалить для всех');
                        } else {
                          toast.success('Сообщение удалено для всех');
                          refetch();
                        }
                      }}
                      onForward={() => handleForwardMessage(msg)}
                      onSave={async (messageId) => {
                        const { error } = await saveMessage(messageId, chat.id);
                        if (error) {
                          toast.error('Не удалось добавить в избранное');
                        } else {
                          toast.success('Добавлено в избранное');
                        }
                      }}
                      onUnsave={async (messageId) => {
                        const { error } = await unsaveMessage(messageId);
                        if (error) {
                          toast.error('Не удалось убрать из избранного');
                        } else {
                          toast.success('Убрано из избранного');
                        }
                      }}
                      isSaved={isMessageSaved(msg.id)}
                      canDeleteForEveryone={canDeleteForEveryone(msg.created_at, msg.sender_id)}
                      deleteForEveryoneTimeLeft={getRemainingTime(msg.created_at)}
                      reactions={getReactionGroups(msg.id)}
                      onReaction={(emoji) => toggleReaction(msg.id, emoji)}
                    />
                  </SwipeableMessage>
                </div>
              </div>
            );
          })}
          </>
        )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* New Messages Indicator */}
      <AnimatePresence>
        {newMessagesCount > 0 && !isAtBottom && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={scrollToBottomSmooth}
            className="absolute bottom-24 right-4 z-10 flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ArrowDown className="w-4 h-4" />
            <span className="text-sm font-medium">
              {newMessagesCount} {newMessagesCount === 1 ? 'новое' : newMessagesCount < 5 ? 'новых' : 'новых'}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scroll to Bottom Button (when scrolled up without new messages) */}
      <AnimatePresence>
        {!isAtBottom && newMessagesCount === 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={scrollToBottomSmooth}
            className="absolute bottom-24 right-4 z-10 p-3 bg-card text-foreground rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Scroll to Top Button (when scrolled down) */}
      <AnimatePresence>
        {!isAtTop && messages.length > 10 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={scrollToTop}
            className="absolute bottom-24 left-4 z-10 p-3 bg-card text-foreground rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

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

            {/* Main input area with command autocomplete */}
            <div className="flex-1 flex items-center bg-card rounded-full px-1 min-h-[44px] relative">
              {/* Command Autocomplete */}
              <CommandAutocomplete
                inputValue={messageText}
                onSelectCommand={handleCommandSelect}
                selectedIndex={selectedIndex}
                onSelectedIndexChange={setSelectedIndex}
              />
              
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
                placeholder={replyToMessage ? 'Ответить...' : 'Сообщение'}
                value={messageText}
                onChange={(e) => {
                  const value = e.target.value;
                  setMessageText(value);
                  
                  if (value.trim() && !value.startsWith('/')) {
                    handleTypingStart();
                  }
                }}
                onKeyDown={handleKeyPress}
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

          {/* Quick AI command chips */}
          {!messageText && !replyToMessage && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 overflow-x-auto scrollbar-hide">
              <span className="text-xs text-muted-foreground shrink-0">AI:</span>
              {[
                { label: 'Резюме', action: 'summarise' as const },
                { label: 'Задачи', action: 'extract_tasks' as const },
                { label: 'Черновик', action: 'draft_reply' as const },
                { label: 'Перевод', action: 'translate' as const },
              ].map((cmd) => (
                <button
                  key={cmd.action}
                  onClick={() => {
                    setAiActionType(cmd.action);
                    setShowAIActions(true);
                  }}
                  className="shrink-0 px-2.5 py-1 text-xs rounded-full bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {cmd.label}
                </button>
              ))}
              {onOpenAIChat && (
                <button
                  onClick={onOpenAIChat}
                  className="shrink-0 px-2 py-1 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors flex items-center gap-1.5"
                >
                  <img src={maskLogo} alt="AI" className="w-4 h-4 object-contain" />
                  Чат
                </button>
              )}
            </div>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
};
