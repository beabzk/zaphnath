import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export interface TelemetryPreferences {
  crashReportingEnabled: boolean;
  sessionReplayEnabled: boolean;
}

const APP_SETTINGS_DB_KEY = 'app_settings';

const defaultTelemetryPreferences: TelemetryPreferences = {
  crashReportingEnabled: false,
  sessionReplayEnabled: false,
};

const normalizeTelemetryPreferences = (
  input?: Partial<TelemetryPreferences> | null
): TelemetryPreferences => ({
  crashReportingEnabled:
    input?.crashReportingEnabled ?? defaultTelemetryPreferences.crashReportingEnabled,
  sessionReplayEnabled:
    input?.sessionReplayEnabled ?? defaultTelemetryPreferences.sessionReplayEnabled,
});

const parseTelemetryPreferencesFromAppSettings = (
  serializedSettings: string | null
): TelemetryPreferences => {
  if (!serializedSettings) {
    return { ...defaultTelemetryPreferences };
  }

  try {
    const parsed = JSON.parse(serializedSettings) as {
      advanced?: {
        enableCrashReporting?: boolean;
        enableSessionReplay?: boolean;
      };
    };

    return normalizeTelemetryPreferences({
      crashReportingEnabled: parsed.advanced?.enableCrashReporting,
      sessionReplayEnabled: parsed.advanced?.enableSessionReplay,
    });
  } catch {
    return { ...defaultTelemetryPreferences };
  }
};

class TelemetryService {
  private static instance: TelemetryService;
  private preferences: TelemetryPreferences = { ...defaultTelemetryPreferences };

  private constructor() {}

  static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  applyPreferences(input: Partial<TelemetryPreferences>): TelemetryPreferences {
    const nextPreferences = normalizeTelemetryPreferences(input);
    this.preferences = nextPreferences;

    return { ...this.preferences };
  }

  applyAppSettingsPayload(serializedSettings: string | null): TelemetryPreferences {
    const parsed = parseTelemetryPreferencesFromAppSettings(serializedSettings);
    return this.applyPreferences(parsed);
  }

  async loadPreferencesFromDatabase(): Promise<TelemetryPreferences> {
    try {
      const dbPath = path.join(app.getPath('userData'), 'databases', 'zaphnath.db');

      if (!existsSync(dbPath)) {
        return { ...defaultTelemetryPreferences };
      }

      const db = new Database(dbPath, { readonly: true, fileMustExist: true });
      try {
        const row = db
          .prepare('SELECT value FROM user_settings WHERE key = ?')
          .get(APP_SETTINGS_DB_KEY) as { value: string } | undefined;
        return parseTelemetryPreferencesFromAppSettings(row?.value ?? null);
      } finally {
        db.close();
      }
    } catch (error) {
      console.warn('[Sentry] Failed to read telemetry preferences from database:', error);
      return { ...defaultTelemetryPreferences };
    }
  }

  getPreferences(): TelemetryPreferences {
    return { ...this.preferences };
  }
}

export const telemetryService = TelemetryService.getInstance();
