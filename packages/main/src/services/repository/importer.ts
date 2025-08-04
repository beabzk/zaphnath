import { join } from "path";
import { app } from "electron";
import { DatabaseService } from "../database/index.js";
import { RepositoryDiscoveryService } from "./discovery.js";
import { ZBRSValidator } from "./validator.js";
import type {
  ZBRSManifest,
  ZBRSBook,
  ImportOptions,
  ImportResult,
  ImportProgress,
  ValidationResult,
  SecurityPolicy,
} from "./types.js";

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

      // Stage 2: Validation
      this.reportProgress(options, {
        stage: "validating",
        progress: 10,
        message: "Validating repository structure...",
      });

      const validation = await this.validateRepository(manifest, options);
      if (!validation.valid) {
        result.errors = validation.errors.map((e) => e.message);
        return result;
      }

      result.warnings = validation.warnings.map((w) => w.message);

      // Stage 3: Check if repository already exists
      const existingRepo = this.databaseService
        .getQueries()
        .getRepository(manifest.repository.id);
      if (existingRepo && !options.overwrite_existing) {
        result.errors.push(
          `Repository ${manifest.repository.id} already exists. Use overwrite option to replace.`
        );
        return result;
      }

      // Stage 4: Download and import books
      this.reportProgress(options, {
        stage: "downloading",
        progress: 20,
        message: "Downloading Bible books...",
        total_books: manifest.content.books_count,
        processed_books: 0,
      });

      const importedBooks = await this.importBooks(manifest, options);
      result.books_imported = importedBooks;

      // Stage 5: Create repository record
      this.reportProgress(options, {
        stage: "processing",
        progress: 90,
        message: "Finalizing import...",
      });

      await this.createRepositoryRecord(manifest);

      // Stage 6: Complete
      this.reportProgress(options, {
        stage: "complete",
        progress: 100,
        message: "Import completed successfully!",
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
    manifest: ZBRSManifest,
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
    manifest: ZBRSManifest,
    options: ImportOptions
  ): Promise<number> {
    let importedCount = 0;
    const baseUrl = options.repository_url.endsWith("/")
      ? options.repository_url
      : `${options.repository_url}/`;

    // Import books in order
    for (
      let bookOrder = 1;
      bookOrder <= manifest.content.books_count;
      bookOrder++
    ) {
      try {
        this.reportProgress(options, {
          stage: "downloading",
          progress: 20 + (bookOrder / manifest.content.books_count) * 60,
          message: `Importing book ${bookOrder} of ${manifest.content.books_count}...`,
          total_books: manifest.content.books_count,
          processed_books: bookOrder - 1,
        });

        // Download book file
        const bookFileName = this.generateBookFileName(bookOrder);
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

  private async createRepositoryRecord(manifest: ZBRSManifest): Promise<void> {
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
    options: ImportOptions,
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
}
