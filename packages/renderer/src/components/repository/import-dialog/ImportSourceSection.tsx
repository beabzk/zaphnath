import { Button } from '@/components/ui/button';
import { RepositoryDiscovery } from '../RepositoryDiscovery';
import { FolderOpen, Globe, Loader2, Search } from 'lucide-react';
import type { ImportSourceType } from './shared';

interface ImportSourceSectionProps {
  importType: ImportSourceType;
  importUrl: string;
  isValidating: boolean;
  onImportTypeChange: (importType: ImportSourceType) => void;
  onImportUrlChange: (value: string) => void;
  onFileSelect: () => Promise<void>;
  onRepositorySelect: (url: string) => Promise<void>;
}

export function ImportSourceSection({
  importType,
  importUrl,
  isValidating,
  onImportTypeChange,
  onImportUrlChange,
  onFileSelect,
  onRepositorySelect,
}: ImportSourceSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          variant={importType === 'discover' ? 'default' : 'outline'}
          onClick={() => onImportTypeChange('discover')}
          className="flex-1"
        >
          <Search className="mr-2 h-4 w-4" />
          Discover
        </Button>
        <Button
          variant={importType === 'url' ? 'default' : 'outline'}
          onClick={() => onImportTypeChange('url')}
          className="flex-1"
        >
          <Globe className="mr-2 h-4 w-4" />
          URL
        </Button>
        <Button
          variant={importType === 'file' ? 'default' : 'outline'}
          onClick={() => onImportTypeChange('file')}
          className="flex-1"
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Local Directory
        </Button>
      </div>

      {importType === 'discover' ? (
        <div className="space-y-4">
          <RepositoryDiscovery onRepositorySelect={onRepositorySelect} />

          {importUrl && (
            <div className="space-y-4 border-t pt-4">
              <div className="text-sm font-medium">Selected Repository</div>
              <div className="break-all text-sm text-muted-foreground">{importUrl}</div>

              {isValidating && (
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validating repository...
                </div>
              )}
            </div>
          )}
        </div>
      ) : importType === 'url' ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Repository URL</label>
          <input
            type="url"
            placeholder="https://example.com/bible-repository/"
            value={importUrl}
            onChange={(event) => onImportUrlChange(event.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating repository...
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-sm font-medium">Local Directory</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="C:\\Users\\...\\repository"
              value={importUrl}
              onChange={(event) => onImportUrlChange(event.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button onClick={() => void onFileSelect()}>
              <FolderOpen className="mr-2 h-4 w-4" />
              Browse
            </Button>
          </div>
          {isValidating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating repository...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

