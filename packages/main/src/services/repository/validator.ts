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
import {
  createSchemaValidators,
  validateAgainstSchema,
  type ValidateFunction,
} from './validatorSchema.js';

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

      if (isParentManifest(manifest)) {
        return this.validateParentManifest(manifest);
      }

      if (isTranslationManifest(manifest)) {
        return this.validateTranslationManifest(manifest);
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

  public validateFileIntegrity(filePath: string, expectedChecksum: string): IntegrityCheck {
    return validateFileIntegrity(filePath, expectedChecksum);
  }

  public validateRepositoryUrl(url: string): ValidationResult {
    return validateRepositoryUrl(url, this.securityPolicy);
  }
}
