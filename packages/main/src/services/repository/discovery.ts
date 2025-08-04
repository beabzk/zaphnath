import { net } from "electron";
import { createHash } from "crypto";
import type {
  RepositoryIndex,
  RepositoryIndexEntry,
  RepositorySource,
  ZBRSManifest,
  ValidationResult,
  SecurityPolicy,
} from "./types.js";
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
    // Official Zaphnath repository index
    this.repositorySources.push({
      type: "official",
      url: "https://repositories.zaphnath.org/index.json",
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
      const index = response as RepositoryIndex;

      // Validate index structure
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
    // Ensure URL ends with manifest.json
    const manifestUrl = repositoryUrl.endsWith("/")
      ? `${repositoryUrl}manifest.json`
      : `${repositoryUrl}/manifest.json`;

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
            const jsonData = JSON.parse(responseData);
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

  public async downloadFile(
    url: string,
    maxSize: number = 100 * 1024 * 1024
  ): Promise<Buffer> {
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

  public calculateChecksum(data: Buffer): string {
    const hash = createHash("sha256");
    hash.update(data);
    return `sha256:${hash.digest("hex")}`;
  }
}
