import { Button } from '@/components/ui/button';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import { HardDrive, RefreshCw, Zap } from 'lucide-react';
import { SettingGroup, type UpdatePerformanceSetting } from './AdvancedSettingsShared';

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
