import { createHash } from 'crypto';
import { readFileSync } from 'fs';

import { normalizeRepositoryUrl } from './pathUtils.js';
import type {
  IntegrityCheck,
  SecurityPolicy,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from './types.js';

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
