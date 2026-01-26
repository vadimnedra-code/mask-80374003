import { useState, useEffect, useCallback, useMemo } from 'react';
import { Sparkles, Languages, FileText, ListTodo, MessageSquare, Bot, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChatCommand {
  command: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: 'ai' | 'translate' | 'summarise' | 'tasks' | 'draft' | 'email';
}

const COMMANDS: ChatCommand[] = [
  {
    command: '/ai',
    label: 'AI Ассистент',
    description: 'Открыть чат с AI-ассистентом',
    icon: <Bot className="w-4 h-4" />,
    action: 'ai',
  },
  {
    command: '/translate',
    label: 'Перевести',
    description: 'Перевести последние сообщения',
    icon: <Languages className="w-4 h-4" />,
    action: 'translate',
  },
  {
    command: '/summarise',
    label: 'Резюме',
    description: 'Создать краткое резюме чата',
    icon: <FileText className="w-4 h-4" />,
    action: 'summarise',
  },
  {
    command: '/tasks',
    label: 'Задачи',
    description: 'Извлечь задачи из переписки',
    icon: <ListTodo className="w-4 h-4" />,
    action: 'tasks',
  },
  {
    command: '/draft',
    label: 'Черновик',
    description: 'Сгенерировать ответ',
    icon: <MessageSquare className="w-4 h-4" />,
    action: 'draft',
  },
  {
    command: '/email',
    label: 'Email',
    description: 'Анонимно отправить email через MASK Relay',
    icon: <Mail className="w-4 h-4" />,
    action: 'email',
  },
];

interface CommandAutocompleteProps {
  inputValue: string;
  onSelectCommand: (command: ChatCommand) => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
}

export const CommandAutocomplete = ({
  inputValue,
  onSelectCommand,
  selectedIndex,
  onSelectedIndexChange,
}: CommandAutocompleteProps) => {
  const filteredCommands = useMemo(() => {
    if (!inputValue.startsWith('/')) return [];
    const query = inputValue.toLowerCase();
    return COMMANDS.filter((cmd) => cmd.command.startsWith(query));
  }, [inputValue]);

  const isVisible = filteredCommands.length > 0 && inputValue.length > 0;

  // Reset selection when filtered commands change
  useEffect(() => {
    if (filteredCommands.length > 0 && selectedIndex >= filteredCommands.length) {
      onSelectedIndexChange(0);
    }
  }, [filteredCommands, selectedIndex, onSelectedIndexChange]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 right-0 mb-2 mx-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
      >
        <div className="p-1">
          <div className="text-xs text-muted-foreground px-3 py-1.5 font-medium">
            Команды
          </div>
          {filteredCommands.map((cmd, index) => (
            <button
              key={cmd.command}
              onClick={() => onSelectCommand(cmd)}
              onMouseEnter={() => onSelectedIndexChange(index)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                index === selectedIndex
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted/50'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  index === selectedIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {cmd.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{cmd.label}</span>
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {cmd.command}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {cmd.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const useCommandAutocomplete = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const getFilteredCommands = useCallback((inputValue: string) => {
    if (!inputValue.startsWith('/')) return [];
    const query = inputValue.toLowerCase();
    return COMMANDS.filter((cmd) => cmd.command.startsWith(query));
  }, []);

  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent,
      inputValue: string,
      onSelectCommand: (command: ChatCommand) => void
    ) => {
      const filtered = getFilteredCommands(inputValue);
      if (filtered.length === 0) return false;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        return true;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        return true;
      }

      if (e.key === 'Tab' || (e.key === 'Enter' && filtered.length > 0)) {
        e.preventDefault();
        const selected = filtered[selectedIndex];
        if (selected) {
          onSelectCommand(selected);
        }
        return true;
      }

      if (e.key === 'Escape') {
        return true; // Let parent handle clearing
      }

      return false;
    },
    [selectedIndex, getFilteredCommands]
  );

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown,
    getFilteredCommands,
  };
};
