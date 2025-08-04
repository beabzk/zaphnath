import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggleDropdown } from '@/components/theme/ThemeToggleDropdown'
import { useSidebar, useSearch } from '@/stores'
import { Menu, Settings, Search, BookOpen } from 'lucide-react'
import { getAppVersionWithPrefix } from '@/lib/version'

export function Header() {
  const { toggle: toggleSidebar } = useSidebar()
  const { query, setQuery } = useSearch()
  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-semibold">Zaphnath</h1>
            <Badge variant="secondary" className="text-xs">
              {getAppVersionWithPrefix()}
            </Badge>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search verses, books, or topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <ThemeToggleDropdown />
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
