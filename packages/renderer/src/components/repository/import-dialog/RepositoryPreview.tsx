import type { RepositoryManifest } from './shared';
import { getManifestBookCount, getManifestLanguageName } from './shared';

interface RepositoryPreviewProps {
  manifest: RepositoryManifest;
}

export function RepositoryPreview({ manifest }: RepositoryPreviewProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Repository Information</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Name:</span>
          <div className="font-medium">{manifest.repository.name || 'Unknown'}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Language:</span>
          <div className="font-medium">{getManifestLanguageName(manifest)}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Version:</span>
          <div className="font-medium">v{manifest.repository.version || '0.0.0'}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Books:</span>
          <div className="font-medium">{getManifestBookCount(manifest)}</div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {manifest.repository.description || 'No description available'}
      </p>
    </div>
  );
}
