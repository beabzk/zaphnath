import { useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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

interface Repository {
  id: string;
  name: string;
  description: string;
  language?: string; // Optional for parent repositories
  version: string;
  created_at: string;
  updated_at: string;
  type?: 'parent' | 'translation';
  parent_id?: string;
  book_count?: number;
  verse_count?: number;
  translation_count?: number;
  translations?: TranslationInfo[];
}

interface TranslationInfo {
  id: string;
  name: string;
  directory: string;
  language: string;
  status: string;
  book_count?: number;
  verse_count?: number;
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
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [translationsByParent, setTranslationsByParent] = useState<
    Record<string, TranslationInfo[]>
  >({});
  const [translationsLoadingByParent, setTranslationsLoadingByParent] = useState<
    Record<string, boolean>
  >({});
  const [translationErrorByParent, setTranslationErrorByParent] = useState<Record<string, string>>(
    {}
  );
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

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

  const loadTranslationsForParent = useCallback(
    async (parentId: string) => {
      if (translationsByParent[parentId] || translationsLoadingByParent[parentId]) {
        return;
      }

      setTranslationsLoadingByParent((prev) => ({ ...prev, [parentId]: true }));
      setTranslationErrorByParent((prev) => {
        const next = { ...prev };
        delete next[parentId];
        return next;
      });

      try {
        const translations = await repository.getTranslations(parentId);
        const mappedTranslations: TranslationInfo[] = (translations || []).map(
          (t: Record<string, unknown>) => {
            const id = String(t.translation_id ?? t.id ?? '');
            const name = String(t.translation_name ?? t.name ?? '');
            const directory = String(t.directory_name ?? t.directory ?? '');
            const language = String(t.language_code ?? t.language ?? '');
            const status = String(t.status ?? 'active');
            const book_count = typeof t.book_count === 'number' ? t.book_count : undefined;
            const verse_count = typeof t.verse_count === 'number' ? t.verse_count : undefined;

            return { id, name, directory, language, status, book_count, verse_count };
          }
        );

        setTranslationsByParent((prev) => ({ ...prev, [parentId]: mappedTranslations }));
      } catch (translationError) {
        console.error(`Failed to fetch translations for ${parentId}:`, translationError);
        setTranslationErrorByParent((prev) => ({
          ...prev,
          [parentId]:
            translationError instanceof Error
              ? translationError.message
              : 'Failed to load translations',
        }));
      } finally {
        setTranslationsLoadingByParent((prev) => ({ ...prev, [parentId]: false }));
      }
    },
    [translationsByParent, translationsLoadingByParent]
  );

  useEffect(() => {
    const activeParentIds = new Set(
      repositories.filter((repo) => repo.type === 'parent').map((repo) => repo.id)
    );

    setExpandedParents((prev) => {
      const filtered = new Set([...prev].filter((id) => activeParentIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });

    setTranslationsByParent((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => activeParentIds.has(id)))
    );

    setTranslationsLoadingByParent((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => activeParentIds.has(id)))
    );

    setTranslationErrorByParent((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => activeParentIds.has(id)))
    );
  }, [repositories]);

  useEffect(() => {
    expandedParents.forEach((parentId) => {
      void loadTranslationsForParent(parentId);
    });
  }, [expandedParents, loadTranslationsForParent]);

  const toggleParentExpansion = (parentId: string) => {
    const shouldExpand = !expandedParents.has(parentId);

    setExpandedParents((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(parentId)) {
        newSet.delete(parentId);
      } else {
        newSet.add(parentId);
      }
      return newSet;
    });

    if (shouldExpand) {
      void loadTranslationsForParent(parentId);
    }
  };

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

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLElement>, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
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
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
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
          <button
            onClick={onImportClick}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Import Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-semibold">Installed Repositories</h2>
          <button
            onClick={onImportClick}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Import
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredRepositories.length} repository{filteredRepositories.length !== 1 ? 's' : ''}{' '}
          available
        </p>
      </div>
      <div className="px-6 pb-4 space-y-3">
        {filteredRepositories.map((repo) => {
          const hasLoadedTranslations =
            repo.type === 'parent' && Object.prototype.hasOwnProperty.call(translationsByParent, repo.id);
          const parentTranslations = repo.type === 'parent' ? repo.translations ?? [] : [];
          const translationCount =
            repo.type === 'parent'
              ? hasLoadedTranslations
                ? parentTranslations.length
                : repo.translation_count ?? 0
              : 0;

          return (
            <div key={repo.id} className="space-y-2">
            {/* Parent Repository or Standalone Translation */}
            <div
              className={`p-3 border-b border-border transition-all ${
                repo.type === 'parent' ? 'cursor-default' : 'cursor-pointer hover:bg-accent/30'
              } ${currentRepositoryId === repo.id ? 'bg-accent/20' : ''}`}
              role="button"
              tabIndex={0}
              aria-expanded={repo.type === 'parent' ? expandedParents.has(repo.id) : undefined}
              onClick={() => {
                if (repo.type === 'parent') {
                  toggleParentExpansion(repo.id);
                } else {
                  handleRepositorySelect(repo);
                }
              }}
              onKeyDown={(event) =>
                handleRowKeyDown(event, () => {
                  if (repo.type === 'parent') {
                    toggleParentExpansion(repo.id);
                  } else {
                    handleRepositorySelect(repo);
                  }
                })
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
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
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="h-8 w-8 inline-flex items-center justify-center hover:bg-accent transition-colors">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Info className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: repo.id, name: repo.name });
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
                    className={`p-2 border-b border-border/50 cursor-pointer transition-all hover:bg-accent/30 ${
                      currentRepositoryId === translation.id ? 'bg-accent/20' : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      // Create a repository object for the translation
                      const translationRepo: Repository = {
                        id: translation.id,
                        name: translation.name,
                        description: `${translation.name} from ${repo.name}`,
                        language: translation.language,
                        version: repo.version,
                        created_at: repo.created_at,
                        updated_at: repo.updated_at,
                        type: 'translation',
                        parent_id: repo.id,
                        book_count: translation.book_count,
                        verse_count: translation.verse_count,
                      };
                      handleRepositorySelect(translationRepo);
                    }}
                    onKeyDown={(event) =>
                      handleRowKeyDown(event, () => {
                        const translationRepo: Repository = {
                          id: translation.id,
                          name: translation.name,
                          description: `${translation.name} from ${repo.name}`,
                          language: translation.language,
                          version: repo.version,
                          created_at: repo.created_at,
                          updated_at: repo.updated_at,
                          type: 'translation',
                          parent_id: repo.id,
                          book_count: translation.book_count,
                          verse_count: translation.verse_count,
                        };
                        handleRepositorySelect(translationRepo);
                      })
                    }
                  >
                    <div className="flex items-center gap-2 mb-2">
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
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleDeleteRepository(deleteTarget.id)}
                className="px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-md hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
