import { Button } from '@/components/ui/button';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import { Bug, Download, RefreshCw, Settings as SettingsIcon, Trash2 } from 'lucide-react';
import {
  SettingGroup,
  SliderSetting,
  logLevels,
  type DiagnosticsStats,
  type UpdateAdvancedSetting,
} from './AdvancedSettingsShared';

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
