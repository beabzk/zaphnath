import addFormats from "ajv-formats";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

import type {
  ZBRSParentManifest,
  ZBRSTranslationManifest,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SecurityPolicy,
  IntegrityCheck,
} from "./types.js";
import { isParentManifest, isTranslationManifest } from "./types.js";

type SchemaError = {
  instancePath?: string;
  message?: string;
};

type ValidateFunction = ((data: unknown) => boolean) & {
  errors?: SchemaError[] | null;
};

const require = createRequire(import.meta.url);
const Ajv2020 = require("ajv/dist/2020.js");

export class ZBRSValidator {
  private manifestSchema: unknown;
  private bookSchema: unknown;
  private securityPolicy: SecurityPolicy;
  private ajv: any;
  private manifestValidator: ValidateFunction | null;
  private bookValidator: ValidateFunction | null;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.ajv = new Ajv2020({
      allErrors: true,
      strict: false,
      validateFormats: true,
      allowUnionTypes: true,
    });
    const addFormatsFn =
      typeof addFormats === "function"
        ? addFormats
        : (addFormats as unknown as { default?: (ajv: any) => void }).default;
    if (addFormatsFn) {
      addFormatsFn(this.ajv);
    }

    this.securityPolicy = {
      allow_http: false,
      max_repository_size: 1024 * 1024 * 1024,
      max_file_size: 100 * 1024 * 1024,
      allowed_domains: [],
      blocked_domains: [],
      require_checksums: true,
      ...securityPolicy,
    };

