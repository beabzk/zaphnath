import { RepositoryDiscoveryService } from './discovery.js';
import { RepositoryBookImporter } from './repositoryBookImporter.js';
import { RepositoryChecksumValidator } from './repositoryChecksumValidator.js';
import { RepositoryImportPersistence } from './repositoryImportPersistence.js';
import type {
  ImportOptions,
  ImportProgress,
  ImportResult,
  RepositoryDbRecord,
  TranslationReference,
  ValidationError,
  ValidationResult,
  ZBRSTranslationManifest,
} from './types.js';
import { isTranslationManifest } from './types.js';

type CreateValidationError = (
  code: string,
  message: string,
  path?: string,
  details?: Record<string, unknown>
) => ValidationError;

type ReportProgress = (options: ImportOptions, progress: ImportProgress) => void;

interface RepositoryTranslationImporterDependencies {
  bookImporter: RepositoryBookImporter;
  checksumValidator: RepositoryChecksumValidator;
  createValidationError: CreateValidationError;
  discoveryService: RepositoryDiscoveryService;
  persistence: RepositoryImportPersistence;
  reportProgress: ReportProgress;
  toErrorMessage: (error: unknown) => string;
}

export class RepositoryTranslationImporter {
  constructor(private dependencies: RepositoryTranslationImporterDependencies) {}

  public async importTranslation(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions,
    parentId: string | null = null,
    directoryName: string | null = null,
    translationStatus: 'active' | 'inactive' | 'deprecated' = 'active'
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      repository_id: manifest.repository.id,
      books_imported: 0,
      errors: [],
      warnings: [],
      duration_ms: 0,
    };

    try {
      const [validation, record] = await this.validateAndPrepareTranslation(
        manifest,
        options,
        parentId
      );

      result.warnings.push(...validation.warnings);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }

      if (record) {
        this.dependencies.persistence.upsertRepository(record);
      }

      const translationParentId = parentId ?? manifest.repository.id;
      const translationDirectory = directoryName ?? '.';

      this.dependencies.persistence.registerTranslation({
        parentId: translationParentId,
        manifest,
        directoryName: translationDirectory,
        translationStatus,
      });

      const importedCount = await this.dependencies.bookImporter.importBooks(
        manifest,
        options.repository_url,
        (progress) => {
          const bookImportProgressStart = 60;
          const bookImportProgressRange = 35;

          if (progress.stage === 'preparing') {
            this.reportProgress(options, {
              stage: 'processing',
              progress: bookImportProgressStart,
              message: `Preparing to import ${progress.totalBooks} books...`,
              total_books: progress.totalBooks,
              processed_books: progress.processedBooks,
            });
            return;
          }

          const normalizedProgress =
            progress.totalBooks === 0 ? 0 : progress.processedBooks / progress.totalBooks;
          const mappedProgress = Math.round(
            bookImportProgressStart + normalizedProgress * bookImportProgressRange
          );

          if (progress.stage === 'processing') {
            this.reportProgress(options, {
              stage: 'processing',
              progress: mappedProgress,
              message: `Importing book ${progress.currentBook}...`,
              current_book: progress.currentBook,
              total_books: progress.totalBooks,
              processed_books: progress.processedBooks,
            });
            return;
          }

          this.reportProgress(options, {
            stage: 'processing',
            progress: mappedProgress,
            message: `Imported ${progress.importedCount}/${progress.totalBooks} books`,
            current_book: progress.currentBook,
            total_books: progress.totalBooks,
            processed_books: progress.processedBooks,
          });
        }
      );
      result.books_imported = importedCount;

      this.reportProgress(options, {
        stage: 'complete',
        progress: 100,
        message: `Import complete! ${importedCount} books imported.`,
      });

      result.success = true;
    } catch (error) {
      this.reportProgress(options, {
        stage: 'error',
        progress: 100,
        message: `Import failed: ${this.dependencies.toErrorMessage(error)}`,
      });
      result.errors.push(
        this.dependencies.createValidationError(
          'translation-import-failed',
          `Import failed: ${this.dependencies.toErrorMessage(error)}`
        )
      );
    } finally {
      result.duration_ms = Date.now() - startTime;
    }
    return result;
  }

  public async importTranslationFromParent(
    baseUrl: string,
    translation: TranslationReference,
    parentId: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const translationUrl =
      (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') + translation.directory;

    try {
      const manifest =
        await this.dependencies.discoveryService.fetchRepositoryManifest(translationUrl);

      if (!isTranslationManifest(manifest)) {
        throw new Error(
          `Expected a translation manifest for ${translation.name}, but found a different type.`
        );
      }

      return this.importTranslation(
        manifest,
        { ...options, repository_url: translationUrl },
        parentId,
        translation.directory,
        translation.status
      );
    } catch (error) {
      this.reportProgress(options, {
        stage: 'error',
        progress: 100,
        message: `Failed to import translation ${translation.name}: ${this.dependencies.toErrorMessage(error)}`,
      });
      return {
        success: false,
        repository_id: translation.id,
        books_imported: 0,
        errors: [
          this.dependencies.createValidationError(
            'fetch-translation-failed',
            `Failed to import translation ${translation.name}: ${this.dependencies.toErrorMessage(error)}`
          ),
        ],
        warnings: [],
        duration_ms: 0,
      };
    }
  }

  private async validateAndPrepareTranslation(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions,
    parentId: string | null
  ): Promise<[ValidationResult, RepositoryDbRecord | null]> {
    const validation = await this.dependencies.checksumValidator.validateTranslationImport(
      manifest,
      {
        repositoryUrl: options.repository_url,
        validateChecksums: options.validate_checksums,
      },
      (progress) => {
        this.reportProgress(options, progress);
      }
    );
    if (!validation.valid) {
      return [validation, null];
    }

    const record = parentId
      ? null
      : this.dependencies.persistence.createStandaloneTranslationRepository(manifest);

    return [validation, record];
  }

  private reportProgress(options: ImportOptions, progress: ImportProgress): void {
    this.dependencies.reportProgress(options, progress);
  }
}
