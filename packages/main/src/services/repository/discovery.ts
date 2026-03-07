import type {
  RepositoryIndexEntry,
  RepositorySource,
  ZBRSParentManifest,
  ZBRSTranslationManifest,
  TranslationReference,
  ValidationResult,
  SecurityPolicy,
} from './types.js';
import { ZBRSValidator } from './validator.js';
import { RepositoryResourceClient } from './repositoryResourceClient.js';
import { LocalRepositoryScanner } from './localRepositoryScanner.js';
import { RepositoryManifestClient } from './repositoryManifestClient.js';
import { RepositoryManifestDiscovery } from './repositoryManifestDiscovery.js';
import { RepositoryIndexClient } from './repositoryIndexClient.js';
import { RepositorySourceRegistry } from './repositorySourceRegistry.js';

export class RepositoryDiscoveryService {
  private validator: ZBRSValidator;
  private resourceClient: RepositoryResourceClient;
  private localScanner: LocalRepositoryScanner;
  private manifestDiscovery: RepositoryManifestDiscovery;
  private indexClient: RepositoryIndexClient;
  private sourceRegistry: RepositorySourceRegistry;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.validator = new ZBRSValidator(securityPolicy);
    this.resourceClient = new RepositoryResourceClient();
    const manifestClient = new RepositoryManifestClient(this.resourceClient);
    this.manifestDiscovery = new RepositoryManifestDiscovery(this.validator, manifestClient);
    this.localScanner = new LocalRepositoryScanner(this.validator);
    this.indexClient = new RepositoryIndexClient(securityPolicy);
    this.sourceRegistry = new RepositorySourceRegistry();
  }

  public async discoverRepositories(): Promise<RepositoryIndexEntry[]> {
    const allRepositories: RepositoryIndexEntry[] = [];

    for (const source of this.sourceRegistry.getSources()) {
      if (!source.enabled) continue;

      try {
        console.log(`Discovering repositories from: ${source.name}`);
        const repositories = await this.indexClient.fetchRepositoryIndex(source.url);
        allRepositories.push(...repositories);
      } catch (error) {
        console.error(`Failed to fetch from ${source.name}:`, error);
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
    return this.indexClient.fetchRepositoryIndex(indexUrl);
  }

  public async fetchRepositoryManifest(repositoryUrl: string) {
    return this.manifestDiscovery.fetchRepositoryManifest(repositoryUrl);
  }

  public async validateRepository(repositoryUrl: string): Promise<ValidationResult> {
    return this.manifestDiscovery.validateRepository(repositoryUrl);
  }

  // New methods for hierarchical repository support

  public async fetchTranslationManifest(
    repositoryUrl: string,
    translationDirectory: string
  ): Promise<ZBRSTranslationManifest> {
    return this.manifestDiscovery.fetchTranslationManifest(repositoryUrl, translationDirectory);
  }

  public async discoverTranslations(repositoryUrl: string): Promise<TranslationReference[]> {
    return this.manifestDiscovery.discoverTranslations(repositoryUrl);
  }

  public async validateTranslation(
    repositoryUrl: string,
    translationDirectory: string
  ): Promise<ValidationResult> {
    return this.manifestDiscovery.validateTranslation(repositoryUrl, translationDirectory);
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
    this.sourceRegistry.add(source);
  }

  public removeRepositorySource(url: string): boolean {
    return this.sourceRegistry.remove(url);
  }

  public getRepositorySources(): RepositorySource[] {
    return this.sourceRegistry.getSources();
  }

  public enableRepositorySource(url: string, enabled: boolean): boolean {
    return this.sourceRegistry.setEnabled(url, enabled);
  }

  public clearCache(): void {
    this.indexClient.clearCache();
  }

  public async downloadFile(url: string, maxSize: number = 100 * 1024 * 1024): Promise<Buffer> {
    return this.resourceClient.downloadFile(url, maxSize);
  }

  public calculateChecksum(data: Buffer): string {
    return this.resourceClient.calculateChecksum(data);
  }
}
