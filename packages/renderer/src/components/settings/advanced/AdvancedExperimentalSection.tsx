import { Button } from '@/components/ui/button';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import { AlertTriangle } from 'lucide-react';
import { SettingGroup, type UpdateAdvancedSetting } from './AdvancedSettingsShared';

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
