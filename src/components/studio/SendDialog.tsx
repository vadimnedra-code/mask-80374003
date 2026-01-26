import { useState, useEffect, useCallback, useRef } from 'react';
import { Mail, Send, Loader2, Shield, Paperclip, X, FileText, Image, HardDrive, FolderOpen, Sparkles, ClipboardPaste } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { StudioArtifact, StudioFile } from '@/types/studio';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStudioFiles } from '@/hooks/useStudioFiles';

interface SendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: StudioArtifact | null;
  pendingImageUrl?: string | null;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const SendDialog = ({
  isOpen,
  onClose,
  artifact,
  pendingImageUrl,
}: SendDialogProps) => {
  const { user } = useAuth();
  const { uploadFile, uploading: uploadingFile } = useStudioFiles();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [filesToSend, setFilesToSend] = useState<StudioFile[]>([]);
  const [selectedArtifacts, setSelectedArtifacts] = useState<StudioArtifact[]>([]);
  const [availableFiles, setAvailableFiles] = useState<StudioFile[]>([]);
  const [availableArtifacts, setAvailableArtifacts] = useState<StudioArtifact[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [clipboardImages, setClipboardImages] = useState<{ id: string; name: string; blob: Blob; preview: string }[]>([]);

  // Fetch available files and artifacts
  const fetchAssets = useCallback(async () => {
    if (!user?.id || !isOpen) return;
    
    setLoadingAssets(true);
    try {
      const [filesRes, artifactsRes] = await Promise.all([
        supabase
          .from('studio_files')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('studio_artifacts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (filesRes.data) {
        setAvailableFiles(filesRes.data as unknown as StudioFile[]);
      }
      if (artifactsRes.data) {
        setAvailableArtifacts(artifactsRes.data as unknown as StudioArtifact[]);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoadingAssets(false);
    }
  }, [user?.id, isOpen]);

  // Initialize when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMessage(artifact?.text_content?.slice(0, 500) || '');
      setFilesToSend([]);
      setSelectedArtifacts(artifact ? [artifact] : []);
      setClipboardImages([]);
      setShowConfirm(false);
      fetchAssets();
    }
  }, [isOpen, artifact, fetchAssets]);

  // Handle paste from clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;

          if (blob.size > MAX_FILE_SIZE) {
            toast.error('Изображение слишком большое (максимум 10MB)');
            continue;
          }

          const id = `clipboard-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const name = `Изображение ${clipboardImages.length + 1}.png`;
          const preview = URL.createObjectURL(blob);

          setClipboardImages(prev => [...prev, { id, name, blob, preview }]);
          toast.success('Изображение добавлено из буфера обмена');
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen, clipboardImages.length]);

  // Cleanup preview URLs
  useEffect(() => {
    return () => {
      clipboardImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [clipboardImages]);

  const removeClipboardImage = (id: string) => {
    setClipboardImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const removeFileFromSend = (fileId: string) => {
    setFilesToSend(prev => prev.filter(f => f.id !== fileId));
  };

  const removeArtifactFromSend = (artifactId: string) => {
    setSelectedArtifacts(prev => prev.filter(a => a.id !== artifactId));
  };

  const addFile = (file: StudioFile) => {
    if (!filesToSend.find(f => f.id === file.id)) {
      setFilesToSend(prev => [...prev, file]);
    }
    setShowFilePicker(false);
  };

  const addArtifact = (art: StudioArtifact) => {
    if (!selectedArtifacts.find(a => a.id === art.id)) {
      setSelectedArtifacts(prev => [...prev, art]);
    }
    setShowFilePicker(false);
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: файл слишком большой (максимум 10MB)`);
        continue;
      }
      
      try {
        const uploadedFile = await uploadFile(file);
        if (uploadedFile) {
          setFilesToSend(prev => [...prev, uploadedFile]);
        }
      } catch (error: any) {
        toast.error(`Ошибка загрузки ${file.name}`);
      }
    }

    e.target.value = '';
  };

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error('Укажите получателя');
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsSending(true);
    
    try {
      // Upload clipboard images first
      const uploadedClipboardFiles: StudioFile[] = [];
      for (const img of clipboardImages) {
        const file = new File([img.blob], img.name, { type: 'image/png' });
        const uploaded = await uploadFile(file);
        if (uploaded) {
          uploadedClipboardFiles.push(uploaded);
        }
      }

      const allFiles = [...filesToSend, ...uploadedClipboardFiles];
      const fileIds = allFiles.map(f => f.id);
      
      const artifactContent = selectedArtifacts
        .filter(a => a.text_content)
        .map(a => `\n\n--- ${a.title} ---\n${a.text_content}`)
        .join('');
      
      const fullMessage = message + artifactContent;
      
      const { data, error } = await supabase.functions.invoke('send-email-relay', {
        body: {
          to: recipient,
          subject: subject || 'Message via MASK',
          body: fullMessage,
          artifactId: selectedArtifacts[0]?.id || artifact?.id,
          fileIds: fileIds.length > 0 ? fileIds : undefined,
          imageUrl: pendingImageUrl || undefined,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const attachmentCount = allFiles.length + selectedArtifacts.length + (pendingImageUrl ? 1 : 0);
      toast.success(
        attachmentCount > 0 
          ? `Email отправлен анонимно с ${attachmentCount} вложением(ями)` 
          : 'Email отправлен анонимно'
      );
      
      onClose();
      setShowConfirm(false);
      setRecipient('');
      setSubject('');
      setMessage('');
      setSelectedArtifacts([]);
      setFilesToSend([]);
      setClipboardImages([]);
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Ошибка отправки');
    } finally {
      setIsSending(false);
    }
  };

  const totalAttachments = filesToSend.length + selectedArtifacts.length + clipboardImages.length + (pendingImageUrl ? 1 : 0);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Анонимная отправка Email
          </DialogTitle>
          <DialogDescription>
            Сообщение будет отправлено через MASK relay. Ваша личность скрыта.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email получателя
            </Label>
            <Input
              type="email"
              placeholder="recipient@example.com"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Тема</Label>
            <Input
              placeholder="Тема письма"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Сообщение</Label>
            <Textarea
              placeholder="Текст письма..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
            />
          </div>

          {/* Attachments section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {totalAttachments > 0 && `Прикреплено: ${totalAttachments}`}
              </span>
              
              {/* Hidden file input */}
              <input
                type="file"
                id="email-file-upload"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.webp"
                onChange={handleLocalFileUpload}
                className="hidden"
              />
              
              {/* Attachment dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 gap-2"
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Paperclip className="w-4 h-4" />
                    )}
                    <span className="text-xs">Прикрепить</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover">
                  <DropdownMenuItem 
                    onClick={() => document.getElementById('email-file-upload')?.click()} 
                    className="gap-2 cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>С диска</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setShowFilePicker(true)} 
                    className="gap-2 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Из медиатеки</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowFilePicker(true)} 
                    className="gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Из студии</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* File picker popover */}
              <Popover open={showFilePicker} onOpenChange={setShowFilePicker}>
                <PopoverTrigger asChild>
                  <span className="hidden" />
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 bg-popover" align="end">
                  <ScrollArea className="h-[300px]">
                    <div className="p-2">
                      {loadingAssets ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      ) : (
                        <>
                          {availableFiles.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground px-2 py-1">📁 Медиатека</p>
                              {availableFiles.map((file) => (
                                <button
                                  key={file.id}
                                  onClick={() => addFile(file)}
                                  disabled={!!filesToSend.find(f => f.id === file.id)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="truncate">{file.original_name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {availableArtifacts.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground px-2 py-1">✨ Артефакты студии</p>
                              {availableArtifacts.map((art) => (
                                <button
                                  key={art.id}
                                  onClick={() => addArtifact(art)}
                                  disabled={!!selectedArtifacts.find(a => a.id === art.id)}
                                  className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {art.artifact_type === 'image' ? (
                                    <Image className="w-4 h-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                  )}
                                  <span className="truncate">{art.title}</span>
                                </button>
                              ))}
                            </div>
                          )}
                          
                          {availableFiles.length === 0 && availableArtifacts.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Нет доступных файлов или артефактов
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>

            {/* Attached items */}
            {totalAttachments > 0 && (
              <div className="flex flex-wrap gap-2">
                {filesToSend.map((file) => (
                  <Badge 
                    key={file.id} 
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <FileText className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{file.original_name}</span>
                    <button
                      onClick={() => removeFileFromSend(file.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {clipboardImages.map((img) => (
                  <Badge 
                    key={img.id} 
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <img 
                      src={img.preview} 
                      alt={img.name}
                      className="w-4 h-4 rounded object-cover"
                    />
                    <span className="truncate max-w-[100px]">{img.name}</span>
                    <button
                      onClick={() => removeClipboardImage(img.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {selectedArtifacts.map((art) => (
                  <Badge 
                    key={art.id} 
                    variant="outline"
                    className="flex items-center gap-1 pr-1 border-primary/50"
                  >
                    {art.artifact_type === 'image' ? (
                      <Image className="w-3 h-3" />
                    ) : (
                      <FileText className="w-3 h-3" />
                    )}
                    <span className="truncate max-w-[120px]">{art.title}</span>
                    <button
                      onClick={() => removeArtifactFromSend(art.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {pendingImageUrl && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Image className="w-3 h-3" />
                    <span>Сгенерированное изображение</span>
                  </Badge>
                )}
              </div>
            )}

            {/* Paste hint */}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ClipboardPaste className="w-3 h-3" />
              Ctrl+V для вставки изображения из буфера
            </p>
          </div>
        </div>

        {/* Confirmation alert */}
        {showConfirm && (
          <Alert className="border-primary/50 bg-primary/5">
            <Shield className="w-4 h-4 text-primary" />
            <AlertDescription>
              <strong>Подтверждение:</strong>
              <ul className="mt-2 space-y-1 text-sm">
                <li>✓ Ваш email скрыт</li>
                <li>✓ Получатель увидит relay@mask.international</li>
                <li>✓ Данные не сохраняются</li>
                {totalAttachments > 0 && (
                  <li>✓ {totalAttachments} файл(ов) будет прикреплено</li>
                )}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={handleSend} disabled={isSending}>
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            {showConfirm ? 'Подтвердить отправку' : 'Отправить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
