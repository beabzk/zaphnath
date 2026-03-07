import type Database from 'better-sqlite3';
import type { RepositoryDbRecord } from '../repository/types.js';
import type { ParentRepositoryInput } from './databaseRepositoryQueryTypes.js';

export class DatabaseRepositoryMetadataQueries {
  constructor(private db: Database.Database) {}

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

  public createParentRepository(repository: ParentRepositoryInput): void {
    const stmt = this.db.prepare(`
      INSERT INTO repositories (id, name, description, version, type)
      VALUES (?, ?, ?, ?, 'parent')
    `);
    stmt.run(repository.id, repository.name, repository.description, repository.version);
  }

  public deleteRepositoryRow(id: string): void {
    this.db.prepare('DELETE FROM repositories WHERE id = ?').run(id);
  }
}
