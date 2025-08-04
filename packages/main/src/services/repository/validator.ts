// import Ajv from 'ajv';
// import addFormats from "ajv-formats";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { join } from "path";
import type {
  ZBRSManifest,
  ZBRSBook,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SecurityPolicy,
  IntegrityCheck,
} from "./types.js";

export class ZBRSValidator {
  // private ajv: Ajv;
  private manifestSchema: any;
  private bookSchema: any;
  private securityPolicy: SecurityPolicy;
  private ajv: any; // Placeholder for now

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    // this.ajv = new Ajv({ allErrors: true, verbose: true });
    // addFormats(this.ajv);
    this.ajv = null; // Placeholder for now

    this.securityPolicy = {
      allow_http: false,
      max_repository_size: 1024 * 1024 * 1024, // 1GB
      max_file_size: 100 * 1024 * 1024, // 100MB
      allowed_domains: [],
      blocked_domains: [],
      require_checksums: true,
      ...securityPolicy,
    };

    this.loadSchemas();
  }

  private loadSchemas(): void {
    try {
      // In production, these would be loaded from the schemas directory
      this.manifestSchema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["zbrs_version", "repository", "content", "technical"],
        properties: {
          zbrs_version: { type: "string", pattern: "^1\\.[0-9]+$" },
          repository: {
            type: "object",
            required: [
              "id",
              "name",
              "description",
              "version",
              "language",
              "translation",
              "publisher",
            ],
            properties: {
              id: {
                type: "string",
                pattern: "^[a-z0-9-]+$",
                minLength: 3,
                maxLength: 50,
              },
              name: { type: "string", minLength: 1, maxLength: 200 },
              description: { type: "string", minLength: 1, maxLength: 1000 },
              version: {
                type: "string",
                pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+$",
              },
            },
          },
          content: {
            type: "object",
            required: ["books_count", "testament", "features"],
            properties: {
              books_count: { type: "integer", minimum: 1, maximum: 100 },
            },
          },
          technical: {
            type: "object",
            required: ["encoding", "compression", "checksum", "size_bytes"],
            properties: {
              encoding: { type: "string", enum: ["UTF-8"] },
              checksum: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
              size_bytes: { type: "integer", minimum: 1, maximum: 1073741824 },
            },
          },
        },
      };

      this.bookSchema = {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["book", "chapters"],
        properties: {
          book: {
            type: "object",
            required: [
              "id",
              "name",
              "abbreviation",
              "order",
              "testament",
              "chapters_count",
              "verses_count",
            ],
            properties: {
              id: {
                type: "string",
                pattern: "^[a-z0-9-]+$",
                minLength: 2,
                maxLength: 20,
              },
              name: { type: "string", minLength: 1, maxLength: 100 },
              order: { type: "integer", minimum: 1, maximum: 100 },
              testament: { type: "string", enum: ["old", "new"] },
            },
          },
          chapters: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["number", "verses"],
              properties: {
                number: { type: "integer", minimum: 1 },
                verses: {
                  type: "array",
                  minItems: 1,
                  items: {
                    type: "object",
                    required: ["number", "text"],
                    properties: {
                      number: { type: "integer", minimum: 1 },
                      text: { type: "string", minLength: 1, maxLength: 5000 },
                    },
                  },
                },
              },
            },
          },
        },
      };
    } catch (error) {
      throw new Error(`Failed to load validation schemas: ${error}`);
    }
  }

  public validateManifest(manifest: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // JSON Schema validation (disabled for now)
      if (this.ajv) {
        const validate = this.ajv.compile(this.manifestSchema);
        const valid = validate(manifest);

        if (!valid && validate.errors) {
          for (const error of validate.errors) {
            errors.push({
              code: "SCHEMA_VALIDATION",
              message: `${error.instancePath}: ${error.message}`,
              path: error.instancePath,
              severity: "error",
              name: "ValidationError",
            });
          }
        }
      }

      // Business logic validation
      this.validateManifestBusinessRules(manifest, errors, warnings);

      // Security validation
      this.validateManifestSecurity(manifest, errors, warnings);
    } catch (error) {
      errors.push({
        code: "VALIDATION_EXCEPTION",
        message: `Validation failed: ${error}`,
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

  public validateBook(book: any, expectedOrder?: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // JSON Schema validation (disabled for now)
      if (this.ajv) {
        const validate = this.ajv.compile(this.bookSchema);
        const valid = validate(book);

        if (!valid && validate.errors) {
          for (const error of validate.errors) {
            errors.push({
              code: "SCHEMA_VALIDATION",
              message: `${error.instancePath}: ${error.message}`,
              path: error.instancePath,
              severity: "error",
              name: "ValidationError",
            });
          }
        }
      }

      // Business logic validation
      this.validateBookBusinessRules(book, errors, warnings, expectedOrder);
    } catch (error) {
      errors.push({
        code: "VALIDATION_EXCEPTION",
        message: `Book validation failed: ${error}`,
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

  private validateManifestBusinessRules(
    manifest: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check ZBRS version compatibility
    if (manifest.zbrs_version && !manifest.zbrs_version.startsWith("1.")) {
      errors.push({
        code: "UNSUPPORTED_VERSION",
        message: `Unsupported ZBRS version: ${manifest.zbrs_version}`,
        path: "/zbrs_version",
        severity: "error",
        name: "ValidationError",
      });
    }

    // Validate testament book counts
    if (manifest.content) {
      const { old, new: newTestament } = manifest.content.testament || {};
      const total = (old || 0) + (newTestament || 0);

      if (total !== manifest.content.books_count) {
        errors.push({
          code: "BOOK_COUNT_MISMATCH",
          message: `Testament book counts (${old} + ${newTestament} = ${total}) don't match total (${manifest.content.books_count})`,
          path: "/content/testament",
          severity: "error",
          name: "ValidationError",
        });
      }

      // Standard Protestant canon check
      if (
        manifest.content.books_count === 66 &&
        (old !== 39 || newTestament !== 27)
      ) {
        warnings.push({
          code: "NON_STANDARD_CANON",
          message:
            "Book counts differ from standard Protestant canon (39 OT + 27 NT)",
          path: "/content/testament",
        });
      }
    }

    // Validate repository size
    if (
      manifest.technical?.size_bytes > this.securityPolicy.max_repository_size
    ) {
      errors.push({
        code: "REPOSITORY_TOO_LARGE",
        message: `Repository size (${manifest.technical.size_bytes}) exceeds maximum (${this.securityPolicy.max_repository_size})`,
        path: "/technical/size_bytes",
        severity: "error",
        name: "ValidationError",
      });
    }
  }

  private validateManifestSecurity(
    manifest: any,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check for required checksums
    if (
      this.securityPolicy.require_checksums &&
      !manifest.technical?.checksum
    ) {
      errors.push({
        code: "MISSING_CHECKSUM",
        message: "Repository checksum is required by security policy",
        path: "/technical/checksum",
        severity: "error",
        name: "ValidationError",
      });
    }

    // Validate publisher information
    if (manifest.repository?.publisher?.url) {
      const url = new URL(manifest.repository.publisher.url);

      if (!this.securityPolicy.allow_http && url.protocol === "http:") {
        warnings.push({
          code: "INSECURE_URL",
          message: "Publisher URL uses insecure HTTP protocol",
          path: "/repository/publisher/url",
        });
      }

      if (this.securityPolicy.blocked_domains.includes(url.hostname)) {
        errors.push({
          code: "BLOCKED_DOMAIN",
          message: `Publisher domain ${url.hostname} is blocked`,
          path: "/repository/publisher/url",
          severity: "error",
          name: "ValidationError",
        });
      }
    }
  }

  private validateBookBusinessRules(
    book: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    expectedOrder?: number
  ): void {
    if (!book.book || !book.chapters) return;

    // Validate book order
    if (expectedOrder && book.book.order !== expectedOrder) {
      errors.push({
        code: "INCORRECT_BOOK_ORDER",
        message: `Book order ${book.book.order} doesn't match expected ${expectedOrder}`,
        path: "/book/order",
        severity: "error",
        name: "ValidationError",
      });
    }

    // Validate chapter count
    if (book.chapters.length !== book.book.chapters_count) {
      errors.push({
        code: "CHAPTER_COUNT_MISMATCH",
        message: `Actual chapters (${book.chapters.length}) don't match declared count (${book.book.chapters_count})`,
        path: "/book/chapters_count",
        severity: "error",
        name: "ValidationError",
      });
    }

    // Validate verse count
    let totalVerses = 0;
    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];

      // Check chapter numbering
      if (chapter.number !== i + 1) {
        errors.push({
          code: "INCORRECT_CHAPTER_NUMBER",
          message: `Chapter ${i + 1} has incorrect number ${chapter.number}`,
          path: `/chapters/${i}/number`,
          severity: "error",
          name: "ValidationError",
        });
      }

      // Check verse numbering and count
      if (chapter.verses) {
        for (let j = 0; j < chapter.verses.length; j++) {
          const verse = chapter.verses[j];

          if (verse.number !== j + 1) {
            errors.push({
              code: "INCORRECT_VERSE_NUMBER",
              message: `Chapter ${chapter.number}, verse ${
                j + 1
              } has incorrect number ${verse.number}`,
              path: `/chapters/${i}/verses/${j}/number`,
              severity: "error",
              name: "ValidationError",
            });
          }

          // Check for empty verse text
          if (!verse.text || verse.text.trim().length === 0) {
            errors.push({
              code: "EMPTY_VERSE_TEXT",
              message: `Chapter ${chapter.number}, verse ${verse.number} has empty text`,
              path: `/chapters/${i}/verses/${j}/text`,
              severity: "error",
              name: "ValidationError",
            });
          }

          totalVerses++;
        }
      }
    }

    if (totalVerses !== book.book.verses_count) {
      errors.push({
        code: "VERSE_COUNT_MISMATCH",
        message: `Actual verses (${totalVerses}) don't match declared count (${book.book.verses_count})`,
        path: "/book/verses_count",
        severity: "error",
        name: "ValidationError",
      });
    }
  }

  public validateFileIntegrity(
    filePath: string,
    expectedChecksum: string
  ): IntegrityCheck {
    try {
      const content = readFileSync(filePath);
      const hash = createHash("sha256");
      hash.update(content);
      const actualChecksum = `sha256:${hash.digest("hex")}`;

      return {
        file_path: filePath,
        expected_checksum: expectedChecksum,
        actual_checksum: actualChecksum,
        valid: actualChecksum === expectedChecksum,
      };
    } catch (error) {
      return {
        file_path: filePath,
        expected_checksum: expectedChecksum,
        actual_checksum: "",
        valid: false,
      };
    }
  }

  public validateRepositoryUrl(url: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const parsedUrl = new URL(url);

      // Protocol validation
      if (!this.securityPolicy.allow_http && parsedUrl.protocol === "http:") {
        errors.push({
          code: "INSECURE_PROTOCOL",
          message: "HTTP protocol not allowed by security policy",
          severity: "error",
          name: "ValidationError",
        });
      }

      if (!["http:", "https:", "file:"].includes(parsedUrl.protocol)) {
        errors.push({
          code: "INVALID_PROTOCOL",
          message: `Unsupported protocol: ${parsedUrl.protocol}`,
          severity: "error",
          name: "ValidationError",
        });
      }

      // Domain validation
      if (this.securityPolicy.blocked_domains.includes(parsedUrl.hostname)) {
        errors.push({
          code: "BLOCKED_DOMAIN",
          message: `Domain ${parsedUrl.hostname} is blocked`,
          severity: "error",
          name: "ValidationError",
        });
      }

      if (
        this.securityPolicy.allowed_domains.length > 0 &&
        !this.securityPolicy.allowed_domains.includes(parsedUrl.hostname)
      ) {
        errors.push({
          code: "DOMAIN_NOT_ALLOWED",
          message: `Domain ${parsedUrl.hostname} is not in allowed list`,
          severity: "error",
          name: "ValidationError",
        });
      }
    } catch (error) {
      errors.push({
        code: "INVALID_URL",
        message: `Invalid URL format: ${error}`,
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
}
