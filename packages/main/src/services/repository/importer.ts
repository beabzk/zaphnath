import { DatabaseService } from '../database/index.js';
import { RepositoryDiscoveryService } from './discovery.js';
import { RepositoryImportContentService } from './importContentService.js';
import { ZBRSValidator } from './validator.js';
import { normalizeRepositoryUrl } from './pathUtils.js';
import type {
  RepositoryDbRecord,
  ZBRSParentManifest,
  ZBRSTranslationManifest,
  TranslationReference,
  ZBRSBook,
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

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.databaseService = DatabaseService.getInstance();
    this.discoveryService = new RepositoryDiscoveryService(securityPolicy);
    this.validator = new ZBRSValidator(securityPolicy);
    this.contentService = new RepositoryImportContentService();
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
    const validation = await this.validateRepositoryChecksums(manifest, options);
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

      const importedCount = await this.importBooks(manifest, options);
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

  private async validateRepositoryChecksums(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions
  ): Promise<ValidationResult> {
    const validation = this.validator.validateTranslationManifest(manifest);
    if (!validation.valid) return validation;

    if (options.validate_checksums) {
      this.reportProgress(options, {
        stage: 'validating',
        progress: 50,
        message: 'Validating file checksums...',
      });

      const baseUrl = this.contentService.normalizeRepositoryBaseUrl(options.repository_url);
      const bookFiles = await this.contentService.resolveBookFiles(manifest, options.repository_url);
      let checksumWarningEmitted = false;

      for (const bookFile of bookFiles) {
        const expectedChecksum = bookFile.checksum;
        if (!expectedChecksum || !expectedChecksum.startsWith('sha256:')) {
          if (!checksumWarningEmitted) {
            validation.warnings.push({
              code: 'CHECKSUM_SKIPPED',
              message:
                'Skipping checksum validation for one or more books because checksum metadata is missing or not sha256',
              name: 'ValidationWarning',
            });
            checksumWarningEmitted = true;
          }
          continue;
        }

        const bookUrl = this.contentService.buildBookUrl(baseUrl, bookFile);

        try {
          const actualChecksum = await this.contentService.calculateSha256(bookUrl);
          if (actualChecksum === expectedChecksum) {
            continue;
          }

          validation.valid = false;
          validation.errors.push(
            createValidationError(
              'checksum-mismatch',
              `Checksum mismatch for ${bookFile.path}`,
              bookFile.path,
              {
                expected: expectedChecksum,
                actual: actualChecksum,
              }
            )
          );
        } catch (error) {
          validation.valid = false;
          validation.errors.push(
            createValidationError(
              'checksum-validation-failed',
              `Failed to validate checksum for ${bookFile.path}: ${toErrorMessage(error)}`,
              bookFile.path
            )
          );
        }
      }
    }
    return validation;
  }

  private async importBooks(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions
  ): Promise<number> {
    const bookImportProgressStart = 60;
    const bookImportProgressRange = 35;
    const baseUrl = this.contentService.normalizeRepositoryBaseUrl(options.repository_url);
    const bookFiles = await this.contentService.resolveBookFiles(manifest, options.repository_url);
    let importedCount = 0;

    if (!Array.isArray(bookFiles) || bookFiles.length === 0) {
      console.error('No book files could be resolved for translation:', manifest.repository.id);
      throw new Error(
        'No book files could be resolved. Ensure the translation exposes a books directory (e.g., translation/books/*.json) or provides content.books references.'
      );
    }

    this.reportProgress(options, {
      stage: 'processing',
      progress: bookImportProgressStart,
      message: `Preparing to import ${bookFiles.length} books...`,
      total_books: bookFiles.length,
      processed_books: 0,
    });

    for (const [index, bookFile] of bookFiles.entries()) {
      const bookFileName = bookFile.path;
      const normalizedProgress = (index + 1) / bookFiles.length;
      this.reportProgress(options, {
        stage: 'processing',
        progress: Math.round(
          bookImportProgressStart + normalizedProgress * bookImportProgressRange
        ),
        message: `Importing book ${bookFileName}...`,
        current_book: bookFileName,
        total_books: bookFiles.length,
        processed_books: index,
      });

      try {
        const bookUrl = this.contentService.buildBookUrl(baseUrl, bookFile);
        const book = (await this.contentService.fetchJsonFromLocation(bookUrl)) as ZBRSBook;

        await this.databaseService.getQueries().importBook(book, manifest.repository.id);
        importedCount++;
        this.reportProgress(options, {
          stage: 'processing',
          progress: Math.round(
            bookImportProgressStart + normalizedProgress * bookImportProgressRange
          ),
          message: `Imported ${importedCount}/${bookFiles.length} books`,
          current_book: bookFileName,
          total_books: bookFiles.length,
          processed_books: index + 1,
        });
      } catch (error) {
        console.error(`Failed to import book ${bookFileName}:`, error);
        // Optionally add a warning to the result
      }
    }
    return importedCount;
  }

  private reportProgress(options: ImportOptions, progress: ImportProgress): void {
    if (options.progress_callback) {
      options.progress_callback(progress);
    }
  }

  public getDiscoveryService(): RepositoryDiscoveryService {
    return this.discoveryService;
  }

  // New hierarchical import method for ZBRS v1.1 with translation selection
  public async importRepositoryHierarchical(
    repositoryUrl: string,
    selectedTranslations: string[]
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
    const result: ImportResult = {
      success: false,
      repository_id: '',
      translations_imported: [],
      translations_skipped: [],
      books_imported: 0,
      errors: [],
      warnings: [],
      duration_ms: 0,
    };
    const translationsImported = result.translations_imported ?? [];
    const translationsSkipped = result.translations_skipped ?? [];

    try {
      // Fetch the parent repository manifest
      const manifest = await this.discoveryService.fetchRepositoryManifest(normalizedRepositoryUrl);

      if (!isParentManifest(manifest)) {
        result.errors.push(
          createValidationError(
            'not-parent-repository',
            'URL does not point to a parent repository manifest'
          )
        );
        result.duration_ms = Date.now() - startTime;
        return result;
      }

      result.repository_id = manifest.repository.id;

      // Validate parent repository
      const validation = this.validator.validateParentManifest(manifest);
      if (!validation.valid) {
        result.errors.push(...validation.errors);
        result.duration_ms = Date.now() - startTime;
        return result;
      }
      result.warnings.push(...validation.warnings);

      // Create parent repository record
      await this.createOrUpdateRepositoryRecord({
        id: manifest.repository.id,
        name: manifest.repository.name,
        description: manifest.repository.description || null,
        type: 'parent',
        parent_id: null,
        language: null,
        version: manifest.repository.version,
        created_at: manifest.repository.created_at || new Date().toISOString(),
        updated_at: manifest.repository.updated_at || new Date().toISOString(),
        imported_at: new Date().toISOString(),
        metadata: JSON.stringify({
          publisher: manifest.publisher,
          technical: manifest.technical,
          extensions: manifest.extensions || {},
        }),
      });

      // Import selected translations
      const baseUrl = this.contentService.normalizeRepositoryBaseUrl(normalizedRepositoryUrl);
      let totalBooksImported = 0;

      for (const translation of manifest.translations) {
        if (selectedTranslations.includes(translation.id)) {
          try {
            const translationResult = await this.importTranslationFromParent(
              baseUrl,
              translation,
              manifest.repository.id,
              {
                repository_url: normalizedRepositoryUrl,
                validate_checksums: true,
                download_audio: false,
                overwrite_existing: false,
              }
            );

            if (translationResult.success) {
              translationsImported.push(translation.id);
              totalBooksImported += translationResult.books_imported;
            } else {
              translationsSkipped.push(translation.id);
              result.errors.push(...translationResult.errors);
            }
          } catch (error) {
            translationsSkipped.push(translation.id);
            result.errors.push(
              createValidationError(
                'translation-import-failed',
                `Failed to import translation ${translation.name}: ${toErrorMessage(error)}`
              )
            );
          }
        } else {
          translationsSkipped.push(translation.id);
        }
      }

      result.books_imported = totalBooksImported;
      result.success = translationsImported.length > 0;
      result.duration_ms = Date.now() - startTime;

      return result;
    } catch (error) {
      result.errors.push(
        createValidationError(
          'hierarchical-import-failed',
          `Hierarchical import failed: ${toErrorMessage(error)}`
        )
      );
      result.duration_ms = Date.now() - startTime;
      return result;
    }
  }
}
