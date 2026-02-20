import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { repository } from "@app/preload";
import {
  RepositoryState,
  Repository,
  Book,
  Chapter,
  Verse,
  ErrorState,
  ImportProgress,
  ValidationResult,
} from "@/types/store";

const initialState = {
  repositories: [],
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
          set({ repositories }, false, "setRepositories");
        },

        setCurrentRepository: (repository: Repository | null) => {
          set(
            {
              currentRepository: repository,
              books: [], // Clear books when switching repositories
              currentBook: null,
              currentChapter: null,
              verses: [],
            },
            false,
            "setCurrentRepository"
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
            "addRepository"
          );
        },

        removeRepository: (repositoryId: string) => {
          set(
            (state) => {
              const newRepositories = state.repositories.filter(
                (r) => r.id !== repositoryId
              );
              const newCurrentRepository =
                state.currentRepository?.id === repositoryId
                  ? null
                  : state.currentRepository;

              return {
                repositories: newRepositories,
                currentRepository: newCurrentRepository,
                books: newCurrentRepository ? state.books : [],
                currentBook: newCurrentRepository ? state.currentBook : null,
                currentChapter: newCurrentRepository
                  ? state.currentChapter
                  : null,
                verses: newCurrentRepository ? state.verses : [],
              };
            },
            false,
            "removeRepository"
          );
        },

        updateRepository: (
          repositoryId: string,
          updates: Partial<Repository>
        ) => {
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
            "updateRepository"
          );
        },

        // Book Actions
        setBooks: (books: Book[]) => {
          set({ books }, false, "setBooks");
        },

        setCurrentBook: (book: Book | null) => {
          set(
            {
              currentBook: book,
              currentChapter: null,
              verses: [],
            },
            false,
            "setCurrentBook"
          );
        },

        // Chapter Actions
        setCurrentChapter: (chapter: Chapter | null) => {
          set({ currentChapter: chapter }, false, "setCurrentChapter");
        },

        setVerses: (verses: Verse[]) => {
          set({ verses }, false, "setVerses");
        },

        // UI State Actions
        setLoading: (isLoading: boolean) => {
          set({ isLoading }, false, "setLoading");
        },

        setError: (error: ErrorState | null) => {
          set({ error }, false, "setError");
        },

        setImportProgress: (progress: ImportProgress | null) => {
          set({ importProgress: progress }, false, "setImportProgress");
        },

        setValidationResult: (result: ValidationResult | null) => {
          set({ validationResult: result }, false, "setValidationResult");
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
              { repositories: parentRepositories || [] },
              false,
              "loadParentRepositories"
            );
          } catch (error) {
            setError({
              hasError: true,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to load parent repositories",
              timestamp: new Date().toISOString(),
            });
          } finally {
            setLoading(false);
          }
        },

        loadTranslations: async (parentId: string) => {
          const { setLoading, setError } = get();

          try {
            setLoading(true);
            setError(null);

            // @ts-ignore - APIs will be available at runtime
            const translations = await repository.getTranslations(parentId);

            // Update the parent repository with its translations
            const { repositories } = get();
            const updatedRepositories = repositories.map((repo) =>
              repo.id === parentId
                ? { ...repo, translations: translations || [] }
                : repo
            );

            set(
              { repositories: updatedRepositories },
              false,
              "loadTranslations"
            );
            return translations || [];
          } catch (error) {
            setError({
              hasError: true,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to load translations",
              timestamp: new Date().toISOString(),
            });
            return [];
          } finally {
            setLoading(false);
          }
        },

        // Async Actions
        loadRepositories: async () => {
          const { setLoading, setError, setRepositories } = get();

          try {
            setLoading(true);
            setError(null);

            // @ts-ignore - APIs will be available at runtime
            const repositories = await repository.list();
            setRepositories(repositories || []);

            // Validate currentRepository still exists
            const { currentRepository, setCurrentRepository } = get();
            if (currentRepository && repositories) {
              const exists = repositories.some(
                (r: Repository) => r.id === currentRepository.id
              );
              if (!exists) {
                setCurrentRepository(null);
              }
            }
          } catch (error) {
            setError({
              hasError: true,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to load repositories",
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

            // @ts-ignore - APIs will be available at runtime
            const books = await repository.getBooks(repositoryId);
            const mappedBooks = (books || []).map((b: any) => ({
              id: String(b.id),
              repository_id: b.repository_id,
              name: b.name,
              abbreviation: b.abbreviation,
              testament:
                b.testament === "OT" ? ("old" as const) : ("new" as const),
              order: b.order,
              chapter_count: b.chapter_count,
            }));
            setBooks(mappedBooks);
          } catch (error) {
            setError({
              hasError: true,
              message:
                error instanceof Error ? error.message : "Failed to load books",
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

            // @ts-ignore - APIs will be available at runtime
            const chapterData = await repository.getChapter(
              bookId,
              chapterNumber
            );

            if (chapterData) {
              const verses = chapterData.verses || [];
              const mappedChapter = {
                id: `${bookId}-${chapterNumber}`,
                book_id: String(bookId),
                number: chapterNumber,
                verse_count: verses.length,
              };
              const mappedVerses = verses.map((v: any) => ({
                id: String(v.id),
                chapter_id: `${v.book_id}-${v.chapter}`,
                number: v.verse,
                text: v.text,
              }));
              setCurrentChapter(mappedChapter);
              setVerses(mappedVerses);
            }
          } catch (error) {
            setError({
              hasError: true,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to load chapter",
              timestamp: new Date().toISOString(),
            });
          } finally {
            setLoading(false);
          }
        },

        importRepository: async (url: string, options?: any) => {
          const { setLoading, setError, setImportProgress, loadRepositories } =
            get();

          try {
            setLoading(true);
            setError(null);
            setImportProgress({ stage: "Starting import...", progress: 0 });

            // @ts-ignore - APIs will be available at runtime
            // Note: progress_callback cannot be passed through IPC, so we remove it
            const cleanOptions = { ...options };
            delete cleanOptions.progress_callback;

            // @ts-ignore
            const result = await repository.import(url, cleanOptions);

            if (result?.success) {
              setImportProgress({
                stage: "Import completed successfully",
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
                message: result?.errors?.join(", ") || "Import failed",
                timestamp: new Date().toISOString(),
              });
              setImportProgress(null);
              return false;
            }
          } catch (error) {
            setError({
              hasError: true,
              message: error instanceof Error ? error.message : "Import failed",
              timestamp: new Date().toISOString(),
            });
            setImportProgress(null);
            return false;
          } finally {
            setLoading(false);
          }
        },

        validateRepository: async (url: string) => {
          const { setLoading, setError, setValidationResult } = get();

          try {
            setLoading(true);
            setError(null);

            // @ts-ignore - APIs will be available at runtime
            const result = await repository.validate(url);
            const mappedResult: ValidationResult = {
              valid: result.valid,
              errors: (result.errors || []).map((e: any) => ({
                code: e.code,
                message: e.message,
                severity: e.severity ?? "error",
              })),
              warnings: (result.warnings || []).map((w: any) => ({
                code: w.code,
                message: w.message,
                severity: "warning",
              })),
            };
            setValidationResult(mappedResult);

            return mappedResult;
          } catch (error) {
            const errorResult: ValidationResult = {
              valid: false,
              errors: [
                {
                  code: "VALIDATION_ERROR",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Validation failed",
                  severity: "error",
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
        name: "zaphnath-repository-store",
        version: 1,
        partialize: (state) => ({
          currentRepository: state.currentRepository,
          repositories: state.repositories,
          // Don't persist loading states, errors, or temporary data
        }),
      }
    ),
    {
      name: "repository-store",
    }
  )
);
