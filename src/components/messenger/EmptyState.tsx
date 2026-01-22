import maskLogo from '@/assets/mask-logo.png';

export const EmptyState = () => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center h-full bg-gradient-to-br from-[hsl(20,15%,7%)] via-[hsl(25,12%,9%)] to-[hsl(20,18%,6%)]">
      {/* Ambient glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/5 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative group">
        {/* Golden glow behind logo */}
        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-yellow-500/10 to-amber-600/20 rounded-full blur-3xl scale-150 group-hover:scale-[1.7] transition-transform duration-700" />
        <div className="absolute inset-0 bg-amber-400/10 rounded-full blur-2xl animate-glow-pulse" />
        <img 
          src={maskLogo} 
          alt="МАСК Logo" 
          className="relative w-44 h-44 object-contain drop-shadow-[0_0_40px_rgba(212,175,55,0.3)] group-hover:scale-105 transition-transform duration-500"
        />
      </div>
      
      <h2 className="mt-8 text-3xl font-bold tracking-tight">
        <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
          МАСК
        </span>
        <span className="text-amber-100/80 ml-2 font-normal">Messenger</span>
      </h2>
      
      <p className="mt-4 text-amber-100/50 text-center max-w-sm text-base">
        Выберите чат из списка слева, чтобы начать общение
      </p>
      
      <div className="mt-8 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <p className="text-xs text-amber-200/70">
          Сквозное шифрование
        </p>
      </div>
      
      <p className="mt-6 text-xs text-amber-100/30">
        Защита от просмотра сообщений третьими лицами
      </p>
    </div>
  );
};
