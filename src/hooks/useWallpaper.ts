import { useState, useEffect, createContext, useContext } from 'react';

export interface Wallpaper {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'pattern' | 'image';
  value: string;
  preview: string;
}

export const WALLPAPERS: Wallpaper[] = [
  // Premium solids
  { 
    id: 'default', 
    name: 'Шампань', 
    type: 'solid',
    value: 'hsl(var(--chat-wallpaper))',
    preview: 'bg-[hsl(40,18%,94%)] dark:bg-[hsl(20,15%,7%)]'
  },
  { 
    id: 'noir', 
    name: 'Нуар', 
    type: 'solid',
    value: 'hsl(20 15% 6%)',
    preview: 'bg-[hsl(20,15%,6%)]'
  },
  { 
    id: 'obsidian', 
    name: 'Обсидиан', 
    type: 'solid',
    value: 'hsl(220 20% 8%)',
    preview: 'bg-[hsl(220,20%,8%)]'
  },
  { 
    id: 'mahogany', 
    name: 'Красное дерево', 
    type: 'solid',
    value: 'hsl(10 35% 12%)',
    preview: 'bg-[hsl(10,35%,12%)]'
  },
  { 
    id: 'onyx', 
    name: 'Оникс', 
    type: 'solid',
    value: 'hsl(0 0% 8%)',
    preview: 'bg-[hsl(0,0%,8%)]'
  },
  { 
    id: 'slate', 
    name: 'Графит', 
    type: 'solid',
    value: 'hsl(215 15% 14%)',
    preview: 'bg-[hsl(215,15%,14%)]'
  },
  
  // Premium gradients
  { 
    id: 'black-gold', 
    name: 'Чёрное золото', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(20 15% 7%), hsl(43 30% 12%), hsl(20 18% 6%))',
    preview: 'bg-gradient-to-br from-neutral-950 via-amber-950/50 to-neutral-950'
  },
  { 
    id: 'royal', 
    name: 'Королевский', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(260 40% 12%), hsl(280 35% 10%))',
    preview: 'bg-gradient-to-br from-purple-950 to-violet-950'
  },
  { 
    id: 'velvet', 
    name: 'Бархат', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(340 45% 12%), hsl(355 35% 8%))',
    preview: 'bg-gradient-to-br from-rose-950 to-red-950'
  },
  { 
    id: 'midnight-sapphire', 
    name: 'Полночный сапфир', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(220 50% 10%), hsl(240 45% 8%))',
    preview: 'bg-gradient-to-br from-blue-950 to-indigo-950'
  },
  { 
    id: 'bronze', 
    name: 'Бронза', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(25 40% 14%), hsl(35 35% 10%))',
    preview: 'bg-gradient-to-br from-orange-950 to-amber-950'
  },
  { 
    id: 'deep-emerald', 
    name: 'Глубокий изумруд', 
    type: 'gradient',
    value: 'linear-gradient(180deg, hsl(155 45% 10%), hsl(165 40% 7%))',
    preview: 'bg-gradient-to-b from-emerald-950 to-teal-950'
  },
];

export interface ThemeColor {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export const THEME_COLORS: ThemeColor[] = [
  { id: 'default', name: 'Золото', primary: '43 74% 49%', accent: '43 50% 92%' },
  { id: 'platinum', name: 'Платина', primary: '220 10% 55%', accent: '220 15% 92%' },
  { id: 'rose-gold', name: 'Розовое золото', primary: '10 60% 55%', accent: '10 50% 92%' },
  { id: 'emerald', name: 'Изумруд', primary: '155 60% 40%', accent: '155 50% 92%' },
  { id: 'sapphire', name: 'Сапфир', primary: '220 75% 50%', accent: '220 65% 92%' },
  { id: 'amethyst', name: 'Аметист', primary: '280 55% 50%', accent: '280 45% 92%' },
];

interface WallpaperContextValue {
  currentWallpaper: Wallpaper;
  setWallpaper: (wallpaper: Wallpaper) => void;
  currentThemeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
  wallpapers: Wallpaper[];
  themeColors: ThemeColor[];
}

const WallpaperContext = createContext<WallpaperContextValue | null>(null);

export const useWallpaper = () => {
  const context = useContext(WallpaperContext);
  if (!context) {
    throw new Error('useWallpaper must be used within WallpaperProvider');
  }
  return context;
};

export const useWallpaperState = () => {
  const [currentWallpaper, setCurrentWallpaper] = useState<Wallpaper>(() => {
    const saved = localStorage.getItem('chat-wallpaper');
    if (saved) {
      const found = WALLPAPERS.find(w => w.id === saved);
      if (found) return found;
    }
    return WALLPAPERS[0];
  });

  const [currentThemeColor, setCurrentThemeColor] = useState<ThemeColor>(() => {
    const saved = localStorage.getItem('theme-color');
    if (saved) {
      const found = THEME_COLORS.find(c => c.id === saved);
      if (found) return found;
    }
    return THEME_COLORS[0];
  });

  // Apply wallpaper CSS
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--chat-wallpaper-custom', currentWallpaper.value);
    localStorage.setItem('chat-wallpaper', currentWallpaper.id);
  }, [currentWallpaper]);

  // Apply theme color CSS
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', currentThemeColor.primary);
    root.style.setProperty('--accent', currentThemeColor.accent);
    root.style.setProperty('--ring', currentThemeColor.primary);
    localStorage.setItem('theme-color', currentThemeColor.id);
  }, [currentThemeColor]);

  const setWallpaper = (wallpaper: Wallpaper) => {
    setCurrentWallpaper(wallpaper);
  };

  const setThemeColor = (color: ThemeColor) => {
    setCurrentThemeColor(color);
  };

  return {
    currentWallpaper,
    setWallpaper,
    currentThemeColor,
    setThemeColor,
    wallpapers: WALLPAPERS,
    themeColors: THEME_COLORS,
  };
};

export { WallpaperContext };
