import type Database from 'better-sqlite3';
import { DatabaseConnection } from './connection.js';
import { DatabaseContentQueries } from './databaseContentQueries.js';
import { DatabaseRepositoryQueries } from './databaseRepositoryQueries.js';
import { DatabaseSettingsQueries, type DatabaseStats } from './databaseSettingsQueries.js';
import type { RepositoryDbRecord, ZBRSBook } from '../repository/types.js';

export class DatabaseQueries {
  private db: Database.Database;
  private repositoryQueries: DatabaseRepositoryQueries;
  private contentQueries: DatabaseContentQueries;
  private settingsQueries: DatabaseSettingsQueries;

  constructor() {
    const connection = DatabaseConnection.getInstance();
    this.db = connection.connect();
    this.repositoryQueries = new DatabaseRepositoryQueries(this.db);
    this.contentQueries = new DatabaseContentQueries(this.db);
    this.settingsQueries = new DatabaseSettingsQueries(this.db);
  }

  public getRepositories(): Zaphnath.BibleRepository[] {
    return this.repositoryQueries.getRepositories();
  }

  public getRepository(id: string): Zaphnath.BibleRepository | null {
    return this.repositoryQueries.getRepository(id);
  }

  public createRepository(
    repository: Omit<Zaphnath.BibleRepository, 'created_at' | 'updated_at'>
  ): void {
    this.repositoryQueries.createRepository(repository);
  }

  public deleteRepository(id: string): void {
    this.repositoryQueries.deleteRepository(id);
  }

  public upsertRepository(record: RepositoryDbRecord): void {
    this.repositoryQueries.upsertRepository(record);
  }

  public getBooks(repositoryId?: string): Zaphnath.BibleBook[] {
    return this.contentQueries.getBooks(repositoryId);
  }

  public getBook(id: number): Zaphnath.BibleBook | null {
    return this.contentQueries.getBook(id);
  }

  public createBook(book: Omit<Zaphnath.BibleBook, 'id'>): number {
    return this.contentQueries.createBook(book);
  }

  public importBook(book: ZBRSBook, repositoryId: string): void {
    this.contentQueries.importBook(book, repositoryId);
  }

  public getVerses(bookId: number, chapter: number): Zaphnath.BibleVerse[] {
    return this.contentQueries.getVerses(bookId, chapter);
  }

  public getVerse(bookId: number, chapter: number, verse: number): Zaphnath.BibleVerse | null {
    return this.contentQueries.getVerse(bookId, chapter, verse);
  }

  public createVerse(verse: Omit<Zaphnath.BibleVerse, 'id'>): number {
    return this.contentQueries.createVerse(verse);
  }

  public searchVerses(query: string, repositoryId?: string): Zaphnath.BibleVerse[] {
    return this.contentQueries.searchVerses(query, repositoryId);
  }

  public getSetting(key: string): string | null {
    return this.settingsQueries.getSetting(key);
  }

  public setSetting(key: string, value: string): void {
    this.settingsQueries.setSetting(key, value);
  }

  public getAllSettings(): Record<string, string> {
    return this.settingsQueries.getAllSettings();
  }

  public transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  public getStats(): DatabaseStats {
    return this.settingsQueries.getStats();
  }

  public getParentRepositories(): Zaphnath.BibleRepository[] {
    return this.repositoryQueries.getParentRepositories();
  }

  public getTranslationRepositories(parentId?: string): Zaphnath.BibleRepository[] {
    return this.repositoryQueries.getTranslationRepositories(parentId);
  }

  public createParentRepository(repository: {
    id: string;
    name: string;
    description: string;
    version: string;
  }): void {
    this.repositoryQueries.createParentRepository(repository);
  }

  public createTranslationRepository(repository: {
    id: string;
    name: string;
    description: string;
    language: string;
    version: string;
    parent_id: string;
    directory_name?: string;
    status?: string;
  }): void {
    this.repositoryQueries.createTranslationRepository(repository);
  }

  public createRepositoryTranslation(translation: {
    id: string;
    parent_repository_id: string;
    translation_id: string;
    translation_name: string;
    translation_description?: string | null;
    translation_version: string;
    directory_name: string;
    language_code: string;
    status?: string;
  }): void {
    this.repositoryQueries.createRepositoryTranslation(translation);
  }

  public getRepositoryTranslations(parentId: string): Zaphnath.RepositoryTranslationRow[] {
    return this.repositoryQueries.getRepositoryTranslations(parentId);
  }

  public deleteRepositoryTranslation(parentId: string, translationId: string): void {
    this.repositoryQueries.deleteRepositoryTranslation(parentId, translationId);
  }
}
