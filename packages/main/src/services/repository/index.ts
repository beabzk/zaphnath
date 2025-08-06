import { RepositoryDiscoveryService } from "./discovery.js";
import { RepositoryImporter } from "./importer.js";
import { ZBRSValidator } from "./validator.js";
import type {
  ImportOptions,
  ImportResult,
  ImportProgress,
  ValidationResult,
  RepositoryIndexEntry,
  RepositorySource,
  SecurityPolicy,
  ZBRSManifest,
} from "./types.js";

export class RepositoryService {
  private static instance: RepositoryService;
  private discoveryService: RepositoryDiscoveryService;
  private importer: RepositoryImporter;
  private validator: ZBRSValidator;
  private isInitialized = false;

  private constructor() {
    const securityPolicy: Partial<SecurityPolicy> = {
      allow_http: false, // Only HTTPS in production
      max_repository_size: 1024 * 1024 * 1024, // 1GB
      max_file_size: 100 * 1024 * 1024, // 100MB per file
      require_checksums: true,
      allowed_domains: [], // Empty = allow all
      blocked_domains: ["malicious-site.com"], // Example blocked domains
    };

    this.discoveryService = new RepositoryDiscoveryService(securityPolicy);
    this.importer = new RepositoryImporter(securityPolicy);
    this.validator = new ZBRSValidator(securityPolicy);
  }

  public static getInstance(): RepositoryService {
    if (!RepositoryService.instance) {
      RepositoryService.instance = new RepositoryService();
    }
    return RepositoryService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log("Initializing repository service...");

      // Initialize default repository sources
      this.setupDefaultSources();

      this.isInitialized = true;
      console.log("Repository service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize repository service:", error);
      throw error;
    }
  }

  private setupDefaultSources(): void {
    // Add official Zaphnath repository
    this.discoveryService.addRepositorySource({
      type: "official",
      url: "https://repositories.zaphnath.org/index.json",
      name: "Official Zaphnath Repositories",
      enabled: true,
    });

    // Add development/local repository for testing
    if (process.env.NODE_ENV === "development") {
      this.discoveryService.addRepositorySource({
        type: "local",
        url: "http://localhost:3000/repositories/index.json",
        name: "Local Development Repositories",
        enabled: false, // Disabled by default
      });
    }
  }

  // Repository Discovery Methods

  public async discoverRepositories(): Promise<RepositoryIndexEntry[]> {
    this.ensureInitialized();
    return this.discoveryService.discoverRepositories();
  }

  public async getRepositoryManifest(
    repositoryUrl: string
  ): Promise<ZBRSManifest> {
    this.ensureInitialized();
    return this.discoveryService.fetchRepositoryManifest(repositoryUrl);
  }

  public async validateRepositoryUrl(url: string): Promise<ValidationResult> {
    this.ensureInitialized();
    return this.discoveryService.validateRepository(url);
  }

  public async scanDirectoryForRepositories(directoryPath: string): Promise<{
    repositories: Array<{
      path: string;
      manifest: any;
      validation: ValidationResult;
    }>;
    errors: string[];
  }> {
    this.ensureInitialized();
    return this.discoveryService.scanDirectoryForRepositories(directoryPath);
  }

  // Repository Import Methods

  public async importRepository(options: ImportOptions): Promise<ImportResult> {
    this.ensureInitialized();
    return this.importer.importRepository(options);
  }

  public async importRepositoryWithProgress(
    repositoryUrl: string,
    progressCallback: (progress: ImportProgress) => void,
    options?: Partial<ImportOptions>
  ): Promise<ImportResult> {
    const importOptions: ImportOptions = {
      repository_url: repositoryUrl,
      validate_checksums: true,
      download_audio: false,
      overwrite_existing: false,
      progress_callback: progressCallback,
      ...options,
    };

    return this.importRepository(importOptions);
  }

  // Repository Source Management

  public getRepositorySources(): RepositorySource[] {
    this.ensureInitialized();
    return this.discoveryService.getRepositorySources();
  }

  public addRepositorySource(source: RepositorySource): void {
    this.ensureInitialized();
    this.discoveryService.addRepositorySource(source);
  }

  public removeRepositorySource(url: string): boolean {
    this.ensureInitialized();
    return this.discoveryService.removeRepositorySource(url);
  }

  public enableRepositorySource(url: string, enabled: boolean): boolean {
    this.ensureInitialized();
    return this.discoveryService.enableRepositorySource(url, enabled);
  }

  // Validation Methods

  public async validateManifest(manifest: any): Promise<ValidationResult> {
    this.ensureInitialized();
    return this.validator.validateManifest(manifest);
  }

  public async validateBook(
    book: any,
    expectedOrder?: number
  ): Promise<ValidationResult> {
    this.ensureInitialized();
    return this.validator.validateBook(book, expectedOrder);
  }

  // Utility Methods

  public clearCache(): void {
    this.ensureInitialized();
    this.discoveryService.clearCache();
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error(
        "Repository service not initialized. Call initialize() first."
      );
    }
  }

  // Static helper methods for creating repositories

  public static createRepositorySource(
    type: "official" | "third-party" | "local",
    url: string,
    name: string,
    enabled: boolean = true
  ): RepositorySource {
    return {
      type,
      url,
      name,
      enabled,
      last_checked: new Date().toISOString(),
    };
  }

  public static createImportOptions(
    repositoryUrl: string,
    options?: {
      validateChecksums?: boolean;
      downloadAudio?: boolean;
      overwriteExisting?: boolean;
      progressCallback?: (progress: ImportProgress) => void;
    }
  ): ImportOptions {
    return {
      repository_url: repositoryUrl,
      validate_checksums: options?.validateChecksums ?? true,
      download_audio: options?.downloadAudio ?? false,
      overwrite_existing: options?.overwriteExisting ?? false,
      progress_callback: options?.progressCallback,
    };
  }
}

// Export individual components for advanced usage
export { RepositoryDiscoveryService } from "./discovery.js";
export { RepositoryImporter } from "./importer.js";
export { ZBRSValidator } from "./validator.js";
export * from "./types.js";

// Export the main service as default
export default RepositoryService;
