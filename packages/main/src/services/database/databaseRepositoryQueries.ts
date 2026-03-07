import type Database from 'better-sqlite3';
import type { RepositoryDbRecord } from '../repository/types.js';
import { DatabaseRepositoryMetadataQueries } from './databaseRepositoryMetadataQueries.js';
import type {
  ParentRepositoryInput,
  RepositoryTranslationInput,
  TranslationRepositoryInput,
} from './databaseRepositoryQueryTypes.js';
import { DatabaseRepositoryTranslationQueries } from './databaseRepositoryTranslationQueries.js';

export class DatabaseRepositoryQueries {
  private metadataQueries: DatabaseRepositoryMetadataQueries;
  private translationQueries: DatabaseRepositoryTranslationQueries;

  constructor(private db: Database.Database) {
    this.metadataQueries = new DatabaseRepositoryMetadataQueries(db);
    this.translationQueries = new DatabaseRepositoryTranslationQueries(db);
  }

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
    return this.metadataQueries.getRepositories();
  }

  public getRepository(id: string): Zaphnath.BibleRepository | null {
    return this.metadataQueries.getRepository(id);
  }

  public createRepository(
    repository: Omit<Zaphnath.BibleRepository, 'created_at' | 'updated_at'>
  ): void {
    this.metadataQueries.createRepository(repository);
  }

  public deleteRepository(id: string): void {
    const deleteAll = this.db.transaction(() => {
      const translationIds = this.translationQueries.getTranslationIdsForParent(id);

      for (const translationId of translationIds) {
        this.deleteTranslationData(translationId);
      }

      this.translationQueries.deleteTranslationsForParent(id);
      this.metadataQueries.deleteRepositoryRow(id);
    });

    deleteAll();
  }

  public upsertRepository(record: RepositoryDbRecord): void {
    this.metadataQueries.upsertRepository(record);
  }

  public getParentRepositories(): Zaphnath.BibleRepository[] {
    return this.metadataQueries.getParentRepositories();
  }

  public getTranslationRepositories(parentId?: string): Zaphnath.BibleRepository[] {
    return this.translationQueries.getTranslationRepositories(parentId);
  }

  public createParentRepository(repository: ParentRepositoryInput): void {
    this.metadataQueries.createParentRepository(repository);
  }

  public createTranslationRepository(repository: TranslationRepositoryInput): void {
    this.translationQueries.createTranslationRepository(repository);
  }

  public createRepositoryTranslation(translation: RepositoryTranslationInput): void {
    this.translationQueries.createRepositoryTranslation(translation);
  }

  public getRepositoryTranslations(parentId: string): Zaphnath.RepositoryTranslationRow[] {
    return this.translationQueries.getRepositoryTranslations(parentId);
  }

  public deleteRepositoryTranslation(parentId: string, translationId: string): void {
    const deleteTranslation = this.db.transaction(() => {
      this.deleteTranslationData(translationId);
      this.translationQueries.deleteRepositoryTranslationRow(parentId, translationId);
    });

    deleteTranslation();
  }
}
