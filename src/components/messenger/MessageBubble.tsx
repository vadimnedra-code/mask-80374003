import { useState } from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, FileText, Download, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import { VoicePlayer } from './VoicePlayer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
}

export const MessageBubble = ({ message, isOwn, showAvatar, onEdit, onDelete }: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [isDeleting, setIsDeleting] = useState(false);

  const isEdited = message.timestamp.getTime() !== new Date(message.timestamp).getTime() && 
    message.content !== null;

  const handleEdit = async () => {
    if (!editContent.trim() || !onEdit) return;
    await onEdit(message.id, editContent.trim());
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    await onDelete(message.id);
    setIsDeleting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setEditContent(message.content || '');
    }
  };

  const canEdit = isOwn && message.type === 'text' && onEdit;
  const canDelete = isOwn && onDelete;

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

    if (message.type === 'voice') {
      return (
        <div className="mb-2">
          <VoicePlayer src={message.mediaUrl} isOwn={isOwn} />
        </div>
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
        'flex items-end gap-2 animate-fade-in group',
        isOwn ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Action menu for own messages */}
      {isOwn && (canEdit || canDelete) && !isEditing && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {canEdit && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div
        className={cn(
          'max-w-[75%] px-4 py-2.5 shadow-soft',
          isOwn ? 'message-bubble-sent' : 'message-bubble-received'
        )}
      >
        {renderMedia()}
        
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <Input
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="bg-background/50 border-primary/30"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content || '');
                }}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                onClick={handleEdit}
                disabled={!editContent.trim()}
              >
                Сохранить
              </Button>
            </div>
          </div>
        ) : (
          message.content && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )
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
