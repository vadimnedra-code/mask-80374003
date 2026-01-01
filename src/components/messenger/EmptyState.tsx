import maskLogo from '@/assets/mask-logo.png';

export const EmptyState = () => {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center h-full bg-[#111b21]">
      <div className="relative">
        <div className="absolute inset-0 bg-[#00a884]/10 rounded-full blur-3xl scale-150" />
        <img 
          src={maskLogo} 
          alt="МАСК Logo" 
          className="relative w-40 h-40 object-contain opacity-80"
        />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-[#e9edef]">МАСК Messenger</h2>
      <p className="mt-2 text-[#8696a0] text-center max-w-sm">
        Выберите чат из списка слева, чтобы начать общение
      </p>
      <p className="mt-6 text-xs text-[#8696a0]/60">
        Защита от просмотра сообщений третьими лицами
      </p>
    </div>
  );
};
