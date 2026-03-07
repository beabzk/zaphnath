import type { ZBRSManifest, ZBRSTranslationManifest } from './types.js';
import { isTranslationManifest } from './types.js';
import { normalizeRepositoryUrl } from './pathUtils.js';
import type { RepositoryResourceClient } from './repositoryResourceClient.js';

const MANIFEST_FILE_NAME = 'manifest.json';

export class RepositoryManifestClient {
  constructor(private resourceClient: RepositoryResourceClient) {}

  public resolveRepositoryManifestUrl(repositoryUrl: string): string {
    const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
    if (normalizedRepositoryUrl.endsWith(MANIFEST_FILE_NAME)) {
      return normalizedRepositoryUrl;
    }

    return normalizedRepositoryUrl.endsWith('/')
      ? `${normalizedRepositoryUrl}${MANIFEST_FILE_NAME}`
      : `${normalizedRepositoryUrl}/${MANIFEST_FILE_NAME}`;
  }

  public resolveTranslationManifestUrl(
    repositoryUrl: string,
    translationDirectory: string
  ): string {
    const normalizedDirectory = translationDirectory.replace(/^\/+|\/+$/g, '');
    if (!normalizedDirectory || normalizedDirectory === '.') {
      return this.resolveRepositoryManifestUrl(repositoryUrl);
    }

    return `${this.resolveRepositoryBaseUrl(repositoryUrl)}${normalizedDirectory}/${MANIFEST_FILE_NAME}`;
  }

  public async fetchRepositoryManifest(repositoryUrl: string): Promise<ZBRSManifest> {
    return this.fetchManifest(this.resolveRepositoryManifestUrl(repositoryUrl));
  }

  public async fetchTranslationManifest(
    repositoryUrl: string,
    translationDirectory: string
  ): Promise<ZBRSTranslationManifest> {
    const manifest = await this.fetchManifest(
      this.resolveTranslationManifestUrl(repositoryUrl, translationDirectory)
    );

    if (!isTranslationManifest(manifest)) {
      throw new Error('Invalid translation manifest structure');
    }

    return manifest;
  }

  private async fetchManifest(manifestUrl: string): Promise<ZBRSManifest> {
    return (await this.resourceClient.fetchJson(manifestUrl)) as ZBRSManifest;
  }

  private resolveRepositoryBaseUrl(repositoryUrl: string): string {
    const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);
    if (normalizedRepositoryUrl.endsWith(MANIFEST_FILE_NAME)) {
      return normalizedRepositoryUrl.slice(0, -MANIFEST_FILE_NAME.length);
    }

    return normalizedRepositoryUrl.endsWith('/')
      ? normalizedRepositoryUrl
      : `${normalizedRepositoryUrl}/`;
  }
}
