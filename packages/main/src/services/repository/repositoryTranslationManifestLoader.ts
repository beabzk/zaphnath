import { RepositoryDiscoveryService } from './discovery.js';
import type { TranslationReference, ZBRSTranslationManifest } from './types.js';
import { isTranslationManifest } from './types.js';

export interface LoadedTranslationManifest {
  manifest: ZBRSTranslationManifest;
  translationUrl: string;
}

export async function loadTranslationManifestFromParent(
  discoveryService: RepositoryDiscoveryService,
  baseUrl: string,
  translation: TranslationReference
): Promise<LoadedTranslationManifest> {
  const translationUrl = (baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`) + translation.directory;
  const manifest = await discoveryService.fetchRepositoryManifest(translationUrl);

  if (!isTranslationManifest(manifest)) {
    throw new Error(
      `Expected a translation manifest for ${translation.name}, but found a different type.`
    );
  }

  return {
    manifest,
    translationUrl,
  };
}
