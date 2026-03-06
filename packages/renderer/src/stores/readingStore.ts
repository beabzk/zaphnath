import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useRepositoryStore } from './repositoryStore';
import {
  ReadingState,
  ReadingLocation,
  ReadingHistory,
  Bookmark,
  Note,
  Highlight,
} from '@/types/store';

const initialState = {
  currentLocation: null,
  history: [],
  bookmarks: [],
  notes: [],
  highlights: [],

  // Reading preferences (synced with settings)
  readingMode: 'verse' as const,
  autoScroll: false,
  scrollSpeed: 5,
  showVerseNumbers: true,
  highlightCurrentVerse: true,
};

export const useReadingStore = create<ReadingState>()(
  devtools(
    persist(
      (set, get) => {
        const ensureRepositoryContext = async (repositoryId: string) => {
          const repositoryState = useRepositoryStore.getState();
          const isCurrentRepository = repositoryState.currentRepository?.id === repositoryId;

          if (!isCurrentRepository) {
            const targetRepository =
              repositoryState.repositories.find((repo) => repo.id === repositoryId) || null;
            if (targetRepository) {
              repositoryState.setCurrentRepository(targetRepository);
            }
          }

          const refreshedRepositoryState = useRepositoryStore.getState();
          const hasBooksForRepository = refreshedRepositoryState.books.some(
            (book) => book.repository_id === repositoryId
          );

          if (!hasBooksForRepository) {
            await refreshedRepositoryState.loadBooks(repositoryId);
          }

          return useRepositoryStore.getState();
        };

        return {
          ...initialState,

          // Location Actions
          setCurrentLocation: (location: ReadingLocation | null) => {
            set({ currentLocation: location }, false, 'setCurrentLocation');

            // Add to history if location is set
            if (location) {
              get().addToHistory(location);
            }
          },

          // History Actions
          addToHistory: (location: ReadingLocation, duration?: number) => {
            const historyEntry: ReadingHistory = {
              id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              repository_id: location.repository_id,
              book_id: location.book_id,
              chapter_number: location.chapter_number,
              verse_number: location.verse_number,
              timestamp: new Date().toISOString(),
              duration,
            };

            set(
              (state) => {
                // Remove duplicate entries (same location within last 5 minutes)
                const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
                const filteredHistory = state.history.filter((entry) => {
                  const entryTime = new Date(entry.timestamp).getTime();
                  const isSameLocation =
                    entry.repository_id === location.repository_id &&
                    entry.book_id === location.book_id &&
                    entry.chapter_number === location.chapter_number;

                  return !(isSameLocation && entryTime > fiveMinutesAgo);
                });

                // Keep only last 100 entries
                const newHistory = [...filteredHistory, historyEntry].slice(-100);

                return { history: newHistory };
              },
              false,
              'addToHistory'
            );
          },

          clearHistory: () => {
            set({ history: [] }, false, 'clearHistory');
          },

          // Bookmark Actions
          addBookmark: (bookmark: Omit<Bookmark, 'id' | 'created_at'>) => {
            const newBookmark: Bookmark = {
              ...bookmark,
              id: `bookmark-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              created_at: new Date().toISOString(),
            };

            set(
              (state) => ({
                bookmarks: [...state.bookmarks, newBookmark],
              }),
              false,
              'addBookmark'
            );
          },

          removeBookmark: (bookmarkId: string) => {
            set(
              (state) => ({
                bookmarks: state.bookmarks.filter((b) => b.id !== bookmarkId),
              }),
              false,
              'removeBookmark'
            );
          },

          updateBookmark: (bookmarkId: string, updates: Partial<Bookmark>) => {
            set(
              (state) => ({
                bookmarks: state.bookmarks.map((b) =>
                  b.id === bookmarkId ? { ...b, ...updates } : b
                ),
              }),
              false,
              'updateBookmark'
            );
          },

          // Note Actions
          addNote: (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
            const now = new Date().toISOString();
            const newNote: Note = {
              ...note,
              id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              created_at: now,
              updated_at: now,
            };

            set(
              (state) => ({
                notes: [...state.notes, newNote],
              }),
              false,
              'addNote'
            );
          },

          removeNote: (noteId: string) => {
            set(
              (state) => ({
                notes: state.notes.filter((n) => n.id !== noteId),
              }),
              false,
              'removeNote'
            );
          },

          updateNote: (noteId: string, updates: Partial<Note>) => {
            set(
              (state) => ({
                notes: state.notes.map((n) =>
                  n.id === noteId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
                ),
              }),
              false,
              'updateNote'
            );
          },

          // Highlight Actions
          addHighlight: (highlight: Omit<Highlight, 'id' | 'created_at'>) => {
            const newHighlight: Highlight = {
              ...highlight,
              id: `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              created_at: new Date().toISOString(),
            };

            set(
              (state) => ({
                highlights: [...state.highlights, newHighlight],
              }),
              false,
              'addHighlight'
            );
          },

          removeHighlight: (highlightId: string) => {
            set(
              (state) => ({
                highlights: state.highlights.filter((h) => h.id !== highlightId),
              }),
              false,
              'removeHighlight'
            );
          },

          updateHighlight: (highlightId: string, updates: Partial<Highlight>) => {
            set(
              (state) => ({
                highlights: state.highlights.map((h) =>
                  h.id === highlightId ? { ...h, ...updates } : h
                ),
              }),
              false,
              'updateHighlight'
            );
          },

          getVerseHighlight: (verseId: string): Highlight | undefined => {
            const state = get();
            return state.highlights.find((h) => {
              // Parse verse ID format: repository_id-book_id-chapter-verse
              const parts = verseId.split('-');
              if (parts.length < 4) return false;

              const verseNum = parseInt(parts[parts.length - 1]);
              const chapterNum = parseInt(parts[parts.length - 2]);

              return h.verse_number === verseNum && h.chapter_number === chapterNum;
            });
          },

          // Reading Preference Actions
          setReadingMode: (mode: 'verse' | 'paragraph' | 'chapter') => {
            set({ readingMode: mode }, false, 'setReadingMode');
          },

          setAutoScroll: (enabled: boolean) => {
            set({ autoScroll: enabled }, false, 'setAutoScroll');
          },

          setScrollSpeed: (speed: number) => {
            const clampedSpeed = Math.min(10, Math.max(1, speed));
            set({ scrollSpeed: clampedSpeed }, false, 'setScrollSpeed');
          },

          setShowVerseNumbers: (show: boolean) => {
            set({ showVerseNumbers: show }, false, 'setShowVerseNumbers');
          },

          setHighlightCurrentVerse: (highlight: boolean) => {
            set({ highlightCurrentVerse: highlight }, false, 'setHighlightCurrentVerse');
          },

          // Navigation Actions
          goToVerse: async (
            repositoryId: string,
            bookId: string,
            chapter: number,
            verse?: number
          ) => {
            const location: ReadingLocation = {
              repository_id: repositoryId,
              book_id: bookId,
              chapter_number: chapter,
              verse_number: verse,
            };

            const repositoryState = await ensureRepositoryContext(repositoryId);
            const targetBook = repositoryState.books.find((book) => book.id === bookId) || null;

            if (targetBook) {
              repositoryState.setCurrentBook(targetBook);
              await repositoryState.loadChapter(bookId, chapter);
            } else {
              console.warn('[readingStore] goToVerse could not resolve target book', {
                repositoryId,
                bookId,
                chapter,
              });
            }

            get().setCurrentLocation(location);
          },

          goToNextChapter: async () => {
            const { currentLocation } = get();
            if (!currentLocation) return;

            const { goToVerse } = get();
            const repositoryState = await ensureRepositoryContext(currentLocation.repository_id);

            const sortedBooks = [...repositoryState.books].sort((a, b) => a.order - b.order);
            const currentBookIndex = sortedBooks.findIndex(
              (book) => book.id === currentLocation.book_id
            );

            if (currentBookIndex === -1) {
              console.warn(
                '[readingStore] goToNextChapter could not resolve current book',
                currentLocation
              );
              return;
            }

            const currentBook = sortedBooks[currentBookIndex];
            let targetBook = currentBook;
            let targetChapter = currentLocation.chapter_number + 1;

            if (targetChapter > currentBook.chapter_count) {
              const nextBook = sortedBooks[currentBookIndex + 1];
              if (!nextBook) {
                return;
              }
              targetBook = nextBook;
              targetChapter = 1;
            }

            await goToVerse(currentLocation.repository_id, targetBook.id, targetChapter);
          },

          goToPreviousChapter: async () => {
            const { currentLocation } = get();
            if (!currentLocation) return;

            const { goToVerse } = get();
            const repositoryState = await ensureRepositoryContext(currentLocation.repository_id);

            const sortedBooks = [...repositoryState.books].sort((a, b) => a.order - b.order);
            const currentBookIndex = sortedBooks.findIndex(
              (book) => book.id === currentLocation.book_id
            );

            if (currentBookIndex === -1) {
              console.warn(
                '[readingStore] goToPreviousChapter could not resolve current book',
                currentLocation
              );
              return;
            }

            const currentBook = sortedBooks[currentBookIndex];
            let targetBook = currentBook;
            let targetChapter = currentLocation.chapter_number - 1;

            if (targetChapter < 1) {
              const previousBook = sortedBooks[currentBookIndex - 1];
              if (!previousBook) {
                return;
              }
              targetBook = previousBook;
              targetChapter = Math.max(previousBook.chapter_count, 1);
            }

            await goToVerse(currentLocation.repository_id, targetBook.id, targetChapter);
          },
        };
      },
      {
        name: 'zaphnath-reading-store',
        version: 1,
        partialize: (state) => ({
          currentLocation: state.currentLocation,
          history: state.history.slice(-50), // Keep only last 50 history entries
          bookmarks: state.bookmarks,
          notes: state.notes,
          highlights: state.highlights,
          readingMode: state.readingMode,
          autoScroll: state.autoScroll,
          scrollSpeed: state.scrollSpeed,
          showVerseNumbers: state.showVerseNumbers,
          highlightCurrentVerse: state.highlightCurrentVerse,
        }),
      }
    ),
    {
      name: 'reading-store',
    }
  )
);
