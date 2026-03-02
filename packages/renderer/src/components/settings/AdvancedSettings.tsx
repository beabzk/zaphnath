import { useMemo, useState } from 'react';
import { useSettings } from './SettingsProvider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { logger } from '@/services/logger';
import { performanceMonitor } from '@/services/performanceMonitor';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import {
  HardDrive,
  Database,
  Shield,
  Zap,
  Bug,
  AlertTriangle,
  Folder,
  RefreshCw,
  Trash2,
  Download,
  MousePointerClick,
  Activity,
  Settings as SettingsIcon,
} from 'lucide-react';

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

  const diagnosticsStats = useMemo(
    () => ({
      logs: logger.getRecentLogs(5000).length,
      errors: logger.getRecentErrors(500).length,
      metrics: performanceMonitor.getMetrics().length,
      actions: logger.getUserActions(1000).length,
    }),
    [
      advanced.enableLogging,
      advanced.logLevel,
      advanced.loggingMaxEntries,
      advanced.enableAnalytics,
      advanced.analyticsTrackPerformance,
      advanced.analyticsTrackUserActions,
      advanced.analyticsRespectDoNotTrack,
      diagnosticsRefreshTick,
    ]
  );

  const exportSessionLogs = () => {
    const logsJson = logger.exportLogs();
    const blob = new Blob([logsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zaphnath-session-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearDiagnostics = () => {
    logger.clearLogs();
    performanceMonitor.clearMetrics();
    setDiagnosticsRefreshTick((tick) => tick + 1);
  };

  const SettingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      {children}
    </div>
  );

  const SliderSetting = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = '',
    onChange,
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Badge variant="secondary" className="text-xs">
          {value}
          {unit}
        </Badge>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' },
    { code: 'pt', name: 'Português' },
    { code: 'it', name: 'Italiano' },
    { code: 'ru', name: 'Русский' },
    { code: 'zh', name: '中文' },
    { code: 'ar', name: 'العربية' },
    { code: 'he', name: 'עברית' },
  ];

  const logLevels: Array<{
    value: AdvancedSettingsType['logLevel'];
    name: string;
    description: string;
  }> = [
    { value: 'error', name: 'Error', description: 'Only critical errors' },
    { value: 'warn', name: 'Warning', description: 'Errors and warnings' },
    { value: 'info', name: 'Info', description: 'General information' },
    { value: 'debug', name: 'Debug', description: 'Detailed debugging' },
  ];

  return (
    <div className="space-y-6">
      {/* Language Settings */}
      <SettingGroup title="Language & Region">
        <div className="space-y-2">
          <label className="text-sm font-medium">Interface Language</label>
          <select
            value={advanced.language}
            onChange={(e) => updateSetting('advanced', 'language', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Changes will take effect after restarting the application
          </p>
        </div>
      </SettingGroup>

      <Separator />

      {/* Storage Settings */}
      <SettingGroup title="Storage & Cache">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Data Directory</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={advanced.dataDirectory || 'Default location'}
                readOnly
                className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm"
              />
              <Button variant="outline" size="sm" disabled>
                <Folder className="h-4 w-4 mr-2" />
                Browse
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Location where application data is stored
            </p>
          </div>

          <SliderSetting
            label="Cache Size"
            value={advanced.cacheSize}
            min={100}
            max={2000}
            step={50}
            unit=" MB"
            onChange={(value) => updateSetting('advanced', 'cacheSize', value)}
          />

          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            <Button variant="outline" size="sm" disabled>
              <Trash2 className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
          </div>
        </div>
      </SettingGroup>

      <Separator />

      {/* Logging Settings */}
      <SettingGroup title="Logging & Debugging">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span className="text-sm font-medium">Enable Logging</span>
            </div>
            <Button
              variant={advanced.enableLogging ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('advanced', 'enableLogging', !advanced.enableLogging)}
            >
              {advanced.enableLogging ? 'On' : 'Off'}
            </Button>
          </div>

          {advanced.enableLogging && (
            <div className="space-y-4">
              <label className="text-sm font-medium">Log Level</label>
              <div className="grid grid-cols-2 gap-2">
                {logLevels.map((level) => (
                  <Button
                    key={level.value}
                    variant={advanced.logLevel === level.value ? 'default' : 'outline'}
                    onClick={() => updateSetting('advanced', 'logLevel', level.value)}
                    className="flex-col gap-1 h-auto p-3"
                  >
                    <span className="text-xs font-medium">{level.name}</span>
                    <span className="text-xs text-muted-foreground">{level.description}</span>
                  </Button>
                ))}
              </div>

              <SliderSetting
                label="Max Retained Log Entries"
                value={advanced.loggingMaxEntries}
                min={200}
                max={5000}
                step={100}
                onChange={(value) => updateSetting('advanced', 'loggingMaxEntries', value)}
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  <span className="text-sm font-medium">Mirror Logs to Console</span>
                </div>
                <Button
                  variant={advanced.logToConsole ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSetting('advanced', 'logToConsole', !advanced.logToConsole)}
                >
                  {advanced.logToConsole ? 'On' : 'Off'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-2 text-center">
              <div className="text-xs text-muted-foreground">Logs</div>
              <div className="text-sm font-semibold">{diagnosticsStats.logs}</div>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-2 text-center">
              <div className="text-xs text-muted-foreground">Errors</div>
              <div className="text-sm font-semibold">{diagnosticsStats.errors}</div>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-2 text-center">
              <div className="text-xs text-muted-foreground">Metrics</div>
              <div className="text-sm font-semibold">{diagnosticsStats.metrics}</div>
            </div>
            <div className="rounded-md border border-border/70 bg-muted/20 px-2 py-2 text-center">
              <div className="text-xs text-muted-foreground">Actions</div>
              <div className="text-sm font-semibold">{diagnosticsStats.actions}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDiagnosticsRefreshTick((tick) => tick + 1)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Stats
            </Button>
            <Button variant="outline" size="sm" onClick={exportSessionLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export Session Logs
            </Button>
            <Button variant="outline" size="sm" onClick={clearDiagnostics}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Diagnostics
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Developer Mode</span>
            </div>
            <Button
              variant={advanced.developerMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('advanced', 'developerMode', !advanced.developerMode)}
            >
              {advanced.developerMode ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </SettingGroup>

      <Separator />

      {/* Privacy Settings */}
      <SettingGroup title="Privacy & Security">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Enable Crash Reporting</span>
            </div>
            <Button
              variant={advanced.enableCrashReporting ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'enableCrashReporting', !advanced.enableCrashReporting)
              }
            >
              {advanced.enableCrashReporting ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span className="text-sm font-medium">Enable Session Replay</span>
            </div>
            <Button
              variant={advanced.enableSessionReplay ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'enableSessionReplay', !advanced.enableSessionReplay)
              }
              disabled={!advanced.enableCrashReporting}
            >
              {advanced.enableSessionReplay ? 'On' : 'Off'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Crash reporting sends anonymized error diagnostics to Sentry. Session replay records UI
            behavior around failures and requires crash reporting. Restart the app after changing
            these options for full effect.
          </p>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Enable Analytics</span>
            </div>
            <Button
              variant={advanced.enableAnalytics ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'enableAnalytics', !advanced.enableAnalytics)
              }
            >
              {advanced.enableAnalytics ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="rounded-md border border-border/70 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Analytics status:{' '}
            <span className="font-medium text-foreground">
              {analyticsActive
                ? 'Active'
                : advanced.enableAnalytics && advanced.analyticsRespectDoNotTrack && doNotTrackEnabled
                  ? 'Paused (Do Not Track enabled)'
                  : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="text-sm font-medium">Collect Performance Metrics</span>
            </div>
            <Button
              variant={advanced.analyticsTrackPerformance ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting(
                  'advanced',
                  'analyticsTrackPerformance',
                  !advanced.analyticsTrackPerformance
                )
              }
              disabled={!advanced.enableAnalytics}
            >
              {advanced.analyticsTrackPerformance ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              <span className="text-sm font-medium">Track Anonymous Interaction Events</span>
            </div>
            <Button
              variant={advanced.analyticsTrackUserActions ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting(
                  'advanced',
                  'analyticsTrackUserActions',
                  !advanced.analyticsTrackUserActions
                )
              }
              disabled={!advanced.enableAnalytics}
            >
              {advanced.analyticsTrackUserActions ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Respect Browser Do Not Track</span>
            </div>
            <Button
              variant={advanced.analyticsRespectDoNotTrack ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting(
                  'advanced',
                  'analyticsRespectDoNotTrack',
                  !advanced.analyticsRespectDoNotTrack
                )
              }
            >
              {advanced.analyticsRespectDoNotTrack ? 'On' : 'Off'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Analytics uses anonymous usage signals to improve reliability and performance. Personal
            content is not collected.
          </p>
        </div>
      </SettingGroup>

      <Separator />

      {/* Database Settings */}
      <SettingGroup title="Database">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Auto Backup</span>
            </div>
            <Button
              variant={advanced.database.autoBackup ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'database', {
                  ...advanced.database,
                  autoBackup: !advanced.database.autoBackup,
                })
              }
            >
              {advanced.database.autoBackup ? 'On' : 'Off'}
            </Button>
          </div>

          {advanced.database.autoBackup && (
            <>
              <SliderSetting
                label="Backup Interval"
                value={advanced.database.backupInterval}
                min={1}
                max={168}
                unit=" hours"
                onChange={(value) =>
                  updateSetting('advanced', 'database', {
                    ...advanced.database,
                    backupInterval: value,
                  })
                }
              />

              <SliderSetting
                label="Maximum Backups"
                value={advanced.database.maxBackups}
                min={1}
                max={30}
                onChange={(value) =>
                  updateSetting('advanced', 'database', {
                    ...advanced.database,
                    maxBackups: value,
                  })
                }
              />
            </>
          )}
        </div>
      </SettingGroup>

      <Separator />

      {/* Performance Settings */}
      <SettingGroup title="Performance">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">GPU Acceleration</span>
            </div>
            <Button
              variant={advanced.performance.enableGPUAcceleration ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'performance', {
                  ...advanced.performance,
                  enableGPUAcceleration: !advanced.performance.enableGPUAcceleration,
                })
              }
            >
              {advanced.performance.enableGPUAcceleration ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="text-sm font-medium">Preload Next Chapter</span>
            </div>
            <Button
              variant={advanced.performance.preloadNextChapter ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'performance', {
                  ...advanced.performance,
                  preloadNextChapter: !advanced.performance.preloadNextChapter,
                })
              }
            >
              {advanced.performance.preloadNextChapter ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Cache Images</span>
            </div>
            <Button
              variant={advanced.performance.cacheImages ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'performance', {
                  ...advanced.performance,
                  cacheImages: !advanced.performance.cacheImages,
                })
              }
            >
              {advanced.performance.cacheImages ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </SettingGroup>

      <Separator />

      {/* Experimental Features */}
      <SettingGroup title="Experimental">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Experimental Features</span>
            </div>
            <Button
              variant={advanced.experimentalFeatures ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                updateSetting('advanced', 'experimentalFeatures', !advanced.experimentalFeatures)
              }
            >
              {advanced.experimentalFeatures ? 'On' : 'Off'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enable experimental features that may be unstable or incomplete
          </p>
        </div>
      </SettingGroup>
    </div>
  );
}
