import { DatabaseService } from '../database/index.js';
import { RepositoryDiscoveryService } from './discovery.js';
import { RepositoryBookImporter } from './repositoryBookImporter.js';
import { RepositoryChecksumValidator } from './repositoryChecksumValidator.js';
import { RepositoryImportContentService } from './importContentService.js';
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

      const validation = this.validator.validateParentManifest(manifest);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        return result;
      }
      result.warnings.push(...validation.warnings);

      await this.createOrUpdateRepositoryRecord({
        id: manifest.repository.id,
        name: manifest.repository.name,
        description: manifest.repository.description,
        version: manifest.repository.version,
        type: 'parent',
        parent_id: null,
        language: null, // Parent repos don't have a single language
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        imported_at: new Date().toISOString(),
        metadata: JSON.stringify({
          publisher: manifest.publisher,
          technical: manifest.technical,
          extensions: manifest.extensions || {},
        }),
      });

      // Clean base URL for translations
      const baseUrl = this.contentService.normalizeRepositoryBaseUrl(options.repository_url);

      const selectedTranslationIds = new Set(options.selected_translations || []);
      const useSelectiveImport = selectedTranslationIds.size > 0;
      const availableTranslationIds = new Set(manifest.translations.map((t) => t.id));

      if (useSelectiveImport) {
        for (const translation of manifest.translations) {
          if (!selectedTranslationIds.has(translation.id)) {
            translationsSkipped.push(translation.id);
          }
        }

        const unknownSelections = [...selectedTranslationIds].filter(
          (translationId) => !availableTranslationIds.has(translationId)
        );
        if (unknownSelections.length > 0) {
          result.warnings.push({
            code: 'UNKNOWN_TRANSLATION_SELECTION',
            message: `Selected translations not found in parent manifest: ${unknownSelections.join(', ')}`,
            name: 'ValidationWarning',
          });
        }
      }

      const translationsToImport = useSelectiveImport
        ? manifest.translations.filter((translation) => selectedTranslationIds.has(translation.id))
        : manifest.translations;

      if (translationsToImport.length === 0) {
        result.errors.push(
          createValidationError(
            'no-translations-selected',
            'No translations were selected for import'
          )
        );
        return result;
      }

      const parentImportStart = 20;
      const parentImportRange = 75;
      const totalTranslations = translationsToImport.length;

      for (const [translationIndex, translation] of translationsToImport.entries()) {
        const slotStart =
          parentImportStart + (translationIndex / totalTranslations) * parentImportRange;
        const slotEnd =
          parentImportStart + ((translationIndex + 1) / totalTranslations) * parentImportRange;

        this.reportProgress(options, {
          stage: 'processing',
          progress: Math.round(slotStart),
          message: `Importing translation ${translationIndex + 1}/${totalTranslations}: ${
            translation.name
          }`,
        });

        const translationResult = await this.importTranslationFromParent(
          baseUrl,
          translation,
          manifest.repository.id,
          {
            ...options,
            progress_callback: (translationProgress) => {
              const boundedChildProgress = Math.max(0, Math.min(100, translationProgress.progress));
              const mappedProgress =
                slotStart + ((slotEnd - slotStart) * boundedChildProgress) / 100;
              this.reportProgress(options, {
                ...translationProgress,
                progress: Math.round(mappedProgress),
                message: `[${translationIndex + 1}/${totalTranslations}] ${
                  translationProgress.message
                }`,
              });
            },
          }
        );
        result.books_imported += translationResult.books_imported;

        if (translationResult.success) {
          translationsImported.push(translation.id);
        } else {
          translationsSkipped.push(translation.id);
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
      : {
          id: manifest.repository.id,
          name: manifest.repository.name,
          description: manifest.repository.description,
          version: manifest.repository.version,
          language: manifest.repository.language.code,
          type: 'parent',
          parent_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          imported_at: new Date().toISOString(),
          metadata: JSON.stringify({
            technical: manifest.technical,
            content: manifest.content,
            extensions: manifest.extensions || {},
          }),
        };

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
        await this.createOrUpdateRepositoryRecord(record);
      }

      const translationParentId = parentId ?? manifest.repository.id;
      const translationDirectory = directoryName ?? '.';

      this.databaseService.getQueries().createRepositoryTranslation({
        id: `${translationParentId}:${manifest.repository.id}`,
        parent_repository_id: translationParentId,
        translation_id: manifest.repository.id,
        translation_name: manifest.repository.name,
        translation_description: manifest.repository.description,
        translation_version: manifest.repository.version,
        directory_name: translationDirectory,
        language_code: manifest.repository.language.code,
        status: translationStatus,
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

  private createOrUpdateRepositoryRecord(record: RepositoryDbRecord) {
    this.databaseService.getQueries().upsertRepository(record);
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
