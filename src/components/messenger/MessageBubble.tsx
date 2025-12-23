import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
}

export const MessageBubble = ({ message, isOwn, showAvatar }: MessageBubbleProps) => {
  return (
    <div
      className={cn(
        'flex items-end gap-2 animate-fade-in',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 shadow-soft',
          isOwn ? 'message-bubble-sent' : 'message-bubble-received'
        )}
      >
        {message.type === 'image' && message.mediaUrl && (
          <img
            src={message.mediaUrl}
            alt="Изображение"
            className="rounded-lg mb-2 max-w-full"
          />
        )}
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </p>
        <div
          className={cn(
            'flex items-center gap-1 mt-1',
            isOwn ? 'justify-end' : 'justify-start'
          )}
        >
          <span
            className={cn(
              'text-[11px]',
              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {format(message.timestamp, 'HH:mm')}
          </span>
          {isOwn && (
            message.isRead ? (
              <CheckCheck className="w-4 h-4 text-primary-foreground/70" />
            ) : (
              <Check className="w-4 h-4 text-primary-foreground/70" />
            )
          )}
        </div>
      </div>
    </div>
  );
};
