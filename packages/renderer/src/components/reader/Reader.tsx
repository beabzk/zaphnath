import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRepositoryStore, useReadingStore } from '@/stores';
import { useSettings } from '@/components/settings/SettingsProvider';
import { createTranslationRepository } from '@/lib/repositoryTranslations';
import { VerseContextMenu } from './VerseContextMenu';
import { ReadingControls, ReadingPreferences, PRESETS } from './ReadingControls';
import { VerseComparison } from './VerseComparison';
import { BookmarkDialog } from './BookmarkDialog';
import { NoteDialog } from './NoteDialog';
import { ReaderSidebar } from './parts/ReaderSidebar';
import { ReaderHeader } from './parts/ReaderHeader';
import { ReaderVerseList } from './parts/ReaderVerseList';

export function Reader() {
  const {
    repositories,
    currentRepositorySelection,
    currentRepository,
    books,
    currentBook,
    currentChapter,
    verses,
    setCurrentRepository,
    loadBooks,
    loadRepositories,
    loadTranslations,
    setCurrentBook,
    loadChapter,
    isLoading: isRepositoryLoading,
  } = useRepositoryStore();
  const { settings, isLoading: isSettingsLoading } = useSettings();

  const [chapterSelect, setChapterSelect] = useState<number | null>(null);
  const [testament, setTestament] = useState<'old' | 'new'>('old');
  const [progress, setProgress] = useState(0);
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number>(1);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    verseId: string;
    verseNumber: number;
  } | null>(null);
  const [selectedVerses] = useState<Set<string>>(new Set());
  const [readingPrefs, setReadingPrefs] = useState<ReadingPreferences>(PRESETS.reading);
  const [comparisonVerse, setComparisonVerse] = useState<{
    bookId: string;
    bookName: string;
    bookAbbreviation: string;
    bookOrder: number;
    chapter: number;
    verse: number;
  } | null>(null);
  const [bookmarkDialogVerse, setBookmarkDialogVerse] = useState<{
    repositoryId: string;
    bookId: string;
    bookName: string;
    chapterNumber: number;
    verseNumber: number;
    verseText: string;
  } | null>(null);
  const [noteDialogVerse, setNoteDialogVerse] = useState<{
    repositoryId: string;
    bookId: string;
    bookName: string;
    chapterNumber: number;
    verseNumber: number;
    verseText: string;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const {
    currentLocation,
    highlights,
    addHighlight,
    removeHighlight,
    bookmarks,
    removeBookmark,
    notes,
  } = useReadingStore();

  // Context menu handlers
  const handleVerseContextMenu = useCallback(
    (e: React.MouseEvent, verseId: string, verseNumber: number) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, verseId, verseNumber });
    },
    []
  );

  const handleCopyVerse = useCallback(() => {
    if (!contextMenu || !currentBook) return;
    const verse = verses.find((v) => v.id === contextMenu.verseId);
    if (verse) {
      const reference = `${currentBook.name} ${currentChapter?.number}:${verse.number}`;
      const text = `${reference} - ${verse.text}`;
      navigator.clipboard.writeText(text);
    }
  }, [contextMenu, verses, currentBook, currentChapter]);

  const handleHighlight = useCallback(
    (color: string) => {
      if (!contextMenu || !currentRepository || !currentBook || !currentChapter) return;

      addHighlight({
        repository_id: currentRepository.id,
        book_id: currentBook.id,
        chapter_number: currentChapter.number,
        verse_number: contextMenu.verseNumber,
        color,
      });
    },
    [contextMenu, currentRepository, currentBook, currentChapter, addHighlight]
  );

  const handleClearHighlight = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook) return;
    const highlight = highlights.find(
      (h) =>
        h.repository_id === currentRepository.id &&
        h.book_id === currentBook.id &&
        h.chapter_number === currentChapter?.number &&
        h.verse_number === contextMenu.verseNumber
    );
    if (highlight) {
      removeHighlight(highlight.id);
    }
  }, [contextMenu, highlights, currentRepository, currentBook, currentChapter, removeHighlight]);

  const handleBookmark = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) return;

    const existingBookmark = bookmarks.find(
      (b) =>
        b.repository_id === currentRepository.id &&
        b.book_id === currentBook.id &&
        b.chapter_number === currentChapter.number &&
        b.verse_number === contextMenu.verseNumber
    );

    if (existingBookmark) {
      removeBookmark(existingBookmark.id);
    } else {
      const verse = verses.find((v) => v.id === contextMenu.verseId);
      setBookmarkDialogVerse({
        repositoryId: currentRepository.id,
        bookId: currentBook.id,
        bookName: currentBook.name,
        chapterNumber: currentChapter.number,
        verseNumber: contextMenu.verseNumber,
        verseText: verse?.text ?? '',
      });
    }
  }, [
    contextMenu,
    currentRepository,
    currentBook,
    currentChapter,
    bookmarks,
    removeBookmark,
    verses,
  ]);

  const handleNote = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) return;

    const verse = verses.find((v) => v.id === contextMenu.verseId);
    setNoteDialogVerse({
      repositoryId: currentRepository.id,
      bookId: currentBook.id,
      bookName: currentBook.name,
      chapterNumber: currentChapter.number,
      verseNumber: contextMenu.verseNumber,
      verseText: verse?.text ?? '',
    });
  }, [contextMenu, currentRepository, currentBook, currentChapter, verses]);

  const handleCompare = useCallback(() => {
    if (!contextMenu || !currentBook || !currentChapter) return;

    setComparisonVerse({
      bookId: currentBook.id,
      bookName: currentBook.name,
      bookAbbreviation: currentBook.abbreviation,
      bookOrder: currentBook.order,
      chapter: currentChapter.number,
      verse: contextMenu.verseNumber,
    });
  }, [contextMenu, currentBook, currentChapter]);

  // Ensure the configured default repository is selected when entering Reader.
  useEffect(() => {
    if (currentRepository || isSettingsLoading || isRepositoryLoading) {
      return;
    }

    if (currentRepositorySelection) {
      void loadRepositories();
      return;
    }

    const defaultRepositoryId = settings.reading.defaultRepository;
    if (!defaultRepositoryId) {
      return;
    }

    let cancelled = false;

    const restoreDefaultRepository = async () => {
      if (repositories.length === 0) {
        await loadRepositories();
      }

      const latestRepositories = useRepositoryStore.getState().repositories;
      const directRepository = latestRepositories.find((repo) => repo.id === defaultRepositoryId);

      if (directRepository) {
        if (!cancelled) {
          setCurrentRepository(directRepository);
        }
        return;
      }

      const parentRepositories = latestRepositories.filter((repo) => repo.type === 'parent');

      for (const parent of parentRepositories) {
        const translations = await loadTranslations(parent.id);
        const translation = translations.find((item) => item.id === defaultRepositoryId) ?? null;

        if (!translation) {
          continue;
        }

        if (cancelled) {
          return;
        }

        setCurrentRepository(createTranslationRepository(parent, translation));
        return;
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
    isSettingsLoading,
    isRepositoryLoading,
    settings.reading.defaultRepository,
    repositories,
    currentRepositorySelection,
    loadRepositories,
    loadTranslations,
    setCurrentRepository,
  ]);

  // When repository changes and books are empty, load books
  useEffect(() => {
    if (currentRepository && books.length === 0) {
      loadBooks(currentRepository.id);
    }
  }, [currentRepository, books.length, loadBooks]);

  // When book changes, if no chapter loaded, load chapter 1
  useEffect(() => {
    if (currentBook && !currentChapter) {
      loadChapter(currentBook.id, 1);
      setChapterSelect(1);
    }
  }, [currentBook, currentChapter, loadChapter]);

  // Sync chapterSelect when chapter changes
  useEffect(() => {
    if (currentChapter?.number) {
      setChapterSelect(currentChapter.number);
      // Reset scroll to top on chapter change
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }
  }, [currentChapter?.number]);

  // If a verse was selected from another view (e.g. search), scroll it into view.
  useEffect(() => {
    if (!currentLocation?.verse_number || !currentRepository || !currentBook || !currentChapter) {
      return;
    }

    const matchesCurrentContext =
      currentLocation.book_id === currentBook.id &&
      currentLocation.chapter_number === currentChapter.number;

    if (!matchesCurrentContext) {
      return;
    }

    const verseDomId = `verse-${currentBook.id}-${currentChapter.number}-${currentLocation.verse_number}`;
    const verseElement = document.getElementById(verseDomId);
    if (!verseElement) {
      return;
    }

    setCurrentVerseNumber(currentLocation.verse_number);
    verseElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentBook, currentChapter, currentLocation, currentRepository, verses.length]);

  const chaptersForCurrentBook = useMemo(() => {
    return currentBook ? Array.from({ length: currentBook.chapter_count }, (_, i) => i + 1) : [];
  }, [currentBook]);

  const filteredBooks = useMemo(() => {
    return books.filter((b) => b.testament === testament);
  }, [books, testament]);

  const chapterVerseState = useMemo(() => {
    const highlightsByVerseNumber = new Map<number, (typeof highlights)[number]>();
    const bookmarkedVerseNumbers = new Set<number>();
    const notedVerseNumbers = new Set<number>();

    if (!currentRepository || !currentBook || !currentChapter) {
      return {
        highlightsByVerseNumber,
        bookmarkedVerseNumbers,
        notedVerseNumbers,
      };
    }

    for (const highlight of highlights) {
      if (
        highlight.repository_id === currentRepository.id &&
        highlight.book_id === currentBook.id &&
        highlight.chapter_number === currentChapter.number
      ) {
        highlightsByVerseNumber.set(highlight.verse_number, highlight);
      }
    }

    for (const bookmark of bookmarks) {
      if (
        bookmark.repository_id === currentRepository.id &&
        bookmark.book_id === currentBook.id &&
        bookmark.chapter_number === currentChapter.number
      ) {
        bookmarkedVerseNumbers.add(bookmark.verse_number);
      }
    }

    for (const note of notes) {
      if (
        note.repository_id === currentRepository.id &&
        note.book_id === currentBook.id &&
        note.chapter_number === currentChapter.number
      ) {
        notedVerseNumbers.add(note.verse_number);
      }
    }

    return {
      highlightsByVerseNumber,
      bookmarkedVerseNumbers,
      notedVerseNumbers,
    };
  }, [bookmarks, currentBook, currentChapter, currentRepository, highlights, notes]);

  const handleSelectBook = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) {
      setTestament(book.testament);
      setCurrentBook(book);
      loadChapter(book.id, 1);
      setChapterSelect(1);
    }
  };

  const handleChangeChapter = useCallback(
    (num: number) => {
      if (currentBook) {
        const clamped = Math.max(1, Math.min(currentBook.chapter_count, num));
        setChapterSelect(clamped);
        loadChapter(currentBook.id, clamped);
      }
    },
    [currentBook, loadChapter]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentBook) return;
      const container = scrollRef.current;
      const delta = 70;
      const page = container ? Math.floor(container.clientHeight * 0.9) : 500;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          handleChangeChapter((chapterSelect || 1) + 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleChangeChapter((chapterSelect || 1) - 1);
          break;
        case 'ArrowDown':
          if (container) {
            container.scrollBy({ top: delta, behavior: 'smooth' });
          }
          break;
        case 'ArrowUp':
          if (container) {
            container.scrollBy({ top: -delta, behavior: 'smooth' });
          }
          break;
        case 'PageDown':
          if (container) {
            container.scrollBy({ top: page, behavior: 'smooth' });
          }
          break;
        case 'PageUp':
          if (container) {
            container.scrollBy({ top: -page, behavior: 'smooth' });
          }
          break;
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault();
            handleChangeChapter(1);
          } else if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault();
            handleChangeChapter(currentBook.chapter_count);
          } else if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentBook, chapterSelect, handleChangeChapter]);

  // Progress tracking by scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = Math.max(1, el.scrollHeight - el.clientHeight);
      setProgress(Math.max(0, Math.min(1, el.scrollTop / max)));
    };
    onScroll();
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [currentBook, currentChapter, verses.length]);

  if (!currentRepository) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">
          Select a repository from Repositories to start reading.
        </p>
      </div>
    );
  }

  const percent = Math.round(progress * 100);

  return (
    <div className="h-full min-h-0 flex bg-background/25">
      <ReaderSidebar
        currentRepository={currentRepository}
        testament={testament}
        filteredBooks={filteredBooks}
        currentBookId={currentBook?.id}
        hasBooks={books.length > 0}
        onTestamentChange={setTestament}
        onSelectBook={handleSelectBook}
      />

      <div className="flex-1 flex flex-col h-full">
        <ReaderHeader
          currentRepository={currentRepository}
          currentBook={currentBook}
          currentChapter={currentChapter}
          currentVerseNumber={currentVerseNumber}
          versesCount={verses.length}
          progressPercent={percent}
          chapterSelect={chapterSelect}
          chaptersForCurrentBook={chaptersForCurrentBook}
          onChangeChapter={handleChangeChapter}
        />

        {currentBook && currentChapter && (
          <ReadingControls preferences={readingPrefs} onChange={setReadingPrefs} />
        )}

        {!currentBook ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Choose a book from the sidebar to start reading</p>
          </div>
        ) : (
          <ReaderVerseList
            scrollRef={scrollRef}
            currentBookId={currentBook.id}
            currentChapterNumber={currentChapter?.number ?? 0}
            verses={verses}
            selectedVerses={selectedVerses}
            chapterVerseState={chapterVerseState}
            readingPrefs={readingPrefs}
            onVerseInView={setCurrentVerseNumber}
            onVerseContextMenu={handleVerseContextMenu}
          />
        )}

        {/* Context Menu */}
        {contextMenu && (
          <VerseContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onCopy={handleCopyVerse}
            onHighlight={handleHighlight}
            onBookmark={handleBookmark}
            onNote={handleNote}
            onClearHighlight={handleClearHighlight}
            onCompare={handleCompare}
            hasHighlight={chapterVerseState.highlightsByVerseNumber.has(contextMenu.verseNumber)}
            hasBookmark={chapterVerseState.bookmarkedVerseNumbers.has(contextMenu.verseNumber)}
          />
        )}

        {/* Bookmark Dialog */}
        <BookmarkDialog verse={bookmarkDialogVerse} onClose={() => setBookmarkDialogVerse(null)} />

        {/* Note Dialog */}
        <NoteDialog verse={noteDialogVerse} onClose={() => setNoteDialogVerse(null)} />

        {/* Verse Comparison Modal */}
        {comparisonVerse && (
          <VerseComparison
            bookId={comparisonVerse.bookId}
            bookName={comparisonVerse.bookName}
            bookAbbreviation={comparisonVerse.bookAbbreviation}
            bookOrder={comparisonVerse.bookOrder}
            chapterNumber={comparisonVerse.chapter}
            verseNumber={comparisonVerse.verse}
            onClose={() => setComparisonVerse(null)}
          />
        )}
      </div>
    </div>
  );
}
