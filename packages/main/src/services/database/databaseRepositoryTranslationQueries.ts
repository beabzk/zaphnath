import type Database from 'better-sqlite3';
import { DatabaseRepositoryTranslationReadQueries } from './databaseRepositoryTranslationReadQueries.js';
import { DatabaseRepositoryTranslationWriteQueries } from './databaseRepositoryTranslationWriteQueries.js';
import type {
  RepositoryTranslationInput,
  TranslationRepositoryInput,
} from './databaseRepositoryQueryTypes.js';

export class DatabaseRepositoryTranslationQueries {
  private readQueries: DatabaseRepositoryTranslationReadQueries;
  private writeQueries: DatabaseRepositoryTranslationWriteQueries;

  constructor(db: Database.Database) {
    this.readQueries = new DatabaseRepositoryTranslationReadQueries(db);
    this.writeQueries = new DatabaseRepositoryTranslationWriteQueries(db);
  }

  public getTranslationRepositories(parentId?: string): Zaphnath.BibleRepository[] {
    return this.readQueries.getTranslationRepositories(parentId);
  }

  public createTranslationRepository(repository: TranslationRepositoryInput): void {
    this.writeQueries.createTranslationRepository(repository);
  }

  public createRepositoryTranslation(translation: RepositoryTranslationInput): void {
    this.writeQueries.createRepositoryTranslation(translation);
  }

  public getRepositoryTranslations(parentId: string): Zaphnath.RepositoryTranslationRow[] {
    return this.readQueries.getRepositoryTranslations(parentId);
  }

  public getTranslationIdsForParent(parentId: string): string[] {
    return this.readQueries.getTranslationIdsForParent(parentId);
  }

  public deleteRepositoryTranslationRow(parentId: string, translationId: string): void {
    this.writeQueries.deleteRepositoryTranslationRow(parentId, translationId);
  }

  public deleteTranslationsForParent(parentId: string): void {
    this.writeQueries.deleteTranslationsForParent(parentId);
  }
}
