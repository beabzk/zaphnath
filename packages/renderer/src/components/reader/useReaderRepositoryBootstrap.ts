import { useEffect } from 'react';
import { useRepositoryStore } from '@/stores';
import { resolveRepositoryById } from '@/lib/repositorySelectionState';
import type { Repository, RepositorySelection, TranslationInfo } from '@/types/store';

type ReaderRepositoryBootstrapArgs = {
  currentRepository: Repository | null;
  currentRepositorySelection: RepositorySelection | null;
  repositories: Repository[];
  defaultRepositoryId?: string | null;
  isRepositoryLoading: boolean;
  isSettingsLoading: boolean;
  loadRepositories: () => Promise<void>;
  loadTranslations: (parentId: string) => Promise<TranslationInfo[]>;
  setCurrentRepository: (repository: Repository | null) => void;
};

export function useReaderRepositoryBootstrap({
  currentRepository,
  currentRepositorySelection,
  repositories,
  defaultRepositoryId,
  isRepositoryLoading,
  isSettingsLoading,
  loadRepositories,
  loadTranslations,
  setCurrentRepository,
}: ReaderRepositoryBootstrapArgs) {
  useEffect(() => {
    if (currentRepository || isSettingsLoading || isRepositoryLoading) {
      return;
    }

    if (currentRepositorySelection) {
      void loadRepositories();
      return;
    }

    if (!defaultRepositoryId) {
      return;
    }

    let cancelled = false;

    const restoreDefaultRepository = async () => {
      if (repositories.length === 0) {
        await loadRepositories();
      }

      const latestRepositories = useRepositoryStore.getState().repositories;
      const resolvedRepository = await resolveRepositoryById({
        repositoryId: defaultRepositoryId,
        repositories: latestRepositories,
        loadTranslations,
      });

      if (!cancelled && resolvedRepository) {
        setCurrentRepository(resolvedRepository);
      }
    };

    restoreDefaultRepository().catch((error) => {
      console.error('[Reader] Failed to restore default repository:', error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    currentRepository,
    currentRepositorySelection,
    defaultRepositoryId,
    isRepositoryLoading,
    isSettingsLoading,
    loadRepositories,
    loadTranslations,
    repositories,
    setCurrentRepository,
  ]);
}
