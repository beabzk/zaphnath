import { AlertCircle, CheckCircle } from 'lucide-react';
import { getManifestBookCount, getManifestLanguageName } from './shared';

interface ScannedRepositoryListProps {
  repositories: Zaphnath.ScannedRepository[];
  selectedRepository: string | null;
  onSelect: (repositoryPath: string) => void;
}

export function ScannedRepositoryList({
  repositories,
  selectedRepository,
  onSelect,
}: ScannedRepositoryListProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium">Multiple Repositories Found</h4>
      <p className="text-sm text-muted-foreground">
        The selected directory contains multiple Bible repositories. Please choose which one to
        import:
      </p>
      <div className="space-y-2">
        {repositories.map((repo, index) => (
          <button
            key={`${repo.path}-${index}`}
            type="button"
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              selectedRepository === repo.path
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onSelect(repo.path)}
            aria-pressed={selectedRepository === repo.path}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {repo.validation.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="font-medium">
                    {repo.manifest.repository.name || 'Unknown Repository'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {repo.manifest.repository.description || 'No description available'}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Language: {getManifestLanguageName(repo.manifest)}</span>
                  <span>Version: v{repo.manifest.repository.version || 'Unknown'}</span>
                  <span>Books: {getManifestBookCount(repo.manifest)}</span>
                </div>
                {!repo.validation.valid && repo.validation.errors.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-red-600">
                      Errors: {repo.validation.errors.map((error) => error.message).join(', ')}
                    </span>
                  </div>
                )}
              </div>
              {selectedRepository === repo.path && <CheckCircle className="h-5 w-5 text-primary" />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
