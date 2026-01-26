import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Sparkles, Download, Mail, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioHeader } from './StudioHeader';
import { StudioQuickActions } from './StudioQuickActions';
import { StudioChatInput } from './StudioChatInput';
import { FileUploadZone } from './FileUploadZone';
import { ArtifactCard } from './ArtifactCard';
import { SendDialog } from './SendDialog';
import { StudioSettingsDialog } from './StudioSettingsDialog';
import { ImageGenerationDialog } from './ImageGenerationDialog';

import { useAIChat, type AIMessage } from '@/hooks/useAIChat';
import { useAISettings } from '@/hooks/useAISettings';
import { useStudioFiles } from '@/hooks/useStudioFiles';
import { useStudioArtifacts } from '@/hooks/useStudioArtifacts';
import type { StudioAction, StudioArtifact } from '@/types/studio';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import maskLogo from '@/assets/mask-logo.png';

interface AIStudioPanelProps {
  onClose: () => void;
}

export const AIStudioPanel = ({ onClose }: AIStudioPanelProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState<StudioArtifact | null>(null);
  const [sendChannel, setSendChannel] = useState<'email' | 'sms' | 'voice'>('email');
  const [generatedImages, setGeneratedImages] = useState<Array<{id: string; url: string; prompt: string}>>([]);
  const [pendingEmailImage, setPendingEmailImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { 
    messages, 
    isLoading, 
    isIncognito, 
    setIsIncognito, 
    sendMessage,
    performAction,
  } = useAIChat();

  const { settings, loading: settingsLoading } = useAISettings();
  
  const {
    files,
    uploading,
    fetchFiles,
    uploadFile,
    deleteFile,
    getSignedUrl: getFileSignedUrl,
  } = useStudioFiles();

  const {
    artifacts,
    fetchArtifacts,
    createArtifact,
    deleteArtifact,
    saveToVault,
  } = useStudioArtifacts();

  // Fetch data on mount
  useEffect(() => {
    fetchFiles();
    fetchArtifacts();
  }, [fetchFiles, fetchArtifacts]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, generatedImages]);

  const handleImageGenerated = useCallback((imageUrl: string, prompt: string) => {
    setGeneratedImages(prev => [...prev, { id: Date.now().toString(), url: imageUrl, prompt }]);
  }, []);

  const handleSendImageEmail = useCallback((imageUrl: string) => {
    setPendingEmailImage(imageUrl);
    setSendChannel('email');
    setShowSendDialog(true);
  }, []);

  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const content = inputValue.trim();
    setInputValue('');
    
    // Add file context if files are attached
    let messageContent = content;
    if (files.length > 0) {
      const fileList = files.map(f => f.original_name).join(', ');
      messageContent = `[Прикреплённые файлы: ${fileList}]\n\n${content}`;
    }
    
    await sendMessage(messageContent);
  }, [inputValue, isLoading, files, sendMessage]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      await uploadFile(file);
      toast.success('Файл загружен');
    } catch (error) {
      toast.error((error as Error).message);
    }
  }, [uploadFile]);

  const handleQuickAction = useCallback(async (action: StudioAction) => {
    // Handle communication actions
    if (action === 'send_email' || action === 'send_sms' || action === 'voice_call') {
      setSendChannel(action === 'send_email' ? 'email' : action === 'send_sms' ? 'sms' : 'voice');
      setShowSendDialog(true);
      return;
    }

    // Handle image generation
    if (action === 'generate_image') {
      setImagePrompt('');
      setShowImageDialog(true);
      return;
    }

    // Handle AI actions
    const actionPrompts: Record<string, string> = {
      convert: 'Конвертируй загруженный документ в другой формат',
      summarise: 'Сделай краткое резюме',
      extract_tasks: 'Извлеки задачи и пункты действий',
      extract_table: 'Извлеки данные в табличном формате',
      generate_presentation: 'Создай структуру презентации на основе контента',
    };

    const prompt = actionPrompts[action];
    if (prompt) {
      setInputValue(prompt);
    }
  }, []);

  const handleSaveArtifactToVault = useCallback(async (artifact: StudioArtifact) => {
    const { error } = await saveToVault(artifact.id);
    if (error) {
      toast.error('Не удалось сохранить');
    } else {
      toast.success('Сохранено в Vault');
    }
  }, [saveToVault]);

  const handleDownloadArtifact = useCallback(async (artifact: StudioArtifact) => {
    if (artifact.text_content) {
      const blob = new Blob([artifact.text_content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${artifact.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, []);

  const handleSendArtifact = useCallback((artifact: StudioArtifact) => {
    setSelectedArtifact(artifact);
    setShowSendDialog(true);
  }, []);

  const permissions = {
    allow_outbound_email: (settings as any)?.allow_outbound_email ?? false,
    allow_outbound_sms: (settings as any)?.allow_outbound_sms ?? false,
    allow_outbound_calls: (settings as any)?.allow_outbound_calls ?? false,
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header */}
      <StudioHeader
        isIncognito={isIncognito}
        onToggleIncognito={() => setIsIncognito(!isIncognito)}
        onOpenSettings={() => setShowSettings(true)}
        onClose={onClose}
      />

      {/* Quick Actions */}
      <StudioQuickActions
        onAction={handleQuickAction}
        hasFile={files.length > 0}
        permissions={permissions}
      />

      {/* Main content area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4 max-w-3xl mx-auto">
              {/* Welcome message if empty */}
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <img src={maskLogo} alt="MASK" className="w-12 h-12" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">AI Studio</h2>
                  <p className="text-muted-foreground max-w-md">
                    Загрузите документ, опишите задачу или используйте быстрые действия выше.
                    Все коммуникации анонимны через MASK relay.
                  </p>
                </div>
              )}

              {/* Messages */}
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}

              {/* Generated images inline */}
              {generatedImages.map((img) => (
                <GeneratedImageCard 
                  key={img.id}
                  imageUrl={img.url}
                  prompt={img.prompt}
                  onSendEmail={() => handleSendImageEmail(img.url)}
                  onRemove={() => setGeneratedImages(prev => prev.filter(i => i.id !== img.id))}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <span className="text-sm">AI думает...</span>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Attached files preview */}
          {files.length > 0 && (
            <div className="px-4 py-2 border-t border-border/50 bg-muted/30">
              <div className="flex flex-wrap gap-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background border border-border text-sm"
                  >
                    <span className="truncate max-w-[150px]">{file.original_name}</span>
                    <button
                      onClick={() => deleteFile(file.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <StudioChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            onFileUpload={handleFileUpload}
            isLoading={isLoading}
            uploading={uploading}
          />
        </div>

        {/* Artifacts sidebar (desktop) */}
        <div className="hidden lg:flex lg:w-80 lg:flex-col border-l border-border/50 bg-muted/20">
          <div className="p-4 border-b border-border/50">
            <h3 className="font-semibold text-foreground">Artifacts</h3>
            <p className="text-xs text-muted-foreground">Результаты и файлы</p>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {artifacts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Созданные результаты появятся здесь
                </p>
              ) : (
                artifacts.map((artifact) => (
                  <ArtifactCard
                    key={artifact.id}
                    artifact={artifact}
                    onPreview={() => {}}
                    onDownload={() => handleDownloadArtifact(artifact)}
                    onSend={() => handleSendArtifact(artifact)}
                    onSaveToVault={() => handleSaveArtifactToVault(artifact)}
                    onDelete={() => deleteArtifact(artifact.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Settings Dialog */}
      <StudioSettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Send Dialog */}
      <SendDialog
        isOpen={showSendDialog}
        onClose={() => {
          setShowSendDialog(false);
          setSelectedArtifact(null);
        }}
        channel={sendChannel}
        artifact={selectedArtifact}
        onChannelChange={setSendChannel}
      />

      {/* Image Generation Dialog */}
      <ImageGenerationDialog
        isOpen={showImageDialog}
        onClose={() => {
          setShowImageDialog(false);
          fetchArtifacts();
        }}
        initialPrompt={imagePrompt}
        onImageGenerated={handleImageGenerated}
        onSendEmail={handleSendImageEmail}
      />
    </motion.div>
  );
};

// Message bubble component
const MessageBubble = ({ message }: { message: AIMessage }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3",
        isUser ? "flex-row-reverse" : ""
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
        isUser ? "bg-primary" : "bg-primary/10"
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Sparkles className="w-4 h-4 text-primary" />
        )}
      </div>

      <div className={cn(
        "max-w-[80%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted/50 text-foreground"
      )}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Generated image card component
interface GeneratedImageCardProps {
  imageUrl: string;
  prompt: string;
  onSendEmail: () => void;
  onRemove: () => void;
}

const GeneratedImageCard = ({ imageUrl, prompt, onSendEmail, onRemove }: GeneratedImageCardProps) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `mask-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 max-w-[80%]">
        <div className="rounded-2xl overflow-hidden border border-border bg-muted/30">
          <img 
            src={imageUrl} 
            alt={prompt}
            className="w-full max-h-[300px] object-contain"
          />
          <div className="p-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{prompt}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="w-3 h-3 mr-1" />
                Скачать
              </Button>
              <Button size="sm" onClick={onSendEmail}>
                <Mail className="w-3 h-3 mr-1" />
                Email
              </Button>
              <Button size="sm" variant="ghost" onClick={onRemove} className="ml-auto">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
