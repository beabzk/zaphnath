import type {
  TranslationReference,
  ValidationResult,
  ZBRSManifest,
  ZBRSTranslationManifest,
} from './types.js';
import { isParentManifest, isTranslationManifest, NetworkError } from './types.js';
import type { ZBRSValidator } from './validator.js';
import type { RepositoryManifestClient } from './repositoryManifestClient.js';

export class RepositoryManifestDiscovery {
  constructor(
    private validator: ZBRSValidator,
    private manifestClient: RepositoryManifestClient
  ) {}

  public async fetchRepositoryManifest(repositoryUrl: string): Promise<ZBRSManifest> {
    const manifestUrl = this.manifestClient.resolveRepositoryManifestUrl(repositoryUrl);

    console.log(`Fetching manifest from: ${manifestUrl}`);

    const urlValidation = this.validator.validateRepositoryUrl(manifestUrl);
    if (!urlValidation.valid) {
      throw new NetworkError(
        `Invalid repository URL: ${urlValidation.errors.map((error) => error.message).join(', ')}`,
        manifestUrl
      );
    }

    try {
      const manifest = await this.manifestClient.fetchRepositoryManifest(repositoryUrl);
      const validation = this.validator.validateManifest(manifest);

      if (!validation.valid) {
        throw new Error(
          `Invalid manifest: ${validation.errors.map((error) => error.message).join(', ')}`
        );
      }

      return manifest;
    } catch (error) {
      throw new NetworkError(`Failed to fetch repository manifest: ${error}`, manifestUrl);
    }
  }

  public async validateRepository(repositoryUrl: string): Promise<ValidationResult> {
    try {
      const manifest = await this.fetchRepositoryManifest(repositoryUrl);
      return this.validator.validateManifest(manifest);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            code: 'FETCH_ERROR',
            message: `Failed to validate repository: ${error}`,
            severity: 'error',
            name: 'ValidationError',
          },
        ],
        warnings: [],
      };
    }
  }

  public async fetchTranslationManifest(
    repositoryUrl: string,
    translationDirectory: string
  ): Promise<ZBRSTranslationManifest> {
    const manifestUrl = this.manifestClient.resolveTranslationManifestUrl(
      repositoryUrl,
      translationDirectory
    );

    try {
      return await this.manifestClient.fetchTranslationManifest(
        repositoryUrl,
        translationDirectory
      );
    } catch (error) {
      throw new NetworkError(`Failed to fetch translation manifest: ${error}`, manifestUrl);
    }
  }

  public async discoverTranslations(repositoryUrl: string): Promise<TranslationReference[]> {
    try {
      const manifest = await this.fetchRepositoryManifest(repositoryUrl);

      if (!isParentManifest(manifest)) {
        if (isTranslationManifest(manifest)) {
          return [
            {
              id: manifest.repository.id,
              name: manifest.repository.name,
              directory: '.',
              language: manifest.repository.language,
              status: 'active',
              checksum: manifest.technical.checksum,
              size_bytes: manifest.technical.size_bytes,
            },
          ];
        }

        throw new Error('Repository is neither a parent nor a translation manifest');
      }

      return manifest.translations;
    } catch (error) {
      throw new NetworkError(`Failed to discover translations: ${error}`, repositoryUrl);
    }
  }

  public async validateTranslation(
    repositoryUrl: string,
    translationDirectory: string
  ): Promise<ValidationResult> {
    try {
      const manifest = await this.fetchTranslationManifest(repositoryUrl, translationDirectory);
      return this.validator.validateManifest(manifest);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            code: 'TRANSLATION_FETCH_ERROR',
            message: `Failed to validate translation: ${error}`,
            severity: 'error',
            name: 'ValidationError',
          },
        ],
        warnings: [],
      };
    }
  }
}
