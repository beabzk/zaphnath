import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, BookOpen, Download } from 'lucide-react';
import { repository } from '@app/preload';
import { useRepositoryStore } from '@/stores';
import { RepositoryDeleteDialog } from './RepositoryDeleteDialog';
import { RepositoryListItem } from './RepositoryListItem';
import type { DeleteTarget, RepositoryListRepository as Repository } from './repositoryListTypes';
import { useRepositoryListTranslations } from './useRepositoryListTranslations';

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
        {filteredRepositories.map((repo) => (
          <RepositoryListItem
            key={repo.id}
            currentRepositoryId={currentRepositoryId}
            isExpanded={expandedParents.has(repo.id)}
            repo={repo}
            translationError={translationErrorByParent[repo.id]}
            translationsLoading={Boolean(translationsLoadingByParent[repo.id])}
            translationsByParent={translationsByParent}
            onRepositorySelect={handleRepositorySelect}
            onRequestDelete={setDeleteTarget}
            onToggleParentExpansion={toggleParentExpansion}
          />
        ))}
      </div>

      <RepositoryDeleteDialog
        deleteTarget={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(repositoryId) => void handleDeleteRepository(repositoryId)}
      />
    </div>
  );
}
