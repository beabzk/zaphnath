import type {
  SecurityPolicy,
  ValidationError,
  ValidationWarning,
  ZBRSParentManifest,
  ZBRSTranslationManifest,
} from './types.js';
import { isParentManifest, isTranslationManifest } from './types.js';

export function validateManifestBusinessRules(
  manifest: ZBRSTranslationManifest,
  securityPolicy: SecurityPolicy,
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

  if (manifest.technical.size_bytes > securityPolicy.max_repository_size) {
    errors.push({
      code: 'REPOSITORY_TOO_LARGE',
      message: `Repository size (${manifest.technical.size_bytes}) exceeds maximum (${securityPolicy.max_repository_size})`,
      path: '/technical/size_bytes',
      severity: 'error',
      name: 'ValidationError',
    });
  }
}

export function validateManifestSecurity(
  manifest: ZBRSParentManifest | ZBRSTranslationManifest,
  securityPolicy: SecurityPolicy,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (securityPolicy.require_checksums) {
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
      for (let index = 0; index < manifest.translations.length; index++) {
        const translation = manifest.translations[index];
        if (!translation.checksum) {
          errors.push({
            code: 'MISSING_TRANSLATION_CHECKSUM',
            message: `Translation ${translation.id} is missing checksum`,
            path: `/translations/${index}/checksum`,
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

    if (!securityPolicy.allow_http && parsed.protocol === 'http:') {
      warnings.push({
        code: 'INSECURE_URL',
        message: 'Publisher URL uses insecure HTTP protocol',
        path: isParentManifest(manifest) ? '/publisher/url' : '/repository/publisher/url',
      });
    }

    if (securityPolicy.blocked_domains.includes(parsed.hostname)) {
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

export function validateParentManifestStructure(
  manifest: ZBRSParentManifest,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  if (manifest.repository.type !== 'parent') {
    errors.push({
      code: 'INVALID_PARENT_TYPE',
      message: "Parent repository must have type 'parent'",
      severity: 'error',
      name: 'ValidationError',
    });
  }

  if (!Array.isArray(manifest.translations)) {
    errors.push({
      code: 'MISSING_TRANSLATIONS_ARRAY',
      message: 'Parent repository must have a translations array',
      severity: 'error',
      name: 'ValidationError',
    });
  } else if (manifest.translations.length === 0) {
    warnings.push({
      code: 'EMPTY_TRANSLATIONS_ARRAY',
      message: 'Parent repository has no translations',
    });
  }

  if (!manifest.publisher) {
    errors.push({
      code: 'MISSING_PUBLISHER',
      message: 'Parent repository must have publisher information',
      severity: 'error',
      name: 'ValidationError',
    });
  }
}

export function validateTranslationManifestStructure(
  manifest: ZBRSTranslationManifest,
  errors: ValidationError[]
): void {
  if (!manifest.content) {
    errors.push({
      code: 'MISSING_CONTENT',
      message: 'Translation manifest must have content information',
      severity: 'error',
      name: 'ValidationError',
    });
  }

  if (!manifest.repository.language) {
    errors.push({
      code: 'MISSING_LANGUAGE',
      message: 'Translation manifest must have language information',
      severity: 'error',
      name: 'ValidationError',
    });
  }

  if (!manifest.repository.translation) {
    errors.push({
      code: 'MISSING_TRANSLATION_INFO',
      message: 'Translation manifest must have translation information',
      severity: 'error',
      name: 'ValidationError',
    });
  }
}

export function validateParentManifestBusinessRules(
  manifest: ZBRSParentManifest,
  errors: ValidationError[]
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
      code: 'DUPLICATE_TRANSLATION_IDS',
      message: `Duplicate translation IDs found: ${duplicateIds.join(', ')}`,
      severity: 'error',
      name: 'ValidationError',
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
      code: 'DUPLICATE_TRANSLATION_DIRECTORIES',
      message: `Duplicate translation directories found: ${duplicateDirectories.join(', ')}`,
      severity: 'error',
      name: 'ValidationError',
    });
  }
}
