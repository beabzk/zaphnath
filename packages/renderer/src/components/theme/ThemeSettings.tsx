import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTheme } from './ThemeProvider'
import { Sun, Moon, Monitor, Palette, Check } from 'lucide-react'

export function ThemeSettings() {
  const { theme, setTheme } = useTheme()

  const themeOptions = [
    {
      value: 'light' as const,
      label: 'Light',
      description: 'Clean, bright interface perfect for daytime reading',
      icon: Sun,
      preview: 'bg-white border-gray-200',
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      description: 'Easy on the eyes for low-light environments and night reading',
      icon: Moon,
      preview: 'bg-gray-900 border-gray-700',
    },
    {
      value: 'system' as const,
      label: 'System',
      description: 'Automatically matches your operating system preference',
      icon: Monitor,
      preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-400',
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Theme Settings
        </CardTitle>
        <CardDescription>
          Choose your preferred color scheme for the best reading experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {themeOptions.map((option) => {
            const Icon = option.icon
            const isSelected = theme === option.value
            
            return (
              <div
                key={option.value}
                className={`relative rounded-lg border p-4 cursor-pointer transition-all hover:bg-accent/50 ${
                  isSelected ? 'border-primary bg-accent/20' : 'border-border'
                }`}
                onClick={() => setTheme(option.value)}
              >
                <div className="flex items-start gap-4">
                  {/* Theme Preview */}
                  <div className={`w-12 h-8 rounded border-2 ${option.preview} flex-shrink-0`} />
                  
                  {/* Theme Info */}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="font-medium">{option.label}</span>
                      {isSelected && (
                        <Badge variant="default" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                  
                  {/* Selection Indicator */}
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                  }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary-foreground" />}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Additional Theme Info */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Theme Features</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Optimized color contrast for comfortable Bible reading</li>
            <li>• Smooth transitions between light and dark modes</li>
            <li>• Automatic system theme detection and switching</li>
            <li>• Persistent theme preference across app restarts</li>
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme('light')}
            className="flex-1"
          >
            <Sun className="h-4 w-4 mr-2" />
            Light
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme('dark')}
            className="flex-1"
          >
            <Moon className="h-4 w-4 mr-2" />
            Dark
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme('system')}
            className="flex-1"
          >
            <Monitor className="h-4 w-4 mr-2" />
            System
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
