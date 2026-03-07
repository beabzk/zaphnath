import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import {
  Activity,
  AlertTriangle,
  Bug,
  Database,
  Download,
  HardDrive,
  MousePointerClick,
  RefreshCw,
  Settings as SettingsIcon,
  Shield,
  Trash2,
  Zap,
} from 'lucide-react';

type UpdateAdvancedSetting = <K extends keyof AdvancedSettingsType>(
  key: K,
  value: AdvancedSettingsType[K]
) => void;

type UpdateDatabaseSetting = <K extends keyof AdvancedSettingsType['database']>(
  key: K,
  value: AdvancedSettingsType['database'][K]
) => void;

type UpdatePerformanceSetting = <K extends keyof AdvancedSettingsType['performance']>(
  key: K,
  value: AdvancedSettingsType['performance'][K]
) => void;

type DiagnosticsStats = {
  actions: number;
  errors: number;
  logs: number;
  metrics: number;
};

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      {children}
    </div>
  );
}

function SliderSetting({
  label,
  max,
  min,
  onChange,
  step = 1,
  unit = '',
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step?: number;
  unit?: string;
  value: number;
}) {
  return (
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
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
}

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
  description: string;
  name: string;
  value: AdvancedSettingsType['logLevel'];
}> = [
  { value: 'error', name: 'Error', description: 'Only critical errors' },
  { value: 'warn', name: 'Warning', description: 'Errors and warnings' },
  { value: 'info', name: 'Info', description: 'General information' },
  { value: 'debug', name: 'Debug', description: 'Detailed debugging' },
];

export function AdvancedGeneralSection({
  advanced,
  onAdvancedSettingChange,
}: {
  advanced: AdvancedSettingsType;
  onAdvancedSettingChange: UpdateAdvancedSetting;
}) {
  return (
    <SettingGroup title="Language & Region">
      <div className="space-y-2">
        <label className="text-sm font-medium">Interface Language</label>
        <select
          value={advanced.language}
          onChange={(event) => onAdvancedSettingChange('language', event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {languages.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Changes will take effect after restarting the application
        </p>
      </div>

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
          </div>
          <p className="text-xs text-muted-foreground">Location where application data is stored</p>
        </div>

        <SliderSetting
          label="Cache Size"
          value={advanced.cacheSize}
          min={100}
          max={2000}
          step={50}
          unit=" MB"
          onChange={(value) => onAdvancedSettingChange('cacheSize', value)}
        />
      </div>
    </SettingGroup>
  );
}

export function AdvancedLoggingSection({
  advanced,
  diagnosticsStats,
  onAdvancedSettingChange,
  onClearDiagnostics,
  onExportSessionLogs,
  onRefreshDiagnostics,
}: {
  advanced: AdvancedSettingsType;
  diagnosticsStats: DiagnosticsStats;
  onAdvancedSettingChange: UpdateAdvancedSetting;
  onClearDiagnostics: () => void;
  onExportSessionLogs: () => void;
  onRefreshDiagnostics: () => void;
}) {
  return (
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
            onClick={() => onAdvancedSettingChange('enableLogging', !advanced.enableLogging)}
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
                  onClick={() => onAdvancedSettingChange('logLevel', level.value)}
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
              onChange={(value) => onAdvancedSettingChange('loggingMaxEntries', value)}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Mirror Logs to Console</span>
              </div>
              <Button
                variant={advanced.logToConsole ? 'default' : 'outline'}
                size="sm"
                onClick={() => onAdvancedSettingChange('logToConsole', !advanced.logToConsole)}
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
          <Button variant="outline" size="sm" onClick={onRefreshDiagnostics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Stats
          </Button>
          <Button variant="outline" size="sm" onClick={onExportSessionLogs}>
            <Download className="h-4 w-4 mr-2" />
            Export Session Logs
          </Button>
          <Button variant="outline" size="sm" onClick={onClearDiagnostics}>
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
            onClick={() => onAdvancedSettingChange('developerMode', !advanced.developerMode)}
          >
            {advanced.developerMode ? 'On' : 'Off'}
          </Button>
        </div>
      </div>
    </SettingGroup>
  );
}

export function AdvancedPrivacySection({
  advanced,
  analyticsActive,
  doNotTrackEnabled,
  onAdvancedSettingChange,
}: {
  advanced: AdvancedSettingsType;
  analyticsActive: boolean;
  doNotTrackEnabled: boolean;
  onAdvancedSettingChange: UpdateAdvancedSetting;
}) {
  return (
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
              onAdvancedSettingChange('enableCrashReporting', !advanced.enableCrashReporting)
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
              onAdvancedSettingChange('enableSessionReplay', !advanced.enableSessionReplay)
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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="text-sm font-medium">Enable Analytics</span>
          </div>
          <Button
            variant={advanced.enableAnalytics ? 'default' : 'outline'}
            size="sm"
            onClick={() => onAdvancedSettingChange('enableAnalytics', !advanced.enableAnalytics)}
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
              onAdvancedSettingChange(
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
              onAdvancedSettingChange(
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
              onAdvancedSettingChange(
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
  );
}

export function AdvancedDatabaseSection({
  advanced,
  onDatabaseSettingChange,
}: {
  advanced: AdvancedSettingsType;
  onDatabaseSettingChange: UpdateDatabaseSetting;
}) {
  return (
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
            onClick={() => onDatabaseSettingChange('autoBackup', !advanced.database.autoBackup)}
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
              onChange={(value) => onDatabaseSettingChange('backupInterval', value)}
            />

            <SliderSetting
              label="Maximum Backups"
              value={advanced.database.maxBackups}
              min={1}
              max={30}
              onChange={(value) => onDatabaseSettingChange('maxBackups', value)}
            />
          </>
        )}
      </div>
    </SettingGroup>
  );
}

export function AdvancedPerformanceSection({
  advanced,
  onPerformanceSettingChange,
}: {
  advanced: AdvancedSettingsType;
  onPerformanceSettingChange: UpdatePerformanceSetting;
}) {
  return (
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
              onPerformanceSettingChange(
                'enableGPUAcceleration',
                !advanced.performance.enableGPUAcceleration
              )
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
              onPerformanceSettingChange(
                'preloadNextChapter',
                !advanced.performance.preloadNextChapter
              )
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
              onPerformanceSettingChange('cacheImages', !advanced.performance.cacheImages)
            }
          >
            {advanced.performance.cacheImages ? 'On' : 'Off'}
          </Button>
        </div>
      </div>
    </SettingGroup>
  );
}

export function AdvancedExperimentalSection({
  advanced,
  onAdvancedSettingChange,
}: {
  advanced: AdvancedSettingsType;
  onAdvancedSettingChange: UpdateAdvancedSetting;
}) {
  return (
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
              onAdvancedSettingChange('experimentalFeatures', !advanced.experimentalFeatures)
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
  );
}
