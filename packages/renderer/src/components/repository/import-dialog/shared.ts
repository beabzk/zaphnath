export interface ValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string; severity: string }>;
  warnings: Array<{ code: string; message: string }>;
}

export type ImportMode = 'full' | 'selective';
export type ImportSourceType = 'url' | 'file' | 'discover';
export type ImportResult = Zaphnath.ImportResult;
export type ImportProgress = Zaphnath.ImportProgress;
export type RepositoryManifest = Zaphnath.ZBRSManifest;

export function isParentManifest(
  manifest: RepositoryManifest | null
): manifest is Zaphnath.ZBRSParentManifest {
  return Boolean(manifest && 'translations' in manifest && manifest.repository.type === 'parent');
}

export function getManifestLanguageName(manifest: RepositoryManifest | null): string {
  return !manifest || isParentManifest(manifest) ? 'Multiple' : manifest.repository.language.name;
}

export function getManifestBookCount(manifest: RepositoryManifest | null): number | string {
  return !manifest || isParentManifest(manifest) ? 'Multiple' : manifest.content.books_count;
}

export function getProgressPercentage(progress: ImportProgress | null): number {
  if (!progress) return 0;
  return Math.round(Math.min(100, Math.max(0, progress.progress)));
}

export function getProgressStageLabel(stage: ImportProgress['stage']): string {
  switch (stage) {
    case 'discovering':
      return 'Discovering Repository';
    case 'validating':
      return 'Validating Content';
    case 'downloading':
      return 'Downloading Data';
    case 'processing':
      return 'Importing Books';
    case 'complete':
      return 'Import Complete';
    case 'error':
      return 'Import Error';
    default:
      return 'Importing';
  }
}

