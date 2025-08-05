import React from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useNavigation, type AppView } from './Navigation'
import { useSidebar } from '@/stores'
import {
  BookOpen,
  Library,
  Bookmark,
  StickyNote,
  Calendar,
  Search,
  Settings,
  Download,
  X,
  Bug
} from 'lucide-react'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  view: AppView
  badge?: string
}

const navigationItems: NavItem[] = [
  { icon: BookOpen, label: 'Reader', view: 'reader' },
  { icon: Library, label: 'Repositories', view: 'repositories' },
  { icon: Search, label: 'Search', view: 'search' },
]

const studyItems: NavItem[] = [
  { icon: Bookmark, label: 'Bookmarks', view: 'bookmarks' },
  { icon: StickyNote, label: 'Notes', view: 'notes' },
  { icon: Calendar, label: 'Reading Plans', view: 'reading-plans' },
]

const systemItems: NavItem[] = [
  { icon: Download, label: 'Downloads', view: 'downloads' },
  { icon: Settings, label: 'Settings', view: 'settings' },
  { icon: Bug, label: 'Debug', view: 'debug' },
]

export function Sidebar() {
  const { currentView, setCurrentView } = useNavigation()
  const { isOpen, close, width } = useSidebar()

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="space-y-1">
      <h3 className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {items.map((item) => {
        const isActive = currentView === item.view
        return (
          <Button
            key={item.label}
            variant={isActive ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start gap-3 h-9",
              isActive && "bg-secondary"
            )}
            onClick={() => setCurrentView(item.view)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </Button>
        )
      })}
    </div>
  )

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "border-r bg-background transition-all duration-300 ease-in-out",
          // Base: hidden on mobile, conditional on desktop
          "hidden",
          // Desktop: show when open, hide when closed
          isOpen && "lg:block",
          // Mobile: fixed positioning when open
          isOpen && "block fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] lg:relative lg:top-0 lg:h-auto lg:z-auto"
        )}
        style={{ width: isOpen ? `${width}px` : '0px' }}
      >
        <div className="flex h-full flex-col">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between p-4 lg:hidden">
            <span className="text-sm font-medium">Navigation</span>
            <Button variant="ghost" size="icon" onClick={close} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Navigation Content */}
          <div className="flex-1 space-y-6 p-4">
            <NavSection title="Main" items={navigationItems} />
            <Separator />
            <NavSection title="Study Tools" items={studyItems} />
            <Separator />
            <NavSection title="System" items={systemItems} />
          </div>
          
          {/* Repository Status */}
          <div className="border-t p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Current Repository
                </span>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-sm font-medium">No repository selected</div>
                <div className="text-xs text-muted-foreground">
                  Import a Bible repository to get started
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
