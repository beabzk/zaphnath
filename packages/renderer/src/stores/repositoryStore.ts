import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { repository } from '@app/preload';
import { toRendererBooks, toRendererChapterData } from '@/lib/repositoryContent';
import {
  mergeRepositoriesWithTranslations,
  pruneTranslationsByParent,
  resolveCurrentRepositorySelection,
  toRepositorySelection,
} from '@/lib/repositorySelectionState';
import { toTranslationInfoList } from '@/lib/repositoryTranslations';
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

        // Hierarchical Repository Actions
        loadParentRepositories: async () => {
          const { setLoading, setError } = get();

          try {
            setLoading(true);
            setError(null);

            const parentRepositories = await repository.getParentRepositories();

            // Update repositories with parent repositories
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
            setError({
              hasError: true,
              message:
                error instanceof Error ? error.message : 'Failed to load parent repositories',
              timestamp: new Date().toISOString(),
            });
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

        // Async Actions
        loadRepositories: async () => {
          const {
            setLoading,
            setError,
            currentRepository,
            setCurrentRepository,
            loadTranslations,
          } = get();

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
              if (
                !currentRepository ||
                currentRepository.id !== selectionResolution.repository.id
              ) {
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
            setError({
              hasError: true,
              message: error instanceof Error ? error.message : 'Failed to load repositories',
              timestamp: new Date().toISOString(),
            });
          } finally {
            setLoading(false);
          }
        },

        loadBooks: async (repositoryId: string) => {
          const { setLoading, setError, setBooks } = get();

          try {
            setLoading(true);
            setError(null);

            const books = await repository.getBooks(repositoryId);
            setBooks(toRendererBooks(books));
          } catch (error) {
            setError({
              hasError: true,
              message: error instanceof Error ? error.message : 'Failed to load books',
              timestamp: new Date().toISOString(),
            });
          } finally {
            setLoading(false);
          }
        },

        loadChapter: async (bookId: string, chapterNumber: number) => {
          const { setLoading, setError, setCurrentChapter, setVerses } = get();

          try {
            setLoading(true);
            setError(null);

            const chapterData = await repository.getChapter(bookId, chapterNumber);
            const mappedChapterData = toRendererChapterData(bookId, chapterNumber, chapterData);

            if (mappedChapterData) {
              setCurrentChapter(mappedChapterData.chapter);
              setVerses(mappedChapterData.verses);
            }
          } catch (error) {
            setError({
              hasError: true,
              message: error instanceof Error ? error.message : 'Failed to load chapter',
              timestamp: new Date().toISOString(),
            });
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
              setImportProgress({
                stage: progress.stage,
                progress: progress.progress,
                message: progress.message,
                total_books: progress.total_books,
                imported_books: progress.processed_books,
              });
            });

            const result = await repository.import(url, options);

            if (result?.success) {
              setImportProgress({
                stage: 'Import completed successfully',
                progress: 100,
                message: `Imported ${result.books_imported} books`,
              });

              // Reload repositories
              await loadRepositories();

              // Clear progress after a delay
              setTimeout(() => {
                setImportProgress(null);
              }, 3000);

              return true;
            } else {
              setError({
                hasError: true,
                message: result?.errors?.join(', ') || 'Import failed',
                timestamp: new Date().toISOString(),
              });
              setImportProgress(null);
              return false;
            }
          } catch (error) {
            setError({
              hasError: true,
              message: error instanceof Error ? error.message : 'Import failed',
              timestamp: new Date().toISOString(),
            });
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
            const mappedResult: ValidationResult = {
              valid: result.valid,
              errors: (result.errors || []).map((e) => ({
                code: e.code,
                message: e.message,
                severity: e.severity ?? 'error',
              })),
              warnings: (result.warnings || []).map((w) => ({
                code: w.code,
                message: w.message,
                severity: 'warning',
              })),
            };
            setValidationResult(mappedResult);

            return mappedResult;
          } catch (error) {
            const errorResult: ValidationResult = {
              valid: false,
              errors: [
                {
                  code: 'VALIDATION_ERROR',
                  message: error instanceof Error ? error.message : 'Validation failed',
                  severity: 'error',
                },
              ],
              warnings: [],
            };

            setValidationResult(errorResult);
            return errorResult;
          } finally {
            setLoading(false);
          }
        },
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
