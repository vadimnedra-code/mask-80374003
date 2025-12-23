import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mask.messenger',
  appName: 'mask',
  webDir: 'dist',
  server: {
    url: 'https://1ade546d-83ee-4e13-a7e7-565e69fa0b77.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0a1628',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    }
  },
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
