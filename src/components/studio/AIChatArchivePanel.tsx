import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  Trash2,
  Download,
  MessageSquare,
  Loader2,
  ChevronRight,
  Pencil,
  Check,
  X,
  BookOpen,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useAIChatArchive, type ArchivedSession } from '@/hooks/useAIChatArchive';
import type { AIMessage } from '@/hooks/useAIChat';
import { cn } from '@/lib/utils';

interface AIChatArchivePanelProps {
  onLoadSession: (messages: AIMessage[]) => void;
  onApplyAsContext: (context: string) => void;
  onClose: () => void;
}

export const AIChatArchivePanel = ({
  onLoadSession,
  onApplyAsContext,
  onClose,
}: AIChatArchivePanelProps) => {
  const {
    sessions,
    loading,
    fetchSessions,
    loadSessionMessages,
    deleteSession,
    renameSession,
    buildContextFromSession,
  } = useAIChatArchive();

  const [selectedSession, setSelectedSession] = useState<ArchivedSession | null>(null);
  const [sessionMessages, setSessionMessages] = useState<AIMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleOpenSession = useCallback(async (session: ArchivedSession) => {
    setSelectedSession(session);
    setLoadingMessages(true);
    const msgs = await loadSessionMessages(session.id);
    setSessionMessages(msgs);
    setLoadingMessages(false);
  }, [loadSessionMessages]);

  const handleLoadToChat = useCallback(() => {
    if (sessionMessages.length > 0) {
      onLoadSession(sessionMessages);
      toast.success('Сессия загружена в чат');
      onClose();
    }
  }, [sessionMessages, onLoadSession, onClose]);

  const handleApplyContext = useCallback(async () => {
    if (!selectedSession) return;
    const context = await buildContextFromSession(selectedSession.id);
    if (context) {
      onApplyAsContext(context);
      toast.success('Контекст применён к следующему запросу');
      onClose();
    }
  }, [selectedSession, buildContextFromSession, onApplyAsContext, onClose]);

  const handleDelete = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    if (selectedSession?.id === sessionId) {
      setSelectedSession(null);
      setSessionMessages([]);
    }
    toast.success('Сессия удалена');
  }, [deleteSession, selectedSession]);

  const handleStartRename = useCallback((session: ArchivedSession) => {
    setEditingId(session.id);
    setEditTitle(session.title || '');
  }, []);

  const handleConfirmRename = useCallback(async () => {
    if (editingId && editTitle.trim()) {
      await renameSession(editingId, editTitle.trim());
      setEditingId(null);
    }
  }, [editingId, editTitle, renameSession]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Detail view
  if (selectedSession) {
    return (
      <motion.div
        initial={{ x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="flex flex-col h-full"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
          <Button variant="ghost" size="icon" onClick={() => setSelectedSession(null)} className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">
              {selectedSession.title || 'Сессия'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatDate(selectedSession.created_at)} · {sessionMessages.length} сообщений
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3 border-b border-border/30">
          <Button size="sm" variant="outline" onClick={handleLoadToChat} className="flex-1">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Загрузить в чат
          </Button>
          <Button size="sm" onClick={handleApplyContext} className="flex-1">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            Как контекст
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              sessionMessages.map(msg => (
                <div
                  key={msg.id}
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm max-w-[90%] break-words",
                    msg.role === 'user'
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap line-clamp-6">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </motion.div>
    );
  }

  // Session list view
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Archive className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Архив чатов</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Sessions */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1.5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Archive className="w-10 h-10 opacity-30" />
              <p className="text-sm">Архив пуст</p>
              <p className="text-xs text-center max-w-[200px]">
                Сохраняйте чаты с AI, чтобы использовать их как контекст в будущем
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {sessions.map(session => (
                <motion.div
                  key={session.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="group flex items-center gap-2 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-muted/30 transition-all cursor-pointer"
                  onClick={() => editingId !== session.id && handleOpenSession(session)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingId === session.id ? (
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleConfirmRename()}
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleConfirmRename}>
                          <Check className="w-3.5 h-3.5 text-primary" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-foreground truncate">
                          {session.title || 'Сессия'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatDate(session.created_at)} · {session.message_count} сообщ.
                        </p>
                      </>
                    )}
                  </div>

                  {editingId !== session.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleStartRename(session)}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить сессию?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Все сообщения этой сессии будут удалены безвозвратно.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => handleDelete(session.id)}
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
};
