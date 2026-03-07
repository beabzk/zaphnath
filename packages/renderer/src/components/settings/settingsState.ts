import {
  AppSettings,
  defaultSettings,
  settingsValidation,
  type EditableAppSettings,
  type SettingsValidationRule,
} from '@/types/settings';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const mergeAppearanceSettings = (stored: unknown): AppSettings['appearance'] => ({
  ...defaultSettings.appearance,
  ...(isRecord(stored) ? stored : {}),
});

const mergeReadingSettings = (stored: unknown): AppSettings['reading'] => {
  if (!isRecord(stored)) {
    return defaultSettings.reading;
  }

  const bookmarks = isRecord(stored.bookmarks) ? stored.bookmarks : {};

  return {
    ...defaultSettings.reading,
    ...stored,
    bookmarks: {
      ...defaultSettings.reading.bookmarks,
      ...bookmarks,
    },
  };
};

const mergeAudioSettings = (stored: unknown): AppSettings['audio'] => ({
  ...defaultSettings.audio,
  ...(isRecord(stored) ? stored : {}),
});

const mergeAdvancedSettings = (stored: unknown): AppSettings['advanced'] => {
  if (!isRecord(stored)) {
    return defaultSettings.advanced;
  }

  const database = isRecord(stored.database) ? stored.database : {};
  const performance = isRecord(stored.performance) ? stored.performance : {};

  return {
    ...defaultSettings.advanced,
    ...stored,
    database: {
      ...defaultSettings.advanced.database,
      ...database,
    },
    performance: {
      ...defaultSettings.advanced.performance,
      ...performance,
    },
  };
};

export const APP_SETTINGS_DB_KEY = 'app_settings';

export function mergeSettingsWithDefaults(stored: unknown): AppSettings {
  const source = isRecord(stored) ? stored : {};

  return {
    appearance: mergeAppearanceSettings(source.appearance),
    reading: mergeReadingSettings(source.reading),
    audio: mergeAudioSettings(source.audio),
    advanced: mergeAdvancedSettings(source.advanced),
    version: defaultSettings.version,
    lastModified: new Date().toISOString(),
  };
}

export function updateSettingsTimestamp(
  settings: EditableAppSettings | AppSettings
): EditableAppSettings | AppSettings {
  return {
    ...settings,
    lastModified: new Date().toISOString(),
  };
}

export function validateSettingsValue(path: string, value: unknown): boolean {
  const rule: SettingsValidationRule | undefined = settingsValidation[path];
  if (!rule) {
    return true;
  }

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
}