    this.manifestValidator = null;
    this.bookValidator = null;
    this.loadSchemas();
  }

  private resolveSchemasDirectory(): string {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const searchRoots = [process.cwd(), currentDir];

    for (const root of searchRoots) {
      let probe = root;
      while (true) {
        const candidate = path.join(probe, "docs", "schemas");
        const manifestPath = path.join(candidate, "manifest.schema.json");
        const bookPath = path.join(candidate, "book.schema.json");
        if (existsSync(manifestPath) && existsSync(bookPath)) {
          return candidate;
        }

        const parent = path.dirname(probe);
        if (parent === probe) {
          break;
        }
        probe = parent;
      }
    }

    throw new Error("Unable to locate docs/schemas directory");
  }

  private readJsonFile(filePath: string): unknown {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  }

  private loadSchemas(): void {
    try {
      const schemasDir = this.resolveSchemasDirectory();
      const manifestSchemaPath = path.join(schemasDir, "manifest.schema.json");
      const bookSchemaPath = path.join(schemasDir, "book.schema.json");

      this.manifestSchema = this.readJsonFile(manifestSchemaPath);
      this.bookSchema = this.readJsonFile(bookSchemaPath);
      this.manifestValidator = this.ajv.compile(this.manifestSchema);
      this.bookValidator = this.ajv.compile(this.bookSchema);
    } catch (error) {
      throw new Error(`Failed to load validation schemas: ${error}`);
    }
  }

  private pushSchemaErrors(
    target: ValidationError[],
    ajvErrors: SchemaError[] | null | undefined,
    prefix: string
  ): void {
    if (!ajvErrors) {
      return;
    }

    for (const err of ajvErrors) {
      const pointer = err.instancePath || "/";
      target.push({
        code: "SCHEMA_VALIDATION",
        message: `${prefix}${pointer}: ${err.message ?? "schema validation failed"}`,
        path: err.instancePath || undefined,
        severity: "error",
        name: "ValidationError",
      });
    }
  }

  private validateAgainstSchema(
    validator: ValidateFunction | null,
    payload: unknown,
    errors: ValidationError[],
    label: string
  ): void {
    if (!validator) {
      errors.push({
        code: "SCHEMA_NOT_LOADED",
        message: "Schema validator is not initialized",
        severity: "error",
        name: "ValidationError",
      });
      return;
    }

    const valid = validator(payload);
    if (!valid) {
      this.pushSchemaErrors(errors, validator.errors, `${label} `);
    }
  }

  public validateManifest(manifest: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      this.validateAgainstSchema(
        this.manifestValidator,
        manifest,
        errors,
        "manifest"
      );

      if (errors.length > 0) {
        return { valid: false, errors, warnings: [] };
      }

      if (isParentManifest(manifest as any)) {
        return this.validateParentManifest(manifest as ZBRSParentManifest);
      }

      if (isTranslationManifest(manifest as any)) {
        return this.validateTranslationManifest(manifest as ZBRSTranslationManifest);
      }

      errors.push({
        code: "UNKNOWN_MANIFEST_TYPE",
        message:
          "Manifest is neither a parent repository nor a translation manifest",
        severity: "error",
        name: "ValidationError",
      });
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
      warnings: [],
    };
  }

  public validateParentManifest(
    manifest: ZBRSParentManifest
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.validateAgainstSchema(
        this.manifestValidator,
        manifest,
        errors,
        "parent manifest"
      );
      if (errors.length > 0) {
        return { valid: false, errors, warnings };
      }

      this.validateParentManifestStructure(manifest, errors, warnings);
      this.validateParentManifestBusinessRules(manifest, errors, warnings);
      this.validateManifestSecurity(manifest, errors, warnings);
    } catch (error) {
      errors.push({
        code: "PARENT_VALIDATION_EXCEPTION",
        message: `Parent manifest validation failed: ${error}`,
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

  public validateTranslationManifest(
    manifest: ZBRSTranslationManifest
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.validateAgainstSchema(
        this.manifestValidator,
        manifest,
        errors,
        "translation manifest"
      );
      if (errors.length > 0) {
        return { valid: false, errors, warnings };
      }

      this.validateTranslationManifestStructure(manifest, errors, warnings);
      this.validateManifestBusinessRules(manifest, errors, warnings);
      this.validateManifestSecurity(manifest, errors, warnings);
    } catch (error) {
      errors.push({
        code: "TRANSLATION_VALIDATION_EXCEPTION",
        message: `Translation manifest validation failed: ${error}`,
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

  public validateBook(book: unknown, expectedOrder?: number): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      this.validateAgainstSchema(this.bookValidator, book, errors, "book");
      this.validateBookBusinessRules(book as any, errors, warnings, expectedOrder);
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
    manifest: ZBRSTranslationManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (manifest.zbrs_version && !manifest.zbrs_version.startsWith("1.")) {
      errors.push({
        code: "UNSUPPORTED_VERSION",
        message: `Unsupported ZBRS version: ${manifest.zbrs_version}`,
        path: "/zbrs_version",
        severity: "error",
        name: "ValidationError",
      });
    }

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

    if (manifest.content.books_count === 66 && (old !== 39 || newTestament !== 27)) {
      warnings.push({
        code: "NON_STANDARD_CANON",
        message:
          "Book counts differ from standard Protestant canon (39 OT + 27 NT)",
        path: "/content/testament",
      });
    }

    if (manifest.technical.size_bytes > this.securityPolicy.max_repository_size) {
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
    manifest: ZBRSParentManifest | ZBRSTranslationManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (this.securityPolicy.require_checksums) {
      if (isTranslationManifest(manifest)) {
        if (!manifest.technical?.checksum) {
          errors.push({
            code: "MISSING_CHECKSUM",
            message: "Translation checksum is required by security policy",
            path: "/technical/checksum",
            severity: "error",
            name: "ValidationError",
          });
        }
      } else if (isParentManifest(manifest)) {
        for (let i = 0; i < manifest.translations.length; i++) {
          const translation = manifest.translations[i];
          if (!translation.checksum) {
            errors.push({
              code: "MISSING_TRANSLATION_CHECKSUM",
              message: `Translation ${translation.id} is missing checksum`,
              path: `/translations/${i}/checksum`,
              severity: "error",
              name: "ValidationError",
            });
          }
        }
      }
    }

    const publisherUrl = isParentManifest(manifest)
      ? manifest.publisher?.url
      : manifest.repository.publisher?.url;

    if (!publisherUrl) {
      return;
    }

    try {
      const parsed = new URL(publisherUrl);

      if (!this.securityPolicy.allow_http && parsed.protocol === "http:") {
        warnings.push({
          code: "INSECURE_URL",
          message: "Publisher URL uses insecure HTTP protocol",
          path: isParentManifest(manifest)
            ? "/publisher/url"
            : "/repository/publisher/url",
        });
      }

      if (this.securityPolicy.blocked_domains.includes(parsed.hostname)) {
        errors.push({
          code: "BLOCKED_DOMAIN",
          message: `Publisher domain ${parsed.hostname} is blocked`,
          path: isParentManifest(manifest)
            ? "/publisher/url"
            : "/repository/publisher/url",
          severity: "error",
          name: "ValidationError",
        });
      }
    } catch (error) {
      errors.push({
        code: "INVALID_PUBLISHER_URL",
        message: `Invalid publisher URL: ${error}`,
        path: isParentManifest(manifest)
          ? "/publisher/url"
          : "/repository/publisher/url",
        severity: "error",
        name: "ValidationError",
      });
    }
  }

  private validateBookBusinessRules(
    book: any,
    errors: ValidationError[],
    _warnings: ValidationWarning[],
    expectedOrder?: number
  ): void {
    if (!book?.book || !Array.isArray(book?.chapters)) {
      return;
    }

    if (expectedOrder && book.book.order !== expectedOrder) {
      errors.push({
        code: "INCORRECT_BOOK_ORDER",
        message: `Book order ${book.book.order} doesn't match expected ${expectedOrder}`,
        path: "/book/order",
        severity: "error",
        name: "ValidationError",
      });
    }

    if (book.chapters.length !== book.book.chapters_count) {
      errors.push({
        code: "CHAPTER_COUNT_MISMATCH",
        message: `Actual chapters (${book.chapters.length}) don't match declared count (${book.book.chapters_count})`,
        path: "/book/chapters_count",
        severity: "error",
        name: "ValidationError",
      });
    }

    let totalVerses = 0;
    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];

      if (chapter.number !== i + 1) {
        errors.push({
          code: "INCORRECT_CHAPTER_NUMBER",
          message: `Chapter ${i + 1} has incorrect number ${chapter.number}`,
          path: `/chapters/${i}/number`,
          severity: "error",
          name: "ValidationError",
        });
      }

      if (!Array.isArray(chapter.verses)) {
        continue;
      }

      for (let j = 0; j < chapter.verses.length; j++) {
        const verse = chapter.verses[j];

        if (verse.number !== j + 1) {
          errors.push({
            code: "INCORRECT_VERSE_NUMBER",
            message: `Chapter ${chapter.number}, verse ${j + 1} has incorrect number ${verse.number}`,
            path: `/chapters/${i}/verses/${j}/number`,
            severity: "error",
            name: "ValidationError",
          });
        }

        if (!verse.text || String(verse.text).trim().length === 0) {
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
    } catch {
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

  private validateParentManifestStructure(
    manifest: ZBRSParentManifest,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    if (manifest.repository.type !== "parent") {
      errors.push({
        code: "INVALID_PARENT_TYPE",
        message: "Parent repository must have type 'parent'",
        severity: "error",
        name: "ValidationError",
      });
    }

    if (!Array.isArray(manifest.translations)) {
      errors.push({
        code: "MISSING_TRANSLATIONS_ARRAY",
        message: "Parent repository must have a translations array",
        severity: "error",
        name: "ValidationError",
      });
    } else if (manifest.translations.length === 0) {
      warnings.push({
        code: "EMPTY_TRANSLATIONS_ARRAY",
        message: "Parent repository has no translations",
      });
    }

    if (!manifest.publisher) {
      errors.push({
        code: "MISSING_PUBLISHER",
        message: "Parent repository must have publisher information",
        severity: "error",
        name: "ValidationError",
      });
    }
  }

  private validateTranslationManifestStructure(
    manifest: ZBRSTranslationManifest,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    if (!manifest.content) {
      errors.push({
        code: "MISSING_CONTENT",
        message: "Translation manifest must have content information",
        severity: "error",
        name: "ValidationError",
      });
    }

    if (!manifest.repository.language) {
      errors.push({
        code: "MISSING_LANGUAGE",
        message: "Translation manifest must have language information",
        severity: "error",
        name: "ValidationError",
      });
    }

    if (!manifest.repository.translation) {
      errors.push({
        code: "MISSING_TRANSLATION_INFO",
        message: "Translation manifest must have translation information",
        severity: "error",
        name: "ValidationError",
      });
    }
  }

  private validateParentManifestBusinessRules(
    manifest: ZBRSParentManifest,
    errors: ValidationError[],
    _warnings: ValidationWarning[]
  ): void {
    const translationIds = new Set<string>();
    const duplicateIds: string[] = [];

    for (const translation of manifest.translations) {
      if (translationIds.has(translation.id)) {
        duplicateIds.push(translation.id);
      } else {
        translationIds.add(translation.id);
      }
    }

    if (duplicateIds.length > 0) {
      errors.push({
        code: "DUPLICATE_TRANSLATION_IDS",
        message: `Duplicate translation IDs found: ${duplicateIds.join(", ")}`,
        severity: "error",
        name: "ValidationError",
      });
    }

    const directoryNames = new Set<string>();
    const duplicateDirectories: string[] = [];

    for (const translation of manifest.translations) {
      if (directoryNames.has(translation.directory)) {
        duplicateDirectories.push(translation.directory);
      } else {
        directoryNames.add(translation.directory);
      }
    }

    if (duplicateDirectories.length > 0) {
      errors.push({
        code: "DUPLICATE_TRANSLATION_DIRECTORIES",
        message: `Duplicate translation directories found: ${duplicateDirectories.join(
          ", "
        )}`,
        severity: "error",
        name: "ValidationError",
      });
    }
  }
}
