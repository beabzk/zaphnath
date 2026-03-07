import type {
  ZBRSParentManifest,
  ZBRSTranslationManifest,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  SecurityPolicy,
  IntegrityCheck,
} from './types.js';
import { isParentManifest, isTranslationManifest } from './types.js';
import {
  validateBookBusinessRules,
  validateFileIntegrity,
  validateManifestBusinessRules,
  validateManifestSecurity,
  validateParentManifestBusinessRules,
  validateParentManifestStructure,
  validateRepositoryUrl,
  validateTranslationManifestStructure,
} from './validatorRules.js';
import { createSchemaValidators, validateAgainstSchema, type ValidateFunction } from './validatorSchema.js';

export class ZBRSValidator {
  private securityPolicy: SecurityPolicy;
  private manifestValidator: ValidateFunction | null;
  private bookValidator: ValidateFunction | null;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.securityPolicy = {
      allow_http: false,
      max_repository_size: 1024 * 1024 * 1024,
      max_file_size: 100 * 1024 * 1024,
      allowed_domains: [],
      blocked_domains: [],
      require_checksums: true,
      ...securityPolicy,
    };

    const validators = createSchemaValidators();
    this.manifestValidator = validators.manifestValidator;
    this.bookValidator = validators.bookValidator;
  }

  public validateManifest(manifest: unknown): ValidationResult {
    const errors: ValidationError[] = [];

    try {
      validateAgainstSchema(this.manifestValidator, manifest, errors, 'manifest');

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
        code: 'UNKNOWN_MANIFEST_TYPE',
        message: 'Manifest is neither a parent repository nor a translation manifest',
        severity: 'error',
        name: 'ValidationError',
      });
    } catch (error) {
      errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: `Validation failed: ${error}`,
        severity: 'error',
        name: 'ValidationError',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  public validateParentManifest(manifest: ZBRSParentManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      validateAgainstSchema(this.manifestValidator, manifest, errors, 'parent manifest');
      if (errors.length > 0) {
        return { valid: false, errors, warnings };
      }

      validateParentManifestStructure(manifest, errors, warnings);
      validateParentManifestBusinessRules(manifest, errors);
      validateManifestSecurity(manifest, this.securityPolicy, errors, warnings);
    } catch (error) {
      errors.push({
        code: 'PARENT_VALIDATION_EXCEPTION',
        message: `Parent manifest validation failed: ${error}`,
        severity: 'error',
        name: 'ValidationError',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public validateTranslationManifest(manifest: ZBRSTranslationManifest): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      validateAgainstSchema(this.manifestValidator, manifest, errors, 'translation manifest');
      if (errors.length > 0) {
        return { valid: false, errors, warnings };
      }

      validateTranslationManifestStructure(manifest, errors);
      validateManifestBusinessRules(manifest, this.securityPolicy, errors, warnings);
      validateManifestSecurity(manifest, this.securityPolicy, errors, warnings);
    } catch (error) {
      errors.push({
        code: 'TRANSLATION_VALIDATION_EXCEPTION',
        message: `Translation manifest validation failed: ${error}`,
        severity: 'error',
        name: 'ValidationError',
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
      validateAgainstSchema(this.bookValidator, book, errors, 'book');
      validateBookBusinessRules(book, errors, expectedOrder);
    } catch (error) {
      errors.push({
        code: 'VALIDATION_EXCEPTION',
        message: `Book validation failed: ${error}`,
        severity: 'error',
        name: 'ValidationError',
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
    if (manifest.zbrs_version && !manifest.zbrs_version.startsWith('1.')) {
      errors.push({
        code: 'UNSUPPORTED_VERSION',
        message: `Unsupported ZBRS version: ${manifest.zbrs_version}`,
        path: '/zbrs_version',
        severity: 'error',
        name: 'ValidationError',
      });
    }

    const { old, new: newTestament } = manifest.content.testament || {};
    const total = (old || 0) + (newTestament || 0);
    if (total !== manifest.content.books_count) {
      errors.push({
        code: 'BOOK_COUNT_MISMATCH',
        message: `Testament book counts (${old} + ${newTestament} = ${total}) don't match total (${manifest.content.books_count})`,
        path: '/content/testament',
        severity: 'error',
        name: 'ValidationError',
      });
    }

    if (manifest.content.books_count === 66 && (old !== 39 || newTestament !== 27)) {
      warnings.push({
        code: 'NON_STANDARD_CANON',
        message: 'Book counts differ from standard Protestant canon (39 OT + 27 NT)',
        path: '/content/testament',
      });
    }

    if (manifest.technical.size_bytes > this.securityPolicy.max_repository_size) {
      errors.push({
        code: 'REPOSITORY_TOO_LARGE',
        message: `Repository size (${manifest.technical.size_bytes}) exceeds maximum (${this.securityPolicy.max_repository_size})`,
        path: '/technical/size_bytes',
        severity: 'error',
        name: 'ValidationError',
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
            code: 'MISSING_CHECKSUM',
            message: 'Translation checksum is required by security policy',
            path: '/technical/checksum',
            severity: 'error',
            name: 'ValidationError',
          });
        }
      } else if (isParentManifest(manifest)) {
        for (let i = 0; i < manifest.translations.length; i++) {
          const translation = manifest.translations[i];
          if (!translation.checksum) {
            errors.push({
              code: 'MISSING_TRANSLATION_CHECKSUM',
              message: `Translation ${translation.id} is missing checksum`,
              path: `/translations/${i}/checksum`,
              severity: 'error',
              name: 'ValidationError',
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

      if (!this.securityPolicy.allow_http && parsed.protocol === 'http:') {
        warnings.push({
          code: 'INSECURE_URL',
          message: 'Publisher URL uses insecure HTTP protocol',
          path: isParentManifest(manifest) ? '/publisher/url' : '/repository/publisher/url',
        });
      }

      if (this.securityPolicy.blocked_domains.includes(parsed.hostname)) {
        errors.push({
          code: 'BLOCKED_DOMAIN',
          message: `Publisher domain ${parsed.hostname} is blocked`,
          path: isParentManifest(manifest) ? '/publisher/url' : '/repository/publisher/url',
          severity: 'error',
          name: 'ValidationError',
        });
      }
    } catch (error) {
      errors.push({
        code: 'INVALID_PUBLISHER_URL',
        message: `Invalid publisher URL: ${error}`,
        path: isParentManifest(manifest) ? '/publisher/url' : '/repository/publisher/url',
        severity: 'error',
        name: 'ValidationError',
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
        code: 'INCORRECT_BOOK_ORDER',
        message: `Book order ${book.book.order} doesn't match expected ${expectedOrder}`,
        path: '/book/order',
        severity: 'error',
        name: 'ValidationError',
      });
    }

    if (book.chapters.length !== book.book.chapters_count) {
      errors.push({
        code: 'CHAPTER_COUNT_MISMATCH',
        message: `Actual chapters (${book.chapters.length}) don't match declared count (${book.book.chapters_count})`,
        path: '/book/chapters_count',
        severity: 'error',
        name: 'ValidationError',
      });
    }

    let totalVerses = 0;
    for (let i = 0; i < book.chapters.length; i++) {
      const chapter = book.chapters[i];

      if (chapter.number !== i + 1) {
        errors.push({
          code: 'INCORRECT_CHAPTER_NUMBER',
          message: `Chapter ${i + 1} has incorrect number ${chapter.number}`,
          path: `/chapters/${i}/number`,
          severity: 'error',
          name: 'ValidationError',
        });
      }

      if (!Array.isArray(chapter.verses)) {
        continue;
      }

      for (let j = 0; j < chapter.verses.length; j++) {
        const verse = chapter.verses[j];

        if (verse.number !== j + 1) {
          errors.push({
            code: 'INCORRECT_VERSE_NUMBER',
            message: `Chapter ${chapter.number}, verse ${j + 1} has incorrect number ${verse.number}`,
            path: `/chapters/${i}/verses/${j}/number`,
            severity: 'error',
            name: 'ValidationError',
          });
        }

        if (!verse.text || String(verse.text).trim().length === 0) {
          errors.push({
            code: 'EMPTY_VERSE_TEXT',
            message: `Chapter ${chapter.number}, verse ${verse.number} has empty text`,
            path: `/chapters/${i}/verses/${j}/text`,
            severity: 'error',
            name: 'ValidationError',
          });
        }

        totalVerses++;
      }
    }

    if (totalVerses !== book.book.verses_count) {
      errors.push({
        code: 'VERSE_COUNT_MISMATCH',
        message: `Actual verses (${totalVerses}) don't match declared count (${book.book.verses_count})`,
        path: '/book/verses_count',
        severity: 'error',
        name: 'ValidationError',
      });
    }
  }

  public validateFileIntegrity(filePath: string, expectedChecksum: string): IntegrityCheck {
    return validateFileIntegrity(filePath, expectedChecksum);
  }

  public validateRepositoryUrl(url: string): ValidationResult {
    return validateRepositoryUrl(url, this.securityPolicy);
  }
}
