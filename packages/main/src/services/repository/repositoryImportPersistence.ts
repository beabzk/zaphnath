import { DatabaseService } from '../database/index.js';
import type { RepositoryDbRecord, ZBRSParentManifest, ZBRSTranslationManifest } from './types.js';

export class RepositoryImportPersistence {
  constructor(private databaseService: DatabaseService) {}

  public upsertParentRepository(manifest: ZBRSParentManifest): void {
    this.upsertRepository({
      id: manifest.repository.id,
      name: manifest.repository.name,
      description: manifest.repository.description,
      version: manifest.repository.version,
      type: 'parent',
      parent_id: null,
      language: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      imported_at: new Date().toISOString(),
      metadata: JSON.stringify({
        publisher: manifest.publisher,
        technical: manifest.technical,
        extensions: manifest.extensions || {},
      }),
    });
  }

  public createStandaloneTranslationRepository(
    manifest: ZBRSTranslationManifest
  ): RepositoryDbRecord {
    return {
      id: manifest.repository.id,
      name: manifest.repository.name,
      description: manifest.repository.description,
      version: manifest.repository.version,
      language: manifest.repository.language.code,
      type: 'parent',
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      imported_at: new Date().toISOString(),
      metadata: JSON.stringify({
        technical: manifest.technical,
        content: manifest.content,
        extensions: manifest.extensions || {},
      }),
    };
  }

  public upsertRepository(record: RepositoryDbRecord): void {
    this.databaseService.getQueries().upsertRepository(record);
  }

  public registerTranslation(params: {
    parentId: string;
    manifest: ZBRSTranslationManifest;
    directoryName: string;
    translationStatus: 'active' | 'inactive' | 'deprecated';
  }): void {
    const { parentId, manifest, directoryName, translationStatus } = params;

    this.databaseService.getQueries().createRepositoryTranslation({
      id: `${parentId}:${manifest.repository.id}`,
      parent_repository_id: parentId,
      translation_id: manifest.repository.id,
      translation_name: manifest.repository.name,
      translation_description: manifest.repository.description,
      translation_version: manifest.repository.version,
      directory_name: directoryName,
      language_code: manifest.repository.language.code,
      status: translationStatus,
    });
  }
}
