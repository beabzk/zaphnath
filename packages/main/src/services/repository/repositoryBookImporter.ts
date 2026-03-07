import { DatabaseService } from '../database/index.js';
import { RepositoryImportContentService } from './importContentService.js';
import type { ZBRSBook, ZBRSTranslationManifest } from './types.js';

export type RepositoryBookImportProgress =
  | {
      stage: 'preparing';
      totalBooks: number;
      processedBooks: number;
    }
  | {
      stage: 'processing';
      currentBook: string;
      totalBooks: number;
      processedBooks: number;
    }
  | {
      stage: 'imported';
      currentBook: string;
      totalBooks: number;
      processedBooks: number;
      importedCount: number;
    };

export class RepositoryBookImporter {
  constructor(
    private databaseService: DatabaseService,
    private contentService: RepositoryImportContentService
  ) {}

  public async importBooks(
    manifest: ZBRSTranslationManifest,
    repositoryUrl: string,
    onProgress?: (progress: RepositoryBookImportProgress) => void
  ): Promise<number> {
    const baseUrl = this.contentService.normalizeRepositoryBaseUrl(repositoryUrl);
    const bookFiles = await this.contentService.resolveBookFiles(manifest, repositoryUrl);
    let importedCount = 0;

    if (!Array.isArray(bookFiles) || bookFiles.length === 0) {
      console.error('No book files could be resolved for translation:', manifest.repository.id);
      throw new Error(
        'No book files could be resolved. Ensure the translation exposes a books directory (e.g., translation/books/*.json) or provides content.books references.'
      );
    }

    onProgress?.({
      stage: 'preparing',
      totalBooks: bookFiles.length,
      processedBooks: 0,
    });

    for (const [index, bookFile] of bookFiles.entries()) {
      const currentBook = bookFile.path;

      onProgress?.({
        stage: 'processing',
        currentBook,
        totalBooks: bookFiles.length,
        processedBooks: index,
      });

      try {
        const bookUrl = this.contentService.buildBookUrl(baseUrl, bookFile);
        const book = (await this.contentService.fetchJsonFromLocation(bookUrl)) as ZBRSBook;

        await this.databaseService.getQueries().importBook(book, manifest.repository.id);
        importedCount++;

        onProgress?.({
          stage: 'imported',
          currentBook,
          totalBooks: bookFiles.length,
          processedBooks: index + 1,
          importedCount,
        });
      } catch (error) {
        console.error(`Failed to import book ${currentBook}:`, error);
      }
    }

    return importedCount;
  }
}
