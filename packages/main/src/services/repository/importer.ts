import { join } from "path";
import { app } from "electron";
import { DatabaseService } from "../database/index.js";
import { RepositoryDiscoveryService } from "./discovery.js";
import { ZBRSValidator } from "./validator.js";
import type {
  ZBRSParentManifest,
  ZBRSTranslationManifest,
  TranslationReference,
  ZBRSBook,
  ImportOptions,
  ImportResult,
  ImportProgress,
  ValidationResult,
  SecurityPolicy,
} from "./types.js";
import { isParentManifest, isTranslationManifest } from "./types.js";

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
      // Stage 1: Discovery and validation
      this.reportProgress(options, {
        stage: "discovering",
        progress: 0,
        message: "Discovering repository...",
      });

      const manifest = await this.discoveryService.fetchRepositoryManifest(
        options.repository_url
      );
      result.repository_id = manifest.repository.id;

      // Route to appropriate import method based on manifest type
      if (isParentManifest(manifest)) {
        return await this.importParentRepository(manifest, options);
      } else if (isTranslationManifest(manifest)) {
        return await this.importTranslation(manifest, options);
      } else {
        result.errors.push("Unknown manifest type - cannot import");
        return result;
      }
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
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
      translations_imported: 0,
    };

    try {
      // Stage 2: Validation
      this.reportProgress(options, {
        stage: "validating",
        progress: 10,
        message: "Validating parent repository structure...",
      });

      const validation = this.validator.validateParentManifest(manifest);
      if (!validation.valid) {
        result.errors = validation.errors.map((e) => e.message);
        return result;
      }

      result.warnings = validation.warnings.map((w) => w.message);

      // Stage 3: Check if parent repository already exists
      const existingRepo = this.databaseService
        .getQueries()
        .getRepository(manifest.repository.id);
      if (existingRepo && !options.overwrite_existing) {
        result.errors.push(
          `Parent repository ${manifest.repository.id} already exists. Use overwrite option to replace.`
        );
        return result;
      }

      // Stage 4: Create parent repository record
      this.reportProgress(options, {
        stage: "processing",
        progress: 20,
        message: "Creating parent repository...",
      });

      await this.createParentRepositoryRecord(manifest);

      // Stage 5: Import translations
      const translationsToImport = options.selected_translations
        ? manifest.translations.filter((t) =>
            options.selected_translations!.includes(t.id)
          )
        : manifest.translations;

      let totalBooksImported = 0;
      let translationsImported = 0;

      for (let i = 0; i < translationsToImport.length; i++) {
        const translation = translationsToImport[i];
        const progress = 30 + (i / translationsToImport.length) * 60;

        this.reportProgress(options, {
          stage: "downloading",
          progress,
          message: `Importing translation: ${translation.name}...`,
        });

        try {
          // Create clean options without progress callback to avoid cloning issues
          const cleanOptions = {
            repository_url: options.repository_url,
            validate_checksums: options.validate_checksums,
            overwrite_existing: options.overwrite_existing,
            import_type: options.import_type,
            selected_translations: options.selected_translations,
          };

          const translationResult = await this.importTranslationFromParent(
            options.repository_url,
            translation,
            manifest.repository.id,
            cleanOptions
          );

          if (translationResult.success) {
            totalBooksImported += translationResult.books_imported;
            translationsImported++;
          } else {
            result.warnings.push(
              `Failed to import translation ${
                translation.name
              }: ${translationResult.errors.join(", ")}`
            );
          }
        } catch (error) {
          result.warnings.push(
            `Failed to import translation ${translation.name}: ${error}`
          );
        }
      }

      result.books_imported = totalBooksImported;
      result.translations_imported = translationsImported;

      // Stage 6: Complete
      this.reportProgress(options, {
        stage: "complete",
        progress: 100,
        message: `Import completed! ${translationsImported} translations, ${totalBooksImported} books imported.`,
      });

      result.success = true;
    } catch (error) {
      this.reportProgress(options, {
        stage: "error",
        progress: 0,
        message: `Import failed: ${error}`,
      });

      result.errors.push(`Import failed: ${error}`);
    } finally {
      result.duration_ms = Date.now() - startTime;
    }

    return result;
  }

  private async validateRepository(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions
  ): Promise<ValidationResult> {
    // Validate manifest
    const manifestValidation = this.validator.validateManifest(manifest);
    if (!manifestValidation.valid) {
      return manifestValidation;
    }

    // Additional validation for import
    const errors = [...manifestValidation.errors];
    const warnings = [...manifestValidation.warnings];

    // Check repository size limits
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (manifest.technical.size_bytes > maxSize) {
      errors.push({
        code: "REPOSITORY_TOO_LARGE",
        message: `Repository size (${manifest.technical.size_bytes} bytes) exceeds limit (${maxSize} bytes)`,
        severity: "error",
        name: "ValidationError",
      });
    }

    // Validate book count
    if (
      manifest.content.books_count < 1 ||
      manifest.content.books_count > 100
    ) {
      errors.push({
        code: "INVALID_BOOK_COUNT",
        message: `Invalid book count: ${manifest.content.books_count}`,
        severity: "error",
        name: "ValidationError",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async importBooks(
    manifest: ZBRSTranslationManifest,
    options: ImportOptions
  ): Promise<number> {
    let importedCount = 0;
    const baseUrl = options.repository_url.endsWith("/")
      ? options.repository_url
      : `${options.repository_url}/`;

    // Get list of actual book files instead of using hardcoded names
    const bookFiles = await this.getBookFiles(baseUrl);

    // Import books in order
    for (
      let i = 0;
      i < Math.min(bookFiles.length, manifest.content.books_count);
      i++
    ) {
      const bookOrder = i + 1;
      try {
        this.reportProgress(options, {
          stage: "downloading",
          progress: 20 + (bookOrder / manifest.content.books_count) * 60,
          message: `Importing book ${bookOrder} of ${manifest.content.books_count}...`,
          total_books: manifest.content.books_count,
          processed_books: bookOrder - 1,
        });

        // Download book file using actual filename
        const bookFileName = bookFiles[i];
        const bookUrl = `${baseUrl}books/${bookFileName}`;

        const bookData = await this.discoveryService.downloadFile(bookUrl);
        const bookJson = JSON.parse(bookData.toString("utf-8")) as ZBRSBook;

        // Validate book
        const bookValidation = this.validator.validateBook(bookJson, bookOrder);
        if (!bookValidation.valid) {
          console.error(
            `Book ${bookOrder} validation failed:`,
            bookValidation.errors
          );
          continue; // Skip invalid books but continue import
        }

        // Import book into database
        await this.importBookToDatabase(bookJson, manifest.repository.id);
        importedCount++;
      } catch (error) {
        console.error(`Failed to import book ${bookOrder}:`, error);
        // Continue with next book
      }
    }

    return importedCount;
  }

  private generateBookFileName(order: number): string {
    // Standard ZBRS naming convention: {order:02d}-{name}.json
    const bookNames = [
      "genesis",
      "exodus",
      "leviticus",
      "numbers",
      "deuteronomy",
      "joshua",
      "judges",
      "ruth",
      "1-samuel",
      "2-samuel",
      "1-kings",
      "2-kings",
      "1-chronicles",
      "2-chronicles",
      "ezra",
      "nehemiah",
      "esther",
      "job",
      "psalms",
      "proverbs",
      "ecclesiastes",
      "song-of-solomon",
      "isaiah",
      "jeremiah",
      "lamentations",
      "ezekiel",
      "daniel",
      "hosea",
      "joel",
      "amos",
      "obadiah",
      "jonah",
      "micah",
      "nahum",
      "habakkuk",
      "zephaniah",
      "haggai",
      "zechariah",
      "malachi",
      "matthew",
      "mark",
      "luke",
      "john",
      "acts",
      "romans",
      "1-corinthians",
      "2-corinthians",
      "galatians",
      "ephesians",
      "philippians",
      "colossians",
      "1-thessalonians",
      "2-thessalonians",
      "1-timothy",
      "2-timothy",
      "titus",
      "philemon",
      "hebrews",
      "james",
      "1-peter",
      "2-peter",
      "1-john",
      "2-john",
      "3-john",
      "jude",
      "revelation",
    ];

    if (order < 1 || order > bookNames.length) {
      throw new Error(`Invalid book order: ${order}`);
    }

    return `${order.toString().padStart(2, "0")}-${bookNames[order - 1]}.json`;
  }

  private async getBookFiles(baseUrl: string): Promise<string[]> {
    try {
      // For local file paths, read directory directly
      if (baseUrl.startsWith("file://")) {
        const { fileURLToPath } = await import("url");
        const { readdir } = await import("fs/promises");
        const { join } = await import("path");

        const localPath = fileURLToPath(baseUrl);
        const booksPath = join(localPath, "books");

        const files = await readdir(booksPath);

        // Filter for JSON files and sort them
        const bookFiles = files.filter((file) => file.endsWith(".json")).sort(); // This will sort 01-genesis.json, 02-psalms.json, 03-john.json correctly

        return bookFiles;
      } else {
        // For HTTP URLs, fall back to the hardcoded approach for now
        // In a real implementation, you might want to fetch a directory listing
        const bookCount = 66; // Standard Bible book count
        const bookFiles: string[] = [];

        for (let i = 1; i <= bookCount; i++) {
          try {
            const fileName = this.generateBookFileName(i);
            // Try to check if file exists (this is a simplified approach)
            bookFiles.push(fileName);
          } catch {
            break;
          }
        }

        return bookFiles;
      }
    } catch (error) {
      console.error("Failed to get book files:", error);
      return [];
    }
  }

  private async importBookToDatabase(
    book: ZBRSBook,
    repositoryId: string
  ): Promise<void> {
    const queries = this.databaseService.getQueries();

    // Create book record
    const bookId = queries.createBook({
      repository_id: repositoryId,
      name: book.book.name,
      abbreviation: book.book.abbreviation,
      testament: book.book.testament === "old" ? "OT" : "NT",
      order: book.book.order,
      chapter_count: book.book.chapters_count,
    });

    // Import verses
    for (const chapter of book.chapters) {
      for (const verse of chapter.verses) {
        queries.createVerse({
          repository_id: repositoryId,
          book_id: bookId,
          chapter: chapter.number,
          verse: verse.number,
          text: verse.text,
        });
      }
    }
  }

  private async createRepositoryRecord(
    manifest: ZBRSTranslationManifest
  ): Promise<void> {
    const queries = this.databaseService.getQueries();

    // Delete existing repository if it exists
    try {
      queries.deleteRepository(manifest.repository.id);
    } catch (error) {
      // Repository doesn't exist, which is fine
    }

    // Create new repository record
    queries.createRepository({
      id: manifest.repository.id,
      name: manifest.repository.name,
      description: manifest.repository.description,
      language: manifest.repository.language.code,
      version: manifest.repository.version,
    });
  }

  private reportProgress(
    options: any, // Use any to handle both ImportOptions and clean options
    progress: ImportProgress
  ): void {
    if (options.progress_callback) {
      options.progress_callback(progress);
    }
  }

  public async listAvailableRepositories(): Promise<any[]> {
    try {
      return await this.discoveryService.discoverRepositories();
    } catch (error) {
      console.error("Failed to discover repositories:", error);
      return [];
    }
  }

  public async validateRepositoryUrl(url: string): Promise<ValidationResult> {
    return this.discoveryService.validateRepository(url);
  }

  public getDiscoveryService(): RepositoryDiscoveryService {
    return this.discoveryService;
  }

  // New methods for hierarchical repository support

  public async importTranslation(
    manifest: ZBRSTranslationManifest,
    options: any, // Use any to avoid cloning issues with ImportOptions
    parentId?: string
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
      // Stage 2: Validation
      this.reportProgress(options, {
        stage: "validating",
        progress: 10,
        message: "Validating translation structure...",
      });

      const validation = this.validator.validateTranslationManifest(manifest);
      if (!validation.valid) {
        result.errors = validation.errors.map((e) => e.message);
        return result;
      }

      result.warnings = validation.warnings.map((w) => w.message);

      // Stage 3: Check if translation already exists
      const existingRepo = this.databaseService
        .getQueries()
        .getRepository(manifest.repository.id);
      if (existingRepo && !options.overwrite_existing) {
        result.errors.push(
          `Translation ${manifest.repository.id} already exists. Use overwrite option to replace.`
        );
        return result;
      }

      // Stage 4: Create translation repository record first
      this.reportProgress(options, {
        stage: "processing",
        progress: 20,
        message: "Creating translation repository...",
      });

      await this.createTranslationRepositoryRecord(manifest, parentId);

      // Stage 5: Download and import books
      this.reportProgress(options, {
        stage: "downloading",
        progress: 30,
        message: "Downloading Bible books...",
        total_books: manifest.content.books_count,
        processed_books: 0,
      });

      const importedBooks = await this.importBooks(manifest, options);
      result.books_imported = importedBooks;

      // Stage 6: Complete
      this.reportProgress(options, {
        stage: "complete",
        progress: 100,
        message: "Translation import completed successfully!",
      });

      result.success = true;
    } catch (error) {
      this.reportProgress(options, {
        stage: "error",
        progress: 0,
        message: `Translation import failed: ${error}`,
      });

      result.errors.push(`Translation import failed: ${error}`);
    } finally {
      result.duration_ms = Date.now() - startTime;
    }

    return result;
  }

  public async importTranslationFromParent(
    parentRepositoryUrl: string,
    translationRef: TranslationReference,
    parentId: string,
    options: any // Use any to avoid cloning issues with ImportOptions
  ): Promise<ImportResult> {
    try {
      // Fetch the translation manifest
      const translationManifest =
        await this.discoveryService.fetchTranslationManifest(
          parentRepositoryUrl,
          translationRef.directory
        );

      // Import the translation with clean options
      const cleanImportOptions = {
        repository_url: `${parentRepositoryUrl}/${translationRef.directory}`,
        validate_checksums: options.validate_checksums || true,
        overwrite_existing: options.overwrite_existing || false,
        import_type: "translation" as const,
        // Don't pass progress_callback to avoid cloning issues
      };

      const result = await this.importTranslation(
        translationManifest,
        cleanImportOptions,
        parentId
      );

      // Create the parent-translation relationship
      if (result.success) {
        const queries = this.databaseService.getQueries();
        queries.createRepositoryTranslation({
          id: `${parentId}-${translationRef.id}`,
          parent_repository_id: parentId,
          translation_id: translationRef.id,
          directory_name: translationRef.directory,
          language_code: translationRef.language.code,
          status: translationRef.status,
        });
      }

      return result;
    } catch (error) {
      return {
        success: false,
        repository_id: translationRef.id,
        books_imported: 0,
        errors: [
          `Failed to import translation ${translationRef.name}: ${error}`,
        ],
        warnings: [],
        duration_ms: 0,
      };
    }
  }

  private async createParentRepositoryRecord(
    manifest: ZBRSParentManifest
  ): Promise<void> {
    const queries = this.databaseService.getQueries();

    // Delete existing repository if it exists
    try {
      queries.deleteRepository(manifest.repository.id);
    } catch (error) {
      // Repository doesn't exist, which is fine
    }

    // Create new parent repository record
    queries.createParentRepository({
      id: manifest.repository.id,
      name: manifest.repository.name,
      description: manifest.repository.description,
      version: manifest.repository.version,
    });
  }

  private async createTranslationRepositoryRecord(
    manifest: ZBRSTranslationManifest,
    parentId?: string
  ): Promise<void> {
    const queries = this.databaseService.getQueries();

    // Delete existing repository if it exists
    try {
      queries.deleteRepository(manifest.repository.id);
    } catch (error) {
      // Repository doesn't exist, which is fine
    }

    // Create new translation repository record
    queries.createTranslationRepository({
      id: manifest.repository.id,
      name: manifest.repository.name,
      description: manifest.repository.description,
      language: manifest.repository.language.code,
      version: manifest.repository.version,
      parent_id: parentId,
    });
  }
}
