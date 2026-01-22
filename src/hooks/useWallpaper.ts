import { useState, useEffect, createContext, useContext } from 'react';

export interface Wallpaper {
  id: string;
  name: string;
  type: 'solid' | 'gradient' | 'pattern' | 'image';
  value: string;
  preview: string;
}

export const WALLPAPERS: Wallpaper[] = [
  // Solid colors
  { 
    id: 'default', 
    name: 'Классический', 
    type: 'solid',
    value: 'hsl(var(--chat-wallpaper))',
    preview: 'bg-[hsl(37,26%,89%)] dark:bg-[hsl(200,15%,9%)]'
  },
  { 
    id: 'dark-teal', 
    name: 'Тёмный бирюзовый', 
    type: 'solid',
    value: 'hsl(200 20% 12%)',
    preview: 'bg-[hsl(200,20%,12%)]'
  },
  { 
    id: 'midnight', 
    name: 'Полночь', 
    type: 'solid',
    value: 'hsl(230 25% 10%)',
    preview: 'bg-[hsl(230,25%,10%)]'
  },
  { 
    id: 'warm-gray', 
    name: 'Тёплый серый', 
    type: 'solid',
    value: 'hsl(30 10% 20%)',
    preview: 'bg-[hsl(30,10%,20%)]'
  },
  { 
    id: 'forest', 
    name: 'Лесной', 
    type: 'solid',
    value: 'hsl(150 30% 12%)',
    preview: 'bg-[hsl(150,30%,12%)]'
  },
  { 
    id: 'ocean', 
    name: 'Океан', 
    type: 'solid',
    value: 'hsl(210 40% 15%)',
    preview: 'bg-[hsl(210,40%,15%)]'
  },
  
  // Gradients
  { 
    id: 'sunset', 
    name: 'Закат', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(340 60% 20%), hsl(280 50% 15%))',
    preview: 'bg-gradient-to-br from-rose-900 to-purple-950'
  },
  { 
    id: 'aurora', 
    name: 'Сияние', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(180 50% 15%), hsl(260 60% 20%))',
    preview: 'bg-gradient-to-br from-teal-900 to-indigo-900'
  },
  { 
    id: 'moss', 
    name: 'Мох', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(160 40% 12%), hsl(120 30% 18%))',
    preview: 'bg-gradient-to-br from-emerald-950 to-green-900'
  },
  { 
    id: 'cosmic', 
    name: 'Космос', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(250 60% 12%), hsl(290 50% 10%))',
    preview: 'bg-gradient-to-br from-indigo-950 to-purple-950'
  },
  { 
    id: 'warm-dusk', 
    name: 'Сумерки', 
    type: 'gradient',
    value: 'linear-gradient(135deg, hsl(20 40% 15%), hsl(350 30% 12%))',
    preview: 'bg-gradient-to-br from-amber-950 to-rose-950'
  },
  { 
    id: 'deep-sea', 
    name: 'Глубина', 
    type: 'gradient',
    value: 'linear-gradient(180deg, hsl(200 50% 12%), hsl(220 60% 8%))',
    preview: 'bg-gradient-to-b from-cyan-950 to-blue-950'
  },
];

export interface ThemeColor {
  id: string;
  name: string;
  primary: string;
  accent: string;
}

export const THEME_COLORS: ThemeColor[] = [
  { id: 'default', name: 'WhatsApp', primary: '142 70% 45%', accent: '142 60% 94%' },
  { id: 'blue', name: 'Telegram', primary: '210 100% 50%', accent: '210 80% 94%' },
  { id: 'purple', name: 'Violet', primary: '270 70% 55%', accent: '270 60% 94%' },
  { id: 'rose', name: 'Rose', primary: '350 80% 55%', accent: '350 70% 94%' },
  { id: 'amber', name: 'Amber', primary: '38 92% 50%', accent: '38 80% 94%' },
  { id: 'cyan', name: 'Cyan', primary: '185 80% 45%', accent: '185 70% 94%' },
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
