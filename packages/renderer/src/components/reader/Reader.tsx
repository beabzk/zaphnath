import { useEffect, useMemo, useState } from 'react';
import { useRepositoryStore, useReadingStore } from '@/stores';
import { useSettings } from '@/components/settings/SettingsProvider';
import { VerseContextMenu } from './VerseContextMenu';
import { ReadingControls, ReadingPreferences, PRESETS } from './ReadingControls';
import { VerseComparison } from './VerseComparison';
import { BookmarkDialog } from './BookmarkDialog';
import { NoteDialog } from './NoteDialog';
import { ReaderSidebar } from './parts/ReaderSidebar';
import { ReaderHeader } from './parts/ReaderHeader';
import { ReaderVerseList } from './parts/ReaderVerseList';
import { useReaderRepositoryBootstrap } from './useReaderRepositoryBootstrap';
import { useReaderVerseActions } from './useReaderVerseActions';
import { useReaderViewport } from './useReaderViewport';

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

  const [testament, setTestament] = useState<'old' | 'new'>('old');
  const [selectedVerses] = useState<Set<string>>(new Set());
  const [readingPrefs, setReadingPrefs] = useState<ReadingPreferences>(PRESETS.reading);

  const {
    currentLocation,
    highlights,
    addHighlight,
    removeHighlight,
    bookmarks,
    removeBookmark,
    notes,
  } = useReadingStore();

  useReaderRepositoryBootstrap({
    currentRepository,
    currentRepositorySelection,
    repositories,
    defaultRepositoryId: settings.reading.defaultRepository,
    isRepositoryLoading,
    isSettingsLoading,
    loadRepositories,
    loadTranslations,
    setCurrentRepository,
  });

  const {
    chapterSelect,
    currentVerseNumber,
    progressPercent,
    scrollRef,
    handleChangeChapter,
    setCurrentVerseNumber,
  } = useReaderViewport({
    currentRepositoryId: currentRepository?.id,
    currentBook,
    currentChapter,
    currentLocation,
    versesCount: verses.length,
    loadChapter,
  });

  const {
    contextMenu,
    comparisonVerse,
    bookmarkDialogVerse,
    noteDialogVerse,
    handleVerseContextMenu,
    handleCopyVerse,
    handleHighlight,
    handleClearHighlight,
    handleBookmark,
    handleNote,
    handleCompare,
    closeContextMenu,
    closeComparison,
    closeBookmarkDialog,
    closeNoteDialog,
  } = useReaderVerseActions({
    currentRepository,
    currentBook,
    currentChapter,
    verses,
    highlights,
    bookmarks,
    addHighlight,
    removeHighlight,
    removeBookmark,
  });

  // When repository changes and books are empty, load books
  useEffect(() => {
    if (currentRepository && books.length === 0) {
      loadBooks(currentRepository.id);
    }
  }, [currentRepository, books.length, loadBooks]);

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
      setCurrentVerseNumber(1);
    }
  };

  if (!currentRepository) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">
          Select a repository from Repositories to start reading.
        </p>
      </div>
    );
  }
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
          progressPercent={progressPercent}
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
            onClose={closeContextMenu}
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
        <BookmarkDialog verse={bookmarkDialogVerse} onClose={closeBookmarkDialog} />

        {/* Note Dialog */}
        <NoteDialog verse={noteDialogVerse} onClose={closeNoteDialog} />

        {/* Verse Comparison Modal */}
        {comparisonVerse && (
          <VerseComparison
            bookId={comparisonVerse.bookId}
            bookName={comparisonVerse.bookName}
            bookAbbreviation={comparisonVerse.bookAbbreviation}
            bookOrder={comparisonVerse.bookOrder}
            chapterNumber={comparisonVerse.chapter}
            verseNumber={comparisonVerse.verse}
            onClose={closeComparison}
          />
        )}
      </div>
    </div>
  );
}
