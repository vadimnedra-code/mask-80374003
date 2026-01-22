import { useState } from 'react';
import { Message } from '@/types/chat';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, FileText, Download, MoreVertical, Pencil, Trash2, X, Forward, Loader2, Lock, Star, Users } from 'lucide-react';
import { format } from 'date-fns';
import { VoicePlayer } from './VoicePlayer';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmojiPicker } from './EmojiPicker';
import { MessageReactions } from './MessageReactions';
import { ReactionGroup } from '@/hooks/useMessageReactions';
import { ImageLightbox } from './ImageLightbox';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  onEdit?: (messageId: string, newContent: string) => Promise<void>;
  onDelete?: (messageId: string) => Promise<void>;
  onDeleteForEveryone?: (messageId: string) => Promise<void>;
  onForward?: (message: Message) => void;
  onSave?: (messageId: string) => Promise<void>;
  onUnsave?: (messageId: string) => Promise<void>;
  isSaved?: boolean;
  canDeleteForEveryone?: boolean;
  deleteForEveryoneTimeLeft?: string | null;
  reactions?: ReactionGroup[];
  onReaction?: (emoji: string) => void;
}

export const MessageBubble = ({ 
  message, 
  isOwn, 
  showAvatar, 
  onEdit, 
  onDelete, 
  onDeleteForEveryone,
  onForward, 
  onSave,
  onUnsave,
  isSaved = false,
  canDeleteForEveryone = false,
  deleteForEveryoneTimeLeft,
  reactions = [], 
  onReaction 
}: MessageBubbleProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteForEveryoneDialog, setShowDeleteForEveryoneDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
    setShowDeleteDialog(false);
  };

  const handleDeleteForEveryone = async () => {
    if (!onDeleteForEveryone) return;
    setIsDeleting(true);
    await onDeleteForEveryone(message.id);
    setIsDeleting(false);
    setShowDeleteForEveryoneDialog(false);
  };

  const handleToggleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    if (isSaved && onUnsave) {
      await onUnsave(message.id);
    } else if (!isSaved && onSave) {
      await onSave(message.id);
    }
    setIsSaving(false);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(true);
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
        <>
          <ImageLightbox 
            src={message.mediaUrl} 
            isOpen={lightboxOpen} 
            onClose={() => setLightboxOpen(false)} 
          />
          <div 
            onClick={() => setLightboxOpen(true)}
            className="cursor-pointer"
          >
            <img
              src={message.mediaUrl}
              alt="Изображение"
              className="rounded-md max-w-full max-h-64 object-cover hover:opacity-90 transition-opacity"
            />
          </div>
        </>
      );
    }

    if (message.type === 'video') {
      return (
        <video
          src={message.mediaUrl}
          controls
          className="rounded-md max-w-full max-h-64"
        />
      );
    }

    if (message.type === 'voice') {
      return (
        <div className="mb-1">
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
            "flex items-center gap-2 p-2 rounded-md mb-1 transition-colors",
            isOwn 
              ? "bg-black/5 hover:bg-black/10" 
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

  // WhatsApp-style timestamp with checkmarks and encryption indicator
  const renderTimestamp = () => (
    <span className="inline-flex items-center gap-[2px] ml-2 align-bottom float-right mt-[3px] -mb-[3px]">
      {message.isEncrypted && (
        <Lock className="w-[12px] h-[12px] text-[#667781] mr-[2px]" />
      )}
      <span className={cn(
        'text-[11px] leading-none',
        isOwn ? 'text-[#667781]' : 'text-[#667781]'
      )}>
        {format(message.timestamp, 'HH:mm')}
      </span>
      {isOwn && (
        message.isRead ? (
          <CheckCheck className="w-[18px] h-[18px] text-[#53bdeb]" />
        ) : message.isDelivered !== false ? (
          <CheckCheck className="w-[18px] h-[18px] text-[#667781]" />
        ) : (
          <Check className="w-[18px] h-[18px] text-[#667781]" />
        )
      )}
    </span>
  );

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сообщение?</AlertDialogTitle>
            <AlertDialogDescription>
              Это сообщение будет удалено только у вас. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить у себя'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete For Everyone Confirmation Dialog */}
      <AlertDialog open={showDeleteForEveryoneDialog} onOpenChange={setShowDeleteForEveryoneDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить для всех?</AlertDialogTitle>
            <AlertDialogDescription>
              Это сообщение будет удалено у всех участников чата. Это действие нельзя отменить.
              {deleteForEveryoneTimeLeft && (
                <span className="block mt-2 text-sm text-muted-foreground">
                  Осталось времени: {deleteForEveryoneTimeLeft}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Отмена</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteForEveryone}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить для всех'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div
        className={cn(
          'flex items-end gap-1 group px-[5%]',
          isOwn ? 'justify-end' : 'justify-start'
        )}
      >
      {/* Action menu for messages - shown on hover */}
      {!isEditing && !isOwn && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center order-2">
          {onReaction && (
            <EmojiPicker onSelect={onReaction} align="start" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-muted transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[160px]">
              {(onSave || onUnsave) && (
                <DropdownMenuItem onClick={handleToggleSave} disabled={isSaving}>
                  <Star className={cn("w-4 h-4 mr-2", isSaved && "fill-primary text-primary")} />
                  {isSaved ? 'Убрать из избранного' : 'В избранное'}
                </DropdownMenuItem>
              )}
              {onForward && (
                <DropdownMenuItem onClick={() => onForward(message)}>
                  <Forward className="w-4 h-4 mr-2" />
                  Переслать
                </DropdownMenuItem>
              )}
              {(onSave || onUnsave || onForward) && canDelete && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={confirmDelete}
                  className="text-destructive focus:text-destructive"
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
          'max-w-[75%] min-w-[80px] px-[9px] py-[6px] relative',
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
          <div className="relative">
            {message.content && (
              <span className="text-[14.2px] leading-[19px] whitespace-pre-wrap break-words">
                {message.content}
                {/* Invisible spacer for timestamp */}
                <span className="inline-block w-[70px]" aria-hidden="true" />
              </span>
            )}
            {/* Absolute positioned timestamp at bottom right */}
            <span className={cn(
              'absolute bottom-0 right-0 flex items-center gap-[2px]',
            )}>
              <span className="text-[11px] leading-none text-muted-foreground">
                {format(message.timestamp, 'HH:mm')}
              </span>
              {isOwn && (
                message.isRead ? (
                  <CheckCheck className="w-[16px] h-[16px] text-primary" />
                ) : message.isDelivered !== false ? (
                  <CheckCheck className="w-[16px] h-[16px] text-muted-foreground" />
                ) : (
                  <Check className="w-[16px] h-[16px] text-muted-foreground" />
                )
              )}
            </span>
          </div>
        )}
        
        {/* Reactions */}
        {onReaction && reactions.length > 0 && (
          <MessageReactions 
            reactions={reactions} 
            onToggle={onReaction}
            isOwn={isOwn}
          />
        )}
      </div>

      {/* Action menu for own messages - shown on hover */}
      {!isEditing && isOwn && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center order-first">
          {onReaction && (
            <EmojiPicker onSelect={onReaction} align="end" />
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-full hover:bg-muted transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {(onSave || onUnsave) && (
                <DropdownMenuItem onClick={handleToggleSave} disabled={isSaving}>
                  <Star className={cn("w-4 h-4 mr-2", isSaved && "fill-yellow-500 text-yellow-500")} />
                  {isSaved ? 'Убрать из избранного' : 'В избранное'}
                </DropdownMenuItem>
              )}
              {onForward && (
                <DropdownMenuItem onClick={() => onForward(message)}>
                  <Forward className="w-4 h-4 mr-2" />
                  Переслать
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
              )}
              {(onSave || onUnsave || onForward || canEdit) && (canDelete || canDeleteForEveryone) && <DropdownMenuSeparator />}
              {canDeleteForEveryone && onDeleteForEveryone && (
                <DropdownMenuItem 
                  onClick={() => setShowDeleteForEveryoneDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Удалить для всех
                  {deleteForEveryoneTimeLeft && (
                    <span className="ml-auto text-xs opacity-70">{deleteForEveryoneTimeLeft}</span>
                  )}
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={confirmDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить у себя
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      </div>
    </>
  );
};