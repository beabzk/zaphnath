import { createHash } from 'crypto';
import { readFileSync } from 'fs';

import { normalizeRepositoryUrl } from './pathUtils.js';
import type {
  IntegrityCheck,
  SecurityPolicy,
  ValidationError,
  ValidationResult,
  ValidationWarning,
  ZBRSParentManifest,
  ZBRSTranslationManifest,
} from './types.js';
import { isParentManifest, isTranslationManifest } from './types.js';

interface BookPayload {
  book?: {
    order: number;
    chapters_count: number;
    verses_count: number;
  };
  chapters?: Array<{
    number: number;
    verses?: Array<{
      number: number;
      text: string;
    }>;
  }>;
}

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

export function validateBookBusinessRules(
  book: unknown,
  errors: ValidationError[],
  expectedOrder?: number
): void {
  const payload = book as BookPayload;
  if (!payload.book || !Array.isArray(payload.chapters)) {
    return;
  }

  if (expectedOrder && payload.book.order !== expectedOrder) {
    errors.push({
      code: 'INCORRECT_BOOK_ORDER',
      message: `Book order ${payload.book.order} doesn't match expected ${expectedOrder}`,
      path: '/book/order',
      severity: 'error',
      name: 'ValidationError',
    });
  }

  if (payload.chapters.length !== payload.book.chapters_count) {
    errors.push({
      code: 'CHAPTER_COUNT_MISMATCH',
      message: `Actual chapters (${payload.chapters.length}) don't match declared count (${payload.book.chapters_count})`,
      path: '/book/chapters_count',
      severity: 'error',
      name: 'ValidationError',
    });
  }

  let totalVerses = 0;
  for (let chapterIndex = 0; chapterIndex < payload.chapters.length; chapterIndex++) {
    const chapter = payload.chapters[chapterIndex];

    if (chapter.number !== chapterIndex + 1) {
      errors.push({
        code: 'INCORRECT_CHAPTER_NUMBER',
        message: `Chapter ${chapterIndex + 1} has incorrect number ${chapter.number}`,
        path: `/chapters/${chapterIndex}/number`,
        severity: 'error',
        name: 'ValidationError',
      });
    }

    if (!Array.isArray(chapter.verses)) {
      continue;
    }

    for (let verseIndex = 0; verseIndex < chapter.verses.length; verseIndex++) {
      const verse = chapter.verses[verseIndex];

      if (verse.number !== verseIndex + 1) {
        errors.push({
          code: 'INCORRECT_VERSE_NUMBER',
          message: `Chapter ${chapter.number}, verse ${verseIndex + 1} has incorrect number ${verse.number}`,
          path: `/chapters/${chapterIndex}/verses/${verseIndex}/number`,
          severity: 'error',
          name: 'ValidationError',
        });
      }

      if (!verse.text || String(verse.text).trim().length === 0) {
        errors.push({
          code: 'EMPTY_VERSE_TEXT',
          message: `Chapter ${chapter.number}, verse ${verse.number} has empty text`,
          path: `/chapters/${chapterIndex}/verses/${verseIndex}/text`,
          severity: 'error',
          name: 'ValidationError',
        });
      }

      totalVerses++;
    }
  }

  if (totalVerses !== payload.book.verses_count) {
    errors.push({
      code: 'VERSE_COUNT_MISMATCH',
      message: `Actual verses (${totalVerses}) don't match declared count (${payload.book.verses_count})`,
      path: '/book/verses_count',
      severity: 'error',
      name: 'ValidationError',
    });
  }
}

export function validateFileIntegrity(filePath: string, expectedChecksum: string): IntegrityCheck {
  try {
    const content = readFileSync(filePath);
    const hash = createHash('sha256');
    hash.update(content);
    const actualChecksum = `sha256:${hash.digest('hex')}`;

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
      actual_checksum: '',
      valid: false,
    };
  }
}

export function validateRepositoryUrl(
  url: string,
  securityPolicy: SecurityPolicy
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const normalizedUrl = normalizeRepositoryUrl(url);
    const parsedUrl = new URL(normalizedUrl);

    if (!securityPolicy.allow_http && parsedUrl.protocol === 'http:') {
      errors.push({
        code: 'INSECURE_PROTOCOL',
        message: 'HTTP protocol not allowed by security policy',
        severity: 'error',
        name: 'ValidationError',
      });
    }

    if (!['http:', 'https:', 'file:'].includes(parsedUrl.protocol)) {
      errors.push({
        code: 'INVALID_PROTOCOL',
        message: `Unsupported protocol: ${parsedUrl.protocol}`,
        severity: 'error',
        name: 'ValidationError',
      });
    }

    const isNetworkUrl = parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';

    if (isNetworkUrl && securityPolicy.blocked_domains.includes(parsedUrl.hostname)) {
      errors.push({
        code: 'BLOCKED_DOMAIN',
        message: `Domain ${parsedUrl.hostname} is blocked`,
        severity: 'error',
        name: 'ValidationError',
      });
    }

    if (
      isNetworkUrl &&
      securityPolicy.allowed_domains.length > 0 &&
      !securityPolicy.allowed_domains.includes(parsedUrl.hostname)
    ) {
      errors.push({
        code: 'DOMAIN_NOT_ALLOWED',
        message: `Domain ${parsedUrl.hostname} is not in allowed list`,
        severity: 'error',
        name: 'ValidationError',
      });
    }
  } catch (error) {
    errors.push({
      code: 'INVALID_URL',
      message: `Invalid URL format: ${error}`,
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
