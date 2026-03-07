import { useEffect } from 'react';
import type { AppSettings } from '@/types/settings';
import { logger } from '@/services/logger';
import { performanceMonitor } from '@/services/performanceMonitor';
import { applySentryPrivacySettings } from '@/services/sentry';

type SettingsRuntimeSyncArgs = {
  settings: AppSettings;
  isLoading: boolean;
};

const isDoNotTrackEnabled = (): boolean => {
  const navigatorWithLegacyDoNotTrack = navigator as Navigator & { msDoNotTrack?: string };
  const windowWithDoNotTrack = window as Window & { doNotTrack?: string };

  return (
    navigator.doNotTrack === '1' ||
    windowWithDoNotTrack.doNotTrack === '1' ||
    navigatorWithLegacyDoNotTrack.msDoNotTrack === '1'
  );
};

export function useSettingsRuntimeSync({ settings, isLoading }: SettingsRuntimeSyncArgs) {
  useEffect(() => {
    if (isLoading) {
      return;
    }

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

  useEffect(() => {
    if (isLoading) {
      return;
    }

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
}
