import { useCallback, useEffect, useState } from 'react';
import { RepositoryList } from './RepositoryList';
import { RepositoryImportDialog } from './RepositoryImportDialog';
import { useRepositoryStore, useModal, useNotifications } from '@/stores';
import { useNavigation } from '@/components/layout/Navigation';
import { database } from '@app/preload';
import { Database, BookOpen, HardDrive, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

// Types are now imported from stores

interface OverviewStats {
  repositories: number;
  books: number;
  verses: number;
  databaseSize: string;
}

export function RepositoryManagement() {
  const {
    repositories,
    currentRepository,
    setCurrentRepository,
    loadRepositories,
    isLoading,
    error,
  } = useRepositoryStore();
  const { setCurrentView } = useNavigation();

  const {
    isOpen: showImportDialog,
    open: openImportDialog,
    close: closeImportDialog,
  } = useModal('repository-import');
  const { addNotification } = useNotifications();
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);

  const loadOverviewData = useCallback(async () => {
    setIsOverviewLoading(true);
    await loadRepositories();

    try {
      const stats = (await database.getStats()) as OverviewStats;
      setOverviewStats(stats);
    } catch (statsError) {
      console.error('Failed to load database stats:', statsError);
    } finally {
      setIsOverviewLoading(false);
    }
  }, [loadRepositories]);

  useEffect(() => {
    void loadOverviewData();
  }, [loadOverviewData]);

  const handleImportComplete = () => {
    void loadOverviewData();
    addNotification({
      type: 'success',
      title: 'Repository Imported',
      message: 'Repository has been successfully imported',
      duration: 5000,
    });
  };

  const repositoryCount = overviewStats?.repositories ?? repositories.length;
  const bookCount =
    overviewStats?.books ?? repositories.reduce((sum, repo) => sum + (repo.book_count || 0), 0);
  const verseCount =
    overviewStats?.verses ?? repositories.reduce((sum, repo) => sum + (repo.verse_count || 0), 0);
  const databaseSize = overviewStats?.databaseSize ?? '-';

  const handleRepositorySelect = (repository: any) => {
    setCurrentRepository(repository);
    // Navigate to Reader so the user can read immediately
    setCurrentView('reader');
  };

  const currentBookCount = currentRepository?.book_count ?? null;
  const currentVerseCount = currentRepository?.verse_count ?? null;
  const hasIndexedBooks = (currentBookCount ?? 0) > 0;
  const hasIndexedVerses = (currentVerseCount ?? 0) > 0;
  const isParentRepository = currentRepository?.type === 'parent';
  const isTranslationReady = !isParentRepository && hasIndexedBooks && hasIndexedVerses;

  return (
    <div className="h-full flex flex-col">
      {/* Database Overview */}
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Database className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Database Overview</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Current status of your Bible database and repositories
          </p>
        </div>
        <div className="px-6 pb-4">
          {isLoading || isOverviewLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error.message}</span>
              <button
                onClick={() => void loadOverviewData()}
                className="ml-auto px-3 py-1 text-sm border border-border hover:bg-accent transition-colors"
              >
                <RefreshCw className="h-4 w-4 mr-2 inline" />
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-px bg-border">
              <div className="bg-background px-4 py-3">
                <div className="text-3xl font-semibold">{repositoryCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Repositories</div>
              </div>
              <div className="bg-background px-4 py-3">
                <div className="text-3xl font-semibold">{bookCount}</div>
                <div className="text-xs text-muted-foreground mt-1">Books</div>
              </div>
              <div className="bg-background px-4 py-3">
                <div className="text-3xl font-semibold">{verseCount.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Verses</div>
              </div>
              <div className="bg-background px-4 py-3">
                <div className="text-3xl font-semibold text-muted-foreground">{databaseSize}</div>
                <div className="text-xs text-muted-foreground mt-1">Database Size</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Repository List */}
      <RepositoryList
        repositories={repositories}
        currentRepositoryId={currentRepository?.id}
        isLoading={isLoading}
        errorMessage={error?.message || null}
        onRefresh={() => void loadOverviewData()}
        onImportClick={openImportDialog}
        onRepositorySelect={handleRepositorySelect}
        onRepositoryDelete={(repoId) => {
          if (currentRepository?.id === repoId || currentRepository?.parent_id === repoId) {
            setCurrentRepository(null);
          }
          void loadOverviewData();
        }}
      />

      {/* Selected Repository Details */}
      {currentRepository && (
        <div className="border-b border-border">
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Repository Details</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Information about the selected repository
            </p>
          </div>
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium mb-2">{currentRepository.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {currentRepository.description}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Language:</span>
                    <span>{currentRepository.language}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Version:</span>
                    <span>v{currentRepository.version}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Books:</span>
                    <span>{currentBookCount ?? 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Verses:</span>
                    <span>
                      {currentVerseCount !== null ? currentVerseCount.toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Repository Status</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Repository metadata available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasIndexedBooks ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm">
                      {hasIndexedBooks
                        ? `${currentBookCount} books indexed`
                        : 'No indexed books detected'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isTranslationReady ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm">
                      {isTranslationReady
                        ? 'Ready for reading'
                        : isParentRepository
                          ? 'Select a translation to read'
                          : 'Not ready for reading yet'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Created: {new Date(currentRepository.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      Updated: {new Date(currentRepository.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-6 py-4">
        <h2 className="text-lg font-semibold mb-1">Quick Actions</h2>
        <p className="text-sm text-muted-foreground mb-4">Common maintenance tasks</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => void loadOverviewData()}
            className="p-4 border border-border hover:bg-accent/50 transition-colors flex flex-col items-center gap-2"
          >
            <RefreshCw className="h-5 w-5" />
            <div className="text-center">
              <div className="font-medium text-sm">Refresh Database</div>
              <div className="text-xs text-muted-foreground">Update statistics</div>
            </div>
          </button>

          <button
            className="p-4 border border-border bg-muted/20 opacity-50 cursor-not-allowed flex flex-col items-center gap-2"
            disabled
          >
            <HardDrive className="h-5 w-5" />
            <div className="text-center">
              <div className="font-medium text-sm">Backup Data</div>
              <div className="text-xs text-muted-foreground">Coming soon</div>
            </div>
          </button>
        </div>
      </div>

      {/* Import Dialog */}
      <RepositoryImportDialog
        isOpen={showImportDialog}
        onClose={closeImportDialog}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
}
