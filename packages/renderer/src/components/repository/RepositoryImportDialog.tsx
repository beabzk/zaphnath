import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { filesystem, repository } from '@app/preload';
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
import type {
  ImportMode,
  ImportProgress,
  ImportResult,
  ImportSourceType,
  RepositoryManifest,
  ValidationResult,
} from './import-dialog/shared';
import { isParentManifest } from './import-dialog/shared';

interface DialogAsyncState {
  validationStatus: 'idle' | 'validating';
  validation: ValidationResult | null;
  manifest: RepositoryManifest | null;
  multipleRepositories: Zaphnath.ScannedRepository[] | null;
  selectedRepository: string | null;
  importStatus: 'idle' | 'running';
  importProgress: ImportProgress | null;
  importResult: ImportResult | null;
}

type DialogAsyncAction =
  | { type: 'startValidation' }
  | {
      type: 'completeValidation';
      validation: ValidationResult;
      manifest?: RepositoryManifest | null;
      multipleRepositories?: Zaphnath.ScannedRepository[] | null;
      selectedRepository?: string | null;
    }
  | {
      type: 'selectScannedRepository';
      repositoryPath: string;
      validation: ValidationResult;
      manifest: RepositoryManifest | null;
    }
  | { type: 'resetValidation' }
  | { type: 'startImport'; progress: ImportProgress }
  | { type: 'updateImportProgress'; progress: ImportProgress | null }
  | { type: 'finishImport'; result: ImportResult; progress: ImportProgress }
  | { type: 'failImport'; result: ImportResult; progress: ImportProgress }
  | { type: 'resetAll' };

const initialDialogAsyncState: DialogAsyncState = {
  validationStatus: 'idle',
  validation: null,
  manifest: null,
  multipleRepositories: null,
  selectedRepository: null,
  importStatus: 'idle',
  importProgress: null,
  importResult: null,
};

function dialogAsyncReducer(
  state: DialogAsyncState,
  action: DialogAsyncAction
): DialogAsyncState {
  switch (action.type) {
    case 'startValidation':
      return {
        ...state,
        validationStatus: 'validating',
        validation: null,
        manifest: null,
        multipleRepositories: null,
        selectedRepository: null,
      };
    case 'completeValidation':
      return {
        ...state,
        validationStatus: 'idle',
        validation: action.validation,
        manifest: action.manifest ?? null,
        multipleRepositories: action.multipleRepositories ?? null,
        selectedRepository: action.selectedRepository ?? null,
      };
    case 'selectScannedRepository':
      return {
        ...state,
        validation: action.validation,
        manifest: action.manifest,
        selectedRepository: action.repositoryPath,
      };
    case 'resetValidation':
      return {
        ...state,
        validationStatus: 'idle',
        validation: null,
        manifest: null,
        multipleRepositories: null,
        selectedRepository: null,
      };
    case 'startImport':
      return {
        ...state,
        importStatus: 'running',
        importProgress: action.progress,
        importResult: null,
      };
    case 'updateImportProgress':
      return {
        ...state,
        importProgress: action.progress,
      };
    case 'finishImport':
    case 'failImport':
      return {
        ...state,
        importStatus: 'idle',
        importResult: action.result,
        importProgress: action.progress,
      };
    case 'resetAll':
      return initialDialogAsyncState;
    default:
      return state;
  }
}

function toScanValidationResult(errors: string[]): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: errors.map((error) => ({
      code: 'SCAN_WARNING',
      message: error,
      severity: 'warning' as const,
    })),
  };
}

