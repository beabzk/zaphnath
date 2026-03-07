import { RepositoryImportContentService } from './importContentService.js';
import { ZBRSValidator } from './validator.js';
import type {
  ImportProgress,
  ValidationError,
  ValidationResult,
  ZBRSTranslationManifest,
} from './types.js';

type ValidationErrorFactory = (
  code: string,
  message: string,
  path?: string,
  details?: Record<string, unknown>
) => ValidationError;

type ErrorMessageFormatter = (error: unknown) => string;

export class RepositoryChecksumValidator {
  constructor(
    private validator: ZBRSValidator,
    private contentService: RepositoryImportContentService,
    private createValidationError: ValidationErrorFactory,
    private toErrorMessage: ErrorMessageFormatter
  ) {}

  public async validateTranslationImport(
    manifest: ZBRSTranslationManifest,
    options: {
      repositoryUrl: string;
      validateChecksums: boolean;
    },
    reportProgress?: (progress: ImportProgress) => void
  ): Promise<ValidationResult> {
    const validation = this.validator.validateTranslationManifest(manifest);
    if (!validation.valid || !options.validateChecksums) {
      return validation;
    }

    reportProgress?.({
      stage: 'validating',
      progress: 50,
      message: 'Validating file checksums...',
    });

    const baseUrl = this.contentService.normalizeRepositoryBaseUrl(options.repositoryUrl);
    const bookFiles = await this.contentService.resolveBookFiles(manifest, options.repositoryUrl);
    let checksumWarningEmitted = false;

    for (const bookFile of bookFiles) {
      const expectedChecksum = bookFile.checksum;
      if (!expectedChecksum || !expectedChecksum.startsWith('sha256:')) {
        if (!checksumWarningEmitted) {
          validation.warnings.push({
            code: 'CHECKSUM_SKIPPED',
            message:
              'Skipping checksum validation for one or more books because checksum metadata is missing or not sha256',
            name: 'ValidationWarning',
          });
          checksumWarningEmitted = true;
        }
        continue;
      }

      const bookUrl = this.contentService.buildBookUrl(baseUrl, bookFile);

      try {
        const actualChecksum = await this.contentService.calculateSha256(bookUrl);
        if (actualChecksum === expectedChecksum) {
          continue;
        }

        validation.valid = false;
        validation.errors.push(
          this.createValidationError(
            'checksum-mismatch',
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
          this.createValidationError(
            'checksum-validation-failed',
            `Failed to validate checksum for ${bookFile.path}: ${this.toErrorMessage(error)}`,
            bookFile.path
          )
        );
      }
    }

    return validation;
  }
}
