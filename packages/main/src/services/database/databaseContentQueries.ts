import type Database from 'better-sqlite3';
import type { ZBRSBook } from '../repository/types.js';

export class DatabaseContentQueries {
  constructor(private db: Database.Database) {}

  public getBooks(repositoryId?: string): Zaphnath.BibleBook[] {
    let query = `
      SELECT id, repository_id, name, abbreviation, testament, book_order as "order", chapter_count
      FROM books
    `;
    const params: unknown[] = [];

    if (repositoryId) {
      query += ' WHERE repository_id = ?';
      params.push(repositoryId);
    }

    query += ' ORDER BY book_order';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Zaphnath.BibleBook[];
  }

  public getBook(id: number): Zaphnath.BibleBook | null {
    const stmt = this.db.prepare(`
      SELECT id, repository_id, name, abbreviation, testament, book_order as "order", chapter_count
      FROM books
      WHERE id = ?
    `);
    return stmt.get(id) as Zaphnath.BibleBook | null;
  }

  public createBook(book: Omit<Zaphnath.BibleBook, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO books (repository_id, name, abbreviation, testament, book_order, chapter_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      book.repository_id,
      book.name,
      book.abbreviation,
      book.testament,
      book.order,
      book.chapter_count
    );
    return result.lastInsertRowid as number;
  }

  public importBook(book: ZBRSBook, repositoryId: string): void {
    const runImport = this.db.transaction(() => {
      const existing = this.db
        .prepare('SELECT id FROM books WHERE repository_id = ? AND book_order = ?')
        .get(repositoryId, book.book.order) as { id: number } | undefined;

      if (existing?.id) {
        this.db.prepare('DELETE FROM verses WHERE book_id = ?').run(existing.id);
        this.db.prepare('DELETE FROM books WHERE id = ?').run(existing.id);
      }

      const chapterCount =
        typeof book.book.chapters_count === 'number'
          ? book.book.chapters_count
          : book.chapters.length;

      const bookId = this.createBook({
        repository_id: repositoryId,
        name: book.book.name,
        abbreviation: book.book.abbreviation,
        testament: book.book.testament === 'old' ? 'OT' : 'NT',
        order: book.book.order,
        chapter_count: chapterCount,
      });

      const verseStatement = this.db.prepare(`
        INSERT INTO verses (repository_id, book_id, chapter, verse, text)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          verseStatement.run(repositoryId, bookId, chapter.number, verse.number, verse.text ?? '');
        }
      }
    });

    runImport();
  }

  public getVerses(bookId: number, chapter: number): Zaphnath.BibleVerse[] {
    const stmt = this.db.prepare(`
      SELECT id, book_id, chapter, verse, text
      FROM verses
      WHERE book_id = ? AND chapter = ?
      ORDER BY verse
    `);
    return stmt.all(bookId, chapter) as Zaphnath.BibleVerse[];
  }

  public getVerse(bookId: number, chapter: number, verse: number): Zaphnath.BibleVerse | null {
    const stmt = this.db.prepare(`
      SELECT id, book_id, chapter, verse, text
      FROM verses
      WHERE book_id = ? AND chapter = ? AND verse = ?
    `);
    return stmt.get(bookId, chapter, verse) as Zaphnath.BibleVerse | null;
  }

  public createVerse(verse: Omit<Zaphnath.BibleVerse, 'id'>): number {
    const stmt = this.db.prepare(`
      INSERT INTO verses (repository_id, book_id, chapter, verse, text)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      verse.repository_id,
      verse.book_id,
      verse.chapter,
      verse.verse,
      verse.text
    );
    return result.lastInsertRowid as number;
  }

  public searchVerses(query: string, repositoryId?: string): Zaphnath.BibleVerse[] {
    if (!query || query.trim() === '') {
      let sql = `
        SELECT v.id, v.book_id, v.chapter, v.verse, v.text,
               b.name as book_name, b.abbreviation as book_abbreviation,
               b.testament, v.repository_id
        FROM verses v
        JOIN books b ON v.book_id = b.id
      `;
      const params: unknown[] = [];

      if (repositoryId) {
        sql += ' WHERE v.repository_id = ?';
        params.push(repositoryId);
      }

      sql += ' ORDER BY b.book_order, v.chapter, v.verse';

      const stmt = this.db.prepare(sql);
      return stmt.all(...params) as Zaphnath.BibleVerse[];
    }

    let sql = `
      SELECT v.id, v.book_id, v.chapter, v.verse, v.text,
             b.name as book_name, b.abbreviation as book_abbreviation,
             b.testament, v.repository_id
      FROM verses v
      JOIN books b ON v.book_id = b.id
      WHERE v.text LIKE ?
    `;
    const params: unknown[] = [`%${query}%`];

    if (repositoryId) {
      sql += ' AND v.repository_id = ?';
      params.push(repositoryId);
    }

    sql += ' ORDER BY b.book_order, v.chapter, v.verse LIMIT 100';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as Zaphnath.BibleVerse[];
  }
}
