import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import {
  AppSettings,
  defaultSettings,
  EditableAppSettings,
  SettingsSectionKey,
  SettingsSectionValue,
} from '@/types/settings';
import {
  mergeSettingsWithDefaults,
  updateSettingsTimestamp,
  validateSettingsValue,
} from './settingsState';
import { useSettingsPersistence } from './useSettingsPersistence';
import { useSettingsRuntimeSync } from './useSettingsRuntimeSync';

type SettingsProviderProps = {
  children: ReactNode;
};

type SettingsProviderState = {
  settings: AppSettings;
  updateSetting: <T extends SettingsSectionKey, K extends keyof SettingsSectionValue<T>>(
    category: T,
    key: K,
    value: SettingsSectionValue<T>[K]
  ) => void;
  updateSettings: (newSettings: Partial<EditableAppSettings>) => void;
  resetSettings: () => void;
  resetCategory: (category: SettingsSectionKey) => void;
  exportSettings: () => string;
  importSettings: (settingsJson: string) => Promise<boolean>;
  validateSetting: (path: string, value: unknown) => boolean;
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

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const { saveSettings } = useSettingsPersistence({
    settings,
    setSettings,
    isLoading,
    setIsLoading,
    hasUnsavedChanges,
    setHasUnsavedChanges,
  });

  useSettingsRuntimeSync({ settings, isLoading });

  const validateSetting = useCallback((path: string, value: unknown): boolean => {
    return validateSettingsValue(path, value);
  }, []);

  const updateSetting = useCallback(
    <T extends SettingsSectionKey, K extends keyof SettingsSectionValue<T>>(
      category: T,
      key: K,
      value: SettingsSectionValue<T>[K]
    ) => {
      const path = `${String(category)}.${String(key)}`;

      if (!validateSetting(path, value)) {
        console.warn(`Invalid setting value for ${path}:`, value);
        return;
      }

      setSettings((prev) => {
        const currentCategory = prev[category];
        return updateSettingsTimestamp({
          ...prev,
          [category]: {
            ...currentCategory,
            [key]: value,
          },
        }) as AppSettings;
      });

      setHasUnsavedChanges(true);
    },
    [validateSetting]
  );

  const updateSettings = useCallback((newSettings: Partial<EditableAppSettings>) => {
    setSettings((prev) => updateSettingsTimestamp({ ...prev, ...newSettings }) as AppSettings);

    setHasUnsavedChanges(true);
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(updateSettingsTimestamp(defaultSettings) as AppSettings);
    setHasUnsavedChanges(true);
  }, []);

  const resetCategory = useCallback((category: SettingsSectionKey) => {
    setSettings(
      (prev) =>
        updateSettingsTimestamp({
          ...prev,
          [category]: defaultSettings[category],
        }) as AppSettings
    );
    setHasUnsavedChanges(true);
  }, []);

  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback(async (settingsJson: string): Promise<boolean> => {
    try {
      setSettings(mergeSettingsWithDefaults(JSON.parse(settingsJson) as unknown));
      setHasUnsavedChanges(true);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }, []);

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
