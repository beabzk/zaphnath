import type { RepositorySource } from './types.js';

const defaultRepositorySources: RepositorySource[] = [
  {
    type: 'official',
    url: 'https://raw.githubusercontent.com/beabzk/zbrs-registry/main/manifest.json',
    name: 'Official Zaphnath Repositories',
    enabled: true,
  },
  {
    type: 'third-party',
    url: 'https://bible-repositories.example.com/index.json',
    name: 'Community Bible Repositories',
    enabled: false,
  },
];

export class RepositorySourceRegistry {
  private repositorySources: RepositorySource[] = defaultRepositorySources.map((source) => ({
    ...source,
  }));

  public getSources(): RepositorySource[] {
    return [...this.repositorySources];
  }

  public add(source: RepositorySource): void {
    const existingIndex = this.repositorySources.findIndex(
      (repositorySource) => repositorySource.url === source.url
    );

    if (existingIndex >= 0) {
      this.repositorySources[existingIndex] = source;
      return;
    }

    this.repositorySources.push(source);
  }

  public remove(url: string): boolean {
    const index = this.repositorySources.findIndex((source) => source.url === url);
    if (index < 0) {
      return false;
    }

    this.repositorySources.splice(index, 1);
    return true;
  }

  public setEnabled(url: string, enabled: boolean): boolean {
    const source = this.repositorySources.find((repositorySource) => repositorySource.url === url);
    if (!source) {
      return false;
    }

    source.enabled = enabled;
    return true;
  }
}
