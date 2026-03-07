import { useMemo, useState } from 'react';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/services/logger';
import { performanceMonitor } from '@/services/performanceMonitor';
import {
  AdvancedDatabaseSection,
  AdvancedExperimentalSection,
  AdvancedGeneralSection,
  AdvancedLoggingSection,
  AdvancedPerformanceSection,
  AdvancedPrivacySection,
} from './AdvancedSettingsSections';
import { useSettings } from './SettingsProvider';

export function AdvancedSettings() {
  const { settings, updateSetting } = useSettings();
  const { advanced } = settings;
  const [diagnosticsRefreshTick, setDiagnosticsRefreshTick] = useState(0);

  const doNotTrackEnabled = useMemo(() => {
    const navigatorWithLegacyDoNotTrack = navigator as Navigator & { msDoNotTrack?: string };
    const windowWithDoNotTrack = window as Window & { doNotTrack?: string };

    return (
      navigator.doNotTrack === '1' ||
      windowWithDoNotTrack.doNotTrack === '1' ||
      navigatorWithLegacyDoNotTrack.msDoNotTrack === '1'
    );
  }, []);

  const analyticsActive =
    advanced.enableAnalytics && (!advanced.analyticsRespectDoNotTrack || !doNotTrackEnabled);

  void diagnosticsRefreshTick;

  const diagnosticsStats = {
    logs: logger.getRecentLogs(5000).length,
    errors: logger.getRecentErrors(500).length,
    metrics: performanceMonitor.getMetrics().length,
    actions: logger.getUserActions(1000).length,
  };

  const exportSessionLogs = () => {
    const logsJson = logger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `zaphnath-session-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const clearDiagnostics = () => {
    logger.clearLogs();
    performanceMonitor.clearMetrics();
    setDiagnosticsRefreshTick((tick) => tick + 1);
  };

  const updateAdvancedSetting = <K extends keyof typeof advanced>(
    key: K,
    value: (typeof advanced)[K]
  ) => {
    updateSetting('advanced', key, value);
  };

  const updateDatabaseSetting = <K extends keyof typeof advanced.database>(
    key: K,
    value: (typeof advanced.database)[K]
  ) => {
    updateAdvancedSetting('database', {
      ...advanced.database,
      [key]: value,
    });
  };

  const updatePerformanceSetting = <K extends keyof typeof advanced.performance>(
    key: K,
    value: (typeof advanced.performance)[K]
  ) => {
    updateAdvancedSetting('performance', {
      ...advanced.performance,
      [key]: value,
    });
  };

  return (
    <div className="space-y-6">
      <AdvancedGeneralSection advanced={advanced} onAdvancedSettingChange={updateAdvancedSetting} />

      <Separator />

      <AdvancedLoggingSection
        advanced={advanced}
        diagnosticsStats={diagnosticsStats}
        onAdvancedSettingChange={updateAdvancedSetting}
        onClearDiagnostics={clearDiagnostics}
        onExportSessionLogs={exportSessionLogs}
        onRefreshDiagnostics={() => setDiagnosticsRefreshTick((tick) => tick + 1)}
      />

      <Separator />

      <AdvancedPrivacySection
        advanced={advanced}
        analyticsActive={analyticsActive}
        doNotTrackEnabled={doNotTrackEnabled}
        onAdvancedSettingChange={updateAdvancedSetting}
      />

      <Separator />

      <AdvancedDatabaseSection
        advanced={advanced}
        onDatabaseSettingChange={updateDatabaseSetting}
      />

      <Separator />

      <AdvancedPerformanceSection
        advanced={advanced}
        onPerformanceSettingChange={updatePerformanceSetting}
      />

      <Separator />

      <AdvancedExperimentalSection
        advanced={advanced}
        onAdvancedSettingChange={updateAdvancedSetting}
      />
    </div>
  );
}
