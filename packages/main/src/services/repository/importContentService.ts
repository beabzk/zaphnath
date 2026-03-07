import { createHash } from 'crypto';
import { readdir, readFile, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

import { normalizeRepositoryUrl } from './pathUtils.js';
import type { ContentBookReference, ZBRSTranslationManifest } from './types.js';

export interface ResolvedBookFile extends ContentBookReference {
  download_url?: string;
}

export class RepositoryImportContentService {
  public normalizeRepositoryBaseUrl(repositoryUrl: string): string {
    const normalizedUrl = normalizeRepositoryUrl(repositoryUrl);
    return normalizedUrl.replace(/\/manifest\.json$/, '').replace(/\/$/, '');
  }

  public buildBookUrl(baseUrl: string, bookFile: ResolvedBookFile): string {
    if (bookFile.download_url) {
      return bookFile.download_url;
    }

    const normalizedBookPath = bookFile.path.replace(/\\/g, '/');
    if (
      normalizedBookPath.startsWith('http://') ||
      normalizedBookPath.startsWith('https://') ||
      normalizedBookPath.startsWith('file://')
    ) {
      return normalizedBookPath;
    }

    const absoluteBookPath = normalizeRepositoryUrl(bookFile.path);
    if (absoluteBookPath.startsWith('file://')) {
      return absoluteBookPath;
    }

    if (baseUrl.startsWith('file://')) {
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      return new URL(normalizedBookPath.replace(/^\/+/, ''), normalizedBase).toString();
    }

    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${normalizedBookPath.replace(/^\/+/, '')}`;
  }

  public async fetchJsonFromLocation(location: string): Promise<unknown> {
    const normalizedLocation = normalizeRepositoryUrl(location);

    if (normalizedLocation.startsWith('file://')) {
      const localPath = fileURLToPath(normalizedLocation);
      const rawContent = await readFile(localPath, 'utf-8');
      return JSON.parse(rawContent.replace(/^\uFEFF/, ''));
    }

    if (!normalizedLocation.startsWith('http://') && !normalizedLocation.startsWith('https://')) {
      throw new Error('Only HTTP(S) or local file book sources are supported');
    }

    const response = await fetch(normalizedLocation);
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.statusText}`);
    }
    const rawContent = await response.text();
    return JSON.parse(rawContent.replace(/^\uFEFF/, ''));
  }

  public async calculateSha256(location: string): Promise<string> {
    const normalizedLocation = normalizeRepositoryUrl(location);

    if (normalizedLocation.startsWith('file://')) {
      const localPath = fileURLToPath(normalizedLocation);
      const data = await readFile(localPath);
      const hash = createHash('sha256');
      hash.update(data);
      return `sha256:${hash.digest('hex')}`;
    }

    if (!normalizedLocation.startsWith('http://') && !normalizedLocation.startsWith('https://')) {
      throw new Error('Only HTTP(S) or local file checksum sources are supported');
    }

    const response = await fetch(normalizedLocation);
    if (!response.ok) {
      throw new Error(`Failed to fetch file for checksum: ${response.statusText}`);
    }

    const data = Buffer.from(await response.arrayBuffer());
    const hash = createHash('sha256');
    hash.update(data);
    return `sha256:${hash.digest('hex')}`;
  }

  public async resolveBookFiles(
    manifest: ZBRSTranslationManifest,
    repositoryUrl: string
  ): Promise<ResolvedBookFile[]> {
    const manifestBooks = manifest.content?.books;
    if (Array.isArray(manifestBooks) && manifestBooks.length > 0) {
      return manifestBooks;
    }

    const discoveredBooks = await this.discoverBookFiles(repositoryUrl);
    if (discoveredBooks.length > 0) {
      return discoveredBooks;
    }

    return [];
  }

  private async discoverBookFiles(repositoryUrl: string): Promise<ResolvedBookFile[]> {
    const normalizedUrl = this.normalizeRepositoryBaseUrl(repositoryUrl);

    if (normalizedUrl.startsWith('file://')) {
      return this.discoverLocalBookFiles(normalizedUrl);
    }

    if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://')) {
      try {
        const parsedUrl = new URL(normalizedUrl);
        if (parsedUrl.hostname === 'raw.githubusercontent.com') {
          return this.discoverGitHubRawBookFiles(parsedUrl);
        }
      } catch {
        return [];
      }
    }

    return [];
  }

  private async discoverLocalBookFiles(repositoryUrl: string): Promise<ResolvedBookFile[]> {
    try {
      const repositoryPath = fileURLToPath(repositoryUrl);
      const booksDirectory = join(repositoryPath, 'books');
      const entries = await readdir(booksDirectory, { withFileTypes: true });

      const files = await Promise.all(
        entries
          .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
          .map(async (entry) => {
            const filePath = join(booksDirectory, entry.name);
            const fileStat = await stat(filePath);

            return {
              path: `books/${entry.name}`,
              checksum: '',
              size_bytes: fileStat.size,
              media_type: 'application/json',
            } as ResolvedBookFile;
          })
      );

      return files.sort((left, right) =>
        left.path.localeCompare(right.path, undefined, {
          numeric: true,
          sensitivity: 'base',
        })
      );
    } catch {
      return [];
    }
  }

  private async discoverGitHubRawBookFiles(repositoryUrl: URL): Promise<ResolvedBookFile[]> {
    try {
      const pathSegments = repositoryUrl.pathname
        .split('/')
        .filter((segment) => segment.length > 0);
      if (pathSegments.length < 4) {
        return [];
      }

      const [owner, repo, ref, ...repositoryPath] = pathSegments;
      const booksPath = [...repositoryPath, 'books']
        .map((segment) => encodeURIComponent(segment))
        .join('/');
      const apiUrl = `https://api.github.com/repos/${encodeURIComponent(
        owner
      )}/${encodeURIComponent(repo)}/contents/${booksPath}?ref=${encodeURIComponent(ref)}`;

      const response = await fetch(apiUrl, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Zaphnath Bible Reader/1.0',
        },
      });

      if (!response.ok) {
        console.warn(
          `Failed to discover books via GitHub API (${response.status} ${response.statusText}) for ${repositoryUrl.toString()}`
        );
        return [];
      }

      const data = (await response.json()) as Array<{
        type?: string;
        name?: string;
        size?: number;
        download_url?: string;
      }>;

      if (!Array.isArray(data)) {
        return [];
      }

      return data
        .filter(
          (entry) =>
            entry.type === 'file' &&
            typeof entry.name === 'string' &&
            entry.name.toLowerCase().endsWith('.json')
        )
        .sort((left, right) =>
          (left.name ?? '').localeCompare(right.name ?? '', undefined, {
            numeric: true,
            sensitivity: 'base',
          })
        )
        .map((entry) => ({
          path: `books/${entry.name as string}`,
          checksum: '',
          size_bytes: typeof entry.size === 'number' ? entry.size : undefined,
          media_type: 'application/json',
          download_url: typeof entry.download_url === 'string' ? entry.download_url : undefined,
        }));
    } catch {
      return [];
    }
  }
}
