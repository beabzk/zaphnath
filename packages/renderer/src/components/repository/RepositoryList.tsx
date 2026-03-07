import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Calendar,
  Globe,
  Info,
  MoreVertical,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Languages,
} from 'lucide-react';
import { repository } from '@app/preload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRepositoryStore } from '@/stores';
import { createTranslationRepository } from '@/lib/repositoryTranslations';
import { useRepositoryListTranslations } from './useRepositoryListTranslations';
import type { Repository as BaseRepository } from '@/types/store';

interface Repository extends BaseRepository {
  translation_count?: number;
}

interface RepositoryListProps {
  repositories: Repository[];
  currentRepositoryId?: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRefresh: () => void;
  onImportClick: () => void;
  onRepositorySelect?: (repository: Repository) => void;
  onRepositoryDelete?: (repositoryId: string) => void;
}

interface DeleteTarget {
  id: string;
  name: string;
}

export function RepositoryList({
  repositories,
  currentRepositoryId = null,
  isLoading,
  errorMessage,
  onRefresh,
  onImportClick,
  onRepositorySelect,
  onRepositoryDelete,
}: RepositoryListProps) {
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const translationsByParent = useRepositoryStore((state) => state.translationsByParent);
  const loadTranslations = useRepositoryStore((state) => state.loadTranslations);
  const {
    expandedParents,
    translationsLoadingByParent,
    translationErrorByParent,
    toggleParentExpansion,
  } = useRepositoryListTranslations({
    repositories,
    translationsByParent,
    loadTranslations,
  });

  const filteredRepositories = useMemo(() => {
    const baseRepositories = repositories.filter((repo) => {
      if (repo.type === 'parent') return true;
      if (repo.type === 'translation' && !repo.parent_id) return true;
      if (repo.type === 'translation' && repo.parent_id) return false;
      return true;
    });

    return baseRepositories.map((repo) => {
      if (repo.type !== 'parent') {
        return repo;
      }

      return {
        ...repo,
        translations: translationsByParent[repo.id],
      };
    });
  }, [repositories, translationsByParent]);

  useEffect(() => {
    if (!deleteTarget) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDeleteTarget(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [deleteTarget]);

  const handleRepositorySelect = (repository: Repository) => {
    onRepositorySelect?.(repository);
  };

  const handleDeleteRepository = async (repositoryId: string) => {
    try {
      await repository.delete(repositoryId);
      onRepositoryDelete?.(repositoryId);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete repository:', err);
    }
  };

  const getLanguageDisplay = (language: string) => {
    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      pt: 'Portuguese',
      it: 'Italian',
      ru: 'Russian',
      zh: 'Chinese',
      ar: 'Arabic',
      he: 'Hebrew',
      el: 'Greek',
    };
    return languageNames[language] || language.toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold">Installed Repositories</h2>
          <p className="text-sm text-muted-foreground">Loading your Bible repositories...</p>
        </div>
        <div className="px-6 pb-8">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold">Installed Repositories</h2>
          <p className="text-sm text-muted-foreground">Error loading repositories</p>
        </div>
        <div className="px-6 pb-4">
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
          <Button onClick={onRefresh}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (filteredRepositories.length === 0) {
    return (
      <div className="border-b border-border">
        <div className="px-6 py-4">
          <h2 className="text-lg font-semibold">Installed Repositories</h2>
          <p className="text-sm text-muted-foreground">No Bible repositories found</p>
        </div>
        <div className="px-6 pb-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Repositories Installed</h3>
          <p className="text-muted-foreground mb-4">
            Import your first Bible repository to get started with reading and studying.
          </p>
          <Button onClick={onImportClick} className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import Repository
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Installed Repositories</h2>
          <Button size="sm" onClick={onImportClick} className="inline-flex items-center gap-2">
            <Download className="h-4 w-4" />
            Import
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredRepositories.length} repository{filteredRepositories.length !== 1 ? 's' : ''}{' '}
          available
        </p>
      </div>
      <div className="px-6 pb-4 space-y-3">
        {filteredRepositories.map((repo) => {
          const hasLoadedTranslations =
            repo.type === 'parent' &&
            Object.prototype.hasOwnProperty.call(translationsByParent, repo.id);
          const parentTranslations = repo.type === 'parent' ? (repo.translations ?? []) : [];
          const translationCount =
            repo.type === 'parent'
              ? hasLoadedTranslations
                ? parentTranslations.length
                : (repo.translation_count ?? 0)
              : 0;

          return (
            <div key={repo.id} className="space-y-2">
              {/* Parent Repository or Standalone Translation */}
              <div
                className={`flex items-start gap-2 border-b border-border p-3 transition-all ${
                  currentRepositoryId === repo.id ? 'bg-accent/20' : ''
                }`}
              >
                <button
                  type="button"
                  className={`flex-1 space-y-2 text-left transition-colors ${
                    repo.type === 'parent' ? 'hover:text-foreground' : 'hover:bg-accent/30'
                  }`}
                  aria-expanded={repo.type === 'parent' ? expandedParents.has(repo.id) : undefined}
                  aria-pressed={
                    repo.type !== 'parent' ? currentRepositoryId === repo.id : undefined
                  }
                  onClick={() => {
                    if (repo.type === 'parent') {
                      toggleParentExpansion(repo.id);
                    } else {
                      handleRepositorySelect(repo);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {repo.type === 'parent' && (
                        <div className="p-1">
                          {expandedParents.has(repo.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </div>
                      )}

                      {repo.type === 'parent' ? (
                        <FolderOpen className="h-4 w-4 text-blue-600" />
                      ) : (
                        <BookOpen className="h-4 w-4 text-green-600" />
                      )}

                      <h3 className="font-medium">{repo.name}</h3>

                      {repo.type === 'parent' && (
                        <Badge variant="secondary" className="text-xs">
                          <Languages className="h-3 w-3 mr-1" />
                          {translationCount} translations
                        </Badge>
                      )}

                      {currentRepositoryId === repo.id && (
                        <Badge variant="default" className="text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{repo.description}</p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {repo.language && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{getLanguageDisplay(repo.language)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>v{repo.version}</span>
                    </div>
                    {repo.type !== 'parent' && (
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{repo.book_count || 'Unknown'} books</span>
                      </div>
                    )}
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Repository actions for ${repo.name}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Info className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTarget({ id: repo.id, name: repo.name });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Expanded Translations for Parent Repositories */}
              {repo.type === 'parent' && expandedParents.has(repo.id) && (
                <div className="ml-6 pl-4 border-l-2 border-border space-y-0">
                  {translationsLoadingByParent[repo.id] && (
                    <div className="p-2 text-xs text-muted-foreground border-b border-border/50">
                      Loading translations...
                    </div>
                  )}
                  {translationErrorByParent[repo.id] && (
                    <div className="p-2 text-xs text-destructive border-b border-border/50">
                      {translationErrorByParent[repo.id]}
                    </div>
                  )}
                  {!translationsLoadingByParent[repo.id] &&
                    !translationErrorByParent[repo.id] &&
                    hasLoadedTranslations &&
                    parentTranslations.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground border-b border-border/50">
                        No translations available
                      </div>
                    )}
                  {parentTranslations.map((translation) => (
                    <div
                      key={translation.id}
                      className={`border-b border-border/50 p-2 transition-all ${
                        currentRepositoryId === translation.id ? 'bg-accent/20' : ''
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left transition-colors hover:bg-accent/30"
                        aria-pressed={currentRepositoryId === translation.id}
                        onClick={() => {
                          const translationRepo = createTranslationRepository(repo, translation);
                          handleRepositorySelect(translationRepo);
                        }}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          {currentRepositoryId === translation.id && (
                            <CheckCircle className="h-3 w-3 text-primary" />
                          )}
                          <BookOpen className="h-3 w-3 text-green-600" />
                          <span className="font-medium text-sm">{translation.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {translation.language}
                          </Badge>
                          {translation.status !== 'active' && (
                            <Badge variant="secondary" className="text-xs">
                              {translation.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            <span>{translation.book_count || 'Unknown'} books</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Directory: {translation.directory}</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-popover border border-border shadow-lg w-full max-w-md mx-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium">Delete Repository</h3>
              <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
            </div>
            <div className="px-4 py-3 space-y-2">
              <p className="text-sm">
                Delete <span className="font-medium">{deleteTarget.name}</span>?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleDeleteRepository(deleteTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
