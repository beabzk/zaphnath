import { createHash } from "crypto";

import { DatabaseService } from "../database/index.js";
import { RepositoryDiscoveryService } from "./discovery.js";
import { ZBRSValidator } from "./validator.js";
import type {
  ContentBookReference,
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

interface ResolvedBookFile extends ContentBookReference {
  download_url?: string;
}

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

      // Clean base URL for translations
      const baseUrl = options.repository_url.replace(/\/manifest\.json$/, "").replace(/\/$/, "");

      for (const translation of manifest.translations) {
        const translationResult = await this.importTranslationFromParent(
          baseUrl,
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
    parentId: string | null
  ): Promise<[ValidationResult, RepositoryDbRecord | null]> {
    const validation = await this.validateRepositoryChecksums(
      manifest,
      options
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
        type: "parent",
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
    translationStatus: "active" | "inactive" | "deprecated" = "active"
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
      const translationDirectory = directoryName ?? ".";

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
        translation.directory,
        translation.status
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

  private normalizeRepositoryBaseUrl(repositoryUrl: string): string {
    return repositoryUrl.replace(/\/manifest\.json$/, "").replace(/\/$/, "");
  }

  private buildBookUrl(baseUrl: string, bookFile: ResolvedBookFile): string {
    if (bookFile.download_url) {
      return bookFile.download_url;
    }

    if (bookFile.path.startsWith("http://") || bookFile.path.startsWith("https://")) {
      return bookFile.path;
    }

    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${bookFile.path.replace(/^\/+/, "")}`;
  }

  private async fetchJsonFromLocation(location: string): Promise<unknown> {
    if (!location.startsWith("http://") && !location.startsWith("https://")) {
      throw new Error("Only HTTP(S) book sources are supported");
    }

    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.statusText}`);
    }
    const rawContent = await response.text();
    return JSON.parse(rawContent.replace(/^\uFEFF/, ""));
  }

  private async calculateSha256(location: string): Promise<string> {
    if (!location.startsWith("http://") && !location.startsWith("https://")) {
      throw new Error("Only HTTP(S) checksum sources are supported");
    }

    const response = await fetch(location);
    if (!response.ok) {
      throw new Error(`Failed to fetch file for checksum: ${response.statusText}`);
    }

    const data = Buffer.from(await response.arrayBuffer());
    const hash = createHash("sha256");
    hash.update(data);
    return `sha256:${hash.digest("hex")}`;
  }

  private async resolveBookFiles(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions
  ): Promise<ResolvedBookFile[]> {
    const manifestBooks = manifest.content?.books;
    if (Array.isArray(manifestBooks) && manifestBooks.length > 0) {
      return manifestBooks;
    }

    const discoveredBooks = await this.discoverBookFiles(
      options.repository_url
    );
    if (discoveredBooks.length > 0) {
      return discoveredBooks;
    }

    return [];
  }

  private async discoverBookFiles(
    repositoryUrl: string
  ): Promise<ResolvedBookFile[]> {
    const normalizedUrl = this.normalizeRepositoryBaseUrl(repositoryUrl);

    if (normalizedUrl.startsWith("http://") || normalizedUrl.startsWith("https://")) {
      try {
        const parsedUrl = new URL(normalizedUrl);
        if (parsedUrl.hostname === "raw.githubusercontent.com") {
          return this.discoverGitHubRawBookFiles(parsedUrl);
        }
      } catch {
        return [];
      }
    }

    return [];
  }

  private async discoverGitHubRawBookFiles(
    repositoryUrl: URL
  ): Promise<ResolvedBookFile[]> {
    try {
      const pathSegments = repositoryUrl.pathname
        .split("/")
        .filter((segment) => segment.length > 0);
      if (pathSegments.length < 4) {
        return [];
      }

      const [owner, repo, ref, ...repositoryPath] = pathSegments;
      const booksPath = [...repositoryPath, "books"]
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repo)}/contents/${booksPath}?ref=${encodeURIComponent(
        ref
      )}`;

      const response = await fetch(apiUrl, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Zaphnath Bible Reader/1.0",
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to discover books via GitHub API (${response.status} ${response.statusText}) for ${repositoryUrl.toString()}`
        );
        return [];
      }

      const data = (await response.json()) as Array<{
        type?: string;
        name?: string;
        size?: number;
        download_url?: string;
      }>;

      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .filter(
          (entry) =>
            entry.type === "file" &&
            typeof entry.name === "string" &&
            entry.name.toLowerCase().endsWith(".json")
        )
        .sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", undefined, {
            numeric: true,
            sensitivity: "base",
          })
        )
        .map((entry) => ({
          path: `books/${entry.name as string}`,
          checksum: "",
          size_bytes: typeof entry.size === "number" ? entry.size : undefined,
          media_type: "application/json",
          download_url:
            typeof entry.download_url === "string"
              ? entry.download_url
              : undefined,
        }));
    } catch {
      return [];
    }
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

      const baseUrl = this.normalizeRepositoryBaseUrl(options.repository_url);
      const bookFiles = await this.resolveBookFiles(manifest, options);
      let checksumWarningEmitted = false;

      for (const bookFile of bookFiles) {
        const expectedChecksum = bookFile.checksum;
        if (!expectedChecksum || !expectedChecksum.startsWith("sha256:")) {
          if (!checksumWarningEmitted) {
            validation.warnings.push({
              code: "CHECKSUM_SKIPPED",
              message:
                "Skipping checksum validation for one or more books because checksum metadata is missing or not sha256",
              name: "ValidationWarning",
            });
            checksumWarningEmitted = true;
          }
          continue;
        }

        const bookUrl = this.buildBookUrl(baseUrl, bookFile);

        try {
          const actualChecksum = await this.calculateSha256(bookUrl);
          if (actualChecksum === expectedChecksum) {
            continue;
          }

          validation.valid = false;
          validation.errors.push(
            createValidationError(
              "checksum-mismatch",
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
              "checksum-validation-failed",
              `Failed to validate checksum for ${bookFile.path}: ${toErrorMessage(
                error
              )}`,
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
    const baseUrl = this.normalizeRepositoryBaseUrl(options.repository_url);
    const bookFiles = await this.resolveBookFiles(manifest, options);
    let importedCount = 0;

    if (!Array.isArray(bookFiles) || bookFiles.length === 0) {
      console.error(
        "No book files could be resolved for translation:",
        manifest.repository.id
      );
      throw new Error(
        "No book files could be resolved. Ensure the translation exposes a books directory (e.g., translation/books/*.json) or provides content.books references."
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
        const bookUrl = this.buildBookUrl(baseUrl, bookFile);
        const book = (await this.fetchJsonFromLocation(bookUrl)) as ZBRSBook;

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

  // New hierarchical import method for ZBRS v1.1 with translation selection
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
                `Failed to import translation ${translation.name
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
