import type { Book, Chapter, Verse } from '@/types/store';

export interface BookRecord extends Record<string, unknown> {
  id?: unknown;
  repository_id?: unknown;
  name?: unknown;
  abbreviation?: unknown;
  testament?: unknown;
  order?: unknown;
  chapter_count?: unknown;
}

export interface VerseRecord extends Record<string, unknown> {
  id?: unknown;
  book_id?: unknown;
  chapter?: unknown;
  verse?: unknown;
  text?: unknown;
}

export interface ChapterPayload extends Record<string, unknown> {
  verses?: unknown;
}

type BookSource = Zaphnath.BibleBook | BookRecord;
type VerseSource = Zaphnath.BibleVerse | VerseRecord;
type ChapterSource =
  | {
      verses?: Zaphnath.BibleVerse[] | VerseRecord[];
    }
  | ChapterPayload;

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' ? value : fallback;
}

function toRendererTestament(testament: unknown): Book['testament'] {
  return testament === 'OT' || testament === 'old' ? 'old' : 'new';
}

export function toRendererBook(book: BookSource): Book {
  return {
    id: String(book.id ?? ''),
    repository_id: asString(book.repository_id),
    name: asString(book.name),
    abbreviation: asString(book.abbreviation),
    testament: toRendererTestament(book.testament),
    order: asNumber(book.order),
    chapter_count: asNumber(book.chapter_count),
  };
}

export function toRendererBooks(books: BookSource[] | null | undefined): Book[] {
  return (books ?? []).map(toRendererBook);
}

export function toRendererVerses(verses: VerseSource[] | null | undefined): Verse[] {
  return (verses ?? []).map((verse) => ({
    id: String(verse.id ?? ''),
    chapter_id: `${String(verse.book_id ?? '')}-${String(verse.chapter ?? '')}`,
    number: asNumber(verse.verse),
    text: asString(verse.text),
  }));
}

export function toRendererChapterData(
  bookId: string,
  chapterNumber: number,
  chapterData: ChapterSource | null | undefined
): { chapter: Chapter; verses: Verse[] } | null {
  if (!chapterData) {
    return null;
  }

  const verses = toRendererVerses(chapterData.verses as VerseSource[] | undefined);

  return {
    chapter: {
      id: `${bookId}-${chapterNumber}`,
      book_id: bookId,
      number: chapterNumber,
      verse_count: verses.length,
    },
    verses,
  };
}
