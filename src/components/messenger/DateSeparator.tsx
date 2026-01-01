import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator = ({ date }: DateSeparatorProps) => {
  const getDateText = () => {
    if (isToday(date)) {
      return 'Сегодня';
    }
    if (isYesterday(date)) {
      return 'Вчера';
    }
    return format(date, 'd MMMM yyyy', { locale: ru });
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="px-3 py-1 rounded-full bg-muted/80 text-xs text-muted-foreground backdrop-blur-sm">
        {getDateText()}
      </div>
    </div>
  );
};

export const shouldShowDateSeparator = (
  currentDate: Date,
  previousDate: Date | null
): boolean => {
  if (!previousDate) return true;
  return !isSameDay(currentDate, previousDate);
};
