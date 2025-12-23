import { MessageCircle } from 'lucide-react';

export const EmptyState = () => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center h-full bg-muted/30">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-150" />
        <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
          <MessageCircle className="w-16 h-16 text-primary" />
        </div>
      </div>
      <h2 className="mt-8 text-2xl font-semibold text-foreground">Mask Messenger</h2>
      <p className="mt-2 text-muted-foreground text-center max-w-sm">
        Выберите чат из списка слева, чтобы начать общение
      </p>
    </div>
  );
};
