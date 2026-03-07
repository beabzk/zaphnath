import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppSettings, defaultSettings, settingsValidation } from '@/types/settings';
import { logger } from '@/services/logger';
import { performanceMonitor } from '@/services/performanceMonitor';
import { applySentryPrivacySettings } from '@/services/sentry';

const APP_SETTINGS_DB_KEY = 'app_settings';

type SettingsProviderProps = {
  children: React.ReactNode;
};

type SettingsProviderState = {
  settings: AppSettings;
  updateSetting: <T extends keyof AppSettings>(
    category: T,
    key: keyof AppSettings[T],
    value: AppSettings[T][keyof AppSettings[T]]
  ) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetSettings: () => void;
  resetCategory: (category: keyof AppSettings) => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => Promise<boolean>;
  validateSetting: (path: string, value: any) => boolean;
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  saveSettings: () => Promise<void>;
};

const initialState: SettingsProviderState = {
  settings: defaultSettings,
  updateSetting: () => null,
  updateSettings: () => null,
  resetSettings: () => null,
  resetCategory: () => null,
  exportSettings: () => '',
  importSettings: async () => false,
  validateSetting: () => true,
  isLoading: false,
  hasUnsavedChanges: false,
  saveSettings: async () => {},
};

const SettingsProviderContext = createContext<SettingsProviderState>(initialState);

