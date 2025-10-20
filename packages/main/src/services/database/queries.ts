import type Database from "better-sqlite3";
import { DatabaseConnection } from "./connection.js";
import type { RepositoryDbRecord, ZBRSBook } from "../repository/types.js";

export class DatabaseQueries {
  private db: Database.Database;

  constructor() {
    const connection = DatabaseConnection.getInstance();
    this.db = connection.connect();
  }

  // Repository queries
  public getRepositories(): Zaphnath.BibleRepository[] {
    const stmt = this.db.prepare(`
      SELECT
        r.id,
        r.name,
        r.description,
        r.language,
        r.version,
        r.created_at,
        r.updated_at,
        r.type,
        r.parent_id,
        COALESCE(book_counts.book_count, 0) as book_count,
        COALESCE(verse_counts.verse_count, 0) as verse_count,
        COALESCE(translation_counts.translation_count, 0) as translation_count
      FROM repositories r
      LEFT JOIN (
        SELECT repository_id, COUNT(*) as book_count
        FROM books
        GROUP BY repository_id
      ) book_counts ON r.id = book_counts.repository_id
      LEFT JOIN (
        SELECT repository_id, COUNT(*) as verse_count
        FROM verses
        GROUP BY repository_id
      ) verse_counts ON r.id = verse_counts.repository_id
      LEFT JOIN (
        SELECT parent_id, COUNT(*) as translation_count
        FROM repositories
        WHERE type = 'translation' AND parent_id IS NOT NULL
        GROUP BY parent_id
      ) translation_counts ON r.id = translation_counts.parent_id
      ORDER BY r.name
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

  public createRepository(
    repository: Omit<Zaphnath.BibleRepository, "created_at" | "updated_at">
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO repositories (id, name, description, language, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      repository.id,
      repository.name,
      repository.description,
      repository.language,
      repository.version
    );
  }

  public deleteRepository(id: string): void {
    const stmt = this.db.prepare("DELETE FROM repositories WHERE id = ?");
    stmt.run(id);
  }

  public upsertRepository(record: RepositoryDbRecord): void {
    const stmt = this.db.prepare(
      `
        INSERT INTO repositories (id, name, description, language, version, created_at, updated_at, type, parent_id)
        VALUES (@id, @name, @description, @language, @version, @created_at, @updated_at, @type, @parent_id)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          description = excluded.description,
          language = excluded.language,
          version = excluded.version,
          updated_at = excluded.updated_at,
          type = excluded.type,
          parent_id = excluded.parent_id
      `
    );

    stmt.run({
      id: record.id,
      name: record.name,
      description: record.description ?? null,
      language: record.language ?? "en",
      version: record.version,
      created_at: record.created_at,
      updated_at: record.updated_at,
      type: record.type,
      parent_id: record.parent_id,
    });
  }

  // Book queries
  public getBooks(repositoryId?: string): Zaphnath.BibleBook[] {
    let query = `
      SELECT id, repository_id, name, abbreviation, testament, book_order as "order", chapter_count
      FROM books
    `;
    let params: any[] = [];

    if (repositoryId) {
      query += " WHERE repository_id = ?";
      params.push(repositoryId);
    }

    query += " ORDER BY book_order";

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

  public createBook(book: Omit<Zaphnath.BibleBook, "id">): number {
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
        .prepare(
          "SELECT id FROM books WHERE repository_id = ? AND book_order = ?"
        )
        .get(repositoryId, book.book.order) as { id: number } | undefined;

      if (existing?.id) {
        this.db
          .prepare("DELETE FROM verses WHERE book_id = ?")
          .run(existing.id);
        this.db.prepare("DELETE FROM books WHERE id = ?").run(existing.id);
      }

      const chapterCount =
        typeof book.book.chapters_count === "number"
          ? book.book.chapters_count
          : book.chapters.length;

      const bookId = this.createBook({
        repository_id: repositoryId,
        name: book.book.name,
        abbreviation: book.book.abbreviation,
        testament: book.book.testament === "old" ? "OT" : "NT",
        order: book.book.order,
        chapter_count: chapterCount,
      });

      const verseStatement = this.db.prepare(`
        INSERT INTO verses (repository_id, book_id, chapter, verse, text)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const chapter of book.chapters) {
        for (const verse of chapter.verses) {
          verseStatement.run(
            repositoryId,
            bookId,
            chapter.number,
            verse.number,
            verse.text ?? ""
          );
        }
      }
    });

    runImport();
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

  public getVerse(
    bookId: number,
    chapter: number,
    verse: number
  ): Zaphnath.BibleVerse | null {
    const stmt = this.db.prepare(`
      SELECT id, book_id, chapter, verse, text
      FROM verses
      WHERE book_id = ? AND chapter = ? AND verse = ?
    `);
    return stmt.get(bookId, chapter, verse) as Zaphnath.BibleVerse | null;
  }

  public createVerse(verse: Omit<Zaphnath.BibleVerse, "id">): number {
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

  public searchVerses(
    query: string,
    repositoryId?: string
  ): Zaphnath.BibleVerse[] {
    let sql = `
      SELECT v.id, v.book_id, v.chapter, v.verse, v.text,
             b.name as book_name, b.abbreviation as book_abbreviation
      FROM verses v
      JOIN books b ON v.book_id = b.id
      WHERE v.text LIKE ?
    `;
    let params: any[] = [`%${query}%`];

    if (repositoryId) {
      sql += " AND v.repository_id = ?";
      params.push(repositoryId);
    }

    sql += " ORDER BY b.book_order, v.chapter, v.verse LIMIT 100";

    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as Zaphnath.BibleVerse[];
  }

  // User settings queries
  public getSetting(key: string): string | null {
    const stmt = this.db.prepare(
      "SELECT value FROM user_settings WHERE key = ?"
    );
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
    const stmt = this.db.prepare("SELECT key, value FROM user_settings");
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
    const repositoryCount = this.db
      .prepare("SELECT COUNT(*) as count FROM repositories")
      .get() as { count: number };
    const bookCount = this.db
      .prepare("SELECT COUNT(*) as count FROM books")
      .get() as { count: number };
    const verseCount = this.db
      .prepare("SELECT COUNT(*) as count FROM verses")
      .get() as { count: number };

    // Get database file size
    const sizeResult = this.db
      .prepare(
        "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
      )
      .get() as { size: number };
    const sizeInMB = (sizeResult.size / (1024 * 1024)).toFixed(2);

    return {
      repositories: repositoryCount.count,
      books: bookCount.count,
      verses: verseCount.count,
      databaseSize: `${sizeInMB} MB`,
    };
  }

  // Hierarchical repository queries
  public getParentRepositories(): Zaphnath.BibleRepository[] {
    const stmt = this.db.prepare(`
      SELECT id, name, description, language, version, created_at, updated_at, type, parent_id
      FROM repositories
      WHERE type = 'parent'
      ORDER BY name
    `);
    return stmt.all() as Zaphnath.BibleRepository[];
  }

  public getTranslationRepositories(
    parentId?: string
  ): Zaphnath.BibleRepository[] {
    let query = `
      SELECT id, name, description, language, version, created_at, updated_at, type, parent_id
      FROM repositories
      WHERE type = 'translation'
    `;
    let params: any[] = [];

    if (parentId) {
      query += " AND parent_id = ?";
      params.push(parentId);
    }

    query += " ORDER BY name";

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Zaphnath.BibleRepository[];
  }

  public createParentRepository(repository: {
    id: string;
    name: string;
    description: string;
    version: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO repositories (id, name, description, version, type)
      VALUES (?, ?, ?, ?, 'parent')
    `);
    stmt.run(
      repository.id,
      repository.name,
      repository.description,
      repository.version
    );
  }

  public createTranslationRepository(repository: {
    id: string;
    name: string;
    description: string;
    language: string;
    version: string;
    parent_id?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO repositories (id, name, description, language, version, type, parent_id)
      VALUES (?, ?, ?, ?, ?, 'translation', ?)
    `);
    stmt.run(
      repository.id,
      repository.name,
      repository.description,
      repository.language,
      repository.version,
      repository.parent_id || null
    );
  }

  public createRepositoryTranslation(translation: {
    id: string;
    parent_repository_id: string;
    translation_id: string;
    directory_name: string;
    language_code: string;
    status?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO repository_translations (id, parent_repository_id, translation_id, directory_name, language_code, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      translation.id,
      translation.parent_repository_id,
      translation.translation_id,
      translation.directory_name,
      translation.language_code,
      translation.status || "active"
    );
  }

  public getRepositoryTranslations(parentId: string): any[] {
    const stmt = this.db.prepare(`
      SELECT 
        rt.*, 
        r.name as translation_name, 
        r.description as translation_description,
        COALESCE(book_counts.book_count, 0) as book_count,
        COALESCE(verse_counts.verse_count, 0) as verse_count
      FROM repository_translations rt
      JOIN repositories r ON rt.translation_id = r.id
      LEFT JOIN (
        SELECT repository_id, COUNT(*) as book_count
        FROM books
        GROUP BY repository_id
      ) book_counts ON r.id = book_counts.repository_id
      LEFT JOIN (
        SELECT repository_id, COUNT(*) as verse_count
        FROM verses
        GROUP BY repository_id
      ) verse_counts ON r.id = verse_counts.repository_id
      WHERE rt.parent_repository_id = ?
      ORDER BY rt.directory_name
    `);
    return stmt.all(parentId);
  }

  public deleteRepositoryTranslation(
    parentId: string,
    translationId: string
  ): void {
    const stmt = this.db.prepare(`
      DELETE FROM repository_translations
      WHERE parent_repository_id = ? AND translation_id = ?
    `);
    stmt.run(parentId, translationId);
  }
}
