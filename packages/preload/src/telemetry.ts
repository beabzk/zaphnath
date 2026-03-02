import * as Sentry from '@sentry/electron/renderer';

export interface TelemetryPreferences {
  crashReportingEnabled: boolean;
  sessionReplayEnabled: boolean;
}

const defaultTelemetryPreferences: TelemetryPreferences = {
  crashReportingEnabled: false,
  sessionReplayEnabled: false,
};

let currentTelemetryPreferences: TelemetryPreferences = { ...defaultTelemetryPreferences };
let sentryInitialized = false;

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

const closeSentryClient = async () => {
  if (!sentryInitialized) {
    return;
  }

  sentryInitialized = false;
  console.info(
    '[Sentry] Preload telemetry settings changed. Restart the app for the change to be fully applied.'
  );
};

export const applyPreloadTelemetryPreferences = async (
  preferences: Partial<TelemetryPreferences>
): Promise<TelemetryPreferences> => {
  const nextPreferences = normalizeTelemetryPreferences(preferences);
  const hasSettingsChanged =
    nextPreferences.crashReportingEnabled !== currentTelemetryPreferences.crashReportingEnabled ||
    nextPreferences.sessionReplayEnabled !== currentTelemetryPreferences.sessionReplayEnabled;

  currentTelemetryPreferences = nextPreferences;

  const hasDsn = Boolean(process.env.SENTRY_DSN);
  const shouldEnableSentry = nextPreferences.crashReportingEnabled && hasDsn;

  if (!shouldEnableSentry) {
    await closeSentryClient();

    if (nextPreferences.crashReportingEnabled && !hasDsn) {
      console.warn('[Sentry] Crash reporting is enabled but SENTRY_DSN is missing in preload.');
    }

    return { ...currentTelemetryPreferences };
  }

  if (sentryInitialized && !hasSettingsChanged) {
    return { ...currentTelemetryPreferences };
  }

  if (sentryInitialized) {
    await closeSentryClient();
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.SENTRY_RELEASE,
  });

  sentryInitialized = true;

  return { ...currentTelemetryPreferences };
};

export const bootstrapPreloadTelemetry = async (
  readAppSettings: () => Promise<string | null>,
  options?: { attempts?: number; retryDelayMs?: number }
): Promise<TelemetryPreferences> => {
  const attempts = options?.attempts ?? 8;
  const retryDelayMs = options?.retryDelayMs ?? 400;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const serializedSettings = await readAppSettings();
      const preferences = parseTelemetryPreferencesFromAppSettings(serializedSettings);
      return await applyPreloadTelemetryPreferences(preferences);
    } catch (error) {
      if (attempt === attempts) {
        console.warn('[Sentry] Failed to bootstrap preload telemetry preferences:', error);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  return applyPreloadTelemetryPreferences(defaultTelemetryPreferences);
};
