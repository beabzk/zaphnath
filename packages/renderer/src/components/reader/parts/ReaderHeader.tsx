import { ChevronRight } from 'lucide-react';
import type { Book, Chapter, Repository } from '@/types/store';

interface ReaderHeaderProps {
  currentRepository: Repository;
  currentBook: Book | null;
  currentChapter: Chapter | null;
  currentVerseNumber: number;
  versesCount: number;
  progressPercent: number;
  chapterSelect: number | null;
  chaptersForCurrentBook: number[];
  onChangeChapter: (chapterNumber: number) => void;
}

export function ReaderHeader({
  currentRepository,
  currentBook,
  currentChapter,
  currentVerseNumber,
  versesCount,
  progressPercent,
  chapterSelect,
  chaptersForCurrentBook,
  onChangeChapter,
}: ReaderHeaderProps) {
  return (
    <>
      <div className="min-h-[64px] border-b border-border/70 bg-card/70 px-4 py-3">
        {currentBook && currentChapter && (
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="cursor-pointer transition-colors hover:text-foreground">
              {currentRepository.name}
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="cursor-pointer transition-colors hover:text-foreground">
              {currentBook.name}
            </span>
            <ChevronRight className="h-3 w-3" />
            <span className="font-medium text-foreground">Chapter {currentChapter.number}</span>
            {currentVerseNumber > 0 && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-foreground">Verse {currentVerseNumber}</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {currentBook && currentChapter ? (
              <>
                <h1 className="text-base font-semibold tracking-tight">
                  {currentBook.name} {currentChapter.number}
                </h1>
                <span className="text-xs text-muted-foreground">({versesCount} verses)</span>
              </>
            ) : (
              <span className="text-muted-foreground">Select a book to begin reading</span>
            )}
          </div>

          {currentBook && (
            <div className="flex items-center gap-1">
              <button
                className="rounded-md px-3 py-1 text-sm transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => onChangeChapter(Math.max(1, (chapterSelect || 1) - 1))}
                disabled={!chapterSelect || chapterSelect <= 1}
              >
                ←
              </button>
              <select
                className="cursor-pointer rounded-md border border-border/70 bg-background/90 px-2 py-1 text-sm text-foreground"
                value={chapterSelect ?? ''}
                onChange={(event) => onChangeChapter(Number(event.target.value))}
              >
                {chaptersForCurrentBook.map((chapterNumber) => (
                  <option
                    key={chapterNumber}
                    value={chapterNumber}
                    className="bg-background text-foreground"
                  >
                    {chapterNumber}
                  </option>
                ))}
              </select>
              <button
                className="rounded-md px-3 py-1 text-sm transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                  onChangeChapter(Math.min(currentBook.chapter_count, (chapterSelect || 1) + 1))
                }
                disabled={!chapterSelect || chapterSelect >= currentBook.chapter_count}
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {currentBook && currentChapter && (
        <div className="relative h-0.5 bg-muted/80">
          <div
            className="h-full bg-primary/60 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </>
  );
}
