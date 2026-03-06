import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Download, X } from 'lucide-react';
import { ImportProgressSummary } from './import-dialog/ImportProgressSummary';
import { ImportResultSummary } from './import-dialog/ImportResultSummary';
import { ImportSourceSection } from './import-dialog/ImportSourceSection';
import { RepositoryPreview } from './import-dialog/RepositoryPreview';
import { ScannedRepositoryList } from './import-dialog/ScannedRepositoryList';
import { TranslationSelection } from './import-dialog/TranslationSelection';
import { ValidationSummary } from './import-dialog/ValidationSummary';
import { isParentManifest } from './import-dialog/shared';
import { useRepositoryImportDialogState } from './import-dialog/useRepositoryImportDialogState';

interface RepositoryImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function RepositoryImportDialog({
  isOpen,
  onClose,
  onImportComplete,
}: RepositoryImportDialogProps) {
  const {
    importUrl,
    importType,
    selectedTranslations,
    importMode,
    validation,
    manifest,
    multipleRepositories,
    selectedRepository,
    importProgress,
    importResult,
    isValidating,
    isImporting,
    setImportUrl,
    setImportType,
    setSelectedTranslations,
    setImportMode,
    handleImport,
    handleClose,
    handleFileSelect,
    handleRepositorySelect,
    handleRepositorySelection,
  } = useRepositoryImportDialogState({ onClose, onImportComplete });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 max-h-screen w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-6">
        <div className="flex h-full max-h-[90vh] flex-col">
          <Card className="flex flex-1 flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import Repository</CardTitle>
                  <CardDescription>Add a new Bible repository using ZBRS standard</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  aria-label="Close import dialog"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <div className="flex flex-1 flex-col overflow-hidden">
              <CardContent className="scrollbar-subtle flex-1 space-y-6 overflow-y-auto p-6">
                <ImportSourceSection
                  importType={importType}
                  importUrl={importUrl}
                  isValidating={isValidating}
                  onImportTypeChange={setImportType}
                  onImportUrlChange={setImportUrl}
                  onFileSelect={handleFileSelect}
                  onRepositorySelect={handleRepositorySelect}
                />

                {validation && (
                  <div className="space-y-4">
                    <Separator />
                    <ValidationSummary validation={validation} />
                  </div>
                )}

                {validation?.valid && isParentManifest(manifest) && (
                  <div className="space-y-4">
                    <Separator />
                    <TranslationSelection
                      manifest={manifest}
                      importMode={importMode}
                      selectedTranslations={selectedTranslations}
                      onImportModeChange={setImportMode}
                      onSelectedTranslationsChange={setSelectedTranslations}
                    />
                  </div>
                )}

                {multipleRepositories && multipleRepositories.length > 1 && (
                  <div className="space-y-4">
                    <Separator />
                    <ScannedRepositoryList
                      repositories={multipleRepositories}
                      selectedRepository={selectedRepository}
                      onSelect={handleRepositorySelection}
                    />
                  </div>
                )}

                {manifest && validation?.valid && (
                  <div className="space-y-4">
                    <Separator />
                    <RepositoryPreview manifest={manifest} />
                  </div>
                )}

                {importProgress && (
                  <div className="space-y-4">
                    <Separator />
                    <ImportProgressSummary progress={importProgress} />
                  </div>
                )}

                {importResult && (
                  <div className="space-y-4">
                    <Separator />
                    <ImportResultSummary result={importResult} />
                  </div>
                )}
              </CardContent>
            </div>

            <div className="flex flex-shrink-0 justify-end gap-2 border-t p-6 pt-4">
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                {importResult?.success ? 'Close' : 'Cancel'}
              </Button>
              {validation?.valid &&
                !importResult?.success &&
                (!multipleRepositories || selectedRepository) && (
                  <Button
                    onClick={() => void handleImport()}
                    disabled={
                      isImporting ||
                      (importMode === 'selective' && selectedTranslations.length === 0)
                    }
                  >
                    {isImporting ? (
                      'Importing...'
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        {isParentManifest(manifest)
                          ? `Import ${
                              importMode === 'selective'
                                ? selectedTranslations.length
                                : manifest.translations.length
                            } Translation${
                              (importMode === 'selective'
                                ? selectedTranslations.length
                                : manifest.translations.length) !== 1
                                ? 's'
                                : ''
                            }`
                          : 'Import Repository'}
                      </>
                    )}
                  </Button>
                )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

