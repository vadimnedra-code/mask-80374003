import React from 'react';

export interface EnergySavingSettings {
  enabled: boolean;
  disableAnimations: boolean;
  reduceRealtimeUpdates: boolean;
  disableTypingIndicators: boolean;
  disableAutoRefresh: boolean;
  reducedPollingInterval: number;
}

const DEFAULT_SETTINGS: EnergySavingSettings = {
  enabled: false,
  disableAnimations: false,
  reduceRealtimeUpdates: true,
  disableTypingIndicators: true,
  disableAutoRefresh: true,
  reducedPollingInterval: 60000,
};

const STORAGE_KEY = 'energy_saving_settings';

export const useEnergySaving = () => {
  const [settings, setSettings] = React.useState<EnergySavingSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load energy saving settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save energy saving settings:', e);
    }
  }, [settings]);

  React.useEffect(() => {
    if (settings.enabled && settings.disableAnimations) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [settings.enabled, settings.disableAnimations]);

  const toggleEnergySaving = React.useCallback((enabled: boolean) => {
    setSettings(prev => ({ ...prev, enabled }));
  }, []);

  const updateSetting = React.useCallback(
    (key: keyof EnergySavingSettings, value: boolean | number) => {
      setSettings(prev => ({ ...prev, [key]: value }));
    },
    []
  );

  const isFeatureDisabled = React.useCallback(
    (feature: 'animations' | 'typing' | 'autoRefresh' | 'realtime') => {
      if (!settings.enabled) return false;
      switch (feature) {
        case 'animations':
          return settings.disableAnimations;
        case 'typing':
          return settings.disableTypingIndicators;
        case 'autoRefresh':
          return settings.disableAutoRefresh;
        case 'realtime':
          return settings.reduceRealtimeUpdates;
        default:
          return false;
      }
    },
    [settings]
  );

  const getPollingInterval = React.useCallback(
    (defaultInterval: number) => {
      if (settings.enabled && settings.reduceRealtimeUpdates) {
        return Math.max(settings.reducedPollingInterval, defaultInterval * 3);
      }
      return defaultInterval;
    },
    [settings]
  );

  return {
    settings,
    toggleEnergySaving,
    updateSetting,
    isFeatureDisabled,
    getPollingInterval,
    isEnergySavingEnabled: settings.enabled,
  };
};

interface EnergySavingContextType {
  settings: EnergySavingSettings;
  toggleEnergySaving: (enabled: boolean) => void;
  updateSetting: (key: keyof EnergySavingSettings, value: boolean | number) => void;
  isFeatureDisabled: (feature: 'animations' | 'typing' | 'autoRefresh' | 'realtime') => boolean;
  getPollingInterval: (defaultInterval: number) => number;
  isEnergySavingEnabled: boolean;
}

const EnergySavingContext = React.createContext<EnergySavingContextType | null>(null);

export function EnergySavingProvider(props: { children: React.ReactNode }) {
  const value = useEnergySaving();
  return React.createElement(
    EnergySavingContext.Provider,
    { value },
    props.children
  );
}

export function useEnergySavingContext(): EnergySavingContextType {
  const context = React.useContext(EnergySavingContext);
  if (!context) {
    return {
      settings: DEFAULT_SETTINGS,
      toggleEnergySaving: () => {},
      updateSetting: () => {},
      isFeatureDisabled: () => false,
      getPollingInterval: (d: number) => d,
      isEnergySavingEnabled: false,
    };
  }
  return context;
}
