import { DatabaseService } from '../database/index.js';
import { RepositoryDiscoveryService } from './discovery.js';
import { RepositoryBookImporter } from './repositoryBookImporter.js';
import { RepositoryChecksumValidator } from './repositoryChecksumValidator.js';
import { RepositoryImportContentService } from './importContentService.js';
import { RepositoryImportPersistence } from './repositoryImportPersistence.js';
import { RepositoryParentImportPlanner } from './repositoryParentImportPlanner.js';
import { RepositoryTranslationImporter } from './repositoryTranslationImporter.js';
import { ZBRSValidator } from './validator.js';
import { normalizeRepositoryUrl } from './pathUtils.js';
import type {
  ZBRSParentManifest,
  ImportOptions,
  ImportResult,
  ImportProgress,
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
  private discoveryService: RepositoryDiscoveryService;
  private validator: ZBRSValidator;
  private contentService: RepositoryImportContentService;
  private persistence: RepositoryImportPersistence;
  private parentImportPlanner: RepositoryParentImportPlanner;
  private translationImporter: RepositoryTranslationImporter;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    const databaseService = DatabaseService.getInstance();
    this.discoveryService = new RepositoryDiscoveryService(securityPolicy);
    this.validator = new ZBRSValidator(securityPolicy);
    this.contentService = new RepositoryImportContentService();
    const bookImporter = new RepositoryBookImporter(databaseService, this.contentService);
    const checksumValidator = new RepositoryChecksumValidator(
      this.validator,
      this.contentService,
      createValidationError,
      toErrorMessage
    );
    this.persistence = new RepositoryImportPersistence(databaseService);
    this.parentImportPlanner = new RepositoryParentImportPlanner(this.validator);
    this.translationImporter = new RepositoryTranslationImporter({
      bookImporter,
      checksumValidator,
      createValidationError,
      discoveryService: this.discoveryService,
      persistence: this.persistence,
      reportProgress: (options, progress) => this.reportProgress(options, progress),
      toErrorMessage,
    });
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
        return await this.translationImporter.importTranslation(manifest, normalizedOptions);
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

  private async importTranslationFromParent(
    baseUrl: string,
    translation: ZBRSParentManifest['translations'][number],
    parentId: string,
    options: ImportOptions
  ): Promise<ImportResult> {
    return this.translationImporter.importTranslationFromParent(
      baseUrl,
      translation,
      parentId,
      options
    );
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
