import { cn } from '@/lib/utils';
import { ReactionGroup } from '@/hooks/useMessageReactions';

interface MessageReactionsProps {
  reactions: ReactionGroup[];
  onToggle: (emoji: string) => void;
  isOwn: boolean;
}

export const MessageReactions = ({ reactions, onToggle, isOwn }: MessageReactionsProps) => {
  if (!reactions.length) return null;

  return (
    <div className={cn(
      "flex flex-wrap gap-1 mt-1",
      isOwn ? "justify-end" : "justify-start"
    )}>
      {reactions.map(({ emoji, count, userReacted }) => (
        <button
          key={emoji}
          onClick={() => onToggle(emoji)}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all",
            "hover:scale-105 active:scale-95",
            userReacted
              ? "bg-primary/20 border border-primary/40"
              : "bg-muted/80 border border-transparent hover:border-muted-foreground/20"
          )}
        >
          <span className="text-sm">{emoji}</span>
          <span className={cn(
            "font-medium",
            userReacted ? "text-primary" : "text-muted-foreground"
          )}>
            {count}
          </span>
        </button>
      ))}
    </div>
  );
};
