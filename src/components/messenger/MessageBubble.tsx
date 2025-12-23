import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
}

export const MessageBubble = ({ message, isOwn, showAvatar }: MessageBubbleProps) => {
  const renderMedia = () => {
    if (!message.mediaUrl) return null;

    if (message.type === 'image') {
      return (
        <a 
          href={message.mediaUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <img
            src={message.mediaUrl}
            alt="Изображение"
            className="rounded-lg mb-2 max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          />
        </a>
      );
    }

    if (message.type === 'video') {
      return (
        <video
          src={message.mediaUrl}
          controls
          className="rounded-lg mb-2 max-w-full max-h-64"
        />
      );
    }

    if (message.type === 'file') {
      return (
        <a
          href={message.mediaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "flex items-center gap-2 p-2 rounded-lg mb-2 transition-colors",
            isOwn 
              ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" 
              : "bg-muted hover:bg-muted/80"
          )}
        >
          <FileText className="w-8 h-8 shrink-0" />
          <span className="truncate text-sm flex-1">Файл</span>
          <Download className="w-4 h-4 shrink-0" />
        </a>
      );
    }

    return null;
  };

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
        {renderMedia()}
        {message.content && (
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        )}
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
