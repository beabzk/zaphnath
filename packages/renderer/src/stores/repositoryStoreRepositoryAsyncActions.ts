import { repository } from '@app/preload';
import {
  toCompletedImportProgress,
  toImportFailureMessage,
  toImportProgressState,
  toRendererValidationResult,
  toRepositoryError,
  toValidationErrorResult,
} from '@/lib/repositoryStoreAdapters';
import {
  mergeRepositoriesWithTranslations,
  pruneTranslationsByParent,
  resolveCurrentRepositorySelection,
} from '@/lib/repositorySelectionState';
import { toTranslationInfoList } from '@/lib/repositoryTranslations';
import type { RepositoryState } from '@/types/store';
import type { RepositoryStoreGet, RepositoryStoreSet } from './repositoryStoreActionTypes';

export function createRepositoryStoreRepositoryAsyncActions(
  set: RepositoryStoreSet,
  get: RepositoryStoreGet
): Pick<
  RepositoryState,
  | 'loadParentRepositories'
  | 'loadTranslations'
  | 'loadRepositories'
  | 'importRepository'
  | 'validateRepository'
> {
  return {
    loadParentRepositories: async () => {
      const { setLoading, setError } = get();

      try {
        setLoading(true);
        setError(null);

        const parentRepositories = await repository.getParentRepositories();

        set(
          (state) => ({
            repositories: mergeRepositoriesWithTranslations(
              parentRepositories || [],
              state.translationsByParent
            ),
          }),
          false,
          'loadParentRepositories'
        );
      } catch (error) {
        setError(toRepositoryError(error, 'Failed to load parent repositories'));
      } finally {
        setLoading(false);
      }
    },

    loadTranslations: async (parentId: string) => {
      const { translationsByParent, setTranslationsForParent } = get();

      if (translationsByParent[parentId]) {
        return translationsByParent[parentId];
      }

      try {
        const translations = await repository.getTranslations(parentId);
        const normalizedTranslations = toTranslationInfoList(translations);
        setTranslationsForParent(parentId, normalizedTranslations);

        return normalizedTranslations;
      } catch (error) {
        throw error instanceof Error ? error : new Error('Failed to load translations');
      }
    },

    loadRepositories: async () => {
      const { setLoading, setError, currentRepository, setCurrentRepository, loadTranslations } =
        get();

      try {
        setLoading(true);
        setError(null);

        const repositories = await repository.list();
        const normalizedRepositories = repositories || [];
        const repositorySelection = get().currentRepositorySelection;

        set(
          (state) => {
            const nextTranslationsByParent = pruneTranslationsByParent(
              state.translationsByParent,
              normalizedRepositories
            );

            return {
              translationsByParent: nextTranslationsByParent,
              repositories: mergeRepositoriesWithTranslations(
                normalizedRepositories,
                nextTranslationsByParent
              ),
            };
          },
          false,
          'loadRepositories'
        );

        const selectionResolution = await resolveCurrentRepositorySelection({
          currentRepository,
          repositorySelection,
          repositories: normalizedRepositories,
          loadTranslations,
        });

        if (selectionResolution.kind === 'direct') {
          if (!currentRepository || currentRepository.id !== selectionResolution.repository.id) {
            setCurrentRepository(selectionResolution.repository);
          }
          return;
        }

        if (selectionResolution.kind === 'translation') {
          set(
            {
              currentRepository: selectionResolution.repository,
            },
            false,
            'syncCurrentTranslation'
          );
          return;
        }

        if (selectionResolution.kind === 'clear') {
          setCurrentRepository(null);
        }
      } catch (error) {
        setError(toRepositoryError(error, 'Failed to load repositories'));
      } finally {
        setLoading(false);
      }
    },

    importRepository: async (url: string, options?: Zaphnath.RepositoryImportOptions) => {
      const { setLoading, setError, setImportProgress, loadRepositories } = get();
      let unsubscribeProgress: (() => void) | null = null;

      try {
        setLoading(true);
        setError(null);
        setImportProgress({ stage: 'Starting import...', progress: 0 });

        unsubscribeProgress = repository.onImportProgress((progress) => {
          setImportProgress(toImportProgressState(progress));
        });

        const result = await repository.import(url, options);

        if (result?.success) {
          setImportProgress(toCompletedImportProgress(result));
          await loadRepositories();

          setTimeout(() => {
            setImportProgress(null);
          }, 3000);

          return true;
        }

        setError(toRepositoryError(null, toImportFailureMessage(result)));
        setImportProgress(null);
        return false;
      } catch (error) {
        setError(toRepositoryError(error, 'Import failed'));
        setImportProgress(null);
        return false;
      } finally {
        unsubscribeProgress?.();
        setLoading(false);
      }
    },

    validateRepository: async (url: string) => {
      const { setLoading, setError, setValidationResult } = get();

      try {
        setLoading(true);
        setError(null);

        const result = await repository.validate(url);
        const mappedResult = toRendererValidationResult(result);
        setValidationResult(mappedResult);

        return mappedResult;
      } catch (error) {
        const errorResult = toValidationErrorResult(error);
        setValidationResult(errorResult);
        return errorResult;
      } finally {
        setLoading(false);
      }
    },
  };
}
