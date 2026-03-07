import type Database from 'better-sqlite3';

export class DatabaseRepositoryTranslationReadQueries {
  constructor(private db: Database.Database) {}

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

  public getTranslationIdsForParent(parentId: string): string[] {
    const rows = this.db
      .prepare(
        `
        SELECT translation_id
        FROM repository_translations
        WHERE parent_repository_id = ?
        `
      )
      .all(parentId) as { translation_id: string }[];

    return rows.map((row) => row.translation_id);
  }
}
