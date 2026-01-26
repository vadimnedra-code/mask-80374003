import { useState, useEffect, useCallback } from 'react';
import { Mail, Send, Loader2, Shield, Paperclip, X, Plus, FileText, Image } from 'lucide-react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { StudioArtifact, StudioFile } from '@/types/studio';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SendDialogProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: StudioArtifact | null;
  attachedFiles?: StudioFile[];
  pendingImageUrl?: string | null;
  allowFilePicker?: boolean; // Enable browsing studio files/artifacts
}

export const SendDialog = ({
  isOpen,
  onClose,
  artifact,
  attachedFiles = [],
  pendingImageUrl,
  allowFilePicker = true,
}: SendDialogProps) => {
  const { user } = useAuth();
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

  // Initialize message and files when dialog opens
  useEffect(() => {
    if (isOpen) {
      setMessage(artifact?.text_content?.slice(0, 500) || '');
      setFilesToSend(attachedFiles);
      setSelectedArtifacts(artifact ? [artifact] : []);
      setShowConfirm(false);
      fetchAssets();
    }
  }, [isOpen, artifact, attachedFiles, fetchAssets]);

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

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error('Укажите получателя');
      return;
    }

    // Show confirmation for first-time send
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setIsSending(true);
    
    try {
      // Prepare file IDs for the edge function
      const fileIds = filesToSend.map(f => f.id);
      
      // Prepare artifact content for email body
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

      const attachmentCount = filesToSend.length + selectedArtifacts.length + (pendingImageUrl ? 1 : 0);
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
    } catch (error: any) {
      console.error('Send error:', error);
      toast.error(error.message || 'Ошибка отправки');
    } finally {
      setIsSending(false);
    }
  };

  const totalAttachments = filesToSend.length + selectedArtifacts.length + (pendingImageUrl ? 1 : 0);

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
              <Label className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Вложения {totalAttachments > 0 && `(${totalAttachments})`}
              </Label>
              
              {allowFilePicker && (
                <Popover open={showFilePicker} onOpenChange={setShowFilePicker}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      <Plus className="w-3 h-3 mr-1" />
                      Добавить
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
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
                                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Файлы</p>
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
                                <p className="text-xs font-medium text-muted-foreground px-2 py-1">Артефакты</p>
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
              )}
            </div>

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
