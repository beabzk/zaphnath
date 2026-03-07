import { Button } from '@/components/ui/button';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import { Activity, AlertTriangle, Bug, MousePointerClick, Shield } from 'lucide-react';
import { SettingGroup, type UpdateAdvancedSetting } from './AdvancedSettingsShared';

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
