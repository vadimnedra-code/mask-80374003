import { X, Check, Image, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWallpaper, WALLPAPERS, THEME_COLORS } from '@/hooks/useWallpaper';

interface AppearanceSettingsPanelProps {
  onClose: () => void;
}

export const AppearanceSettingsPanel = ({ onClose }: AppearanceSettingsPanelProps) => {
  const { currentWallpaper, setWallpaper, currentThemeColor, setThemeColor } = useWallpaper();

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-in-right lg:relative lg:animate-none flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-border bg-card pt-[max(1rem,env(safe-area-inset-top))]">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-display font-semibold">Оформление</h1>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin pb-[env(safe-area-inset-bottom)]">
        {/* Theme Colors Section */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold">Цвет темы</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {THEME_COLORS.map((color) => (
              <button
                key={color.id}
                onClick={() => setThemeColor(color)}
                className={cn(
                  'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all',
                  currentThemeColor.id === color.id
                    ? 'border-primary bg-primary/10'
                    : 'border-transparent bg-muted/50 hover:bg-muted'
                )}
              >
                <div 
                  className="w-10 h-10 rounded-full shadow-md mb-2"
                  style={{ backgroundColor: `hsl(${color.primary})` }}
                />
                <span className="text-xs font-medium">{color.name}</span>
                {currentThemeColor.id === color.id && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Wallpapers Section */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-primary" />
            <h2 className="font-display font-semibold">Фон чата</h2>
          </div>
          
          {/* Preview */}
          <div 
            className={cn(
              'mb-4 h-32 rounded-xl overflow-hidden relative',
              currentWallpaper.id === 'default' && 'chat-wallpaper'
            )}
            style={{
              background: currentWallpaper.id !== 'default' ? currentWallpaper.value : undefined
            }}
          >
            {/* Sample message bubbles */}
            <div className="absolute inset-0 p-4 flex flex-col justify-center gap-2">
              <div className="self-start max-w-[60%] px-3 py-2 rounded-lg bg-card text-card-foreground text-xs">
                Привет! 👋
              </div>
              <div className="self-end max-w-[60%] px-3 py-2 rounded-lg bg-message-sent text-message-sent-foreground text-xs">
                Отлично выглядит!
              </div>
            </div>
          </div>
          
          {/* Wallpaper Grid */}
          <div className="grid grid-cols-3 gap-3">
            {WALLPAPERS.map((wallpaper) => (
              <button
                key={wallpaper.id}
                onClick={() => setWallpaper(wallpaper)}
                className={cn(
                  'relative aspect-square rounded-xl overflow-hidden border-2 transition-all',
                  currentWallpaper.id === wallpaper.id
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-transparent hover:border-muted-foreground/30',
                  wallpaper.id === 'default' && 'chat-wallpaper'
                )}
                style={{
                  background: wallpaper.id !== 'default' ? wallpaper.value : undefined
                }}
              >
                {currentWallpaper.id === wallpaper.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Check className="w-6 h-6 text-white drop-shadow-lg" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white text-[10px] text-center truncate">
                  {wallpaper.name}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Выбранные настройки сохраняются автоматически
          </p>
        </div>
      </div>
    </div>
  );
};
