import type {
  Repository,
  RepositorySelection,
  RepositoryState,
  TranslationInfo,
} from '@/types/store';
import {
  mergeRepositoriesWithTranslations,
  toRepositorySelection,
} from '@/lib/repositorySelectionState';

export type RepositoryStorePersistedState = {
  currentRepositorySelection?: RepositorySelection | null;
  currentRepository?: Repository | null;
};

export const initialRepositoryState: Pick<
  RepositoryState,
  | 'repositories'
  | 'translationsByParent'
  | 'currentRepositorySelection'
  | 'currentRepository'
  | 'books'
  | 'currentBook'
  | 'currentChapter'
  | 'verses'
  | 'isLoading'
  | 'error'
  | 'importProgress'
  | 'validationResult'
> = {
  repositories: [],
  translationsByParent: {},
  currentRepositorySelection: null,
  currentRepository: null,
  books: [],
  currentBook: null,
  currentChapter: null,
  verses: [],
  isLoading: false,
  error: null,
  importProgress: null,
  validationResult: null,
};

export const isRepositoryStorePersistedState = (
  value: unknown
): value is RepositoryStorePersistedState => typeof value === 'object' && value !== null;

export function mergeRepositoryListState(
  repositories: Repository[],
  translationsByParent: Record<string, TranslationInfo[]>
): Pick<RepositoryState, 'repositories'> {
  return {
    repositories: mergeRepositoriesWithTranslations(repositories, translationsByParent),
  };
}

export function setTranslationsForParentState(
  state: Pick<RepositoryState, 'repositories' | 'translationsByParent'>,
  parentId: string,
  translations: TranslationInfo[]
): Pick<RepositoryState, 'translationsByParent' | 'repositories'> {
  const nextTranslationsByParent = {
    ...state.translationsByParent,
    [parentId]: translations,
  };

  return {
    translationsByParent: nextTranslationsByParent,
    repositories: mergeRepositoriesWithTranslations(state.repositories, nextTranslationsByParent),
  };
}

export function setCurrentRepositoryState(
  repository: Repository | null
): Pick<
  RepositoryState,
  | 'currentRepositorySelection'
  | 'currentRepository'
  | 'books'
  | 'currentBook'
  | 'currentChapter'
  | 'verses'
> {
  return {
    currentRepositorySelection: toRepositorySelection(repository),
    currentRepository: repository,
    books: [],
    currentBook: null,
    currentChapter: null,
    verses: [],
  };
}

export function addRepositoryState(
  state: Pick<RepositoryState, 'repositories'>,
  repository: Repository
): Pick<RepositoryState, 'repositories'> {
  return {
    repositories: [...state.repositories, repository],
  };
}

export function removeRepositoryState(
  state: Pick<
    RepositoryState,
    | 'repositories'
    | 'translationsByParent'
    | 'currentRepositorySelection'
    | 'currentRepository'
    | 'books'
    | 'currentBook'
    | 'currentChapter'
    | 'verses'
  >,
  repositoryId: string
): Pick<
  RepositoryState,
  | 'repositories'
  | 'translationsByParent'
  | 'currentRepositorySelection'
  | 'currentRepository'
  | 'books'
  | 'currentBook'
  | 'currentChapter'
  | 'verses'
> {
  const repositories = state.repositories.filter((repository) => repository.id !== repositoryId);
  const currentRepository =
    state.currentRepository?.id === repositoryId ? null : state.currentRepository;
  const currentRepositorySelection =
    state.currentRepositorySelection?.id === repositoryId ||
    state.currentRepositorySelection?.parent_id === repositoryId
      ? null
      : state.currentRepositorySelection;

  return {
    repositories,
    translationsByParent: Object.fromEntries(
      Object.entries(state.translationsByParent).filter(([id]) => id !== repositoryId)
    ),
    currentRepositorySelection,
    currentRepository,
    books: currentRepository ? state.books : [],
    currentBook: currentRepository ? state.currentBook : null,
    currentChapter: currentRepository ? state.currentChapter : null,
    verses: currentRepository ? state.verses : [],
  };
}

export function updateRepositoryState(
  state: Pick<RepositoryState, 'repositories' | 'currentRepository'>,
  repositoryId: string,
  updates: Partial<Repository>
): Pick<RepositoryState, 'repositories' | 'currentRepository'> {
  return {
    repositories: state.repositories.map((repository) =>
      repository.id === repositoryId ? { ...repository, ...updates } : repository
    ),
    currentRepository:
      state.currentRepository?.id === repositoryId
        ? { ...state.currentRepository, ...updates }
        : state.currentRepository,
  };
}

export function migrateRepositoryStoreState(
  persistedState: unknown,
  version: number
): Pick<RepositoryState, 'currentRepositorySelection'> {
  const state = isRepositoryStorePersistedState(persistedState) ? persistedState : {};

  if (version < 2) {
    return {
      currentRepositorySelection: null,
    };
  }

  if (version < 3) {
    return {
      currentRepositorySelection: toRepositorySelection(state.currentRepository ?? null),
    };
  }

  return {
    currentRepositorySelection: state.currentRepositorySelection ?? null,
  };
}

export function partializeRepositoryStoreState(
  state: RepositoryState
): Pick<RepositoryState, 'currentRepositorySelection'> {
  return {
    currentRepositorySelection: state.currentRepositorySelection,
  };
}
