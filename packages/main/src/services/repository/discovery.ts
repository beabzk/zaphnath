import { net } from "electron";
import { createHash } from "crypto";
import { readFile, access, readdir, stat } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
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
} from "./types.js";
import { isParentManifest, isTranslationManifest } from "./types.js";
import { NetworkError } from "./types.js";
import { ZBRSValidator } from "./validator.js";

export class RepositoryDiscoveryService {
  private validator: ZBRSValidator;
  private repositorySources: RepositorySource[] = [];
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.validator = new ZBRSValidator(securityPolicy);
    this.initializeDefaultSources();
  }

  private initializeDefaultSources(): void {
    // Official Zaphnath repository registry
    this.repositorySources.push({
      type: "official",
      url: "https://raw.githubusercontent.com/beabzk/zbrs-registry/main/manifest.json",
      name: "Official Zaphnath Repositories",
      enabled: true,
    });

    // Example third-party sources (would be configurable)
    this.repositorySources.push({
      type: "third-party",
      url: "https://bible-repositories.example.com/index.json",
      name: "Community Bible Repositories",
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

  public async fetchRepositoryIndex(
    indexUrl: string
  ): Promise<RepositoryIndexEntry[]> {
    // Check cache first
    const cached = this.cache.get(indexUrl);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // Validate URL
    const urlValidation = this.validator.validateRepositoryUrl(indexUrl);
    if (!urlValidation.valid) {
      throw new NetworkError(
        `Invalid repository index URL: ${urlValidation.errors
          .map((e) => e.message)
          .join(", ")}`,
        indexUrl
      );
    }

    try {
      const response = await this.fetchJson(indexUrl);

      // Handle GitHub registry format
      if (response.registry && Array.isArray(response.repositories)) {
        const repositories = response.repositories.map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          url: repo.url,
          language: repo.language || 'unknown',
          license: repo.license || 'unknown',
          verified: repo.verified || false,
          last_updated: repo.last_updated,
          description: repo.description,
          tags: repo.tags || []
        }));

        // Cache the result
        this.cache.set(indexUrl, {
          data: repositories,
          timestamp: Date.now(),
        });

        return repositories;
      }

      // Handle legacy format
      const index = response as RepositoryIndex;
      if (!index.version || !Array.isArray(index.repositories)) {
        throw new Error("Invalid repository index format");
      }

      // Cache the result
      this.cache.set(indexUrl, {
        data: index.repositories,
        timestamp: Date.now(),
      });

      return index.repositories;
    } catch (error) {
      throw new NetworkError(
        `Failed to fetch repository index: ${error}`,
        indexUrl
      );
    }
  }

  public async fetchRepositoryManifest(
    repositoryUrl: string
  ): Promise<ZBRSManifest> {
    // Handle URLs that already point to manifest.json
    let manifestUrl: string;
    if (repositoryUrl.endsWith("manifest.json")) {
      manifestUrl = repositoryUrl;
    } else {
      // Ensure URL ends with manifest.json
      manifestUrl = repositoryUrl.endsWith("/")
        ? `${repositoryUrl}manifest.json`
        : `${repositoryUrl}/manifest.json`;
    }

    console.log(`Fetching manifest from: ${manifestUrl}`);

    // Validate URL
    const urlValidation = this.validator.validateRepositoryUrl(manifestUrl);
    if (!urlValidation.valid) {
      throw new NetworkError(
        `Invalid repository URL: ${urlValidation.errors
          .map((e) => e.message)
          .join(", ")}`,
        manifestUrl
      );
    }

    try {
      const manifest = (await this.fetchJson(manifestUrl)) as ZBRSManifest;

      // Validate manifest
      const validation = this.validator.validateManifest(manifest);
      if (!validation.valid) {
        throw new Error(
          `Invalid manifest: ${validation.errors
            .map((e) => e.message)
            .join(", ")}`
        );
      }

      return manifest;
    } catch (error) {
      throw new NetworkError(
        `Failed to fetch repository manifest: ${error}`,
        manifestUrl
      );
    }
  }

  public async validateRepository(
    repositoryUrl: string
  ): Promise<ValidationResult> {
    try {
      const manifest = await this.fetchRepositoryManifest(repositoryUrl);
      return this.validator.validateManifest(manifest);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            code: "FETCH_ERROR",
            message: `Failed to validate repository: ${error}`,
            severity: "error",
            name: "ValidationError",
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
      const baseUrl = repositoryUrl.endsWith("/")
        ? repositoryUrl
        : `${repositoryUrl}/`;
      const manifestUrl = `${baseUrl}${translationDirectory}/manifest.json`;

      // For local file paths, use direct file reading
      if (repositoryUrl.startsWith("file://")) {
        const { fileURLToPath } = await import("url");
        const { readFile } = await import("fs/promises");
        const { join } = await import("path");

        const localPath = fileURLToPath(repositoryUrl);
        const manifestPath = join(
          localPath,
          translationDirectory,
          "manifest.json"
        );

        const manifestContent = await readFile(manifestPath, "utf-8");
        // Remove BOM if present
        const cleanContent = manifestContent.replace(/^\uFEFF/, '');
        const manifest = JSON.parse(cleanContent) as ZBRSManifest;

        if (!isTranslationManifest(manifest)) {
          throw new Error("Invalid translation manifest structure");
        }

        return manifest;
      } else {
        // For HTTP URLs, use the existing fetch logic
        const manifest = await this.fetchRepositoryManifest(
          manifestUrl.replace("/manifest.json", "")
        );

        if (!isTranslationManifest(manifest)) {
          throw new Error("Invalid translation manifest structure");
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

  public async discoverTranslations(
    repositoryUrl: string
  ): Promise<TranslationReference[]> {
    try {
      const manifest = await this.fetchRepositoryManifest(repositoryUrl);

      if (!isParentManifest(manifest)) {
        // If it's a translation manifest, return it as a single translation
        if (isTranslationManifest(manifest)) {
          return [
            {
              id: manifest.repository.id,
              name: manifest.repository.name,
              directory: ".", // Current directory
              language: manifest.repository.language,
              status: "active" as const,
            },
          ];
        }
        throw new Error(
          "Repository is neither a parent nor a translation manifest"
        );
      }

      return manifest.translations;
    } catch (error) {
      throw new NetworkError(
        `Failed to discover translations: ${error}`,
        repositoryUrl
      );
    }
  }

  public async validateTranslation(
    repositoryUrl: string,
    translationDirectory: string
  ): Promise<ValidationResult> {
    try {
      const manifest = await this.fetchTranslationManifest(
        repositoryUrl,
        translationDirectory
      );
      return this.validator.validateManifest(manifest);
    } catch (error) {
      return {
        valid: false,
        errors: [
          {
            code: "TRANSLATION_FETCH_ERROR",
            message: `Failed to validate translation: ${error}`,
            severity: "error",
            name: "ValidationError",
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
  public async scanDirectoryForRepositories(directoryPath: string): Promise<{
    repositories: Array<{
      path: string;
      manifest: ZBRSManifest;
      validation: ValidationResult;
    }>;
    errors: string[];
  }> {
    const repositories: Array<{
      path: string;
      manifest: ZBRSManifest;
      validation: ValidationResult;
    }> = [];
    const errors: string[] = [];

    try {
      // Convert to file:// URL if it's a local path
      const directoryUrl = directoryPath.startsWith("file://")
        ? directoryPath
        : `file://${directoryPath.replace(/\\/g, "/")}`;

      const localPath = fileURLToPath(directoryUrl);

      // Check if directory exists
      const dirStat = await stat(localPath);
      if (!dirStat.isDirectory()) {
        errors.push(`Path is not a directory: ${localPath}`);
        return { repositories, errors };
      }

      // Read directory contents
      const entries = await readdir(localPath, { withFileTypes: true });

      // Check each subdirectory for a manifest.json file
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDirPath = join(localPath, entry.name);
          const manifestPath = join(subDirPath, "manifest.json");

          try {
            // Check if manifest.json exists
            await access(manifestPath);

            // Try to read and validate the manifest
            const manifestContent = await readFile(manifestPath, "utf-8");
            // Remove BOM if present
            const cleanContent = manifestContent.replace(/^\uFEFF/, '');
            const manifest = JSON.parse(cleanContent) as ZBRSManifest;

            // Validate the manifest
            const validation = this.validator.validateManifest(manifest);

            // Convert back to file:// URL for consistency
            const repositoryUrl = `file://${subDirPath.replace(/\\/g, "/")}`;

            repositories.push({
              path: repositoryUrl,
              manifest,
              validation,
            });
          } catch (error) {
            // Skip directories without valid manifests, but don't treat as errors
            // This allows parent directories to contain non-repository folders
            console.log(`Skipping directory ${entry.name}: ${error}`);
          }
        }
      }

      // If no repositories found, check if the directory itself is a repository
      if (repositories.length === 0) {
        const manifestPath = join(localPath, "manifest.json");
        try {
          await access(manifestPath);
          const manifestContent = await readFile(manifestPath, "utf-8");
          // Remove BOM if present
          const cleanContent = manifestContent.replace(/^\uFEFF/, '');
          const manifest = JSON.parse(cleanContent) as ZBRSManifest;
          const validation = this.validator.validateManifest(manifest);

          repositories.push({
            path: directoryUrl,
            manifest,
            validation,
          });
        } catch (error) {
          errors.push(
            `No repositories found in directory and directory itself is not a valid repository: ${error}`
          );
        }
      }
    } catch (error) {
      errors.push(`Failed to scan directory: ${error}`);
    }

    return { repositories, errors };
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
    const translations: Array<{
      path: string;
      directory: string;
      manifest: ZBRSTranslationManifest;
      validation: ValidationResult;
    }> = [];
    const errors: string[] = [];
    let parentRepository:
      | {
        path: string;
        manifest: ZBRSParentManifest;
        validation: ValidationResult;
      }
      | undefined;

    try {
      const directoryUrl = directoryPath.startsWith("file://")
        ? directoryPath
        : `file://${directoryPath.replace(/\\/g, "/")}`;

      const localPath = fileURLToPath(directoryUrl);

      // Check if directory exists
      const dirStat = await stat(localPath);
      if (!dirStat.isDirectory()) {
        errors.push(`Path is not a directory: ${localPath}`);
        return { parentRepository, translations, errors };
      }

      // First, check if this directory has a parent manifest
      const parentManifestPath = join(localPath, "manifest.json");
      try {
        await access(parentManifestPath);
        const manifestContent = await readFile(parentManifestPath, "utf-8");
        // Remove BOM if present
        const cleanContent = manifestContent.replace(/^\uFEFF/, '');
        const manifest = JSON.parse(cleanContent) as ZBRSManifest;

        if (isParentManifest(manifest)) {
          const validation = this.validator.validateManifest(manifest);
          parentRepository = {
            path: directoryUrl,
            manifest,
            validation,
          };

          // Now scan for translations based on the parent manifest
          for (const translationRef of manifest.translations) {
            const translationPath = join(localPath, translationRef.directory);
            const translationManifestPath = join(
              translationPath,
              "manifest.json"
            );

            try {
              await access(translationManifestPath);
              const translationContent = await readFile(
                translationManifestPath,
                "utf-8"
              );
              // Remove BOM if present
              const cleanTranslationContent = translationContent.replace(/^\uFEFF/, '');
              const translationManifest = JSON.parse(
                cleanTranslationContent
              ) as ZBRSManifest;

              if (isTranslationManifest(translationManifest)) {
                const translationValidation =
                  this.validator.validateManifest(translationManifest);
                const translationUrl = `file://${translationPath.replace(
                  /\\/g,
                  "/"
                )}`;

                translations.push({
                  path: translationUrl,
                  directory: translationRef.directory,
                  manifest: translationManifest,
                  validation: translationValidation,
                });
              } else {
                errors.push(
                  `Invalid translation manifest in ${translationRef.directory}`
                );
              }
            } catch (error) {
              errors.push(
                `Failed to load translation ${translationRef.directory}: ${error}`
              );
            }
          }
        }
      } catch (error) {
        // No parent manifest, treat as individual translation or scan for translations
        console.log(`No parent manifest found: ${error}`);
      }

      // If no parent repository found, scan for individual translation directories
      if (!parentRepository) {
        const entries = await readdir(localPath, { withFileTypes: true });

        for (const entry of entries) {
          if (entry.isDirectory()) {
            const subDirPath = join(localPath, entry.name);
            const manifestPath = join(subDirPath, "manifest.json");

            try {
              await access(manifestPath);
              const manifestContent = await readFile(manifestPath, "utf-8");
              // Remove BOM if present
              const cleanContent = manifestContent.replace(/^\uFEFF/, '');
              const manifest = JSON.parse(cleanContent) as ZBRSManifest;

              if (isTranslationManifest(manifest)) {
                const validation = this.validator.validateManifest(manifest);
                const translationUrl = `file://${subDirPath.replace(
                  /\\/g,
                  "/"
                )}`;

                translations.push({
                  path: translationUrl,
                  directory: entry.name,
                  manifest,
                  validation,
                });
              }
            } catch (error) {
              console.log(`Skipping directory ${entry.name}: ${error}`);
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to scan hierarchical repository: ${error}`);
    }

    return { parentRepository, translations, errors };
  }

  public addRepositorySource(source: RepositorySource): void {
    // Check if source already exists
    const existingIndex = this.repositorySources.findIndex(
      (s) => s.url === source.url
    );
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

  private async fetchJson(url: string): Promise<any> {
    // Handle local file:// URLs
    if (url.startsWith("file://")) {
      return this.fetchLocalJson(url);
    }

    // Handle HTTP/HTTPS URLs
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: "GET",
        url: url,
        headers: {
          "User-Agent": "Zaphnath Bible Reader/1.0",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      let responseData = "";

      request.on("response", (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
          return;
        }

        const contentType = response.headers["content-type"];
        if (contentType && !contentType.includes("application/json")) {
          console.warn(`Unexpected content type: ${contentType}`);
        }

        response.on("data", (chunk) => {
          responseData += chunk.toString();
        });

        response.on("end", () => {
          clearTimeout(timeout);
          try {
            // Remove BOM (Byte Order Mark) if present - common with GitHub raw content
            const cleanData = responseData.replace(/^\uFEFF/, '');
            const jsonData = JSON.parse(cleanData);
            resolve(jsonData);
          } catch (error) {
            reject(new Error(`Invalid JSON response: ${error}`));
          }
        });
      });

      request.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Network error: ${error.message}`));
      });

      // Set timeout
      const timeout = setTimeout(() => {
        request.abort();
        reject(new Error("Request timeout"));
      }, 30000);

      request.end();
    });
  }

  private async fetchLocalJson(fileUrl: string): Promise<any> {
    try {
      // Convert file:// URL to local path (cross-platform)
      const filePath = fileURLToPath(fileUrl);

      // Check if file exists
      await access(filePath);

      // Read and parse JSON file
      const fileContent = await readFile(filePath, "utf-8");
      // Remove BOM (Byte Order Mark) if present
      const cleanContent = fileContent.replace(/^\uFEFF/, '');
      return JSON.parse(cleanContent);
    } catch (error) {
      throw new Error(`Failed to read local file: ${error}`);
    }
  }

  public async downloadFile(
    url: string,
    maxSize: number = 100 * 1024 * 1024
  ): Promise<Buffer> {
    // Handle local file:// URLs
    if (url.startsWith("file://")) {
      return this.downloadLocalFile(url, maxSize);
    }

    // Handle HTTP/HTTPS URLs
    return new Promise((resolve, reject) => {
      const request = net.request({
        method: "GET",
        url: url,
        headers: {
          "User-Agent": "Zaphnath Bible Reader/1.0",
        },
      });

      const chunks: Buffer[] = [];
      let totalSize = 0;

      request.on("response", (response) => {
        if (response.statusCode !== 200) {
          reject(
            new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`)
          );
          return;
        }

        const contentLength = parseInt(
          (response.headers["content-length"] as string) || "0"
        );
        if (contentLength > maxSize) {
          reject(
            new Error(
              `File too large: ${contentLength} bytes (max: ${maxSize})`
            )
          );
          return;
        }

        response.on("data", (chunk) => {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            request.abort();
            reject(new Error(`File too large: exceeded ${maxSize} bytes`));
            return;
          }
          chunks.push(chunk);
        });

        response.on("end", () => {
          clearTimeout(timeout);
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
      });

      request.on("error", (error) => {
        clearTimeout(timeout);
        reject(new Error(`Download error: ${error.message}`));
      });

      const timeout = setTimeout(() => {
        request.abort();
        reject(new Error("Download timeout"));
      }, 60000);

      request.end();
    });
  }

  private async downloadLocalFile(
    fileUrl: string,
    maxSize: number
  ): Promise<Buffer> {
    try {
      // Convert file:// URL to local path
      const filePath = fileURLToPath(fileUrl);

      // Check if file exists
      await access(filePath);

      // Read file as buffer
      const fileBuffer = await readFile(filePath);

      // Check file size
      if (fileBuffer.length > maxSize) {
        throw new Error(
          `File too large: ${fileBuffer.length} bytes (max: ${maxSize})`
        );
      }

      return fileBuffer;
    } catch (error) {
      throw new Error(`Failed to read local file: ${error}`);
    }
  }

  public calculateChecksum(data: Buffer): string {
    const hash = createHash("sha256");
    hash.update(data);
    return `sha256:${hash.digest("hex")}`;
  }
}
