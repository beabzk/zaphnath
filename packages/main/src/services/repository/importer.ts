import { DatabaseService } from "../database/index.js";
import { RepositoryDiscoveryService } from "./discovery.js";
import { ZBRSValidator } from "./validator.js";
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
} from "./types.js";
import { isParentManifest, isTranslationManifest } from "./types.js";

const createValidationError = (
  code: string,
  message: string,
  path?: string,
  details?: Record<string, unknown>
): ValidationError => ({
  code,
  message,
  path,
  severity: "error",
  details,
  name: "ValidationError",
});

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class RepositoryImporter {
  private databaseService: DatabaseService;
  private discoveryService: RepositoryDiscoveryService;
  private validator: ZBRSValidator;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.databaseService = DatabaseService.getInstance();
    this.discoveryService = new RepositoryDiscoveryService(securityPolicy);
    this.validator = new ZBRSValidator(securityPolicy);
  }

  public async importRepository(options: ImportOptions): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      repository_id: "",
      books_imported: 0,
      errors: [],
      warnings: [],
      duration_ms: 0,
    };

    try {
      this.reportProgress(options, {
        stage: "discovering",
        progress: 0,
        message: "Discovering repository...",
      });

      const manifest = await this.discoveryService.fetchRepositoryManifest(
        options.repository_url
      );
      result.repository_id = manifest.repository.id;

      if (isParentManifest(manifest)) {
        return await this.importParentRepository(manifest, options);
      } else if (isTranslationManifest(manifest)) {
        return await this.importTranslation(manifest, options);
      } else {
        result.errors.push(
          createValidationError(
            "unknown-manifest-type",
            "Unknown manifest type - cannot import"
          )
        );
        return result;
      }
    } catch (error) {
      result.errors.push(
        createValidationError(
          "import-failed",
          `Import failed: ${toErrorMessage(error)}`
        )
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

    try {
      this.reportProgress(options, {
        stage: "validating",
        progress: 10,
        message: "Validating parent repository...",
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
        type: "parent",
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

      for (const translation of manifest.translations) {
        const translationResult = await this.importTranslationFromParent(
          options.repository_url,
          translation,
          manifest.repository.id,
          options
        );
        if (translationResult.success) {
          result.translations_imported!.push(translation.id);
        } else {
          result.translations_skipped!.push(translation.id);
          result.errors.push(...translationResult.errors);
          result.warnings.push(...translationResult.warnings);
        }
      }
      result.success = result.errors.length === 0;
    } catch (error) {
      result.errors.push(
        createValidationError(
          "parent-import-failed",
          `Import failed: ${toErrorMessage(error)}`
        )
      );
    } finally {
      result.duration_ms = Date.now() - startTime;
    }
    return result;
  }

  private async validateAndPrepareTranslation(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions,
    parentId: string | null,
    directoryName: string | null
  ): Promise<[ValidationResult, RepositoryDbRecord | null]> {
    const validation = await this.validateRepositoryChecksums(
      manifest,
      options
    );
    if (!validation.valid) return [validation, null];

    const record: RepositoryDbRecord = {
      id: manifest.repository.id,
      name: manifest.repository.name,
      description: manifest.repository.description,
      version: manifest.repository.version,
      language: manifest.repository.language.code,
      type: "translation",
      parent_id: parentId,
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
    directoryName: string | null = null
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
        parentId,
        directoryName
      );

      result.warnings.push(...validation.warnings);
      if (!validation.valid || !record) {
        result.errors.push(...validation.errors);
        return result;
      }

      await this.createOrUpdateRepositoryRecord(record);

      const importedCount = await this.importBooks(manifest, options);
      result.books_imported = importedCount;

      this.reportProgress(options, {
        stage: "complete",
        progress: 100,
        message: `Import complete! ${importedCount} books imported.`,
      });

      result.success = true;
    } catch (error) {
      result.errors.push(
        createValidationError(
          "translation-import-failed",
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
      (baseUrl.endsWith("/") ? baseUrl : baseUrl + "/") + translation.directory;

    try {
      const manifest = await this.discoveryService.fetchRepositoryManifest(
        translationUrl
      );

      if (!isTranslationManifest(manifest)) {
        throw new Error(
          `Expected a translation manifest for ${translation.name}, but found a different type.`
        );
      }

      return this.importTranslation(
        manifest,
        { ...options, repository_url: translationUrl },
        parentId,
        translation.directory
      );
    } catch (error) {
      return {
        success: false,
        repository_id: translation.id,
        books_imported: 0,
        errors: [
          createValidationError(
            "fetch-translation-failed",
            `Failed to import translation ${translation.name}: ${toErrorMessage(
              error
            )}`
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
        stage: "validating",
        progress: 50,
        message: "Validating file checksums...",
      });

      const baseUrl = options.repository_url;
      const bookFiles = manifest.content?.books ?? [];

      for (const bookFile of bookFiles) {
        const bookUrl = `${baseUrl}/${bookFile.path}`;
        const expectedChecksum = bookFile.checksum;
        const integrityValidation = await this.validator.validateFileIntegrity(
          bookUrl,
          expectedChecksum
        );
        if (!integrityValidation.valid) {
          validation.valid = false;
          validation.errors.push(
            createValidationError(
              "checksum-mismatch",
              `Checksum mismatch for ${bookFile.path}`,
              bookFile.path,
              {
                expected: expectedChecksum,
                actual: integrityValidation.actual_checksum,
              }
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
    const baseUrl = options.repository_url;
    const bookFiles = manifest.content?.books ?? [];
    let importedCount = 0;

    if (!Array.isArray(bookFiles) || bookFiles.length === 0) {
      console.error(
        "No book files found or bookFiles is not an array in the manifest:",
        manifest
      );
      throw new Error(
        "Invalid manifest content: book files are missing or not in an array."
      );
    }

    for (const [index, bookFile] of bookFiles.entries()) {
      const bookFileName = bookFile.path;
      this.reportProgress(options, {
        stage: "downloading",
        progress: (index / bookFiles.length) * 100,
        message: `Importing book ${bookFileName}...`,
      });

      try {
        const bookUrl =
          (baseUrl.endsWith("/") ? baseUrl : baseUrl + "/") + bookFileName;
        const response = await fetch(bookUrl);
        if (!response.ok)
          throw new Error(`Failed to fetch book: ${response.statusText}`);
        const book = (await response.json()) as ZBRSBook;

        await this.databaseService
          .getQueries()
          .importBook(book, manifest.repository.id);
        importedCount++;
      } catch (error) {
        console.error(`Failed to import book ${bookFileName}:`, error);
        // Optionally add a warning to the result
      }
    }
    return importedCount;
  }

  private reportProgress(
    options: ImportOptions,
    progress: ImportProgress
  ): void {
    if (options.progress_callback) {
      options.progress_callback(progress);
    }
  }

  public getDiscoveryService(): RepositoryDiscoveryService {
    return this.discoveryService;
  }

  // New hierarchical import method for ZBRS v1.0 with translation selection
  public async importRepositoryHierarchical(
    repositoryUrl: string,
    selectedTranslations: string[]
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const result: ImportResult = {
      success: false,
      repository_id: "",
      translations_imported: [],
      translations_skipped: [],
      books_imported: 0,
      errors: [],
      warnings: [],
      duration_ms: 0,
    };

    try {
      // Fetch the parent repository manifest
      const manifest = await this.discoveryService.fetchRepositoryManifest(
        repositoryUrl
      );

      if (!isParentManifest(manifest)) {
        result.errors.push(
          createValidationError(
            "not-parent-repository",
            "URL does not point to a parent repository manifest"
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
        type: "parent",
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
      const baseUrl = repositoryUrl.replace("/manifest.json", "");
      let totalBooksImported = 0;

      for (const translation of manifest.translations) {
        if (selectedTranslations.includes(translation.id)) {
          try {
            const translationResult = await this.importTranslationFromParent(
              baseUrl,
              translation,
              manifest.repository.id,
              {
                repository_url: repositoryUrl,
                validate_checksums: true,
                download_audio: false,
                overwrite_existing: false,
              }
            );

            if (translationResult.success) {
              result.translations_imported!.push(translation.id);
              totalBooksImported += translationResult.books_imported;
            } else {
              result.translations_skipped!.push(translation.id);
              result.errors.push(...translationResult.errors);
            }
          } catch (error) {
            result.translations_skipped!.push(translation.id);
            result.errors.push(
              createValidationError(
                "translation-import-failed",
                `Failed to import translation ${
                  translation.name
                }: ${toErrorMessage(error)}`
              )
            );
          }
        } else {
          result.translations_skipped!.push(translation.id);
        }
      }

      result.books_imported = totalBooksImported;
      result.success = result.translations_imported!.length > 0;
      result.duration_ms = Date.now() - startTime;

      return result;
    } catch (error) {
      result.errors.push(
        createValidationError(
          "hierarchical-import-failed",
          `Hierarchical import failed: ${toErrorMessage(error)}`
        )
      );
      result.duration_ms = Date.now() - startTime;
      return result;
    }
  }
}
