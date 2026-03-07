import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';
import {
  SettingGroup,
  SliderSetting,
  languages,
  type UpdateAdvancedSetting,
} from './AdvancedSettingsShared';

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
