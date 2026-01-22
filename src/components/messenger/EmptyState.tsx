import maskLogo from '@/assets/mask-logo.png';

export const EmptyState = () => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center h-full bg-background">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative">
        {/* Golden glow behind logo */}
        <div className="absolute inset-0 bg-primary/15 blur-3xl scale-150" />
        <div className="relative w-44 h-44 bg-logo overflow-hidden">
          <img 
            src={maskLogo} 
            alt="Mask Logo" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <h2 className="mt-8 text-3xl font-bold tracking-tight">
        <span className="text-gold-gradient">
          Mask
        </span>
        <span className="text-foreground/80 ml-2 font-normal">Messenger</span>
      </h2>
      
      <p className="mt-4 text-muted-foreground text-center max-w-sm text-base">
        Выберите чат из списка слева, чтобы начать общение
      </p>
      
      <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
        <div className="w-2 h-2 rounded-full bg-[hsl(var(--online))] animate-pulse" />
        <p className="text-xs text-primary">
          Сквозное шифрование
        </p>
      </div>
      
      <p className="mt-6 text-xs text-muted-foreground/50">
        Защита от просмотра сообщений третьими лицами
      </p>
    </div>
  );
};
