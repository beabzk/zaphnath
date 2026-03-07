import type Database from 'better-sqlite3';
import type {
  RepositoryTranslationInput,
  TranslationRepositoryInput,
} from './databaseRepositoryQueryTypes.js';

export class DatabaseRepositoryTranslationWriteQueries {
  constructor(private db: Database.Database) {}

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

  public deleteRepositoryTranslationRow(parentId: string, translationId: string): void {
    this.db
      .prepare(
        `
        DELETE FROM repository_translations
        WHERE parent_repository_id = ? AND translation_id = ?
        `
      )
      .run(parentId, translationId);
  }

  public deleteTranslationsForParent(parentId: string): void {
    this.db
      .prepare('DELETE FROM repository_translations WHERE parent_repository_id = ?')
      .run(parentId);
  }
}
