import * as Sentry from '@sentry/electron/main';
import { telemetryService } from './services/telemetry/index.js';

const dsn = process.env.SENTRY_DSN;

if (!dsn) {
  console.log('[Sentry] Main process DSN missing, crash reporting disabled');
} else {
  // Load persisted preference before app ready to avoid reporting without consent.
  telemetryService
    .loadPreferencesFromDatabase()
    .then((preferences) => {
      telemetryService.applyPreferences(preferences);
    })
    .catch((error) => {
      console.warn('[Sentry] Failed to load persisted telemetry preferences:', error);
    });

  Sentry.init({
    dsn,
    release: process.env.SENTRY_RELEASE,
    tracesSampler: () => (telemetryService.getPreferences().crashReportingEnabled ? 0.2 : 0),
    beforeSend: (event) => {
      if (!telemetryService.getPreferences().crashReportingEnabled) {
        return null;
      }
      return event;
    },
    beforeSendTransaction: (transaction) => {
      if (!telemetryService.getPreferences().crashReportingEnabled) {
        return null;
      }
      return transaction;
    },
    enableLogs: true,
  });

  console.log('[Sentry] Main process initialized with consent-aware filtering');
}

console.log(
  '[Sentry] Main process initialized with DSN:',
  dsn ? 'configured' : 'MISSING'
);
