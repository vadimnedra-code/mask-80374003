import { Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface E2EEIndicatorProps {
  isEnabled: boolean;
  recipientHasE2EE: boolean;
  className?: string;
}

export const E2EEIndicator = ({ isEnabled, recipientHasE2EE, className = '' }: E2EEIndicatorProps) => {
  const getStatus = () => {
    if (isEnabled) {
      return {
        icon: ShieldCheck,
        color: 'text-green-500',
        tooltip: 'Сквозное шифрование активно',
        label: 'E2EE'
      };
    }
    if (!recipientHasE2EE) {
      return {
        icon: ShieldAlert,
        color: 'text-yellow-500',
        tooltip: 'Собеседник не поддерживает E2EE',
        label: 'Нет E2EE'
      };
    }
    return {
      icon: Shield,
      color: 'text-muted-foreground',
      tooltip: 'Шифрование не активно',
      label: ''
    };
  };

  const { icon: Icon, color, tooltip, label } = getStatus();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center gap-1 ${className}`}>
            <Icon className={`h-4 w-4 ${color}`} />
            {label && (
              <span className={`text-xs ${color}`}>{label}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
