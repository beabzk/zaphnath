import { useNavigation, getViewTitle } from './Navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RepositoryManagement } from '@/components/repository/RepositoryManagement'
import { SettingsInterface } from '@/components/settings/SettingsInterface'
import { ErrorReportingPanel } from '@/components/debug/ErrorReportingPanel'
import { SearchInterface } from '@/components/search/SearchInterface'
import { ArrowLeft } from 'lucide-react'
import { Reader } from '@/components/reader/Reader'

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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookmarks</CardTitle>
        <CardDescription>
          Manage your saved verses and passages
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Bookmarks feature will be implemented in future sprints.
        </p>
      </CardContent>
    </Card>
  )
}

function NotesView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notes</CardTitle>
        <CardDescription>
          Create and organize your study notes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Notes feature will be implemented in future sprints.
        </p>
      </CardContent>
    </Card>
  )
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
          Reading plans feature will be implemented in future sprints.
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
          Downloads management will be implemented in future sprints.
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
    <div className="space-y-4">
      {/* View Header */}
      <div className="flex items-center gap-4">
        {canGoBack && (
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h2 className="text-2xl font-bold">{getViewTitle(currentView)}</h2>
      </div>

      {/* View Content */}
      {renderView()}
    </div>
  )
}
