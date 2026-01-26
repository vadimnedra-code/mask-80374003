import { 
  FileText, 
  ListTodo, 
  Table, 
  Presentation, 
  ImageIcon, 
  Mail, 
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StudioAction } from '@/types/studio';

interface StudioQuickActionsProps {
  onAction: (action: StudioAction) => void;
  hasFile: boolean;
  permissions: {
    allow_outbound_email: boolean;
    allow_outbound_sms: boolean;
    allow_outbound_calls: boolean;
  };
}

const actions: {
  id: StudioAction;
  label: string;
  icon: React.ElementType;
  description: string;
  requiresFile?: boolean;
  permissionKey?: keyof StudioQuickActionsProps['permissions'];
}[] = [
  { id: 'convert', label: 'Convert', icon: ArrowRight, description: 'PDF, DOCX, TXT', requiresFile: true },
  { id: 'summarise', label: 'Summarise', icon: FileText, description: 'Краткое резюме' },
  { id: 'extract_tasks', label: 'Tasks', icon: ListTodo, description: 'Извлечь задачи' },
  { id: 'extract_table', label: 'Table', icon: Table, description: 'Извлечь таблицу' },
  { id: 'generate_presentation', label: 'Presentation', icon: Presentation, description: 'Создать PPTX' },
  { id: 'generate_image', label: 'Image', icon: ImageIcon, description: 'Сгенерировать PNG' },
  { id: 'send_email', label: 'Email', icon: Mail, description: 'Отправить', permissionKey: 'allow_outbound_email' },
];

export const StudioQuickActions = ({ onAction, hasFile, permissions }: StudioQuickActionsProps) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 p-3 border-b border-border/50 bg-muted/30">
      {actions.map((action) => {
        const Icon = action.icon;
        const isDisabled = (action.requiresFile && !hasFile) || 
          (action.permissionKey && !permissions[action.permissionKey]);
        
        return (
          <Button
            key={action.id}
            variant="ghost"
            className="flex flex-col items-center gap-1 h-auto py-2 px-1 hover:bg-primary/10 disabled:opacity-40"
            onClick={() => onAction(action.id)}
            disabled={isDisabled}
          >
            <div className="w-10 h-10 rounded-xl bg-background/80 flex items-center justify-center border border-border/50">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-medium text-foreground">{action.label}</span>
            <span className="text-[10px] text-muted-foreground hidden sm:block">{action.description}</span>
          </Button>
        );
      })}
    </div>
  );
};
