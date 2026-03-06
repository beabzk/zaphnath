import type { ImportMode, RepositoryManifest } from './shared';
import { isParentManifest } from './shared';

interface TranslationSelectionProps {
  manifest: RepositoryManifest;
  importMode: ImportMode;
  selectedTranslations: string[];
  onImportModeChange: (mode: ImportMode) => void;
  onSelectedTranslationsChange: (translationIds: string[]) => void;
}

export function TranslationSelection({
  manifest,
  importMode,
  selectedTranslations,
  onImportModeChange,
  onSelectedTranslationsChange,
}: TranslationSelectionProps) {
  if (!isParentManifest(manifest)) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h4 className="font-medium">Translation Selection</h4>
      <p className="text-sm text-muted-foreground">
        This is a parent repository containing multiple translations. Choose which translations to
        import:
      </p>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            type="radio"
            id="import-all"
            name="import-mode"
            checked={importMode === 'full'}
            onChange={() => {
              onImportModeChange('full');
              onSelectedTranslationsChange(
                manifest.translations.map((translation) => translation.id)
              );
            }}
            className="h-4 w-4"
          />
          <label htmlFor="import-all" className="text-sm font-medium">
            Import all translations ({manifest.translations.length})
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="radio"
            id="import-selective"
            name="import-mode"
            checked={importMode === 'selective'}
            onChange={() => onImportModeChange('selective')}
            className="h-4 w-4"
          />
          <label htmlFor="import-selective" className="text-sm font-medium">
            Select specific translations
          </label>
        </div>
      </div>

      {importMode === 'selective' && (
        <div className="space-y-2 pl-6">
          {manifest.translations.map((translation) => (
            <div key={translation.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`translation-${translation.id}`}
                checked={selectedTranslations.includes(translation.id)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onSelectedTranslationsChange([...selectedTranslations, translation.id]);
                    return;
                  }

                  onSelectedTranslationsChange(
                    selectedTranslations.filter((id) => id !== translation.id)
                  );
                }}
                className="h-4 w-4"
              />
              <label htmlFor={`translation-${translation.id}`} className="text-sm">
                <span className="font-medium">{translation.name || 'Unknown Translation'}</span>
                <span className="ml-2 text-muted-foreground">
                  ({translation.language.name || 'Unknown Language'})
                </span>
              </label>
            </div>
          ))}
        </div>
      )}

      {importMode === 'selective' && selectedTranslations.length === 0 && (
        <div className="rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/20">
          Please select at least one translation to import.
        </div>
      )}
    </div>
  );
}

