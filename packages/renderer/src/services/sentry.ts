import * as Sentry from '@sentry/electron/renderer';
import { defaultSettings, type AdvancedSettings, type AppSettings } from '@/types/settings';

const APP_SETTINGS_DB_KEY = 'app_settings';

type SentryPrivacySettings = Pick<AdvancedSettings, 'enableCrashReporting' | 'enableSessionReplay'>;

const defaultSentryPrivacySettings: SentryPrivacySettings = {
  enableCrashReporting: defaultSettings.advanced.enableCrashReporting,
  enableSessionReplay: defaultSettings.advanced.enableSessionReplay,
};

let currentSentryPrivacySettings: SentryPrivacySettings = { ...defaultSentryPrivacySettings };
let sentryInitialized = false;
let crashReportingEnabled = false;

const normalizeSentryPrivacySettings = (
  input?: Partial<SentryPrivacySettings> | null
): SentryPrivacySettings => ({
  enableCrashReporting:
    input?.enableCrashReporting ?? defaultSentryPrivacySettings.enableCrashReporting,
  enableSessionReplay:
    input?.enableSessionReplay ?? defaultSentryPrivacySettings.enableSessionReplay,
});

const parseSentryPrivacySettingsFromAppSettings = (serializedSettings: string | null) => {
  if (!serializedSettings) {
    return { ...defaultSentryPrivacySettings };
  }

  try {
    const parsed = JSON.parse(serializedSettings) as Partial<AppSettings>;
    return normalizeSentryPrivacySettings(parsed.advanced);
  } catch {
    return { ...defaultSentryPrivacySettings };
  }
};

const closeSentryClient = async () => {
  if (!sentryInitialized) {
    return;
  }

  sentryInitialized = false;
  console.info(
    '[Sentry] Renderer telemetry settings changed. Restart the app for the change to be fully applied.'
  );
};

const buildSessionReplayIntegrations = (settings: SentryPrivacySettings) =>
  settings.enableSessionReplay ? [Sentry.replayIntegration()] : [];

export const loadSentryPrivacySettingsFromDatabase = async (): Promise<SentryPrivacySettings> => {
  try {
    const serializedSettings = await window.database.getSetting(APP_SETTINGS_DB_KEY);
    return parseSentryPrivacySettingsFromAppSettings(serializedSettings);
  } catch (error) {
    console.warn('[Sentry] Failed to load renderer privacy settings:', error);
    return { ...defaultSentryPrivacySettings };
  }
};

export const applySentryPrivacySettings = async (
  input: Partial<SentryPrivacySettings>
): Promise<SentryPrivacySettings> => {
  const nextSettings = normalizeSentryPrivacySettings(input);
  const hasConfigurationChanged =
    nextSettings.enableCrashReporting !== currentSentryPrivacySettings.enableCrashReporting ||
    nextSettings.enableSessionReplay !== currentSentryPrivacySettings.enableSessionReplay;

  currentSentryPrivacySettings = nextSettings;

  const hasDsn = Boolean(import.meta.env.VITE_SENTRY_DSN);
  const shouldEnableSentry = nextSettings.enableCrashReporting && hasDsn;

  if (!shouldEnableSentry) {
    crashReportingEnabled = false;
    await closeSentryClient();

    if (nextSettings.enableCrashReporting && !hasDsn) {
      console.warn('[Sentry] Crash reporting is enabled but VITE_SENTRY_DSN is missing.');
    }

    return { ...currentSentryPrivacySettings };
  }

  if (sentryInitialized && !hasConfigurationChanged) {
    crashReportingEnabled = true;
    return { ...currentSentryPrivacySettings };
  }

  if (sentryInitialized) {
    await closeSentryClient();
  }

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    integrations: buildSessionReplayIntegrations(nextSettings),
    replaysSessionSampleRate: nextSettings.enableSessionReplay
      ? import.meta.env.DEV
        ? 1.0
        : 0.1
      : 0,
    replaysOnErrorSampleRate: nextSettings.enableSessionReplay ? 1.0 : 0,
  });

  sentryInitialized = true;
  crashReportingEnabled = true;

  return { ...currentSentryPrivacySettings };
};

export const bootstrapRendererSentry = async (): Promise<SentryPrivacySettings> => {
  const initialSettings = await loadSentryPrivacySettingsFromDatabase();
  return applySentryPrivacySettings(initialSettings);
};

export const isCrashReportingEnabled = (): boolean => crashReportingEnabled;

export const captureRendererException = (
  error: unknown,
  captureContext?: Parameters<typeof Sentry.captureException>[1]
): void => {
  if (!isCrashReportingEnabled()) {
    return;
  }

  Sentry.captureException(error, captureContext);
};
