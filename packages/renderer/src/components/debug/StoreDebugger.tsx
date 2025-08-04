import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useStoreDebug } from '@/stores'
import {
  Bug,
  Eye,
  EyeOff,
  Download,
  Trash2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'

interface StoreDebuggerProps {
  isVisible?: boolean
}

export function StoreDebugger({ isVisible = false }: StoreDebuggerProps) {
  const [isOpen, setIsOpen] = useState(isVisible)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const { repository, ui, reading, logState } = useStoreDebug()

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          variant="outline"
          className="bg-background/95 backdrop-blur"
        >
          <Bug className="h-4 w-4 mr-2" />
          Debug Stores
        </Button>
      </div>
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const exportStoreState = () => {
    const state = {
      repository: {
        repositories: repository.repositories,
        currentRepository: repository.currentRepository,
        books: repository.books,
        currentBook: repository.currentBook,
        currentChapter: repository.currentChapter,
        verses: repository.verses,
        isLoading: repository.isLoading,
        error: repository.error,
      },
      ui: {
        currentView: ui.currentView,
        viewHistory: ui.viewHistory,
        globalLoading: ui.globalLoading,
        globalError: ui.globalError,
        notifications: ui.notifications,
        sidebarOpen: ui.sidebarOpen,
        sidebarWidth: ui.sidebarWidth,
        searchQuery: ui.searchQuery,
        searchResults: ui.searchResults,
      },
      reading: {
        currentLocation: reading.currentLocation,
        history: reading.history,
        bookmarks: reading.bookmarks,
        readingMode: reading.readingMode,
        autoScroll: reading.autoScroll,
        scrollSpeed: reading.scrollSpeed,
      },
      timestamp: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `zaphnath-store-debug-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const clearAllStores = () => {
    if (confirm('Are you sure you want to clear all store data? This action cannot be undone.')) {
      localStorage.removeItem('zaphnath-repository-store')
      localStorage.removeItem('zaphnath-ui-store')
      localStorage.removeItem('zaphnath-reading-store')
      window.location.reload()
    }
  }

  const StoreSection = ({ 
    title, 
    data, 
    sectionKey 
  }: { 
    title: string
    data: any
    sectionKey: string 
  }) => {
    const isExpanded = expandedSections[sectionKey]
    
    return (
      <div className="space-y-2">
        <Button
          variant="ghost"
          onClick={() => toggleSection(sectionKey)}
          className="w-full justify-between h-auto p-2"
        >
          <span className="font-medium">{title}</span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        {isExpanded && (
          <div className="bg-muted/50 rounded-md p-3 text-xs font-mono">
            <pre className="whitespace-pre-wrap overflow-auto max-h-40">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] overflow-hidden">
      <Card className="bg-background/95 backdrop-blur border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <CardTitle className="text-sm">Store Debugger</CardTitle>
              <Badge variant="secondary" className="text-xs">
                Dev Mode
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
            >
              <EyeOff className="h-3 w-3" />
            </Button>
          </div>
          <CardDescription className="text-xs">
            Real-time store state inspection and debugging
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button onClick={logState} size="sm" variant="outline">
              <Eye className="h-3 w-3 mr-1" />
              Log
            </Button>
            <Button onClick={exportStoreState} size="sm" variant="outline">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
            <Button onClick={clearAllStores} size="sm" variant="outline" className="text-destructive">
              <Trash2 className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>

          <Separator />

          {/* Store Sections */}
          <div className="space-y-3">
            <StoreSection
              title="Repository Store"
              sectionKey="repository"
              data={{
                repositories: repository.repositories?.length || 0,
                currentRepository: repository.currentRepository?.name || 'None',
                books: repository.books?.length || 0,
                currentBook: repository.currentBook?.name || 'None',
                verses: repository.verses?.length || 0,
                isLoading: repository.isLoading,
                hasError: !!repository.error,
              }}
            />

            <StoreSection
              title="UI Store"
              sectionKey="ui"
              data={{
                currentView: ui.currentView,
                viewHistory: ui.viewHistory,
                globalLoading: ui.globalLoading.isLoading,
                notifications: ui.notifications?.length || 0,
                sidebarOpen: ui.sidebarOpen,
                sidebarWidth: ui.sidebarWidth,
                searchQuery: ui.searchQuery || 'Empty',
                searchResults: ui.searchResults?.length || 0,
              }}
            />

            <StoreSection
              title="Reading Store"
              sectionKey="reading"
              data={{
                currentLocation: reading.currentLocation ? {
                  repository: reading.currentLocation.repository_id,
                  book: reading.currentLocation.book_id,
                  chapter: reading.currentLocation.chapter_number,
                  verse: reading.currentLocation.verse_number,
                } : 'None',
                history: reading.history?.length || 0,
                bookmarks: reading.bookmarks?.length || 0,
                readingMode: reading.readingMode,
                autoScroll: reading.autoScroll,
                scrollSpeed: reading.scrollSpeed,
              }}
            />
          </div>

          {/* Store Statistics */}
          <Separator />
          
          <div className="space-y-2">
            <h4 className="text-xs font-medium">Store Statistics</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span>Repositories:</span>
                <Badge variant="secondary" className="text-xs">
                  {repository.repositories?.length || 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Books:</span>
                <Badge variant="secondary" className="text-xs">
                  {repository.books?.length || 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Bookmarks:</span>
                <Badge variant="secondary" className="text-xs">
                  {reading.bookmarks?.length || 0}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>History:</span>
                <Badge variant="secondary" className="text-xs">
                  {reading.history?.length || 0}
                </Badge>
              </div>
            </div>
          </div>

          {/* Performance Info */}
          <div className="text-xs text-muted-foreground">
            <div>Last updated: {new Date().toLocaleTimeString()}</div>
            <div>Persistence: LocalStorage</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Development-only wrapper
export function StoreDebuggerWrapper() {
  // Only show in development mode
  const isDevelopment = process.env.NODE_ENV === 'development'
  
  if (!isDevelopment) {
    return null
  }
  
  return <StoreDebugger />
}
