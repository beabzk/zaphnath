import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RepositoryList } from './RepositoryList'
import { RepositoryImportDialog } from './RepositoryImportDialog'
import { useRepositoryStore, useModal, useNotifications } from '@/stores'
import { useNavigation } from '@/components/layout/Navigation'
import {
  Download,
  Database,
  BookOpen,
  HardDrive,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

// Types are now imported from stores

export function RepositoryManagement() {
  const {
    repositories,
    currentRepository,
    setCurrentRepository,
    loadRepositories,
    isLoading,
    error
  } = useRepositoryStore()
  const { setCurrentView } = useNavigation()

  const { isOpen: showImportDialog, open: openImportDialog, close: closeImportDialog } = useModal('repository-import')
  const { addNotification } = useNotifications()

  useEffect(() => {
    loadRepositories()
  }, [loadRepositories])

  const handleImportComplete = () => {
    loadRepositories()
    addNotification({
      type: 'success',
      title: 'Repository Imported',
      message: 'Repository has been successfully imported',
      duration: 5000
    })
  }

  const handleRepositorySelect = (repository: any) => {
    setCurrentRepository(repository)
    // Navigate to Reader so the user can read immediately
    setCurrentView('reader')
  }

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Overview
          </CardTitle>
          <CardDescription>
            Current status of your Bible database and repositories
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error.message}</span>
              <Button onClick={loadRepositories} variant="outline" size="sm" className="ml-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{repositories.length}</div>
                <div className="text-sm text-muted-foreground">Repositories</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {repositories.reduce((sum, repo) => sum + (repo.book_count || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Books</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {repositories.reduce((sum, repo) => sum + (repo.verse_count || 0), 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Verses</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">-</div>
                <div className="text-sm text-muted-foreground">Database Size</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository List */}
      <RepositoryList
        onImportClick={openImportDialog}
        onRepositorySelect={handleRepositorySelect}
      />

      {/* Selected Repository Details */}
      {currentRepository && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Repository Details
            </CardTitle>
            <CardDescription>
              Information about the selected repository
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium mb-2">{currentRepository.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {currentRepository.description}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Language:</span>
                    <span>{currentRepository.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Version:</span>
                    <span>v{currentRepository.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Books:</span>
                    <span>{currentRepository.book_count || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verses:</span>
                    <span>{currentRepository.verse_count?.toLocaleString() || 'Unknown'}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Repository Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Imported and validated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Database indexed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Ready for reading</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="text-xs text-muted-foreground">
                    <div>Created: {new Date(currentRepository.created_at).toLocaleDateString()}</div>
                    <div>Updated: {new Date(currentRepository.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common repository management tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              onClick={openImportDialog}
              className="h-auto p-4 flex-col gap-2"
            >
              <Download className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Import Repository</div>
                <div className="text-xs opacity-80">Add new Bible translation</div>
              </div>
            </Button>

            <Button
              variant="outline"
              onClick={loadRepositories}
              className="h-auto p-4 flex-col gap-2"
            >
              <RefreshCw className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Refresh Database</div>
                <div className="text-xs opacity-80">Update statistics</div>
              </div>
            </Button>
            
            <Button 
              variant="outline"
              className="h-auto p-4 flex-col gap-2"
              disabled
            >
              <HardDrive className="h-6 w-6" />
              <div className="text-center">
                <div className="font-medium">Backup Data</div>
                <div className="text-xs opacity-80">Coming soon</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <RepositoryImportDialog
        isOpen={showImportDialog}
        onClose={closeImportDialog}
        onImportComplete={handleImportComplete}
      />
    </div>
  )
}
