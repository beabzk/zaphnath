import { DatabaseService } from '../database/index.js';
import { RepositoryDiscoveryService } from './discovery.js';
import { RepositoryBookImporter } from './repositoryBookImporter.js';
import { RepositoryChecksumValidator } from './repositoryChecksumValidator.js';
import { RepositoryImportContentService } from './importContentService.js';
import { RepositoryImportPersistence } from './repositoryImportPersistence.js';
import { RepositoryParentImporter } from './repositoryParentImporter.js';
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
  private parentImporter: RepositoryParentImporter;
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
    const persistence = new RepositoryImportPersistence(databaseService);
    const parentImportPlanner = new RepositoryParentImportPlanner(this.validator);
    this.translationImporter = new RepositoryTranslationImporter({
      bookImporter,
      checksumValidator,
      createValidationError,
      discoveryService: this.discoveryService,
      persistence,
      reportProgress: (options, progress) => this.reportProgress(options, progress),
      toErrorMessage,
    });
    this.parentImporter = new RepositoryParentImporter({
      contentService: this.contentService,
      createValidationError,
      parentImportPlanner,
      persistence,
      reportProgress: (options, progress) => this.reportProgress(options, progress),
      toErrorMessage,
      translationImporter: this.translationImporter,
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
    return this.parentImporter.importParentRepository(manifest, options);
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
