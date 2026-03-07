import { Badge } from '@/components/ui/badge';
import type { AdvancedSettings as AdvancedSettingsType } from '@/types/settings';

export type UpdateAdvancedSetting = <K extends keyof AdvancedSettingsType>(
  key: K,
  value: AdvancedSettingsType[K]
) => void;

export type UpdateDatabaseSetting = <K extends keyof AdvancedSettingsType['database']>(
  key: K,
  value: AdvancedSettingsType['database'][K]
) => void;

export type UpdatePerformanceSetting = <K extends keyof AdvancedSettingsType['performance']>(
  key: K,
  value: AdvancedSettingsType['performance'][K]
) => void;

export type DiagnosticsStats = {
  actions: number;
  errors: number;
  logs: number;
  metrics: number;
};

export function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      {children}
    </div>
  );
}

export function SliderSetting({
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

export const languages = [
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

export const logLevels: Array<{
  description: string;
  name: string;
  value: AdvancedSettingsType['logLevel'];
}> = [
  { value: 'error', name: 'Error', description: 'Only critical errors' },
  { value: 'warn', name: 'Warning', description: 'Errors and warnings' },
  { value: 'info', name: 'Info', description: 'General information' },
  { value: 'debug', name: 'Debug', description: 'Detailed debugging' },
];
