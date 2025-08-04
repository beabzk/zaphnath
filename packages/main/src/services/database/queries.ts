import type Database from 'better-sqlite3';
import { DatabaseConnection } from './connection.js';

export class DatabaseQueries {
  private db: Database.Database;

  constructor() {
    const connection = DatabaseConnection.getInstance();
    this.db = connection.connect();
  }

  // Repository queries
  public getRepositories(): Zaphnath.BibleRepository[] {
    const stmt = this.db.prepare(`
      SELECT id, name, description, language, version, created_at, updated_at
      FROM repositories
      ORDER BY name
    `);
    return stmt.all() as Zaphnath.BibleRepository[];
  }

  public getRepository(id: string): Zaphnath.BibleRepository | null {
    const stmt = this.db.prepare(`
      SELECT id, name, description, language, version, created_at, updated_at
      FROM repositories
      WHERE id = ?
    `);
    return stmt.get(id) as Zaphnath.BibleRepository | null;
  }

  public createRepository(repository: Omit<Zaphnath.BibleRepository, 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO repositories (id, name, description, language, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(repository.id, repository.name, repository.description, repository.language, repository.version);
  }

  public deleteRepository(id: string): void {
    const stmt = this.db.prepare('DELETE FROM repositories WHERE id = ?');
    stmt.run(id);
  }

  // Book queries
  public getBooks(repositoryId?: string): Zaphnath.BibleBook[] {
    let query = `
      SELECT id, repository_id, name, abbreviation, testament, book_order as order, chapter_count
      FROM books
    `;
    let params: any[] = [];

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
      SELECT id, repository_id, name, abbreviation, testament, book_order as order, chapter_count
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
    const result = stmt.run(book.repository_id, book.name, book.abbreviation, book.testament, book.order, book.chapter_count);
    return result.lastInsertRowid as number;
  }

  // Verse queries
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
    const result = stmt.run(verse.repository_id, verse.book_id, verse.chapter, verse.verse, verse.text);
    return result.lastInsertRowid as number;
  }

  public searchVerses(query: string, repositoryId?: string): Zaphnath.BibleVerse[] {
    let sql = `
      SELECT v.id, v.book_id, v.chapter, v.verse, v.text,
             b.name as book_name, b.abbreviation as book_abbreviation
      FROM verses v
      JOIN books b ON v.book_id = b.id
      WHERE v.text LIKE ?
    `;
    let params: any[] = [`%${query}%`];

    if (repositoryId) {
      sql += ' AND v.repository_id = ?';
      params.push(repositoryId);
    }

    sql += ' ORDER BY b.book_order, v.chapter, v.verse LIMIT 100';

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as Zaphnath.BibleVerse[];
  }

  // User settings queries
  public getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM user_settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  public setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
  }

  public getAllSettings(): Record<string, string> {
    const stmt = this.db.prepare('SELECT key, value FROM user_settings');
    const rows = stmt.all() as { key: string; value: string }[];
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
  }

  // Utility methods
  public executeRaw(sql: string, params: any[] = []): any {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  public executeRawSingle(sql: string, params: any[] = []): any {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params);
  }

  public executeRawRun(sql: string, params: any[] = []): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return stmt.run(...params);
  }

  // Transaction support
  public transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  // Database statistics
  public getStats(): {
    repositories: number;
    books: number;
    verses: number;
    databaseSize: string;
  } {
    const repositoryCount = this.db.prepare('SELECT COUNT(*) as count FROM repositories').get() as { count: number };
    const bookCount = this.db.prepare('SELECT COUNT(*) as count FROM books').get() as { count: number };
    const verseCount = this.db.prepare('SELECT COUNT(*) as count FROM verses').get() as { count: number };
    
    // Get database file size
    const sizeResult = this.db.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number };
    const sizeInMB = (sizeResult.size / (1024 * 1024)).toFixed(2);

    return {
      repositories: repositoryCount.count,
      books: bookCount.count,
      verses: verseCount.count,
      databaseSize: `${sizeInMB} MB`
    };
  }
}
