import { useState } from 'react';
import { ImageIcon, Loader2, Download, Sparkles, X, Mail } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImageGenerationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  onImageGenerated?: (imageUrl: string, prompt: string) => void;
  onSendEmail?: (imageUrl: string) => void;
}

export const ImageGenerationDialog = ({
  isOpen,
  onClose,
  initialPrompt = '',
  onImageGenerated,
  onSendEmail,
}: ImageGenerationDialogProps) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Введите описание изображения');
      return;
    }

    setIsGenerating(true);
    setGeneratedImage(null);
    setMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim() },
      });

      if (error) {
        throw new Error(error.message || 'Failed to generate image');
      }

      if (data?.error) {
        setMessage(data.message || data.error);
        toast.error(data.error);
        return;
      }

      if (data?.image) {
        setGeneratedImage(data.image);
        if (data.message) {
          setMessage(data.message);
        }
        toast.success('Изображение сгенерировано!');
        
        // Notify parent about the generated image
        onImageGenerated?.(data.image, prompt.trim());
      }
    } catch (error: any) {
      console.error('Generate error:', error);
      toast.error(error.message || 'Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `mask-generated-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmail = () => {
    if (generatedImage && onSendEmail) {
      onSendEmail(generatedImage);
      handleClose();
    }
  };

  const handleReset = () => {
    setGeneratedImage(null);
    setMessage(null);
  };

  const handleClose = () => {
    setGeneratedImage(null);
    setMessage(null);
    setPrompt('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Генерация изображения
          </DialogTitle>
          <DialogDescription>
            Опишите изображение, которое хотите создать
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!generatedImage ? (
            <>
              <Textarea
                placeholder="Например: Закат над океаном в стиле импрессионизма, яркие оранжевые и фиолетовые тона..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                disabled={isGenerating}
              />

              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={handleClose} disabled={isGenerating}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={isGenerating || !prompt.trim()}
                  className="flex-1"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Генерирую...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Сгенерировать
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Generated image */}
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="w-full max-h-[400px] object-contain bg-muted"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset} className="flex-1">
                  Новое изображение
                </Button>
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Скачать
                </Button>
                {onSendEmail && (
                  <Button onClick={handleSendEmail}>
                    <Mail className="w-4 h-4 mr-2" />
                    Email
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
