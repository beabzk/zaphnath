import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSettings } from './SettingsProvider';
import { AppearanceSettings } from './AppearanceSettings';
import { ReadingSettings } from './ReadingSettings';
import { AudioSettings } from './AudioSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { UpdatesSettings } from './UpdatesSettings';
import { defaultSettings, settingsCategories, SettingsCategory } from '@/types/settings';
import {
  Palette,
  BookOpen,
  Volume2,
  RefreshCw,
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
} from 'lucide-react';

const iconMap = {
  Palette,
  BookOpen,
  Volume2,
  RefreshCw,
  Settings: SettingsIcon,
};

export function SettingsInterface() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance');
  const [showImportExport, setShowImportExport] = useState(false);
  const {
    resetSettings,
    resetCategory,
    updateSetting,
    exportSettings,
    importSettings,
    hasUnsavedChanges,
    saveSettings,
    isLoading,
  } = useSettings();

  const handleExportSettings = () => {
    const settingsJson = exportSettings();
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zaphnath-settings-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = await importSettings(text);
      if (success) {
        alert('Settings imported successfully!');
      } else {
        alert('Failed to import settings. Please check the file format.');
      }
    } catch {
      alert('Failed to read settings file.');
    }

    // Reset the input
    event.target.value = '';
  };

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'reading':
        return <ReadingSettings />;
      case 'audio':
        return <AudioSettings />;
      case 'updates':
        return <UpdatesSettings />;
      case 'advanced':
        return <AdvancedSettings />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex flex-col">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Loading your preferences...</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col">
      {/* Settings Header */}
      <div className="border-b border-border">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Settings</h2>
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved Changes
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2"
                onClick={() => setShowImportExport(!showImportExport)}
              >
                <Download className="h-4 w-4" />
                Import/Export
              </Button>

              {hasUnsavedChanges && (
                <Button onClick={saveSettings} size="sm" className="inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </div>

        {showImportExport && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-muted/30 p-3">
              <Button
                onClick={handleExportSettings}
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Settings
              </Button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" className="inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Settings
                </Button>
              </div>

              <div className="h-6 w-px bg-border" />

              <Button
                onClick={resetSettings}
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="h-4 w-4" />
                Reset All
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Content */}
      <div className="flex">
        {/* Category Navigation */}
        <div className="w-60 border-r border-border">
          <div className="px-4 py-2.5 border-b border-border">
            <h3 className="text-sm font-medium">Categories</h3>
          </div>
          <div className="space-y-1.5 px-2 py-2">
            {settingsCategories.map((category) => {
              const Icon = iconMap[category.icon as keyof typeof iconMap];
              const isActive = activeCategory === category.id;

              return (
                <Button
                  key={category.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`h-10 w-full justify-start gap-3 rounded-lg px-3.5 text-sm ${
                    isActive
                      ? 'border border-border/60 bg-accent/80 text-accent-foreground'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{category.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Category Content */}
        <div className="flex-1 min-w-0">
          <div className="px-6 py-3 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const category = settingsCategories.find((c) => c.id === activeCategory);
                    const Icon = iconMap[category?.icon as keyof typeof iconMap];
                    return (
                      <>
                        <Icon className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">{category?.name}</h2>
                      </>
                    );
                  })()}
                </div>
              </div>

              <Button
                onClick={() => {
                  if (activeCategory === 'updates') {
                    updateSetting(
                      'advanced',
                      'updatePolicy',
                      defaultSettings.advanced.updatePolicy
                    );
                    return;
                  }
                  resetCategory(activeCategory);
                }}
                variant="outline"
                size="sm"
                className="inline-flex items-center gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Category
              </Button>
            </div>
          </div>
          <div className="px-6 py-4">{renderCategoryContent()}</div>
        </div>
      </div>
    </div>
  );
}
