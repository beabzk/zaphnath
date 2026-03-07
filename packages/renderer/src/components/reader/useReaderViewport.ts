import { useCallback, useEffect, useRef, useState } from 'react';
import type { Book, Chapter, ReadingLocation } from '@/types/store';

type ReaderViewportArgs = {
  currentRepositoryId?: string;
  currentBook: Book | null;
  currentChapter: Chapter | null;
  currentLocation: ReadingLocation | null;
  versesCount: number;
  loadChapter: (bookId: string, chapterNumber: number) => Promise<void>;
};

export function useReaderViewport({
  currentRepositoryId,
  currentBook,
  currentChapter,
  currentLocation,
  versesCount,
  loadChapter,
}: ReaderViewportArgs) {
  const [chapterSelect, setChapterSelect] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (currentBook && !currentChapter) {
      void loadChapter(currentBook.id, 1);
      setChapterSelect(1);
    }
  }, [currentBook, currentChapter, loadChapter]);

  useEffect(() => {
    if (!currentChapter?.number) {
      return;
    }

    setChapterSelect(currentChapter.number);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [currentChapter?.number]);

  useEffect(() => {
    if (!currentRepositoryId || !currentBook || !currentChapter || !currentLocation?.verse_number) {
      return;
    }

    const matchesCurrentContext =
      currentLocation.repository_id === currentRepositoryId &&
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
  }, [currentBook, currentChapter, currentLocation, currentRepositoryId, versesCount]);

  const handleChangeChapter = useCallback(
    (chapterNumber: number) => {
      if (!currentBook) {
        return;
      }

      const clampedChapterNumber = Math.max(1, Math.min(currentBook.chapter_count, chapterNumber));
      setChapterSelect(clampedChapterNumber);
      void loadChapter(currentBook.id, clampedChapterNumber);
    },
    [currentBook, loadChapter]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!currentBook) {
        return;
      }

      const container = scrollRef.current;
      const delta = 70;
      const page = container ? Math.floor(container.clientHeight * 0.9) : 500;

      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          handleChangeChapter((chapterSelect || 1) + 1);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handleChangeChapter((chapterSelect || 1) - 1);
          break;
        case 'ArrowDown':
          container?.scrollBy({ top: delta, behavior: 'smooth' });
          break;
        case 'ArrowUp':
          container?.scrollBy({ top: -delta, behavior: 'smooth' });
          break;
        case 'PageDown':
          container?.scrollBy({ top: page, behavior: 'smooth' });
          break;
        case 'PageUp':
          container?.scrollBy({ top: -page, behavior: 'smooth' });
          break;
        case 'Home':
          if (event.ctrlKey) {
            event.preventDefault();
            handleChangeChapter(1);
          } else {
            container?.scrollTo({ top: 0, behavior: 'smooth' });
          }
          break;
        case 'End':
          if (event.ctrlKey) {
            event.preventDefault();
            handleChangeChapter(currentBook.chapter_count);
          } else if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [chapterSelect, currentBook, handleChangeChapter]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) {
      return;
    }

    const updateProgress = () => {
      const maxScrollTop = Math.max(1, container.scrollHeight - container.clientHeight);
      setProgress(Math.max(0, Math.min(1, container.scrollTop / maxScrollTop)));
    };

    updateProgress();
    container.addEventListener('scroll', updateProgress);
    return () => container.removeEventListener('scroll', updateProgress);
  }, [currentBook, currentChapter, versesCount]);

  return {
    chapterSelect,
    currentVerseNumber,
    progressPercent: Math.round(progress * 100),
    scrollRef,
    handleChangeChapter,
    setCurrentVerseNumber,
  };
}
