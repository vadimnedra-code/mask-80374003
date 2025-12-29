import { useState } from 'react';
import { Smile } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const EMOJI_LIST = [
  '👍', '❤️', '😂', '😮', '😢', '😡',
  '🔥', '🎉', '👏', '🤔', '👀', '💯',
  '✨', '🙏', '💪', '🤝', '👎', '💔',
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  align?: 'start' | 'end';
}

export const EmojiPicker = ({ onSelect, align = 'end' }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <Smile className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align={align} 
        className="w-auto p-2"
        sideOffset={5}
      >
        <div className="grid grid-cols-6 gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelect(emoji)}
              className={cn(
                "w-8 h-8 flex items-center justify-center rounded-md",
                "text-lg hover:bg-muted transition-colors",
                "hover:scale-110 active:scale-95"
              )}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
