import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { useSettings } from './SettingsProvider'
import { AppearanceSettings } from './AppearanceSettings'
import { ReadingSettings } from './ReadingSettings'
import { AudioSettings } from './AudioSettings'
import { AdvancedSettings } from './AdvancedSettings'
import { settingsCategories, SettingsCategory } from '@/types/settings'
import {
  Palette,
  BookOpen,
  Volume2,
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Download,
  Upload,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

const iconMap = {
  Palette,
  BookOpen,
  Volume2,
  Settings: SettingsIcon,
}

export function SettingsInterface() {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('appearance')
  const [showImportExport, setShowImportExport] = useState(false)
  const {
    settings,
    resetSettings,
    resetCategory,
    exportSettings,
    importSettings,
    hasUnsavedChanges,
    saveSettings,
    isLoading
  } = useSettings()

  const handleExportSettings = () => {
    const settingsJson = exportSettings()
    const blob = new Blob([settingsJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zaphnath-settings-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportSettings = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const success = await importSettings(text)
      if (success) {
        alert('Settings imported successfully!')
      } else {
        alert('Failed to import settings. Please check the file format.')
      }
    } catch (_error) {
      alert('Failed to read settings file.')
    }

    // Reset the input
    event.target.value = ''
  }

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'appearance':
        return <AppearanceSettings />
      case 'reading':
        return <ReadingSettings />
      case 'audio':
        return <AudioSettings />
      case 'advanced':
        return <AdvancedSettings />
      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <p className="text-sm text-muted-foreground">Loading your preferences...</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Settings Header */}
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <SettingsIcon className="h-5 w-5" />
                <h2 className="text-lg font-semibold">Settings</h2>
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved Changes
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Configure your Bible reading experience and application preferences
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 text-sm border border-border hover:bg-accent transition-colors inline-flex items-center gap-2"
                onClick={() => setShowImportExport(!showImportExport)}
              >
                <Download className="h-4 w-4" />
                Import/Export
              </button>

              {hasUnsavedChanges && (
                <button onClick={saveSettings} className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>

        {showImportExport && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border">
              <button onClick={handleExportSettings} className="px-3 py-1 text-sm border border-border hover:bg-accent transition-colors inline-flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Settings
              </button>

              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="px-3 py-1 text-sm border border-border hover:bg-accent transition-colors inline-flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Settings
                </button>
              </div>

              <div className="h-6 w-px bg-border" />

              <button
                onClick={resetSettings}
                className="px-3 py-1 text-sm border border-border hover:bg-destructive/10 text-destructive transition-colors inline-flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Category Navigation */}
        <div className="w-56 border-r border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-medium">Categories</h3>
          </div>
          <div className="py-2">
            {settingsCategories.map((category) => {
              const Icon = iconMap[category.icon as keyof typeof iconMap]
              const isActive = activeCategory === category.id

              return (
                <button
                  key={category.id}
                  className={`w-full text-left px-4 py-2 inline-flex items-center gap-3 text-sm transition-colors ${isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                    }`}
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Category Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {(() => {
                    const category = settingsCategories.find(c => c.id === activeCategory)
                    const Icon = iconMap[category?.icon as keyof typeof iconMap]
                    return (
                      <>
                        <Icon className="h-5 w-5" />
                        <h2 className="text-lg font-semibold">{category?.name}</h2>
                      </>
                    )
                  })()}
                </div>
                <p className="text-sm text-muted-foreground">
                  {settingsCategories.find(c => c.id === activeCategory)?.description}
                </p>
              </div>

              <button
                onClick={() => resetCategory(activeCategory)}
                className="px-3 py-1 text-sm border border-border hover:bg-destructive/10 text-destructive transition-colors inline-flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Category
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {renderCategoryContent()}
          </div>
        </div>
      </div>

      {/* Settings Info */}
      <div className="px-6 py-3 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              <span>Settings Version: {settings.version}</span>
            </div>
            <div>
              Last Modified: {new Date(settings.lastModified).toLocaleString()}
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="h-4 w-4" />
              <span>You have unsaved changes</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
