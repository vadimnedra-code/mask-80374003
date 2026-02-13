import maskLogo from '@/assets/mask-logo.png';

export const EmptyState = () => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center h-full bg-background">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-primary/3 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 bg-primary/3 rounded-full blur-[120px]" />
      </div>
      
      <div className="relative">
        {/* Muted glow behind logo */}
        <div className="absolute inset-0 bg-primary/8 blur-3xl scale-150" />
        <div className="relative w-36 h-36 bg-logo overflow-hidden">
          <img 
            src={maskLogo} 
            alt="Mask Logo" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <h2 className="mt-10 text-3xl tracking-tight">
        <span className="font-display font-semibold text-gold-gradient italic">
          Mask
        </span>
        <span className="text-foreground/60 ml-3 font-light tracking-widest text-lg uppercase">
          Messenger
        </span>
      </h2>
      
      <p className="mt-5 text-muted-foreground text-center max-w-xs text-sm leading-relaxed">
        Выберите чат из списка слева, чтобы начать общение
      </p>
      
      <div className="mt-10 flex items-center gap-2.5 px-4 py-2 rounded-full bg-primary/6 border border-primary/10">
        <div className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))] animate-pulse" />
        <p className="text-xs text-primary tracking-wide">
          Сквозное шифрование
        </p>
      </div>
      
      <p className="mt-6 text-[11px] text-muted-foreground/40 tracking-wider uppercase">
        Защита от просмотра сообщений третьими лицами
      </p>
    </div>
  );
};
