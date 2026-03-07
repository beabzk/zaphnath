import { access, readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import type {
  TranslationReference,
  ValidationResult,
  ZBRSManifest,
  ZBRSParentManifest,
  ZBRSTranslationManifest,
} from './types.js';
import { isParentManifest, isTranslationManifest } from './types.js';
import { normalizeRepositoryUrl } from './pathUtils.js';
import type { ZBRSValidator } from './validator.js';

type HierarchicalTranslationScan = {
  path: string;
  directory: string;
  manifest: ZBRSTranslationManifest;
  validation: ValidationResult;
};

type HierarchicalParentScan = {
  path: string;
  manifest: ZBRSParentManifest;
  validation: ValidationResult;
};

export type HierarchicalRepositoryScanResult = {
  parentRepository?: HierarchicalParentScan;
  translations: HierarchicalTranslationScan[];
  errors: string[];
};

export class LocalRepositoryScanner {
  constructor(private validator: ZBRSValidator) {}

  public async scanDirectoryForRepositories(
    directoryPath: string
  ): Promise<Zaphnath.RepositoryScanResult> {
    const repositories: Zaphnath.ScannedRepository[] = [];
    const errors: string[] = [];

    try {
      const { directoryUrl, localPath } = await this.resolveDirectory(directoryPath);
      const rootManifestPath = join(localPath, 'manifest.json');

      if (await this.pathExists(rootManifestPath)) {
        try {
          const manifest = await this.readManifest(rootManifestPath);
          const validation = this.validator.validateManifest(manifest);

          repositories.push({
            path: directoryUrl,
            manifest,
            validation,
          });
          return { repositories, errors };
        } catch (error) {
          errors.push(`Failed to read repository manifest in selected directory: ${error}`);
          return { repositories, errors };
        }
      }

      const entries = await readdir(localPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const subDirPath = join(localPath, entry.name);
        const manifestPath = join(subDirPath, 'manifest.json');
        if (!(await this.pathExists(manifestPath))) {
          continue;
        }

        try {
          const manifest = await this.readManifest(manifestPath);
          const validation = this.validator.validateManifest(manifest);

          repositories.push({
            path: pathToFileURL(subDirPath).toString(),
            manifest,
            validation,
          });
        } catch (error) {
          console.log(`Skipping directory ${entry.name}: ${error}`);
        }
      }

      if (repositories.length === 0) {
        errors.push('No repositories found in selected directory');
      }
    } catch (error) {
      errors.push(`Failed to scan directory: ${error}`);
    }

    return { repositories, errors };
  }

  public async scanHierarchicalRepository(
    directoryPath: string
  ): Promise<HierarchicalRepositoryScanResult> {
    const translations: HierarchicalTranslationScan[] = [];
    const errors: string[] = [];
    let parentRepository: HierarchicalParentScan | undefined;

    try {
      const { directoryUrl, localPath } = await this.resolveDirectory(directoryPath);
      const parentManifestPath = join(localPath, 'manifest.json');

      if (await this.pathExists(parentManifestPath)) {
        try {
          const manifest = await this.readManifest(parentManifestPath);
          if (isParentManifest(manifest)) {
            parentRepository = {
              path: directoryUrl,
              manifest,
              validation: this.validator.validateManifest(manifest),
            };

            for (const translationRef of manifest.translations) {
              const translationScan = await this.scanReferencedTranslation(
                localPath,
                translationRef
              );

              if (translationScan) {
                translations.push(translationScan);
              } else {
                errors.push(`Failed to load translation ${translationRef.directory}`);
              }
            }
          }
        } catch (error) {
          console.log(`No parent manifest found: ${error}`);
        }
      }

      if (!parentRepository) {
        const entries = await readdir(localPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) {
            continue;
          }

          const translationScan = await this.scanLooseTranslationDirectory(localPath, entry.name);
          if (translationScan) {
            translations.push(translationScan);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to scan hierarchical repository: ${error}`);
    }

    return { parentRepository, translations, errors };
  }

  private async resolveDirectory(directoryPath: string): Promise<{
    directoryUrl: string;
    localPath: string;
  }> {
    const directoryUrl = normalizeRepositoryUrl(directoryPath);
    if (!directoryUrl.startsWith('file://')) {
      throw new Error(`Directory scan only supports local file paths: ${directoryPath}`);
    }

    const localPath = fileURLToPath(directoryUrl);
    const dirStat = await stat(localPath);
    if (!dirStat.isDirectory()) {
      throw new Error(`Path is not a directory: ${localPath}`);
    }

    return { directoryUrl, localPath };
  }

  private async pathExists(path: string): Promise<boolean> {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  private async readManifest(manifestPath: string): Promise<ZBRSManifest> {
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const cleanContent = manifestContent.replace(/^\uFEFF/, '');
    return JSON.parse(cleanContent) as ZBRSManifest;
  }

  private async scanReferencedTranslation(
    localPath: string,
    translationRef: TranslationReference
  ): Promise<HierarchicalTranslationScan | null> {
    try {
      const translationPath = join(localPath, translationRef.directory);
      const manifestPath = join(translationPath, 'manifest.json');

      if (!(await this.pathExists(manifestPath))) {
        return null;
      }

      const manifest = await this.readManifest(manifestPath);
      if (!isTranslationManifest(manifest)) {
        return null;
      }

      return {
        path: pathToFileURL(translationPath).toString(),
        directory: translationRef.directory,
        manifest,
        validation: this.validator.validateManifest(manifest),
      };
    } catch {
      return null;
    }
  }

  private async scanLooseTranslationDirectory(
    localPath: string,
    directoryName: string
  ): Promise<HierarchicalTranslationScan | null> {
    try {
      const translationPath = join(localPath, directoryName);
      const manifestPath = join(translationPath, 'manifest.json');

      if (!(await this.pathExists(manifestPath))) {
        return null;
      }

      const manifest = await this.readManifest(manifestPath);
      if (!isTranslationManifest(manifest)) {
        return null;
      }

      return {
        path: pathToFileURL(translationPath).toString(),
        directory: directoryName,
        manifest,
        validation: this.validator.validateManifest(manifest),
      };
    } catch (error) {
      console.log(`Skipping directory ${directoryName}: ${error}`);
      return null;
    }
  }
}
