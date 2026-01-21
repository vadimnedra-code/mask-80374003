import { useState } from 'react';
import { ArrowLeft, Bookmark, Trash2, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSavedMessages, SavedMessage } from '@/hooks/useSavedMessages';
import { useUsers } from '@/hooks/useUsers';
import { Avatar } from './Avatar';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

interface SavedMessagesPanelProps {
  onClose: () => void;
  onNavigateToMessage?: (chatId: string, messageId: string) => void;
}

export const SavedMessagesPanel = ({ onClose, onNavigateToMessage }: SavedMessagesPanelProps) => {
  const { savedMessages, loading, unsaveMessage } = useSavedMessages();
  const { getUserById } = useUsers();
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (messageId: string) => {
    setRemovingId(messageId);
    const { error } = await unsaveMessage(messageId);
    if (error) {
      toast.error('Не удалось удалить сообщение из избранного');
    } else {
      toast.success('Сообщение удалено из избранного');
    }
    setRemovingId(null);
  };

  const handleNavigate = (saved: SavedMessage) => {
    if (onNavigateToMessage && saved.chat_id && saved.message_id) {
      onNavigateToMessage(saved.chat_id, saved.message_id);
    }
  };

  const getMessagePreview = (saved: SavedMessage) => {
    if (!saved.message) return 'Сообщение недоступно';
    
    switch (saved.message.message_type) {
      case 'image':
        return '🖼️ Фото';
      case 'video':
        return '🎬 Видео';
      case 'voice':
        return '🎤 Голосовое сообщение';
      case 'file':
        return '📎 Файл';
      default:
        return saved.message.content || 'Пустое сообщение';
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <div className="whatsapp-header flex items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-white">Избранные сообщения</h1>
          <p className="text-sm text-white/70">{savedMessages.length} сообщений</p>
        </div>
        <Bookmark className="w-6 h-6 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : savedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bookmark className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Нет избранных сообщений
            </p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              Нажмите и удерживайте сообщение, чтобы добавить его в избранное
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {savedMessages.map((saved) => {
              const sender = saved.message?.sender_id ? getUserById(saved.message.sender_id) : null;
              const isRemoving = removingId === saved.message_id;

              return (
                <motion.div
                  key={saved.id}
                  initial={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-border"
                >
                  <div 
                    className="flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleNavigate(saved)}
                  >
                    <Avatar
                      src={sender?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${saved.message?.sender_id}`}
                      alt={sender?.display_name || 'Unknown'}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">
                          {sender?.display_name || 'Неизвестный'}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {saved.message?.created_at 
                            ? formatDistanceToNow(new Date(saved.message.created_at), { addSuffix: true, locale: ru })
                            : ''
                          }
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {getMessagePreview(saved)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(saved.message_id);
                        }}
                        disabled={isRemoving}
                        className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        {isRemoving ? (
                          <div className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  );
};
