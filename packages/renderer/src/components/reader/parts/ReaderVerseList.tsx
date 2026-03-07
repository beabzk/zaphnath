import type { MouseEvent, RefObject } from 'react';
import type { Verse } from '@/types/store';
import type { ReadingPreferences } from '../ReadingControls';
import { VerseItem } from './VerseItem';

interface ReaderVerseState {
  highlightsByVerseNumber: Map<number, { color: string }>;
  bookmarkedVerseNumbers: Set<number>;
  notedVerseNumbers: Set<number>;
}

interface ReaderVerseListProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  currentBookId: string;
  currentChapterNumber: number;
  verses: Verse[];
  selectedVerses: Set<string>;
  chapterVerseState: ReaderVerseState;
  readingPrefs: ReadingPreferences;
  onVerseInView: (verseNumber: number) => void;
  onVerseContextMenu: (event: MouseEvent, verseId: string, verseNumber: number) => void;
}

export function ReaderVerseList({
  scrollRef,
  currentBookId,
  currentChapterNumber,
  verses,
  selectedVerses,
  chapterVerseState,
  readingPrefs,
  onVerseInView,
  onVerseContextMenu,
}: ReaderVerseListProps) {
  return (
    <div ref={scrollRef} className="scrollbar-subtle flex-1 overflow-y-auto px-8 py-6">
      <div
        className="mx-auto"
        style={{
          maxWidth: `${readingPrefs.maxWidth}px`,
          fontFamily: readingPrefs.fontFamily,
          fontSize: `${readingPrefs.fontSize}px`,
          lineHeight: readingPrefs.lineHeight,
          textAlign: readingPrefs.textAlign,
        }}
      >
        {verses.map((verse) => {
          const highlight = chapterVerseState.highlightsByVerseNumber.get(verse.number);
          const isBookmarked = chapterVerseState.bookmarkedVerseNumbers.has(verse.number);
          const hasNote = chapterVerseState.notedVerseNumbers.has(verse.number);

          return (
            <VerseItem
              key={verse.id}
              domId={`verse-${currentBookId}-${currentChapterNumber}-${verse.number}`}
              verse={verse}
              highlight={highlight}
              isSelected={selectedVerses.has(verse.id)}
              isBookmarked={isBookmarked}
              hasNote={hasNote}
              showNumber={readingPrefs.verseNumbers}
              spacing={readingPrefs.verseSpacing}
              onInView={(inView) => {
                if (inView) {
                  onVerseInView(verse.number);
                }
              }}
              onContextMenu={(event) => onVerseContextMenu(event, verse.id, verse.number)}
            />
          );
        })}
        {verses.length === 0 && (
          <div className="text-sm text-muted-foreground">Loading verses...</div>
        )}
      </div>
    </div>
  );
}