function createImportFailureResult(message: string): ImportResult {
  return {
    success: false,
    repository_id: '',
    books_imported: 0,
    translations_imported: [],
    translations_skipped: [],
    errors: [
      {
        code: 'import-failed',
        message,
        severity: 'error',
      },
    ],
    warnings: [],
    duration_ms: 0,
  };
}

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
  const [dialogState, dispatch] = useReducer(dialogAsyncReducer, initialDialogAsyncState);
  const [importUrl, setImportUrl] = useState('');
  const [importType, setImportType] = useState<ImportSourceType>('discover');
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('full');
  const validationRequestIdRef = useRef(0);
  const importProgressUnsubscribeRef = useRef<(() => void) | null>(null);

  const {
    validationStatus,
    validation,
    manifest,
    multipleRepositories,
    selectedRepository,
    importStatus,
    importProgress,
    importResult,
  } = dialogState;

  const isValidating = validationStatus === 'validating';
  const isImporting = importStatus === 'running';

  const clearImportProgressSubscription = useCallback(() => {
    importProgressUnsubscribeRef.current?.();
    importProgressUnsubscribeRef.current = null;
  }, []);

  const applyManifestState = useCallback((manifestData: RepositoryManifest) => {
    if (isParentManifest(manifestData)) {
      setImportMode('full');
      setSelectedTranslations(manifestData.translations.map((translation) => translation.id));
      return;
    }

    setSelectedTranslations([]);
  }, []);

  const validateSource = useCallback(
    async (sourceUrl: string, sourceType: ImportSourceType) => {
      const trimmedUrl = sourceUrl.trim();
      if (!trimmedUrl) return;

      const requestId = ++validationRequestIdRef.current;

      try {
        dispatch({ type: 'startValidation' });

        const isLocalPath = sourceType === 'file' && !trimmedUrl.startsWith('http');

        if (isLocalPath) {
          const scanResult = await repository.scanDirectory(trimmedUrl);
          if (requestId !== validationRequestIdRef.current) return;

          if (scanResult.repositories.length > 1) {
            dispatch({
              type: 'completeValidation',
              validation: toScanValidationResult(scanResult.errors),
              multipleRepositories: scanResult.repositories,
            });
            return;
          }

          if (scanResult.repositories.length === 1) {
            const scannedRepository = scanResult.repositories[0];
            dispatch({
              type: 'completeValidation',
              validation: scannedRepository.validation,
              manifest: scannedRepository.validation.valid ? scannedRepository.manifest : null,
            });

            if (scannedRepository.validation.valid) {
              applyManifestState(scannedRepository.manifest);
              setImportUrl(scannedRepository.path);
            }
            return;
          }
        }

        const validationResult = await repository.validate(trimmedUrl);
        if (requestId !== validationRequestIdRef.current) return;

        if (!validationResult.valid) {
          dispatch({
            type: 'completeValidation',
            validation: validationResult,
          });
          return;
        }

        const manifestData = await repository.getManifest(trimmedUrl);
        if (requestId !== validationRequestIdRef.current) return;

        dispatch({
          type: 'completeValidation',
          validation: validationResult,
          manifest: manifestData,
        });
        applyManifestState(manifestData);
      } catch (error) {
        if (requestId !== validationRequestIdRef.current) return;

        dispatch({
          type: 'completeValidation',
          validation: {
            valid: false,
            errors: [
              {
                code: 'VALIDATION_ERROR',
                message: error instanceof Error ? error.message : 'Validation failed',
                severity: 'error',
              },
            ],
            warnings: [],
          },
        });
      }
    },
    [applyManifestState]
  );

  useEffect(() => {
    if (importType === 'discover') {
      return;
    }

    const trimmedUrl = importUrl.trim();
    if (!trimmedUrl) {
      validationRequestIdRef.current += 1;
      dispatch({ type: 'resetValidation' });
      return;
    }

    const timeoutId = setTimeout(() => {
      void validateSource(trimmedUrl, importType);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [importType, importUrl, validateSource]);

  const handleRepositorySelection = (repositoryPath: string) => {
    if (!multipleRepositories) return;

    const selectedScan = multipleRepositories.find((repo) => repo.path === repositoryPath);
    if (!selectedScan) return;

    setImportUrl(repositoryPath);
    const manifestData = selectedScan.validation.valid ? selectedScan.manifest : null;

    dispatch({
      type: 'selectScannedRepository',
      repositoryPath,
      validation: selectedScan.validation,
      manifest: manifestData,
    });

    if (manifestData) {
      applyManifestState(manifestData);
    }
  };

  const handleImport = async () => {
    if (!validation?.valid || !importUrl.trim()) return;

    try {
      dispatch({
        type: 'startImport',
        progress: {
          stage: 'discovering',
          progress: 0,
          message: 'Starting import...',
        },
      });

      clearImportProgressSubscription();
      importProgressUnsubscribeRef.current = repository.onImportProgress((progress) => {
        dispatch({
          type: 'updateImportProgress',
          progress: {
            ...progress,
            progress: Math.min(100, Math.max(0, progress.progress)),
          },
        });
      });

      const result = await repository.import(importUrl.trim(), {
        validate_checksums: true,
        overwrite_existing: false,
        import_type: importMode,
        selected_translations: importMode === 'selective' ? selectedTranslations : undefined,
      });

      if (!result.success) {
        dispatch({
          type: 'failImport',
          result,
          progress: {
            stage: 'error',
            progress: 100,
            message: 'Import failed',
          },
        });
        return;
      }

      dispatch({
        type: 'finishImport',
        result,
        progress: {
          stage: 'complete',
          progress: 100,
          message: `Imported ${result.books_imported} books successfully.`,
          processed_books: result.books_imported,
          total_books: result.books_imported,
        },
      });

      setTimeout(() => {
        onImportComplete();
        handleClose();
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      dispatch({
        type: 'failImport',
        result: createImportFailureResult(message),
        progress: {
          stage: 'error',
          progress: 100,
          message,
        },
      });
    } finally {
      clearImportProgressSubscription();
    }
  };

  const handleFileSelect = async () => {
    try {
      const result = await filesystem.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Repository Directory',
      });

      if (!result.canceled && result.filePaths.length > 0) {
        setImportUrl(result.filePaths[0]);
        setImportType('file');
      }
    } catch (error) {
      console.error('File selection failed:', error);
    }
  };

  const handleRepositorySelect = async (url: string) => {
    setImportUrl(url);
    await validateSource(url, 'discover');
  };

  const handleClose = () => {
    clearImportProgressSubscription();
    setImportUrl('');
    setImportType('discover');
    dispatch({ type: 'resetAll' });
    onClose();
  };

  useEffect(() => {
    return () => {
      clearImportProgressSubscription();
    };
  }, [clearImportProgressSubscription]);

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
              {validation?.valid && !importResult?.success && (!multipleRepositories || selectedRepository) && (
                <Button
                  onClick={handleImport}
                  disabled={isImporting || (importMode === 'selective' && selectedTranslations.length === 0)}
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
