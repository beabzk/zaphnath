import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import type { AppSettings } from '@/types/settings';
import { APP_SETTINGS_DB_KEY, mergeSettingsWithDefaults } from './settingsState';

type SettingsPersistenceArgs = {
  settings: AppSettings;
  setSettings: Dispatch<SetStateAction<AppSettings>>;
  isLoading: boolean;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: Dispatch<SetStateAction<boolean>>;
};

export function useSettingsPersistence({
  settings,
  setSettings,
  isLoading,
  setIsLoading,
  hasUnsavedChanges,
  setHasUnsavedChanges,
}: SettingsPersistenceArgs) {
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const dbSettings = await window.database.getSetting(APP_SETTINGS_DB_KEY);

        if (dbSettings) {
          setSettings(mergeSettingsWithDefaults(JSON.parse(dbSettings) as unknown));
          return;
        }

        const seededDefaults = mergeSettingsWithDefaults({});
        setSettings(seededDefaults);
        await window.database.setSetting(APP_SETTINGS_DB_KEY, JSON.stringify(seededDefaults));
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings(mergeSettingsWithDefaults({}));
      } finally {
        setIsLoading(false);
      }
    };

    void loadSettings().catch((error) => {
      console.error('Failed to initialize settings:', error);
      setSettings(mergeSettingsWithDefaults({}));
      setIsLoading(false);
    });
  }, [setIsLoading, setSettings]);

  const saveSettings = useCallback(async (): Promise<void> => {
    try {
      await window.database.setSetting(APP_SETTINGS_DB_KEY, JSON.stringify(settings));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, [settings, setHasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges || isLoading) {
      return;
    }

    const timeoutId = setTimeout(() => {
      saveSettings().catch(console.error);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [hasUnsavedChanges, isLoading, saveSettings]);

  return {
    saveSettings,
  };
}
