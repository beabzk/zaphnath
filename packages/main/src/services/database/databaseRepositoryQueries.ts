import type Database from 'better-sqlite3';
import type { RepositoryDbRecord } from '../repository/types.js';

type ParentRepositoryInput = {
  id: string;
  name: string;
  description: string;
  version: string;
};

type TranslationRepositoryInput = {
  id: string;
  name: string;
  description: string;
  language: string;
  version: string;
  parent_id: string;
  directory_name?: string;
  status?: string;
};

type RepositoryTranslationInput = {
  id: string;
  parent_repository_id: string;
  translation_id: string;
  translation_name: string;
  translation_description?: string | null;
  translation_version: string;
  directory_name: string;
  language_code: string;
  status?: string;
};

export class DatabaseRepositoryQueries {
  constructor(private db: Database.Database) {}

  private tableExists(tableName: string): boolean {
    const stmt = this.db.prepare(
      "SELECT 1 as exists_flag FROM sqlite_master WHERE type = 'table' AND name = ?"
    );
    return Boolean(stmt.get(tableName));
  }

  private deleteTranslationData(repositoryId: string): void {
    this.db.prepare('DELETE FROM verses WHERE repository_id = ?').run(repositoryId);
    this.db.prepare('DELETE FROM books WHERE repository_id = ?').run(repositoryId);

    const optionalTables = ['notes', 'highlights', 'bookmarks'];
    for (const tableName of optionalTables) {
      if (this.tableExists(tableName)) {
        this.db.prepare(`DELETE FROM ${tableName} WHERE repository_id = ?`).run(repositoryId);
      }
    }
  }

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
        SELECT parent_repository_id, COUNT(*) as translation_count
        FROM repository_translations
        GROUP BY parent_repository_id
      ) translation_counts ON r.id = translation_counts.parent_repository_id
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
    repository: Omit<Zaphnath.BibleRepository, 'created_at' | 'updated_at'>
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
    const deleteAll = this.db.transaction(() => {
      const translations = this.db
        .prepare(
          `
          SELECT translation_id as id
          FROM repository_translations
          WHERE parent_repository_id = ?
          `
        )
        .all(id) as { id: string }[];

      for (const translation of translations) {
        this.deleteTranslationData(translation.id);
      }

      this.db.prepare('DELETE FROM repository_translations WHERE parent_repository_id = ?').run(id);
      this.db.prepare('DELETE FROM repositories WHERE id = ?').run(id);
    });

    deleteAll();
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
      language: record.language ?? 'en',
      version: record.version,
      created_at: record.created_at,
      updated_at: record.updated_at,
      type: record.type,
      parent_id: record.parent_id,
    });
  }

  public getParentRepositories(): Zaphnath.BibleRepository[] {
    const stmt = this.db.prepare(`
      SELECT id, name, description, language, version, created_at, updated_at, type, parent_id
      FROM repositories
      WHERE type = 'parent'
      ORDER BY name
    `);
    return stmt.all() as Zaphnath.BibleRepository[];
  }

  public getTranslationRepositories(parentId?: string): Zaphnath.BibleRepository[] {
    let query = `
      SELECT
        rt.translation_id as id,
        rt.translation_name as name,
        rt.translation_description as description,
        rt.language_code as language,
        rt.translation_version as version,
        rt.created_at as created_at,
        rt.created_at as updated_at,
        'translation' as type,
        rt.parent_repository_id as parent_id
      FROM repository_translations rt
      WHERE 1 = 1
    `;
    const params: unknown[] = [];

    if (parentId) {
      query += ' AND rt.parent_repository_id = ?';
      params.push(parentId);
    }

    query += ' ORDER BY rt.translation_name';

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as Zaphnath.BibleRepository[];
  }

  public createParentRepository(repository: ParentRepositoryInput): void {
    const stmt = this.db.prepare(`
      INSERT INTO repositories (id, name, description, version, type)
      VALUES (?, ?, ?, ?, 'parent')
    `);
    stmt.run(repository.id, repository.name, repository.description, repository.version);
  }

  public createTranslationRepository(repository: TranslationRepositoryInput): void {
    this.createRepositoryTranslation({
      id: `${repository.parent_id}:${repository.id}`,
      parent_repository_id: repository.parent_id,
      translation_id: repository.id,
      translation_name: repository.name,
      translation_description: repository.description,
      translation_version: repository.version,
      directory_name: repository.directory_name || repository.id,
      language_code: repository.language,
      status: repository.status || 'active',
    });
  }

  public createRepositoryTranslation(translation: RepositoryTranslationInput): void {
    const stmt = this.db.prepare(`
      INSERT INTO repository_translations (
        id,
        parent_repository_id,
        translation_id,
        translation_name,
        translation_description,
        translation_version,
        directory_name,
        language_code,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(parent_repository_id, translation_id) DO UPDATE SET
        id = excluded.id,
        parent_repository_id = excluded.parent_repository_id,
        translation_id = excluded.translation_id,
        translation_name = excluded.translation_name,
        translation_description = excluded.translation_description,
        translation_version = excluded.translation_version,
        directory_name = excluded.directory_name,
        language_code = excluded.language_code,
        status = excluded.status
    `);
    stmt.run(
      translation.id,
      translation.parent_repository_id,
      translation.translation_id,
      translation.translation_name,
      translation.translation_description || null,
      translation.translation_version,
      translation.directory_name,
      translation.language_code,
      translation.status || 'active'
    );
  }

  public getRepositoryTranslations(parentId: string): Zaphnath.RepositoryTranslationRow[] {
    const stmt = this.db.prepare(`
      SELECT
        rt.*,
        COALESCE(book_counts.book_count, 0) as book_count,
        COALESCE(verse_counts.verse_count, 0) as verse_count
      FROM repository_translations rt
      LEFT JOIN (
        SELECT repository_id, COUNT(*) as book_count
        FROM books
        GROUP BY repository_id
      ) book_counts ON rt.translation_id = book_counts.repository_id
      LEFT JOIN (
        SELECT repository_id, COUNT(*) as verse_count
        FROM verses
        GROUP BY repository_id
      ) verse_counts ON rt.translation_id = verse_counts.repository_id
      WHERE rt.parent_repository_id = ?
      ORDER BY rt.directory_name
    `);
    return stmt.all(parentId) as Zaphnath.RepositoryTranslationRow[];
  }

  public deleteRepositoryTranslation(parentId: string, translationId: string): void {
    const deleteTranslation = this.db.transaction(() => {
      this.deleteTranslationData(translationId);

      this.db
        .prepare(
          `
          DELETE FROM repository_translations
          WHERE parent_repository_id = ? AND translation_id = ?
          `
        )
        .run(parentId, translationId);
    });

    deleteTranslation();
  }
}
