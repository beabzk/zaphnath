import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggleDropdown } from '@/components/theme/ThemeToggleDropdown'
import { useNavigation, getViewTitle, type AppView } from './Navigation'
import { BookOpen, Library, Search, Bookmark, StickyNote, Highlighter, Calendar, Download, Settings, Bug } from 'lucide-react'
import { getAppVersionWithPrefix } from '@/lib/version'
import { getDesktopPlatform } from '@/lib/platform'

interface WorkspaceTab {
  view: AppView
  label: string
  icon: ComponentType<{ className?: string }>
}

const workspaceTabs: WorkspaceTab[] = [
  { view: 'reader', label: 'Reader', icon: BookOpen },
  { view: 'repositories', label: 'Repositories', icon: Library },
  { view: 'search', label: 'Search', icon: Search },
  { view: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { view: 'notes', label: 'Notes', icon: StickyNote },
  { view: 'highlights', label: 'Highlights', icon: Highlighter },
  { view: 'reading-plans', label: 'Reading Plans', icon: Calendar },
  { view: 'downloads', label: 'Downloads', icon: Download },
  { view: 'settings', label: 'Settings', icon: Settings },
  { view: 'debug', label: 'Debug', icon: Bug },
]

export function Header() {
  const { currentView, setCurrentView } = useNavigation()
  const platform = getDesktopPlatform()
  const isMac = platform === 'macos'
  const isWindows = platform === 'windows'

  return (
    <header className="drag-region h-[var(--titlebar-height)] border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="flex h-[42px] items-center gap-2 px-[var(--workspace-padding)]">
        {isMac && (
          <div
            aria-hidden
            className="shrink-0"
            style={{ width: 'var(--window-controls-left)' }}
          />
        )}

        <div className="no-drag flex min-w-0 flex-1 items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1">
            <BookOpen className="h-4 w-4 text-primary" />
            <h1 className="text-sm font-semibold tracking-tight">Zaphnath</h1>
            <Badge variant="secondary" className="h-5 text-[10px] font-medium">
              {getAppVersionWithPrefix()}
            </Badge>
          </div>

          <div className="hidden text-xs text-muted-foreground md:block">
            {getViewTitle(currentView)}
          </div>
        </div>

        <div className="no-drag ml-auto flex items-center gap-2">
          <ThemeToggleDropdown />
        </div>

        {isWindows && (
          <div
            aria-hidden
            className="shrink-0"
            style={{ width: 'var(--window-controls-right)' }}
          />
        )}
      </div>

      <div className="no-drag border-t border-border/60 bg-muted/20">
        <div className="scrollbar-subtle no-scrollbar flex h-[calc(var(--titlebar-height)-42px)] items-center gap-1 overflow-x-auto overflow-y-hidden px-[var(--workspace-padding)] py-1">
          {workspaceTabs.map((tab) => {
            const isActive = currentView === tab.view

            return (
              <Button
                key={tab.view}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setCurrentView(tab.view)}
                className="shrink-0 gap-1.5 px-2.5"
              >
                <tab.icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
