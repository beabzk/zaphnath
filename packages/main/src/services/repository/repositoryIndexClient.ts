import type { RepositoryIndex, RepositoryIndexEntry, SecurityPolicy } from './types.js';
import { NetworkError } from './types.js';
import { normalizeRepositoryUrl } from './pathUtils.js';
import { RepositoryResourceClient } from './repositoryResourceClient.js';
import { ZBRSValidator } from './validator.js';

type RepositoryRegistryResponse = {
  registry?: unknown;
  repositories: Array<Record<string, unknown>>;
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

export class RepositoryIndexClient {
  private cache: Map<string, { data: RepositoryIndexEntry[]; timestamp: number }> = new Map();
  private readonly cacheTtl = 5 * 60 * 1000;
  private readonly resourceClient = new RepositoryResourceClient();
  private readonly validator: ZBRSValidator;

  constructor(securityPolicy?: Partial<SecurityPolicy>) {
    this.validator = new ZBRSValidator(securityPolicy);
  }

  public async fetchRepositoryIndex(indexUrl: string): Promise<RepositoryIndexEntry[]> {
    const normalizedIndexUrl = normalizeRepositoryUrl(indexUrl);
    const cached = this.cache.get(normalizedIndexUrl);

    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    const urlValidation = this.validator.validateRepositoryUrl(normalizedIndexUrl);
    if (!urlValidation.valid) {
      throw new NetworkError(
        `Invalid repository index URL: ${urlValidation.errors.map((error) => error.message).join(', ')}`,
        normalizedIndexUrl
      );
    }

    try {
      const response = await this.resourceClient.fetchJson(normalizedIndexUrl);
      const repositories = this.parseRepositoryIndex(response);

      this.cache.set(normalizedIndexUrl, {
        data: repositories,
        timestamp: Date.now(),
      });

      return repositories;
    } catch (error) {
      throw new NetworkError(`Failed to fetch repository index: ${error}`, normalizedIndexUrl);
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  private parseRepositoryIndex(response: unknown): RepositoryIndexEntry[] {
    if (this.isRegistryResponse(response)) {
      return response.repositories.map(toRepositoryIndexEntry);
    }

    if (this.isLegacyRepositoryIndex(response)) {
      return response.repositories;
    }

    throw new Error('Invalid repository index format');
  }

  private isRegistryResponse(response: unknown): response is RepositoryRegistryResponse {
    return (
      typeof response === 'object' &&
      response !== null &&
      'registry' in response &&
      Array.isArray((response as RepositoryRegistryResponse).repositories)
    );
  }

  private isLegacyRepositoryIndex(response: unknown): response is RepositoryIndex {
    return (
      typeof response === 'object' &&
      response !== null &&
      typeof (response as RepositoryIndex).version === 'string' &&
      Array.isArray((response as RepositoryIndex).repositories)
    );
  }
}
