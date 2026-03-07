import { createTranslationRepository } from '@/lib/repositoryTranslations';
import { Repository, RepositorySelection, TranslationInfo } from '@/types/store';

export const mergeRepositoriesWithTranslations = (
  repositories: Repository[],
  translationsByParent: Record<string, TranslationInfo[]>
): Repository[] =>
  repositories.map((repo) =>
    repo.type === 'parent' ? { ...repo, translations: translationsByParent[repo.id] } : repo
  );

export const toRepositorySelection = (repository: Repository | null): RepositorySelection | null =>
  repository
    ? {
        id: repository.id,
        type: repository.type,
        parent_id: repository.parent_id,
      }
    : null;

export const pruneTranslationsByParent = (
  translationsByParent: Record<string, TranslationInfo[]>,
  repositories: Repository[]
): Record<string, TranslationInfo[]> => {
  const activeParentIds = new Set(
    repositories.filter((repo) => repo.type === 'parent').map((repo) => repo.id)
  );

  return Object.fromEntries(
    Object.entries(translationsByParent).filter(([id]) => activeParentIds.has(id))
  );
};

type ResolveCurrentRepositorySelectionParams = {
  currentRepository: Repository | null;
  repositorySelection: RepositorySelection | null;
  repositories: Repository[];
  loadTranslations: (parentId: string) => Promise<TranslationInfo[]>;
};

type RepositorySelectionResolution =
  | {
      kind: 'clear';
      repository: null;
    }
  | {
      kind: 'direct';
      repository: Repository;
    }
  | {
      kind: 'translation';
      repository: Repository;
    }
  | {
      kind: 'unchanged';
      repository: Repository | null;
    };

export async function resolveCurrentRepositorySelection({
  currentRepository,
  repositorySelection,
  repositories,
  loadTranslations,
}: ResolveCurrentRepositorySelectionParams): Promise<RepositorySelectionResolution> {
  const activeSelection =
    currentRepository !== null ? toRepositorySelection(currentRepository) : repositorySelection;

  if (!activeSelection) {
    return { kind: 'unchanged', repository: currentRepository };
  }

  const directMatch = repositories.find((repository) => repository.id === activeSelection.id);
  if (directMatch) {
    return { kind: 'direct', repository: directMatch };
  }

  const isTranslationSelection =
    activeSelection.type === 'translation' || Boolean(activeSelection.parent_id);
  if (!isTranslationSelection) {
    return { kind: 'clear', repository: null };
  }

  const parentCandidates = repositories.filter(
    (repository) =>
      repository.type === 'parent' &&
      (!activeSelection.parent_id || repository.id === activeSelection.parent_id)
  );

  for (const parent of parentCandidates) {
    const translations = await loadTranslations(parent.id);
    const translation = translations.find((entry) => entry.id === activeSelection.id);

    if (translation) {
      return {
        kind: 'translation',
        repository: createTranslationRepository(parent, translation, {
          ...(currentRepository || activeSelection),
        }),
      };
    }
  }

  return { kind: 'clear', repository: null };
}