const isDoNotTrackEnabled = (): boolean => {
  const navigatorWithLegacyDoNotTrack = navigator as Navigator & { msDoNotTrack?: string };
  const windowWithDoNotTrack = window as Window & { doNotTrack?: string };

  return (
    navigator.doNotTrack === '1' ||
    windowWithDoNotTrack.doNotTrack === '1' ||
    navigatorWithLegacyDoNotTrack.msDoNotTrack === '1'
  );
};

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load settings from database on mount and seed defaults when missing.
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const dbSettings = await window.database.getSetting(APP_SETTINGS_DB_KEY);

        if (dbSettings) {
          const parsedSettings = JSON.parse(dbSettings) as AppSettings;
          const mergedSettings = mergeWithDefaults(parsedSettings, defaultSettings);
          setSettings(mergedSettings);
          return;
        }

        const seededDefaults = mergeWithDefaults({}, defaultSettings);
        setSettings(seededDefaults);
        await window.database.setSetting(APP_SETTINGS_DB_KEY, JSON.stringify(seededDefaults));
      } catch (error) {
        console.error('Failed to load settings:', error);
        // Fall back to defaults
        setSettings(mergeWithDefaults({}, defaultSettings));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings().catch((error) => {
      console.error('Failed to initialize settings:', error);
      setSettings(mergeWithDefaults({}, defaultSettings));
      setIsLoading(false);
    });
  }, []);

  // Deep merge settings with defaults
  const mergeWithDefaults = (stored: unknown, defaults: AppSettings): AppSettings => {
    if (!stored || typeof stored !== 'object') {
      return {
        ...defaults,
        version: defaults.version,
        lastModified: new Date().toISOString(),
      };
    }

    const storedRecord = stored as Record<string, any>;
    const merged = { ...defaults };

    for (const [category, categorySettings] of Object.entries(storedRecord)) {
      if (category in merged && typeof categorySettings === 'object' && categorySettings !== null) {
        const currentCategory = merged[category as keyof AppSettings];
        if (typeof currentCategory === 'object' && currentCategory !== null) {
          merged[category as keyof AppSettings] = {
            ...currentCategory,
            ...categorySettings,
          } as any;
        }
      }
    }

    // Update version and lastModified
    merged.version = defaults.version;
    merged.lastModified = new Date().toISOString();

    return merged;
  };

  // Validate a setting value
  const validateSetting = useCallback((path: string, value: any): boolean => {
    const rule = settingsValidation[path];
    if (!rule) return true;

    switch (rule.type) {
      case 'number':
        if (typeof value !== 'number') return false;
        if (rule.min !== undefined && value < rule.min) return false;
        if (rule.max !== undefined && value > rule.max) return false;
        break;
      case 'string':
        if (typeof value !== 'string') return false;
        if (rule.enum && !rule.enum.includes(value)) return false;
        break;
      case 'boolean':
        if (typeof value !== 'boolean') return false;
        break;
      case 'array':
        if (!Array.isArray(value)) return false;
        break;
    }

    return true;
  }, []);

  // Update a single setting
  const updateSetting = useCallback(
    <T extends keyof AppSettings>(
      category: T,
      key: keyof AppSettings[T],
      value: AppSettings[T][keyof AppSettings[T]]
    ) => {
      const path = `${String(category)}.${String(key)}`;

      if (!validateSetting(path, value)) {
        console.warn(`Invalid setting value for ${path}:`, value);
        return;
      }

      setSettings((prev) => {
        const currentCategory = prev[category];
        return {
          ...prev,
          [category]: {
            ...(currentCategory as any),
            [key]: value,
          },
          lastModified: new Date().toISOString(),
        };
      });

      setHasUnsavedChanges(true);
    },
    [validateSetting]
  );

  // Update multiple settings
  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
      lastModified: new Date().toISOString(),
    }));

    setHasUnsavedChanges(true);
  }, []);

  // Reset all settings to defaults
  const resetSettings = useCallback(() => {
    setSettings({
      ...defaultSettings,
      lastModified: new Date().toISOString(),
    });
    setHasUnsavedChanges(true);
  }, []);

  // Reset a specific category
  const resetCategory = useCallback((category: keyof AppSettings) => {
    setSettings((prev) => ({
      ...prev,
      [category]: defaultSettings[category],
      lastModified: new Date().toISOString(),
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Export settings as JSON
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  // Import settings from JSON
  const importSettings = useCallback(async (settingsJson: string): Promise<boolean> => {
    try {
      const importedSettings = JSON.parse(settingsJson) as AppSettings;
      const mergedSettings = mergeWithDefaults(importedSettings, defaultSettings);
      setSettings(mergedSettings);
      setHasUnsavedChanges(true);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, []);

  // Save settings to database.
  const saveSettings = useCallback(async (): Promise<void> => {
    try {
      const serializedSettings = JSON.stringify(settings);
      await window.database.setSetting(APP_SETTINGS_DB_KEY, serializedSettings);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, [settings]);

  // Auto-save settings when they change (debounced)
  useEffect(() => {
    if (!hasUnsavedChanges || isLoading) return;

    const timeoutId = setTimeout(() => {
      saveSettings().catch(console.error);
    }, 1000); // Auto-save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [settings, hasUnsavedChanges, isLoading, saveSettings]);

  // Keep main-process updater policy in sync with renderer settings
  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;
    const syncUpdatePolicy = async () => {
      try {
        await window.updater.setPolicy(settings.advanced.updatePolicy);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to sync updater policy:', error);
        }
      }
    };

    void syncUpdatePolicy();

    return () => {
      cancelled = true;
    };
  }, [isLoading, settings.advanced.updatePolicy]);

  // Keep renderer logging and analytics runtime behavior in sync with settings.
  useEffect(() => {
    if (isLoading) return;

    let cancelled = false;
    const doNotTrackEnabled = isDoNotTrackEnabled();
    const analyticsAllowedByPrivacy =
      !settings.advanced.analyticsRespectDoNotTrack || !doNotTrackEnabled;
    const analyticsEnabled = settings.advanced.enableAnalytics && analyticsAllowedByPrivacy;

    logger.setConfig({
      enabled: settings.advanced.enableLogging,
      level: settings.advanced.logLevel,
      enableConsole: settings.advanced.enableLogging && settings.advanced.logToConsole,
      maxLogEntries: settings.advanced.loggingMaxEntries,
      enableAnalytics: analyticsEnabled,
      trackPerformanceMetrics: settings.advanced.analyticsTrackPerformance,
      trackUserActions: settings.advanced.analyticsTrackUserActions,
      respectDoNotTrack: settings.advanced.analyticsRespectDoNotTrack,
    });

    performanceMonitor.setEnabled(analyticsEnabled && settings.advanced.analyticsTrackPerformance);

    logger.info(
      'Applied runtime diagnostics settings',
      {
        loggingEnabled: settings.advanced.enableLogging,
        logLevel: settings.advanced.logLevel,
        analyticsEnabled,
        trackPerformance: settings.advanced.analyticsTrackPerformance,
        trackUserActions: settings.advanced.analyticsTrackUserActions,
        respectDoNotTrack: settings.advanced.analyticsRespectDoNotTrack,
        doNotTrackEnabled,
      },
      'system'
    );

    const syncSentryPrivacySettings = async () => {
      const privacySettings = {
        enableCrashReporting: settings.advanced.enableCrashReporting,
        enableSessionReplay: settings.advanced.enableSessionReplay,
      };

      try {
        await applySentryPrivacySettings(privacySettings);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to apply renderer Sentry privacy settings:', error);
        }
      }

      try {
        await window.telemetry.setPreferences({
          crashReportingEnabled: privacySettings.enableCrashReporting,
          sessionReplayEnabled: privacySettings.enableSessionReplay,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to sync telemetry preferences to main process:', error);
        }
      }
    };

    void syncSentryPrivacySettings();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    settings.advanced.enableLogging,
    settings.advanced.logLevel,
    settings.advanced.logToConsole,
    settings.advanced.loggingMaxEntries,
    settings.advanced.enableAnalytics,
    settings.advanced.analyticsTrackPerformance,
    settings.advanced.analyticsTrackUserActions,
    settings.advanced.analyticsRespectDoNotTrack,
    settings.advanced.enableCrashReporting,
    settings.advanced.enableSessionReplay,
  ]);

  const value = {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    resetCategory,
    exportSettings,
    importSettings,
    validateSetting,
    isLoading,
    hasUnsavedChanges,
    saveSettings,
  };

  return (
    <SettingsProviderContext.Provider value={value}>{children}</SettingsProviderContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsProviderContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
