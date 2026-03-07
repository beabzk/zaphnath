import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import {
  RepositoryState,
  Repository,
  RepositorySelection,
  Book,
  Chapter,
  Verse,
  ErrorState,
  ImportProgress,
  ValidationResult,
} from '@/types/store';
import { createRepositoryStoreAsyncActions } from './repositoryStoreAsyncActions';
import {
  addRepositoryState,
  initialRepositoryState,
  mergeRepositoryListState,
  migrateRepositoryStoreState,
  partializeRepositoryStoreState,
  removeRepositoryState,
  setCurrentRepositoryState,
  setTranslationsForParentState,
  updateRepositoryState,
} from './repositoryStoreState';

export const useRepositoryStore = create<RepositoryState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialRepositoryState,

        // Repository Actions
        setRepositories: (repositories: Repository[]) => {
          set(
            (state) => mergeRepositoryListState(repositories, state.translationsByParent),
            false,
            'setRepositories'
          );
        },

        setTranslationsForParent: (parentId, translations) => {
          set(
            (state) => setTranslationsForParentState(state, parentId, translations),
            false,
            'setTranslationsForParent'
          );
        },

        setCurrentRepositorySelection: (selection: RepositorySelection | null) => {
          set({ currentRepositorySelection: selection }, false, 'setCurrentRepositorySelection');
        },

        setCurrentRepository: (repository: Repository | null) => {
          set(setCurrentRepositoryState(repository), false, 'setCurrentRepository');

          // Load books for the new repository
          if (repository) {
            get().loadBooks(repository.id);
          }
        },

        addRepository: (repository: Repository) => {
          set((state) => addRepositoryState(state, repository), false, 'addRepository');
        },

        removeRepository: (repositoryId: string) => {
          set((state) => removeRepositoryState(state, repositoryId), false, 'removeRepository');
        },

        updateRepository: (repositoryId: string, updates: Partial<Repository>) => {
          set(
            (state) => updateRepositoryState(state, repositoryId, updates),
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
        migrate: migrateRepositoryStoreState,
        partialize: partializeRepositoryStoreState,
      }
    ),
    {
      name: 'repository-store',
    }
  )
);
