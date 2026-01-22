import { ReactNode } from 'react';
import { WallpaperContext, useWallpaperState } from '@/hooks/useWallpaper';

interface WallpaperProviderProps {
  children: ReactNode;
}

export const WallpaperProvider = ({ children }: WallpaperProviderProps) => {
  const wallpaperState = useWallpaperState();
  
  return (
    <WallpaperContext.Provider value={wallpaperState}>
      {children}
    </WallpaperContext.Provider>
  );
};
