import { useCallback, useState } from 'react';
import type { MouseEvent } from 'react';
import type { Bookmark, Book, Chapter, Highlight, Repository, Verse } from '@/types/store';

type ContextMenuState = {
  x: number;
  y: number;
  verseId: string;
  verseNumber: number;
} | null;

type ComparisonVerse = {
  bookId: string;
  bookName: string;
  bookAbbreviation: string;
  bookOrder: number;
  chapter: number;
  verse: number;
} | null;

type ReaderDialogVerse = {
  repositoryId: string;
  bookId: string;
  bookName: string;
  chapterNumber: number;
  verseNumber: number;
  verseText: string;
} | null;

type ReaderVerseActionsArgs = {
  currentRepository: Repository | null;
  currentBook: Book | null;
  currentChapter: Chapter | null;
  verses: Verse[];
  highlights: Highlight[];
  bookmarks: Bookmark[];
  addHighlight: (highlight: Omit<Highlight, 'id' | 'created_at'>) => void;
  removeHighlight: (highlightId: string) => void;
  removeBookmark: (bookmarkId: string) => void;
};

export function useReaderVerseActions({
  currentRepository,
  currentBook,
  currentChapter,
  verses,
  highlights,
  bookmarks,
  addHighlight,
  removeHighlight,
  removeBookmark,
}: ReaderVerseActionsArgs) {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [comparisonVerse, setComparisonVerse] = useState<ComparisonVerse>(null);
  const [bookmarkDialogVerse, setBookmarkDialogVerse] = useState<ReaderDialogVerse>(null);
  const [noteDialogVerse, setNoteDialogVerse] = useState<ReaderDialogVerse>(null);

  const handleVerseContextMenu = useCallback(
    (event: MouseEvent, verseId: string, verseNumber: number) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, verseId, verseNumber });
    },
    []
  );

  const handleCopyVerse = useCallback(() => {
    if (!contextMenu || !currentBook) {
      return;
    }

    const verse = verses.find((candidate) => candidate.id === contextMenu.verseId);
    if (!verse) {
      return;
    }

    const reference = `${currentBook.name} ${currentChapter?.number}:${verse.number}`;
    void navigator.clipboard.writeText(`${reference} - ${verse.text}`);
  }, [contextMenu, currentBook, currentChapter, verses]);

  const handleHighlight = useCallback(
    (color: string) => {
      if (!contextMenu || !currentRepository || !currentBook || !currentChapter) {
        return;
      }

      addHighlight({
        repository_id: currentRepository.id,
        book_id: currentBook.id,
        chapter_number: currentChapter.number,
        verse_number: contextMenu.verseNumber,
        color,
      });
    },
    [addHighlight, contextMenu, currentBook, currentChapter, currentRepository]
  );

  const handleClearHighlight = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) {
      return;
    }

    const highlight = highlights.find(
      (candidate) =>
        candidate.repository_id === currentRepository.id &&
        candidate.book_id === currentBook.id &&
        candidate.chapter_number === currentChapter.number &&
        candidate.verse_number === contextMenu.verseNumber
    );

    if (highlight) {
      removeHighlight(highlight.id);
    }
  }, [contextMenu, currentBook, currentChapter, currentRepository, highlights, removeHighlight]);

  const handleBookmark = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) {
      return;
    }

    const existingBookmark = bookmarks.find(
      (candidate) =>
        candidate.repository_id === currentRepository.id &&
        candidate.book_id === currentBook.id &&
        candidate.chapter_number === currentChapter.number &&
        candidate.verse_number === contextMenu.verseNumber
    );

    if (existingBookmark) {
      removeBookmark(existingBookmark.id);
      return;
    }

    const verse = verses.find((candidate) => candidate.id === contextMenu.verseId);
    setBookmarkDialogVerse({
      repositoryId: currentRepository.id,
      bookId: currentBook.id,
      bookName: currentBook.name,
      chapterNumber: currentChapter.number,
      verseNumber: contextMenu.verseNumber,
      verseText: verse?.text ?? '',
    });
  }, [
    bookmarks,
    contextMenu,
    currentBook,
    currentChapter,
    currentRepository,
    removeBookmark,
    verses,
  ]);

  const handleNote = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) {
      return;
    }

    const verse = verses.find((candidate) => candidate.id === contextMenu.verseId);
    setNoteDialogVerse({
      repositoryId: currentRepository.id,
      bookId: currentBook.id,
      bookName: currentBook.name,
      chapterNumber: currentChapter.number,
      verseNumber: contextMenu.verseNumber,
      verseText: verse?.text ?? '',
    });
  }, [contextMenu, currentBook, currentChapter, currentRepository, verses]);

  const handleCompare = useCallback(() => {
    if (!contextMenu || !currentBook || !currentChapter) {
      return;
    }

    setComparisonVerse({
      bookId: currentBook.id,
      bookName: currentBook.name,
      bookAbbreviation: currentBook.abbreviation,
      bookOrder: currentBook.order,
      chapter: currentChapter.number,
      verse: contextMenu.verseNumber,
    });
  }, [contextMenu, currentBook, currentChapter]);

  return {
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
    closeContextMenu: () => setContextMenu(null),
    closeComparison: () => setComparisonVerse(null),
    closeBookmarkDialog: () => setBookmarkDialogVerse(null),
    closeNoteDialog: () => setNoteDialogVerse(null),
  };
}
