import type {
  RepositoryIndex,
  RepositoryIndexEntry,
  RepositorySource,
  ZBRSManifest,
  ZBRSParentManifest,
  ZBRSTranslationManifest,
  TranslationReference,
  ValidationResult,
  SecurityPolicy,
} from './types.js';
import { isParentManifest, isTranslationManifest } from './types.js';
import { NetworkError } from './types.js';
import { ZBRSValidator } from './validator.js';
import { normalizeRepositoryUrl } from './pathUtils.js';
import { RepositoryResourceClient } from './repositoryResourceClient.js';
import { LocalRepositoryScanner } from './localRepositoryScanner.js';

type RepositoryRegistryResponse = {
  registry?: unknown;
  repositories?: Array<Record<string, unknown>>;
};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const toRepositoryIndexEntry = (repo: Record<string, unknown>): RepositoryIndexEntry => ({
  id: asString(repo.id),
  name: asString(repo.name),
  url: asString(repo.url),
  language: asString(repo.language, 'unknown'),
  license: asString(repo.license, 'unknown'),
  verified: asBoolean(repo.verified),
  last_updated: asString(repo.last_updated),
  description: typeof repo.description === 'string' ? repo.description : undefined,
  tags: asStringArray(repo.tags),
});

export class RepositoryDiscoveryService {
  private validator: ZBRSValidator;
  private repositorySources: RepositorySource[] = [];
  private resourceClient: RepositoryResourceClient;
  private localScanner: LocalRepositoryScanner;
  private cache: Map<string, { data: RepositoryIndexEntry[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.validator = new ZBRSValidator(securityPolicy);
    this.resourceClient = new RepositoryResourceClient();
    this.localScanner = new LocalRepositoryScanner(this.validator);
    this.initializeDefaultSources();
  }

  private initializeDefaultSources(): void {
    // Official Zaphnath repository registry
    this.repositorySources.push({
      type: 'official',
      url: 'https://raw.githubusercontent.com/beabzk/zbrs-registry/main/manifest.json',
      name: 'Official Zaphnath Repositories',
      enabled: true,
    });

    // Example third-party sources (would be configurable)
    this.repositorySources.push({
      type: 'third-party',
      url: 'https://bible-repositories.example.com/index.json',
      name: 'Community Bible Repositories',
      enabled: false,
    });
  }

  public async discoverRepositories(): Promise<RepositoryIndexEntry[]> {
    const allRepositories: RepositoryIndexEntry[] = [];
    const errors: string[] = [];

    for (const source of this.repositorySources) {
      if (!source.enabled) continue;

      try {
        console.log(`Discovering repositories from: ${source.name}`);
        const repositories = await this.fetchRepositoryIndex(source.url);
        allRepositories.push(...repositories);
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
        errors.push(`${source.name}: ${error}`);
      }
    }

    // Remove duplicates based on repository ID
    const uniqueRepositories = allRepositories.filter(
      (repo, index, array) => array.findIndex((r) => r.id === repo.id) === index
    );

    console.log(`Discovered ${uniqueRepositories.length} unique repositories`);
    return uniqueRepositories;
  }

  public async fetchRepositoryIndex(indexUrl: string): Promise<RepositoryIndexEntry[]> {
    const normalizedIndexUrl = normalizeRepositoryUrl(indexUrl);

    // Check cache first
    const cached = this.cache.get(normalizedIndexUrl);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Validate URL
    const urlValidation = this.validator.validateRepositoryUrl(normalizedIndexUrl);
    if (!urlValidation.valid) {
      throw new NetworkError(
        `Invalid repository index URL: ${urlValidation.errors.map((e) => e.message).join(', ')}`,
        normalizedIndexUrl
      );
    }

    try {
      const response = (await this.resourceClient.fetchJson(normalizedIndexUrl)) as
        | RepositoryRegistryResponse
        | RepositoryIndex;

      // Handle GitHub registry format
      if ('registry' in response && Array.isArray(response.repositories)) {
        const repositories = response.repositories.map(toRepositoryIndexEntry);

        // Cache the result
        this.cache.set(normalizedIndexUrl, {
          data: repositories,
          timestamp: Date.now(),
        });

        return repositories;
      }

      // Handle legacy format
      const index = response as RepositoryIndex;
      if (!index.version || !Array.isArray(index.repositories)) {
        throw new Error('Invalid repository index format');
      }

      // Cache the result
      this.cache.set(normalizedIndexUrl, {
        data: index.repositories,
        timestamp: Date.now(),
      });

      return index.repositories;
    } catch (error) {
      throw new NetworkError(`Failed to fetch repository index: ${error}`, normalizedIndexUrl);
    }
  }

  public async fetchRepositoryManifest(repositoryUrl: string): Promise<ZBRSManifest> {
    const normalizedRepositoryUrl = normalizeRepositoryUrl(repositoryUrl);

    // Handle URLs that already point to manifest.json
    let manifestUrl: string;
    if (normalizedRepositoryUrl.endsWith('manifest.json')) {
      manifestUrl = normalizedRepositoryUrl;
    } else {
      // Ensure URL ends with manifest.json
      manifestUrl = normalizedRepositoryUrl.endsWith('/')
        ? `${normalizedRepositoryUrl}manifest.json`
        : `${normalizedRepositoryUrl}/manifest.json`;
    }

    console.log(`Fetching manifest from: ${manifestUrl}`);

    // Validate URL
    const urlValidation = this.validator.validateRepositoryUrl(manifestUrl);
    if (!urlValidation.valid) {
      throw new NetworkError(
        `Invalid repository URL: ${urlValidation.errors.map((e) => e.message).join(', ')}`,
        manifestUrl
      );
    }

    try {
      const manifest = (await this.resourceClient.fetchJson(manifestUrl)) as ZBRSManifest;

      // Validate manifest
      const validation = this.validator.validateManifest(manifest);
      if (!validation.valid) {
        throw new Error(`Invalid manifest: ${validation.errors.map((e) => e.message).join(', ')}`);
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

  // New methods for hierarchical repository support

  public async fetchTranslationManifest(
    repositoryUrl: string,
    translationDirectory: string
  ): Promise<ZBRSTranslationManifest> {
    try {
      // Construct the translation manifest URL
      const baseUrl = repositoryUrl.endsWith('/') ? repositoryUrl : `${repositoryUrl}/`;
      const manifestUrl = `${baseUrl}${translationDirectory}/manifest.json`;

      // For local file paths, use direct file reading
      if (repositoryUrl.startsWith('file://')) {
        const { fileURLToPath } = await import('url');
        const { readFile } = await import('fs/promises');
        const { join } = await import('path');

        const localPath = fileURLToPath(repositoryUrl);
        const manifestPath = join(localPath, translationDirectory, 'manifest.json');

        const manifestContent = await readFile(manifestPath, 'utf-8');
        // Remove BOM if present
        const cleanContent = manifestContent.replace(/^\uFEFF/, '');
        const manifest = JSON.parse(cleanContent) as ZBRSManifest;

        if (!isTranslationManifest(manifest)) {
          throw new Error('Invalid translation manifest structure');
        }

        return manifest;
      } else {
        // For HTTP URLs, use the existing fetch logic
        const manifest = await this.fetchRepositoryManifest(
          manifestUrl.replace('/manifest.json', '')
        );

        if (!isTranslationManifest(manifest)) {
          throw new Error('Invalid translation manifest structure');
        }

        return manifest;
      }
    } catch (error) {
      throw new NetworkError(
        `Failed to fetch translation manifest: ${error}`,
        `${repositoryUrl}/${translationDirectory}/manifest.json`
      );
    }
  }

  public async discoverTranslations(repositoryUrl: string): Promise<TranslationReference[]> {
    try {
      const manifest = await this.fetchRepositoryManifest(repositoryUrl);

      if (!isParentManifest(manifest)) {
        // If it's a translation manifest, return it as a single translation
        if (isTranslationManifest(manifest)) {
          return [
            {
              id: manifest.repository.id,
              name: manifest.repository.name,
              directory: '.', // Current directory
              language: manifest.repository.language,
              status: 'active' as const,
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

  /**
   * Scans a directory for multiple repositories and returns their information
   * This handles the case where users select a parent directory containing multiple translation directories
   */
  public async scanDirectoryForRepositories(
    directoryPath: string
  ): Promise<Zaphnath.RepositoryScanResult> {
    return this.localScanner.scanDirectoryForRepositories(directoryPath);
  }

  /**
   * Scans a directory specifically for hierarchical repositories
   * Returns both parent repositories and their translations
   */
  public async scanHierarchicalRepository(directoryPath: string): Promise<{
    parentRepository?: {
      path: string;
      manifest: ZBRSParentManifest;
      validation: ValidationResult;
    };
    translations: Array<{
      path: string;
      directory: string;
      manifest: ZBRSTranslationManifest;
      validation: ValidationResult;
    }>;
    errors: string[];
  }> {
    return this.localScanner.scanHierarchicalRepository(directoryPath);
  }

  public addRepositorySource(source: RepositorySource): void {
    // Check if source already exists
    const existingIndex = this.repositorySources.findIndex((s) => s.url === source.url);
    if (existingIndex >= 0) {
      this.repositorySources[existingIndex] = source;
    } else {
      this.repositorySources.push(source);
    }
  }

  public removeRepositorySource(url: string): boolean {
    const index = this.repositorySources.findIndex((s) => s.url === url);
    if (index >= 0) {
      this.repositorySources.splice(index, 1);
      return true;
    }
    return false;
  }

  public getRepositorySources(): RepositorySource[] {
    return [...this.repositorySources];
  }

  public enableRepositorySource(url: string, enabled: boolean): boolean {
    const source = this.repositorySources.find((s) => s.url === url);
    if (source) {
      source.enabled = enabled;
      return true;
    }
    return false;
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public async downloadFile(url: string, maxSize: number = 100 * 1024 * 1024): Promise<Buffer> {
    return this.resourceClient.downloadFile(url, maxSize);
  }

  public calculateChecksum(data: Buffer): string {
    return this.resourceClient.calculateChecksum(data);
  }
}
