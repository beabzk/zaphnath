import { useSettings } from '@/components/settings/SettingsProvider';

export function useDebugToolsEnabled(): boolean {
  const { settings } = useSettings();
  return import.meta.env.DEV || settings.advanced.developerMode;
}
