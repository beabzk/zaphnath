import { Button } from '@/components/ui/button';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import { Database } from 'lucide-react';
import { SettingGroup, SliderSetting, type UpdateDatabaseSetting } from './AdvancedSettingsShared';

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
