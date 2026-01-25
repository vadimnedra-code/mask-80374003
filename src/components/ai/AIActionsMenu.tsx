import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  ListChecks, 
  MessageSquare, 
  Languages,
  Loader2,
  Check,
  X,
  Send
} from 'lucide-react';
import maskLogo from '@/assets/mask-logo.png';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAIChat, AIAction } from '@/hooks/useAIChat';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface AIActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  chatContent: string; // Messages to analyze
  onInsertDraft?: (text: string) => void;
  initialAction?: AIAction | null; // Pre-select an action from command
}

const ACTIONS = [
  {
    id: 'summarise' as AIAction,
    icon: FileText,
    title: 'Резюме',
    description: 'Краткое содержание переписки',
    color: 'text-blue-400',
  },
  {
    id: 'extract_tasks' as AIAction,
    icon: ListChecks,
    title: 'Задачи',
    description: 'Извлечь задачи из диалога',
    color: 'text-emerald-400',
  },
  {
    id: 'draft_reply' as AIAction,
    icon: MessageSquare,
    title: 'Черновик ответа',
    description: 'Составить ответ',
    color: 'text-amber-400',
  },
  {
    id: 'translate' as AIAction,
    icon: Languages,
    title: 'Перевод',
    description: 'Перевести сообщения',
    color: 'text-purple-400',
  },
];

const LANGUAGES = [
  { value: 'en', label: 'Английский' },
  { value: 'ru', label: 'Русский' },
  { value: 'british_business', label: 'Британский деловой' },
  { value: 'de', label: 'Немецкий' },
  { value: 'fr', label: 'Французский' },
  { value: 'es', label: 'Испанский' },
  { value: 'zh', label: 'Китайский' },
];

const TONES = [
  { value: 'neutral', label: 'Нейтральный' },
  { value: 'warm', label: 'Тёплый' },
  { value: 'formal', label: 'Официальный' },
  { value: 'casual', label: 'Непринуждённый' },
];

export const AIActionsMenu = ({ 
  isOpen, 
  onClose, 
  chatContent,
  onInsertDraft,
  initialAction = null
}: AIActionsMenuProps) => {
  const [selectedAction, setSelectedAction] = useState<AIAction | null>(null);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [toneStyle, setToneStyle] = useState('neutral');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [hasAutoTriggered, setHasAutoTriggered] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  
  const { performAction, sendMessage, isLoading: isChatLoading, messages: chatMessages } = useAIChat();

  // Handle initial action from command
  useEffect(() => {
    if (isOpen && initialAction && !hasAutoTriggered) {
      setHasAutoTriggered(true);
      // If it needs options, just select it
      if (initialAction === 'translate' || initialAction === 'draft_reply') {
        setSelectedAction(initialAction);
      } else {
        // Execute immediately
        executeAction(initialAction);
      }
    }
    
    if (!isOpen) {
      setHasAutoTriggered(false);
    }
  }, [isOpen, initialAction, hasAutoTriggered]);

  const handleActionClick = async (action: AIAction) => {
    if (action === 'translate' || action === 'draft_reply') {
      setSelectedAction(action);
      return;
    }

    await executeAction(action);
  };

  const executeAction = async (action: AIAction) => {
    setIsProcessing(true);
    setResult(null);

    try {
      const res = await performAction(action, chatContent, {
        targetLanguage: action === 'translate' ? targetLanguage : undefined,
        toneStyle: action === 'draft_reply' ? toneStyle : undefined,
      });
      setResult(res);
      setSelectedAction(action);
    } catch (error) {
      toast.error('Ошибка AI: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmOptions = () => {
    if (selectedAction) {
      executeAction(selectedAction);
    }
  };

  const handleUseDraft = () => {
    if (result && onInsertDraft) {
      onInsertDraft(result);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedAction(null);
    setResult(null);
    setIsProcessing(false);
    setCustomQuery('');
    onClose();
  };

  const handleCustomQuery = async () => {
    if (!customQuery.trim() || isProcessing) return;
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      // Use custom_query action that properly handles user requests with chat context
      const res = await performAction('custom_query' as AIAction, chatContent, {
        userQuery: customQuery
      });
      setResult(res);
      setSelectedAction('summarise'); // Just to show result view
    } catch (error) {
      toast.error('Ошибка AI: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
      setCustomQuery('');
    }
  };

  const handleCustomQueryKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCustomQuery();
    }
  };

  const handleCopyResult = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      toast.success('Скопировано');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-none overflow-hidden bg-black">
              <img src={maskLogo} alt="AI" className="w-full h-full object-contain" />
            </div>
            AI Действия
          </DialogTitle>
          <DialogDescription>
            {result ? 'Результат анализа' : 'Выбери, что сделать с перепиской'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {!selectedAction && !isProcessing && (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* Custom query input */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={customQuery}
                      onChange={(e) => setCustomQuery(e.target.value)}
                      onKeyDown={handleCustomQueryKeyDown}
                      placeholder="Спроси что угодно о чате..."
                      className={cn(
                        "w-full rounded-xl bg-muted px-4 py-3 pr-12",
                        "focus:outline-none focus:ring-2 focus:ring-primary/50",
                        "placeholder:text-muted-foreground text-sm"
                      )}
                    />
                  </div>
                  <Button
                    size="icon"
                    onClick={handleCustomQuery}
                    disabled={!customQuery.trim()}
                    className="h-11 w-11 rounded-xl shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-background px-2 text-muted-foreground">
                      или выбери действие
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleActionClick(action.id)}
                      className={cn(
                        "p-4 rounded-xl text-left transition-all",
                        "bg-muted/50 hover:bg-muted border border-transparent hover:border-primary/30"
                      )}
                    >
                      <action.icon className={cn("w-6 h-6 mb-2", action.color)} />
                      <h3 className="font-medium text-sm">{action.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {selectedAction && !result && !isProcessing && (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {selectedAction === 'translate' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Язык перевода
                    </label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedAction === 'draft_reply' && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Стиль ответа
                    </label>
                    <Select value={toneStyle} onValueChange={setToneStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONES.map((tone) => (
                          <SelectItem key={tone.value} value={tone.value}>
                            {tone.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedAction(null)}
                    className="flex-1"
                  >
                    Назад
                  </Button>
                  <Button onClick={handleConfirmOptions} className="flex-1">
                    Выполнить
                  </Button>
                </div>
              </motion.div>
            )}

            {isProcessing && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground">Анализирую...</p>
              </motion.div>
            )}

            {result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="bg-muted/50 rounded-xl p-4 max-h-60 overflow-y-auto">
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{result}</ReactMarkdown>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCopyResult}
                    className="flex-1"
                  >
                    Копировать
                  </Button>
                  {selectedAction === 'draft_reply' && onInsertDraft && (
                    <Button onClick={handleUseDraft} className="flex-1">
                      <Check className="w-4 h-4 mr-2" />
                      Использовать
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};
