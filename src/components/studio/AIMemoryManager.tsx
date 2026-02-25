import { useState, useEffect, useCallback } from 'react';
import { Trash2, Brain, HardDrive, Cloud, Loader2, AlertTriangle, MessageSquare, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getAllMessages, clearAllMessages, deleteMessage, getMessageCount } from '@/lib/ai/localVaultDB';
import { cn } from '@/lib/utils';
import type { AIMemoryMode } from '@/hooks/useAISettings';

interface MemoryItem {
  id: string;
  type: 'local' | 'cloud';
  role: string;
  content: string;
  createdAt: string;
}

interface AIMemoryManagerProps {
  memoryMode: AIMemoryMode;
}

export const AIMemoryManager = ({ memoryMode }: AIMemoryManagerProps) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [localCount, setLocalCount] = useState(0);
  const [cloudCount, setCloudCount] = useState(0);

  const fetchMemories = useCallback(async () => {
    setLoading(true);
    const items: MemoryItem[] = [];

    try {
      // Fetch local vault messages
      if (memoryMode === 'local' || memoryMode === 'none') {
        try {
          const count = await getMessageCount();
          setLocalCount(count);
          
          if (count > 0) {
            const localMsgs = await getAllMessages();
            localMsgs.forEach(msg => {
              items.push({
                id: msg.id,
                type: 'local',
                role: msg.role,
                content: msg.content.length > 200 ? msg.content.slice(0, 200) + '…' : msg.content,
                createdAt: msg.createdAt,
              });
            });
          }
        } catch {
          // Vault not initialized
          setLocalCount(0);
        }
      }

      // Fetch cloud memory items
      if (memoryMode === 'cloud_encrypted' && user?.id) {
        const { data, error, count } = await supabase
          .from('ai_memory_items')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && data) {
          setCloudCount(count ?? data.length);
          data.forEach((item: any) => {
            items.push({
              id: item.id,
              type: 'cloud',
              role: item.type || 'memory',
              content: item.metadata?.preview || '🔒 Зашифрованное воспоминание',
              createdAt: item.created_at,
            });
          });
        }
      }
    } catch (err) {
      console.error('Error fetching memories:', err);
    }

    setMemories(items);
    setLoading(false);
  }, [memoryMode, user?.id]);

  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  const handleDeleteOne = async (item: MemoryItem) => {
    try {
      if (item.type === 'local') {
        await deleteMessage(item.id);
        setLocalCount(prev => prev - 1);
      } else {
        await supabase.from('ai_memory_items').delete().eq('id', item.id);
        setCloudCount(prev => prev - 1);
      }
      setMemories(prev => prev.filter(m => m.id !== item.id));
      toast.success('Воспоминание удалено');
    } catch {
      toast.error('Ошибка удаления');
    }
  };

  const handleClearAll = async (type: 'local' | 'cloud') => {
    try {
      if (type === 'local') {
        await clearAllMessages();
        setLocalCount(0);
      } else if (user?.id) {
        await supabase.from('ai_memory_items').delete().eq('user_id', user.id);
        setCloudCount(0);
      }
      setMemories(prev => prev.filter(m => m.type !== type));
      toast.success(type === 'local' ? 'Local Vault очищен' : 'Облачная память очищена');
    } catch {
      toast.error('Ошибка очистки');
    }
  };

  const totalCount = localCount + cloudCount;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const handleExport = useCallback(() => {
    if (memories.length === 0) {
      toast.error('Нет воспоминаний для экспорта');
      return;
    }

    const lines = memories.map(item => {
      const source = item.type === 'local' ? '[Local]' : '[Cloud]';
      const role = item.role === 'user' ? 'Пользователь' : item.role === 'assistant' ? 'AI' : item.role;
      const date = formatDate(item.createdAt);
      return `${source} ${date} | ${role}:\n${item.content}\n`;
    });

    const text = `MASK AI — Экспорт воспоминаний\nДата: ${new Date().toLocaleString('ru-RU')}\nВсего: ${memories.length}\n${'─'.repeat(40)}\n\n${lines.join('\n')}`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mask-ai-memories-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Воспоминания экспортированы');
  }, [memories]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Воспоминания бота
        </h4>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        {(memoryMode === 'local' || localCount > 0) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Local:</span>
            <span className="font-medium text-foreground">{localCount}</span>
          </div>
        )}
        {memoryMode === 'cloud_encrypted' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
            <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Cloud:</span>
            <span className="font-medium text-foreground">{cloudCount}</span>
          </div>
        )}
      </div>

      {/* Memory list */}
      {totalCount === 0 && !loading ? (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <MessageSquare className="w-8 h-8 opacity-40" />
          <p className="text-sm">Воспоминаний пока нет</p>
          <p className="text-xs">Бот будет запоминать важное из ваших разговоров</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[250px]">
          <div className="space-y-2 pr-3">
            {memories.map(item => (
              <div
                key={item.id}
                className="group flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <div className={cn(
                  "mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                  item.type === 'local' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                )}>
                  {item.type === 'local' ? <HardDrive className="w-3 h-3" /> : <Cloud className="w-3 h-3" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground capitalize">
                      {item.role === 'user' ? 'Вы' : item.role === 'assistant' ? 'AI' : item.role}
                    </span>
                    <span className="text-xs text-muted-foreground/60">{formatDate(item.createdAt)}</span>
                  </div>
                  <p className="text-sm text-foreground mt-0.5 line-clamp-2 break-words">
                    {item.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteOne(item)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Export & Clear buttons */}
      {totalCount > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Экспорт ({totalCount})
          </Button>
          {localCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Очистить Local ({localCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Очистить Local Vault?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Все сохранённые на устройстве воспоминания бота будут удалены безвозвратно.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => handleClearAll('local')}
                  >
                    Удалить всё
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {cloudCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Очистить Cloud ({cloudCount})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Очистить облачную память?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Все зашифрованные воспоминания в облаке будут удалены безвозвратно.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => handleClearAll('cloud')}
                  >
                    Удалить всё
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );
};
