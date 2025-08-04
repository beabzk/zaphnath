import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
    } catch (error) {
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
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Settings
                {hasUnsavedChanges && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Unsaved Changes
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Configure your Bible reading experience and application preferences
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowImportExport(!showImportExport)}
              >
                <Download className="h-4 w-4 mr-2" />
                Import/Export
              </Button>
              
              {hasUnsavedChanges && (
                <Button onClick={saveSettings} size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        {showImportExport && (
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg">
              <Button onClick={handleExportSettings} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Settings
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Settings
                </Button>
              </div>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button 
                onClick={resetSettings} 
                variant="outline" 
                size="sm"
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset All
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Settings Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category Navigation */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {settingsCategories.map((category) => {
              const Icon = iconMap[category.icon as keyof typeof iconMap]
              const isActive = activeCategory === category.id
              
              return (
                <Button
                  key={category.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3 h-auto p-3"
                  onClick={() => setActiveCategory(category.id)}
                >
                  <Icon className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">{category.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {category.description}
                    </div>
                  </div>
                </Button>
              )
            })}
          </CardContent>
        </Card>

        {/* Category Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const category = settingsCategories.find(c => c.id === activeCategory)
                      const Icon = iconMap[category?.icon as keyof typeof iconMap]
                      return (
                        <>
                          <Icon className="h-5 w-5" />
                          {category?.name}
                        </>
                      )
                    })()}
                  </CardTitle>
                  <CardDescription>
                    {settingsCategories.find(c => c.id === activeCategory)?.description}
                  </CardDescription>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resetCategory(activeCategory)}
                  className="text-destructive hover:text-destructive"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Category
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {renderCategoryContent()}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Settings Info */}
      <Card>
        <CardContent className="pt-6">
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
        </CardContent>
      </Card>
    </div>
  )
}
