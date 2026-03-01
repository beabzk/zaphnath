import { isAbsolute } from 'path';
import { pathToFileURL } from 'url';

const WINDOWS_ABSOLUTE_PATH = /^[a-zA-Z]:[\\/]/;
const UNC_PATH = /^[\\/]{2}[^\\/]/;
const URL_WITH_SCHEME = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;

function toWindowsFileUrl(value: string): string {
  const normalized = value.replace(/\\/g, '/');
  return `file:///${encodeURI(normalized)}`;
}

function toUncFileUrl(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '');
  return `file://${encodeURI(normalized)}`;
}

export function normalizeRepositoryUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith('file://')) {
    const withoutScheme = trimmed.slice('file://'.length);
    if (WINDOWS_ABSOLUTE_PATH.test(withoutScheme)) {
      return toWindowsFileUrl(withoutScheme);
    }
    if (UNC_PATH.test(withoutScheme)) {
      return toUncFileUrl(withoutScheme);
    }
    return trimmed;
  }

  if (URL_WITH_SCHEME.test(trimmed)) {
    return trimmed;
  }

  if (WINDOWS_ABSOLUTE_PATH.test(trimmed)) {
    return toWindowsFileUrl(trimmed);
  }

  if (UNC_PATH.test(trimmed)) {
    return toUncFileUrl(trimmed);
  }

  if (isAbsolute(trimmed)) {
    return pathToFileURL(trimmed).toString();
  }

  return trimmed;
}
