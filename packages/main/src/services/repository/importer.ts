import { DatabaseService } from '../database/index.js';
import { RepositoryDiscoveryService } from './discovery.js';
import { RepositoryBookImporter } from './repositoryBookImporter.js';
import { RepositoryChecksumValidator } from './repositoryChecksumValidator.js';
import { RepositoryImportContentService } from './importContentService.js';
import { RepositoryImportPersistence } from './repositoryImportPersistence.js';
import { RepositoryParentImportPlanner } from './repositoryParentImportPlanner.js';
import { ZBRSValidator } from './validator.js';
import { normalizeRepositoryUrl } from './pathUtils.js';
import type {
  RepositoryDbRecord,
  ZBRSParentManifest,
  ZBRSTranslationManifest,
  TranslationReference,
  ImportOptions,
  ImportResult,
  ImportProgress,
  ValidationResult,
  SecurityPolicy,
  ValidationError,
} from './types.js';
import { isParentManifest, isTranslationManifest } from './types.js';

const createValidationError = (
  code: string,
  message: string,
  path?: string,
  details?: Record<string, unknown>
): ValidationError => ({
  code,
  message,
  path,
  severity: 'error',
  details,
  name: 'ValidationError',
});

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class RepositoryImporter {
  private databaseService: DatabaseService;
  private discoveryService: RepositoryDiscoveryService;
  private validator: ZBRSValidator;
  private contentService: RepositoryImportContentService;
  private bookImporter: RepositoryBookImporter;
  private checksumValidator: RepositoryChecksumValidator;
  private persistence: RepositoryImportPersistence;
  private parentImportPlanner: RepositoryParentImportPlanner;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.databaseService = DatabaseService.getInstance();
    this.discoveryService = new RepositoryDiscoveryService(securityPolicy);
    this.validator = new ZBRSValidator(securityPolicy);
    this.contentService = new RepositoryImportContentService();
    this.bookImporter = new RepositoryBookImporter(this.databaseService, this.contentService);
    this.checksumValidator = new RepositoryChecksumValidator(
      this.validator,
      this.contentService,
      createValidationError,
      toErrorMessage
    );
    this.persistence = new RepositoryImportPersistence(this.databaseService);
    this.parentImportPlanner = new RepositoryParentImportPlanner(this.validator);
  }

  public async importRepository(options: ImportOptions): Promise<ImportResult> {
    const startTime = Date.now();
    const normalizedOptions: ImportOptions = {
      ...options,
      repository_url: normalizeRepositoryUrl(options.repository_url),
    };
    const result: ImportResult = {
      success: false,
      repository_id: '',
      books_imported: 0,
      errors: [],
      warnings: [],
      duration_ms: 0,
    };

    try {
      this.reportProgress(options, {
        stage: 'discovering',
        progress: 0,
        message: 'Discovering repository...',
      });

      const manifest = await this.discoveryService.fetchRepositoryManifest(
        normalizedOptions.repository_url
      );
      result.repository_id = manifest.repository.id;

      if (isParentManifest(manifest)) {
        return await this.importParentRepository(manifest, normalizedOptions);
      } else if (isTranslationManifest(manifest)) {
        return await this.importTranslation(manifest, normalizedOptions);
      } else {
        result.errors.push(
          createValidationError('unknown-manifest-type', 'Unknown manifest type - cannot import')
        );
        return result;
      }
    } catch (error) {
      this.reportProgress(options, {
        stage: 'error',
        progress: 100,
        message: `Import failed: ${toErrorMessage(error)}`,
      });
      result.errors.push(
        createValidationError('import-failed', `Import failed: ${toErrorMessage(error)}`)
      );
      result.duration_ms = Date.now() - startTime;
      return result;
    }
  }

  public async importParentRepository(
    manifest: ZBRSParentManifest,
    options: ImportOptions
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      repository_id: manifest.repository.id,
      books_imported: 0,
      errors: [],
      warnings: [],
      duration_ms: 0,
      translations_imported: [],
      translations_skipped: [],
    };
    const translationsImported = result.translations_imported ?? [];
    const translationsSkipped = result.translations_skipped ?? [];

    try {
      this.reportProgress(options, {
        stage: 'validating',
        progress: 10,
        message: 'Validating parent repository...',
      });

      const parentImportPlan = this.parentImportPlanner.planParentImport(
        manifest,
        options.selected_translations
      );

      result.warnings.push(...parentImportPlan.validation.warnings);
      if (!parentImportPlan.validation.valid) {
        result.errors.push(...parentImportPlan.validation.errors);
        return result;
      }

      this.persistence.upsertParentRepository(manifest);

      // Clean base URL for translations
      const baseUrl = this.contentService.normalizeRepositoryBaseUrl(options.repository_url);
      translationsSkipped.push(...parentImportPlan.skippedTranslationIds);

      if (parentImportPlan.translationTasks.length === 0) {
        result.errors.push(
          createValidationError(
            'no-translations-selected',
            'No translations were selected for import'
          )
        );
        return result;
      }

      for (const task of parentImportPlan.translationTasks) {
        this.reportProgress(options, {
          stage: 'processing',
          progress: Math.round(task.slotStart),
          message: `Importing translation ${task.sequenceNumber}/${task.totalTranslations}: ${
            task.translation.name
          }`,
        });

        const translationResult = await this.importTranslationFromParent(
          baseUrl,
          task.translation,
          manifest.repository.id,
          {
            ...options,
            progress_callback: (translationProgress) => {
              this.reportProgress(
                options,
                this.parentImportPlanner.mapChildProgress(task, translationProgress)
              );
            },
          }
        );
        result.books_imported += translationResult.books_imported;

        if (translationResult.success) {
          translationsImported.push(task.translation.id);
        } else {
          translationsSkipped.push(task.translation.id);
          result.errors.push(...translationResult.errors);
          result.warnings.push(...translationResult.warnings);
        }
      }
      result.success = result.errors.length === 0;
      this.reportProgress(options, {
        stage: result.success ? 'complete' : 'error',
        progress: 100,
        message: result.success
          ? `Parent import complete. Imported ${translationsImported.length} translation${
              translationsImported.length === 1 ? '' : 's'
            }.`
          : 'Parent import completed with errors.',
      });
    } catch (error) {
      this.reportProgress(options, {
        stage: 'error',
        progress: 100,
        message: `Parent import failed: ${toErrorMessage(error)}`,
      });
      result.errors.push(
        createValidationError('parent-import-failed', `Import failed: ${toErrorMessage(error)}`)
      );
    } finally {
      result.duration_ms = Date.now() - startTime;
    }
    return result;
  }

  private async validateAndPrepareTranslation(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions,
    parentId: string | null
  ): Promise<[ValidationResult, RepositoryDbRecord | null]> {
    const validation = await this.checksumValidator.validateTranslationImport(
      manifest,
      {
        repositoryUrl: options.repository_url,
        validateChecksums: options.validate_checksums,
      },
      (progress) => {
        this.reportProgress(options, progress);
      }
    );
    if (!validation.valid) return [validation, null];

    // Parent imports store translation metadata in repository_translations only.
    // Standalone translation imports are represented as a single parent repository.
    const record: RepositoryDbRecord | null = parentId
      ? null
      : this.persistence.createStandaloneTranslationRepository(manifest);

    return [validation, record];
  }

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
        this.persistence.upsertRepository(record);
      }

      const translationParentId = parentId ?? manifest.repository.id;
      const translationDirectory = directoryName ?? '.';

      this.persistence.registerTranslation({
        parentId: translationParentId,
        manifest,
        directoryName: translationDirectory,
        translationStatus,
      });

      const importedCount = await this.bookImporter.importBooks(
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
        message: `Import failed: ${toErrorMessage(error)}`,
      });
      result.errors.push(
        createValidationError(
          'translation-import-failed',
          `Import failed: ${toErrorMessage(error)}`
        )
      );
    } finally {
      result.duration_ms = Date.now() - startTime;
    }
    return result;
  }

  private async importTranslationFromParent(
    baseUrl: string,
    translation: TranslationReference,
    parentId: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    const translationUrl =
      (baseUrl.endsWith('/') ? baseUrl : baseUrl + '/') + translation.directory;

    try {
      const manifest = await this.discoveryService.fetchRepositoryManifest(translationUrl);

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
        message: `Failed to import translation ${translation.name}: ${toErrorMessage(error)}`,
      });
      return {
        success: false,
        repository_id: translation.id,
        books_imported: 0,
        errors: [
          createValidationError(
            'fetch-translation-failed',
            `Failed to import translation ${translation.name}: ${toErrorMessage(error)}`
          ),
        ],
        warnings: [],
        duration_ms: 0,
      };
    }
  }

  private reportProgress(options: ImportOptions, progress: ImportProgress): void {
    if (options.progress_callback) {
      options.progress_callback(progress);
    }
  }

  public getDiscoveryService(): RepositoryDiscoveryService {
    return this.discoveryService;
  }
}
