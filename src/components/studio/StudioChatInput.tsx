import { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface StudioChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileUpload: (file: File) => Promise<void>;
  isLoading: boolean;
  uploading: boolean;
  placeholder?: string;
}

export const StudioChatInput = ({
  value,
  onChange,
  onSend,
  onFileUpload,
  isLoading,
  uploading,
  placeholder = "Опишите задачу или задайте вопрос...",
}: StudioChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading) {
        onSend();
      }
    }
  }, [value, isLoading, onSend]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      await onFileUpload(file);
    }
    e.target.value = '';
  }, [onFileUpload]);

  const triggerFileInput = (accept?: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept || '*/*';
      fileInputRef.current.click();
    }
  };

  return (
    <div className="p-3 border-t border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="flex items-end gap-2">
        {/* Attachments */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 flex-shrink-0"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => triggerFileInput('.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx')}>
              📄 Документ
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerFileInput('image/*')}>
              🖼️ Изображение
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerFileInput()}>
              📎 Любой файл
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          multiple
        />

        {/* Text input */}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 min-h-[44px] max-h-[200px] resize-none bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
          rows={1}
        />

        {/* Send button */}
        <Button
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          onClick={onSend}
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </Button>
      </div>
    </div>
  );
};
