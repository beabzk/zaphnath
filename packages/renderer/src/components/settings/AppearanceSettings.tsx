import { useSettings } from './SettingsProvider'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Sun, 
  Moon, 
  Monitor, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignJustify,
  Columns,
  Eye,
  Minimize2
} from 'lucide-react'

export function AppearanceSettings() {
  const { settings, updateSetting } = useSettings()
  const { theme, setTheme } = useTheme()
  const { appearance } = settings

  const fontSizes = [12, 14, 16, 18, 20, 22, 24]
  const fontFamilies = [
    { name: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
    { name: 'Georgia', value: 'Georgia, serif' },
    { name: 'Times New Roman', value: '"Times New Roman", serif' },
    { name: 'Arial', value: 'Arial, sans-serif' },
    { name: 'Helvetica', value: 'Helvetica, sans-serif' },
    { name: 'Verdana', value: 'Verdana, sans-serif' },
    { name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  ]

  const SettingGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">{title}</h3>
      {children}
    </div>
  )

  const SliderSetting = ({ 
    label, 
    value, 
    min, 
    max, 
    step = 1, 
    unit = '', 
    onChange 
  }: {
    label: string
    value: number
    min: number
    max: number
    step?: number
    unit?: string
    onChange: (value: number) => void
  }) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <Badge variant="secondary" className="text-xs">
          {value}{unit}
        </Badge>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
      />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Theme Settings */}
      <SettingGroup title="Theme">
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={theme === 'light' ? 'default' : 'outline'}
            onClick={() => setTheme('light')}
            className="flex-col gap-2 h-auto p-4"
          >
            <Sun className="h-4 w-4" />
            <span className="text-xs">Light</span>
          </Button>
          <Button
            variant={theme === 'dark' ? 'default' : 'outline'}
            onClick={() => setTheme('dark')}
            className="flex-col gap-2 h-auto p-4"
          >
            <Moon className="h-4 w-4" />
            <span className="text-xs">Dark</span>
          </Button>
          <Button
            variant={theme === 'system' ? 'default' : 'outline'}
            onClick={() => setTheme('system')}
            className="flex-col gap-2 h-auto p-4"
          >
            <Monitor className="h-4 w-4" />
            <span className="text-xs">System</span>
          </Button>
        </div>
      </SettingGroup>

      <Separator />

      {/* Typography Settings */}
      <SettingGroup title="Typography">
        <div className="space-y-4">
          {/* Font Family */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Font Family</label>
            <select
              value={appearance.fontFamily}
              onChange={(e) => updateSetting('appearance', 'fontFamily', e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {fontFamilies.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Font Size</label>
              <Badge variant="secondary" className="text-xs">
                {appearance.fontSize}px
              </Badge>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {fontSizes.map((size) => (
                <Button
                  key={size}
                  variant={appearance.fontSize === size ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => updateSetting('appearance', 'fontSize', size)}
                  className="text-xs"
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>

          {/* Line Height */}
          <SliderSetting
            label="Line Height"
            value={appearance.lineHeight}
            min={1.2}
            max={2.0}
            step={0.1}
            onChange={(value) => updateSetting('appearance', 'lineHeight', value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Layout Settings */}
      <SettingGroup title="Layout">
        <div className="space-y-4">
          {/* Text Alignment */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Text Alignment</label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={appearance.textAlign === 'left' ? 'default' : 'outline'}
                onClick={() => updateSetting('appearance', 'textAlign', 'left')}
                className="flex-col gap-2 h-auto p-3"
              >
                <AlignLeft className="h-4 w-4" />
                <span className="text-xs">Left</span>
              </Button>
              <Button
                variant={appearance.textAlign === 'center' ? 'default' : 'outline'}
                onClick={() => updateSetting('appearance', 'textAlign', 'center')}
                className="flex-col gap-2 h-auto p-3"
              >
                <AlignCenter className="h-4 w-4" />
                <span className="text-xs">Center</span>
              </Button>
              <Button
                variant={appearance.textAlign === 'justify' ? 'default' : 'outline'}
                onClick={() => updateSetting('appearance', 'textAlign', 'justify')}
                className="flex-col gap-2 h-auto p-3"
              >
                <AlignJustify className="h-4 w-4" />
                <span className="text-xs">Justify</span>
              </Button>
            </div>
          </div>

          {/* Column Layout */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Column Layout</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={appearance.columnLayout === 'single' ? 'default' : 'outline'}
                onClick={() => updateSetting('appearance', 'columnLayout', 'single')}
                className="flex-col gap-2 h-auto p-3"
              >
                <div className="w-4 h-4 border border-current" />
                <span className="text-xs">Single</span>
              </Button>
              <Button
                variant={appearance.columnLayout === 'double' ? 'default' : 'outline'}
                onClick={() => updateSetting('appearance', 'columnLayout', 'double')}
                className="flex-col gap-2 h-auto p-3"
              >
                <Columns className="h-4 w-4" />
                <span className="text-xs">Double</span>
              </Button>
            </div>
          </div>

          {/* Sidebar Width */}
          <SliderSetting
            label="Sidebar Width"
            value={appearance.sidebarWidth}
            min={200}
            max={400}
            step={10}
            unit="px"
            onChange={(value) => updateSetting('appearance', 'sidebarWidth', value)}
          />
        </div>
      </SettingGroup>

      <Separator />

      {/* Display Options */}
      <SettingGroup title="Display Options">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Show Verse Numbers</span>
            </div>
            <Button
              variant={appearance.showVerseNumbers ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('appearance', 'showVerseNumbers', !appearance.showVerseNumbers)}
            >
              {appearance.showVerseNumbers ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4" />
              <span className="text-sm font-medium">Highlight Current Verse</span>
            </div>
            <Button
              variant={appearance.highlightCurrentVerse ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('appearance', 'highlightCurrentVerse', !appearance.highlightCurrentVerse)}
            >
              {appearance.highlightCurrentVerse ? 'On' : 'Off'}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Minimize2 className="h-4 w-4" />
              <span className="text-sm font-medium">Compact Mode</span>
            </div>
            <Button
              variant={appearance.compactMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateSetting('appearance', 'compactMode', !appearance.compactMode)}
            >
              {appearance.compactMode ? 'On' : 'Off'}
            </Button>
          </div>
        </div>
      </SettingGroup>
    </div>
  )
}
