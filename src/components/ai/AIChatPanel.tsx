import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  X, 
  ArrowLeft, 
  EyeOff, 
  Eye,
  MoreVertical,
  Trash2,
  Settings,
  Shield,
  MessageCircle,
  Copy,
  Check,
  Lock,
  Edit3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAIChat, AIMessage } from '@/hooks/useAIChat';
import { useAISettings } from '@/hooks/useAISettings';
import { useLocalVault } from '@/hooks/useLocalVault';
import { LocalVaultDialog } from '@/components/ai/LocalVaultDialog';
import maskLogo from '@/assets/mask-logo.png';
import ReactMarkdown from 'react-markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { toast } from 'sonner';

interface AIChatPanelProps {
  onClose: () => void;
  onOpenSettings?: () => void;
  activeChatName?: string;
  onSendToChat?: (message: string) => void;
}

export const AIChatPanel = ({ onClose, onOpenSettings, activeChatName, onSendToChat }: AIChatPanelProps) => {
  const [inputValue, setInputValue] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [messageToSend, setMessageToSend] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    messages, 
    isLoading, 
    isIncognito, 
    setIsIncognito, 
    setInitialMessages,
    sendMessage, 
    clearMessages,
    cancelRequest
  } = useAIChat();
  
  const { settings } = useAISettings();
  
  const vault = useLocalVault();

  // Track saved message IDs to avoid duplicates
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  const vaultLoadedRef = useRef(false);

  // Load messages from vault on mount (if vault is unlocked and memory_mode is 'local')
  useEffect(() => {
    const loadVaultMessages = async () => {
      if (vault.isUnlocked && settings?.memory_mode === 'local' && !vaultLoadedRef.current) {
        vaultLoadedRef.current = true;
        const vaultMessages = await vault.loadFromVault();
        if (vaultMessages.length > 0) {
          setInitialMessages(vaultMessages);
          // Mark all loaded messages as already saved
          vaultMessages.forEach(msg => savedMessageIdsRef.current.add(msg.id));
        }
      }
    };
    loadVaultMessages();
  }, [vault.isUnlocked, settings?.memory_mode, setInitialMessages, vault.loadFromVault]);

  // Save NEW messages to vault when they change (if vault is unlocked and memory_mode is 'local')
  useEffect(() => {
    if (vault.isUnlocked && settings?.memory_mode === 'local' && messages.length > 0 && !isIncognito) {
      // Save only messages that haven't been saved yet
      messages.forEach(msg => {
        if (!savedMessageIdsRef.current.has(msg.id)) {
          savedMessageIdsRef.current.add(msg.id);
          vault.saveToVault(msg);
        }
      });
    }
  }, [messages, vault.isUnlocked, settings?.memory_mode, isIncognito, vault.saveToVault]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    sendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getMemoryBadge = () => {
    if (isIncognito) return { text: 'Инкогнито', color: 'bg-purple-500/20 text-purple-400' };
    switch (settings?.memory_mode) {
      case 'none': return { text: 'Без памяти', color: 'bg-muted text-muted-foreground' };
      case 'local': return { text: 'Локальная память', color: 'bg-primary/15 text-primary' };
      case 'cloud_encrypted': return { text: 'Облачная память', color: 'bg-emerald-500/20 text-emerald-400' };
      default: return { text: 'Без памяти', color: 'bg-muted text-muted-foreground' };
    }
  };

  const memoryBadge = getMemoryBadge();

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-in-right lg:relative lg:animate-none">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors lg:hidden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-none overflow-hidden bg-black">
            <img src={maskLogo} alt="AI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="font-semibold">MASK AI</h2>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs px-2 py-0.5 rounded-full", memoryBadge.color)}>
                {memoryBadge.text}
              </span>
              {vault.isUnlocked && vault.messageCount > 0 && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {vault.messageCount}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsIncognito(!isIncognito)}
            className={cn(
              "transition-colors",
              isIncognito && "text-purple-400 bg-purple-500/10"
            )}
          >
            {isIncognito ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                clearMessages();
                savedMessageIdsRef.current.clear();
              }}>
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить чат
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onOpenSettings && (
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Settings className="w-4 h-4 mr-2" />
                  Настройки AI
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setShowVaultDialog(true)}>
                <Lock className="w-4 h-4 mr-2" />
                Local Vault
                {vault.isUnlocked && (
                  <span className="ml-auto text-xs text-emerald-400">●</span>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Shield className="w-4 h-4 mr-2" />
                AI Permissions
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="hidden lg:flex"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center py-12"
          >
            <div className="w-16 h-16 rounded-none overflow-hidden bg-black mb-4">
              <img src={maskLogo} alt="AI" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-lg font-medium mb-2">Привет! Я MASK AI</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Спроси меня о настройках приватности, функциях MASK, или просто поговорим.
            </p>
            
            <div className="grid grid-cols-2 gap-2 mt-6 w-full max-w-sm">
              {[
                'Как включить исчезающие сообщения?',
                'Проверь мои настройки приватности',
                'Что такое маски в MASK?',
                'Как создать секретный чат?',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="p-3 text-xs text-left rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col gap-1",
                message.role === 'user' ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3",
                  message.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              
              {/* Action buttons for assistant messages */}
              {message.role === 'assistant' && (
                <div className="flex items-center gap-1 px-1">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(message.autoSendContent || message.content);
                      setCopiedMessageId(message.id);
                      setTimeout(() => setCopiedMessageId(null), 2000);
                      toast.success('Скопировано');
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    title="Копировать"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  
                  {onSendToChat && (
                    <button
                      onClick={() => {
                        const contentToSend = message.autoSendContent || message.content;
                        setMessageToSend(contentToSend);
                        setSendConfirmOpen(true);
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors",
                        message.autoSendContent 
                          ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                          : "text-primary hover:bg-primary/10"
                      )}
                      title="Отправить в чат"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{message.autoSendContent ? 'Отправить' : 'В чат'}</span>
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-card pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напиши сообщение..."
              rows={1}
              className={cn(
                "w-full resize-none rounded-2xl bg-muted px-4 py-3 pr-12",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                "placeholder:text-muted-foreground",
                "max-h-32"
              )}
              style={{ minHeight: '48px' }}
            />
          </div>
          
          <Button
            type="submit"
            size="icon"
            disabled={!inputValue.trim() || isLoading}
            className="h-12 w-12 rounded-full shrink-0"
          >
            {isLoading ? (
              <X className="w-5 h-5" onClick={(e) => { e.stopPropagation(); cancelRequest(); }} />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>

        {isIncognito && (
          <p className="text-xs text-purple-400 mt-2 text-center">
            🔒 Режим инкогнито: сообщения не сохраняются
          </p>
        )}
      </form>

      {/* Local Vault Dialog */}
      <LocalVaultDialog
        isOpen={showVaultDialog}
        onClose={() => setShowVaultDialog(false)}
        status={vault.status}
        messageCount={vault.messageCount}
        onInitialize={vault.initializeVault}
        onUnlock={vault.unlockVault}
        onLock={vault.lockVault}
        onClear={vault.clearVault}
        onDestroy={vault.destroyVault}
        onLoadMessages={vault.loadFromVault}
      />

      {/* Send Confirmation Dialog */}
      <Dialog open={sendConfirmOpen} onOpenChange={setSendConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Отправить в чат
            </DialogTitle>
            <DialogDescription>
              Отредактируйте сообщение перед отправкой в {activeChatName || 'чат'}
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            value={messageToSend}
            onChange={(e) => setMessageToSend(e.target.value)}
            className="min-h-[120px] resize-none"
            placeholder="Текст сообщения..."
          />
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSendConfirmOpen(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={() => {
                if (messageToSend.trim() && onSendToChat) {
                  onSendToChat(messageToSend.trim());
                  toast.success(`Отправлено в ${activeChatName || 'чат'}`);
                  setSendConfirmOpen(false);
                  onClose();
                }
              }}
              disabled={!messageToSend.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
