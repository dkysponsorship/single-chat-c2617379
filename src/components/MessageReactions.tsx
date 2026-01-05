import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { SmilePlus } from 'lucide-react';
import { GroupedReaction } from '@/hooks/useMessageReactions';

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

interface MessageReactionsProps {
  reactions: GroupedReaction[];
  onReact: (emoji: string) => void;
  isOwn: boolean;
}

export const MessageReactions = ({ reactions, onReact, isOwn }: MessageReactionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setIsOpen(false);
  };

  return (
    <div className={cn("flex items-center gap-1 flex-wrap", isOwn ? "justify-end" : "justify-start")}>
      {/* Display existing reactions */}
      {reactions.map(reaction => (
        <button
          key={reaction.emoji}
          onClick={() => onReact(reaction.emoji)}
          className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all hover:scale-110",
            reaction.hasReacted
              ? "bg-primary/20 border border-primary/40"
              : "bg-muted/80 border border-border hover:bg-muted"
          )}
        >
          <span>{reaction.emoji}</span>
          <span className={cn("font-medium", reaction.hasReacted ? "text-primary" : "text-muted-foreground")}>
            {reaction.count}
          </span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "inline-flex items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-110",
              "bg-muted/60 hover:bg-muted border border-border/50"
            )}
          >
            <SmilePlus className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2" 
          side={isOwn ? "left" : "right"}
          align="center"
        >
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="text-xl hover:scale-125 transition-transform p-1 hover:bg-muted rounded"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface ReactionPickerProps {
  onReact: (emoji: string) => void;
}

export const ReactionPicker = ({ onReact }: ReactionPickerProps) => {
  return (
    <div className="flex gap-1 p-1">
      {EMOJI_OPTIONS.map(emoji => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="text-lg hover:scale-125 transition-transform p-0.5 hover:bg-muted rounded"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};
