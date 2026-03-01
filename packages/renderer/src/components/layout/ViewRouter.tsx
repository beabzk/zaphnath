import { useNavigation, getViewTitle } from './Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { RepositoryManagement } from '@/components/repository/RepositoryManagement'
import { SettingsInterface } from '@/components/settings/SettingsInterface'
import { ErrorReportingPanel } from '@/components/debug/ErrorReportingPanel'
import { SearchInterface } from '@/components/search/SearchInterface'
import { BookmarksView as BookmarksViewComponent } from '@/components/bookmarks/BookmarksView'
import { NotesView as NotesViewComponent } from '@/components/notes/NotesView'
import { HighlightsView as HighlightsViewComponent } from '@/components/highlights/HighlightsView'
import { ArrowLeft, PanelTopClose } from 'lucide-react'
import { Reader } from '@/components/reader/Reader'
import { getPlatformDisplayName } from '@/lib/platform'

// Reader view
function ReaderView() {
  return <Reader />
}

function RepositoriesView() {
  return <RepositoryManagement />
}

function SearchView() {
  return <SearchInterface />
}

function BookmarksView() {
  return <BookmarksViewComponent />
}

function NotesView() {
  return <NotesViewComponent />
}

function HighlightsView() {
  return <HighlightsViewComponent />
}

function ReadingPlansView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reading Plans</CardTitle>
        <CardDescription>
          Follow structured Bible reading plans
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Reading plans feature will be implemented in the future.
        </p>
      </CardContent>
    </Card>
  )
}

function DownloadsView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Downloads</CardTitle>
        <CardDescription>
          Manage audio downloads and offline content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Downloads management will be implemented in the future.
        </p>
      </CardContent>
    </Card>
  )
}

function SettingsView() {
  return <SettingsInterface />
}

function DebugView() {
  return <ErrorReportingPanel />
}

export function ViewRouter() {
  const { currentView, goBack, canGoBack } = useNavigation()
  const isReaderView = currentView === 'reader'
  const platformLabel = getPlatformDisplayName()

  const renderView = () => {
    switch (currentView) {
      case 'reader':
        return <ReaderView />
      case 'repositories':
        return <RepositoriesView />
      case 'search':
        return <SearchView />
      case 'bookmarks':
        return <BookmarksView />
      case 'notes':
        return <NotesView />
      case 'highlights':
        return <HighlightsView />
      case 'reading-plans':
        return <ReadingPlansView />
      case 'downloads':
        return <DownloadsView />
      case 'settings':
        return <SettingsView />
      case 'debug':
        return <DebugView />
      default:
        return <ReaderView />
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {!isReaderView && (
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <Button variant="ghost" size="icon" onClick={goBack}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-base font-semibold tracking-tight">{getViewTitle(currentView)}</h2>
          </div>
          <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
            <PanelTopClose className="h-3.5 w-3.5" />
            <span>{platformLabel} Workspace</span>
          </div>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 flex-1",
          isReaderView ? "h-full" : "overflow-auto p-4"
        )}
      >
        {renderView()}
      </div>
    </div>
  )
}
