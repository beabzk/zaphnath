import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/components/theme/ThemeProvider'
import { Database, Wifi, HardDrive, Sun, Moon, Monitor } from 'lucide-react'

export function Footer() {
  const { theme } = useTheme()

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-3 w-3" />
      case 'dark':
        return <Moon className="h-3 w-3" />
      case 'system':
        return <Monitor className="h-3 w-3" />
      default:
        return <Monitor className="h-3 w-3" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light Mode'
      case 'dark':
        return 'Dark Mode'
      case 'system':
        return 'System Theme'
      default:
        return 'System Theme'
    }
  }

  return (
    <footer className="h-8 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4 text-xs text-muted-foreground">
        {/* Left Section - Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span>Database: Connected</span>
          </div>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1">
            <Wifi className="h-3 w-3" />
            <span>Network: Online</span>
          </div>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1">
            <HardDrive className="h-3 w-3" />
            <span>Storage: 2.3 GB available</span>
          </div>

          <Separator orientation="vertical" className="h-4" />

          <div className="flex items-center gap-1">
            {getThemeIcon()}
            <span>{getThemeLabel()}</span>
          </div>
        </div>

        {/* Right Section - App Info */}
        <div className="flex items-center gap-2">
          <span>Zaphnath Bible Reader</span>
          <Badge variant="outline" className="text-xs">
            Sprint 1
          </Badge>
        </div>
      </div>
    </footer>
  )
}
