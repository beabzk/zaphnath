import { RepositoryImportContentService } from './importContentService.js';
import { RepositoryImportPersistence } from './repositoryImportPersistence.js';
import { RepositoryParentImportPlanner } from './repositoryParentImportPlanner.js';
import { RepositoryTranslationImporter } from './repositoryTranslationImporter.js';
import type {
  ImportOptions,
  ImportProgress,
  ImportResult,
  ValidationError,
  ZBRSParentManifest,
} from './types.js';

type CreateValidationError = (
  code: string,
  message: string,
  path?: string,
  details?: Record<string, unknown>
) => ValidationError;

type ReportProgress = (options: ImportOptions, progress: ImportProgress) => void;

interface RepositoryParentImporterDependencies {
  contentService: RepositoryImportContentService;
  createValidationError: CreateValidationError;
  parentImportPlanner: RepositoryParentImportPlanner;
  persistence: RepositoryImportPersistence;
  reportProgress: ReportProgress;
  toErrorMessage: (error: unknown) => string;
  translationImporter: RepositoryTranslationImporter;
}

export class RepositoryParentImporter {
  constructor(private dependencies: RepositoryParentImporterDependencies) {}

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

      const parentImportPlan = this.dependencies.parentImportPlanner.planParentImport(
        manifest,
        options.selected_translations
      );

      result.warnings.push(...parentImportPlan.validation.warnings);
      if (!parentImportPlan.validation.valid) {
        result.errors.push(...parentImportPlan.validation.errors);
        return result;
      }

      this.dependencies.persistence.upsertParentRepository(manifest);

      const baseUrl = this.dependencies.contentService.normalizeRepositoryBaseUrl(
        options.repository_url
      );
      translationsSkipped.push(...parentImportPlan.skippedTranslationIds);

      if (parentImportPlan.translationTasks.length === 0) {
        result.errors.push(
          this.dependencies.createValidationError(
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

        const translationResult =
          await this.dependencies.translationImporter.importTranslationFromParent(
            baseUrl,
            task.translation,
            manifest.repository.id,
            {
              ...options,
              progress_callback: (translationProgress) => {
                this.reportProgress(
                  options,
                  this.dependencies.parentImportPlanner.mapChildProgress(task, translationProgress)
                );
              },
            }
          );
        result.books_imported += translationResult.books_imported;

        if (translationResult.success) {
          translationsImported.push(task.translation.id);
          continue;
        }

        translationsSkipped.push(task.translation.id);
        result.errors.push(...translationResult.errors);
        result.warnings.push(...translationResult.warnings);
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
        message: `Parent import failed: ${this.dependencies.toErrorMessage(error)}`,
      });
      result.errors.push(
        this.dependencies.createValidationError(
          'parent-import-failed',
          `Import failed: ${this.dependencies.toErrorMessage(error)}`
        )
      );
    } finally {
      result.duration_ms = Date.now() - startTime;
    }

    return result;
  }

  private reportProgress(options: ImportOptions, progress: ImportProgress): void {
    this.dependencies.reportProgress(options, progress);
  }
}
