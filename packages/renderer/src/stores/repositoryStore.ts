import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  mergeRepositoriesWithTranslations,
  toRepositorySelection,
} from '@/lib/repositorySelectionState';
import {
  RepositoryState,
  Repository,
  RepositorySelection,
  TranslationInfo,
  Book,
  Chapter,
  Verse,
  ErrorState,
  ImportProgress,
  ValidationResult,
} from '@/types/store';
import { createRepositoryStoreAsyncActions } from './repositoryStoreAsyncActions';

type RepositoryStorePersistedState = {
  currentRepositorySelection?: RepositorySelection | null;
  currentRepository?: Repository | null;
  repositories?: Repository[];
  translationsByParent?: Record<string, TranslationInfo[]>;
};

const isRepositoryStorePersistedState = (value: unknown): value is RepositoryStorePersistedState =>
  typeof value === 'object' && value !== null;

const initialState = {
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

export const useRepositoryStore = create<RepositoryState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // Repository Actions
        setRepositories: (repositories: Repository[]) => {
          set(
            (state) => ({
              repositories: mergeRepositoriesWithTranslations(
                repositories,
                state.translationsByParent
              ),
            }),
            false,
            'setRepositories'
          );
        },

        setTranslationsForParent: (parentId: string, translations: TranslationInfo[]) => {
          set(
            (state) => {
              const nextTranslationsByParent = {
                ...state.translationsByParent,
                [parentId]: translations,
              };

              return {
                translationsByParent: nextTranslationsByParent,
                repositories: mergeRepositoriesWithTranslations(
                  state.repositories,
                  nextTranslationsByParent
                ),
              };
            },
            false,
            'setTranslationsForParent'
          );
        },

        setCurrentRepositorySelection: (selection: RepositorySelection | null) => {
          set({ currentRepositorySelection: selection }, false, 'setCurrentRepositorySelection');
        },

        setCurrentRepository: (repository: Repository | null) => {
          set(
            {
              currentRepositorySelection: toRepositorySelection(repository),
              currentRepository: repository,
              books: [], // Clear books when switching repositories
              currentBook: null,
              currentChapter: null,
              verses: [],
            },
            false,
            'setCurrentRepository'
          );

          // Load books for the new repository
          if (repository) {
            get().loadBooks(repository.id);
          }
        },

        addRepository: (repository: Repository) => {
          set(
            (state) => ({
              repositories: [...state.repositories, repository],
            }),
            false,
            'addRepository'
          );
        },

        removeRepository: (repositoryId: string) => {
          set(
            (state) => {
              const newRepositories = state.repositories.filter((r) => r.id !== repositoryId);
              const newCurrentRepository =
                state.currentRepository?.id === repositoryId ? null : state.currentRepository;
              const currentRepositorySelection =
                state.currentRepositorySelection?.id === repositoryId ||
                state.currentRepositorySelection?.parent_id === repositoryId
                  ? null
                  : state.currentRepositorySelection;

              return {
                repositories: newRepositories,
                translationsByParent: Object.fromEntries(
                  Object.entries(state.translationsByParent).filter(([id]) => id !== repositoryId)
                ),
                currentRepositorySelection,
                currentRepository: newCurrentRepository,
                books: newCurrentRepository ? state.books : [],
                currentBook: newCurrentRepository ? state.currentBook : null,
                currentChapter: newCurrentRepository ? state.currentChapter : null,
                verses: newCurrentRepository ? state.verses : [],
              };
            },
            false,
            'removeRepository'
          );
        },

        updateRepository: (repositoryId: string, updates: Partial<Repository>) => {
          set(
            (state) => ({
              repositories: state.repositories.map((r) =>
                r.id === repositoryId ? { ...r, ...updates } : r
              ),
              currentRepository:
                state.currentRepository?.id === repositoryId
                  ? { ...state.currentRepository, ...updates }
                  : state.currentRepository,
            }),
            false,
            'updateRepository'
          );
        },

        // Book Actions
        setBooks: (books: Book[]) => {
          set({ books }, false, 'setBooks');
        },

        setCurrentBook: (book: Book | null) => {
          set(
            {
              currentBook: book,
              currentChapter: null,
              verses: [],
            },
            false,
            'setCurrentBook'
          );
        },

        // Chapter Actions
        setCurrentChapter: (chapter: Chapter | null) => {
          set({ currentChapter: chapter }, false, 'setCurrentChapter');
        },

        setVerses: (verses: Verse[]) => {
          set({ verses }, false, 'setVerses');
        },

        // UI State Actions
        setLoading: (isLoading: boolean) => {
          set({ isLoading }, false, 'setLoading');
        },

        setError: (error: ErrorState | null) => {
          set({ error }, false, 'setError');
        },

        setImportProgress: (progress: ImportProgress | null) => {
          set({ importProgress: progress }, false, 'setImportProgress');
        },

        setValidationResult: (result: ValidationResult | null) => {
          set({ validationResult: result }, false, 'setValidationResult');
        },
        ...createRepositoryStoreAsyncActions(set, get),
      }),
      {
        name: 'zaphnath-repository-store',
        version: 3,
        migrate: (persistedState: unknown, version: number) => {
          const state = isRepositoryStorePersistedState(persistedState) ? persistedState : {};

          if (version < 2) {
            return {
              ...state,
              repositories: [],
              translationsByParent: {},
              currentRepositorySelection: null,
              currentRepository: null,
            };
          }

          if (version < 3) {
            return {
              ...state,
              currentRepositorySelection: toRepositorySelection(state.currentRepository ?? null),
              currentRepository: null,
            };
          }

          return state;
        },
        partialize: (state) => ({
          currentRepositorySelection: state.currentRepositorySelection,
          // Don't persist loading states, errors, or temporary data
        }),
      }
    ),
    {
      name: 'repository-store',
    }
  )
);
