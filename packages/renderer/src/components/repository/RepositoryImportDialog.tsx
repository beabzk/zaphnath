import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RepositoryDiscovery } from './RepositoryDiscovery';
import { filesystem, repository } from '@app/preload';
import {
  Download,
  FolderOpen,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Search,
} from 'lucide-react';

interface ValidationResult {
  valid: boolean;
  errors: Array<{ code: string; message: string; severity: string }>;
  warnings: Array<{ code: string; message: string }>;
}

type ImportResult = Zaphnath.ImportResult;
type ImportProgress = Zaphnath.ImportProgress;
type RepositoryManifest = Zaphnath.ZBRSManifest;

function isParentManifest(
  manifest: RepositoryManifest | null
): manifest is Zaphnath.ZBRSParentManifest {
  return Boolean(manifest && 'translations' in manifest && manifest.repository.type === 'parent');
}

function getManifestLanguageName(manifest: RepositoryManifest | null): string {
  return !manifest || isParentManifest(manifest) ? 'Multiple' : manifest.repository.language.name;
}

function getManifestBookCount(manifest: RepositoryManifest | null): number | string {
  return !manifest || isParentManifest(manifest) ? 'Multiple' : manifest.content.books_count;
}

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
  | { type: 'resetImport' }
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
    case 'resetImport':
      return {
        ...state,
        importStatus: 'idle',
        importProgress: null,
        importResult: null,
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
  const [importType, setImportType] = useState<'url' | 'file' | 'discover'>('discover');
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'full' | 'selective'>('full');
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
    async (sourceUrl: string, sourceType: 'url' | 'file' | 'discover') => {
      const trimmedUrl = sourceUrl.trim();
      if (!trimmedUrl) return;

      const requestId = ++validationRequestIdRef.current;

      try {
        dispatch({ type: 'startValidation' });

        // Check if this is a local directory path
        const isLocalPath = sourceType === 'file' && !trimmedUrl.startsWith('http');

        if (isLocalPath) {
          // Try scanning for multiple repositories first
          const scanResult = await repository.scanDirectory(trimmedUrl);
          if (requestId !== validationRequestIdRef.current) return;

          if (scanResult.repositories.length > 1) {
            // Multiple repositories found - show selection UI
            dispatch({
              type: 'completeValidation',
              validation: toScanValidationResult(scanResult.errors),
              multipleRepositories: scanResult.repositories,
            });
            return;
          } else if (scanResult.repositories.length === 1) {
            // Single repository found - use it directly
            const repo = scanResult.repositories[0];
            dispatch({
              type: 'completeValidation',
              validation: repo.validation,
              manifest: repo.validation.valid ? repo.manifest : null,
            });
            if (repo.validation.valid) {
              applyManifestState(repo.manifest);
              // Update the import URL to the specific repository path
              setImportUrl(repo.path);
            }
            return;
          }
          // If no repositories found, fall through to regular validation
        }

        // Regular single repository validation
        const validationResult = await repository.validate(trimmedUrl);
        if (requestId !== validationRequestIdRef.current) return;

        if (validationResult.valid) {
          const manifestData = await repository.getManifest(trimmedUrl);
          if (requestId !== validationRequestIdRef.current) return;
          dispatch({
            type: 'completeValidation',
            validation: validationResult,
            manifest: manifestData,
          });
          applyManifestState(manifestData);
          return;
        }

        dispatch({
          type: 'completeValidation',
          validation: validationResult,
        });
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

    const selectedRepo = multipleRepositories.find((repo) => repo.path === repositoryPath);
    if (selectedRepo) {
      setImportUrl(repositoryPath);
      const manifestData = selectedRepo.validation.valid ? selectedRepo.manifest : null;
      dispatch({
        type: 'selectScannedRepository',
        repositoryPath,
        validation: selectedRepo.validation,
        manifest: manifestData,
      });

      if (manifestData) {
        applyManifestState(manifestData);
      }
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

      const importOptions = {
        validate_checksums: true,
        overwrite_existing: false,
        import_type: importMode,
        selected_translations: importMode === 'selective' ? selectedTranslations : undefined,
      };

      const result = await repository.import(importUrl.trim(), importOptions);

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

      if (result && !result.canceled && result.filePaths.length > 0) {
        setImportUrl(result.filePaths[0]);
        setImportType('file');
      }
    } catch (error) {
      console.error('File selection failed:', error);
    }
  };

  const handleRepositorySelect = async (url: string) => {
    setImportUrl(url);
    // Stay on discover tab, don't switch to URL tab
    // setImportType('url')
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

  const getProgressPercentage = () => {
    if (!importProgress) return 0;
    return Math.round(Math.min(100, Math.max(0, importProgress.progress)));
  };

  const getProgressStageLabel = (stage: ImportProgress['stage']) => {
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
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-6 max-h-screen">
        <div className="h-full max-h-[90vh] flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import Repository</CardTitle>
                  <CardDescription>Add a new Bible repository using ZBRS standard</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close import dialog">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <div className="flex-1 flex flex-col overflow-hidden">
              <CardContent className="space-y-6 flex-1 overflow-y-auto p-6">
                {/* Import Source Selection */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={importType === 'discover' ? 'default' : 'outline'}
                      onClick={() => setImportType('discover')}
                      className="flex-1"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Discover
                    </Button>
                    <Button
                      variant={importType === 'url' ? 'default' : 'outline'}
                      onClick={() => setImportType('url')}
                      className="flex-1"
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      URL
                    </Button>
                    <Button
                      variant={importType === 'file' ? 'default' : 'outline'}
                      onClick={() => setImportType('file')}
                      className="flex-1"
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Local Directory
                    </Button>
                  </div>

                  {importType === 'discover' ? (
                    <div className="space-y-4">
                      <RepositoryDiscovery onRepositorySelect={handleRepositorySelect} />

                      {/* Show validation results and import options when a repository is selected */}
                      {importUrl && (
                        <div className="border-t pt-4 space-y-4">
                          <div className="text-sm font-medium">Selected Repository</div>
                          <div className="text-sm text-muted-foreground break-all">{importUrl}</div>

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
                        onChange={(e) => setImportUrl(e.target.value)}
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
                          onChange={(event) => setImportUrl(event.target.value)}
                          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        />
                        <Button onClick={handleFileSelect}>
                          <FolderOpen className="h-4 w-4 mr-2" />
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

                {/* Validation Results */}
                {validation && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {validation.valid ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {validation.valid ? 'Repository Valid' : 'Validation Failed'}
                        </span>
                      </div>

                      {validation.errors.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-red-600">Errors:</h4>
                          {validation.errors.map((error, index) => (
                            <div
                              key={index}
                              className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded"
                            >
                              {error.message}
                            </div>
                          ))}
                        </div>
                      )}

                      {validation.warnings.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-yellow-600">Warnings:</h4>
                          {validation.warnings.map((warning, index) => (
                            <div
                              key={index}
                              className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded"
                            >
                              {warning.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Translation Selection for Parent Repositories */}
                {validation?.valid &&
                  isParentManifest(manifest) && (
                    <div className="space-y-4">
                      <Separator />
                      <div className="space-y-3">
                        <h4 className="font-medium">Translation Selection</h4>
                        <p className="text-sm text-muted-foreground">
                          This is a parent repository containing multiple translations. Choose which
                          translations to import:
                        </p>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id="import-all"
                              name="import-mode"
                              checked={importMode === 'full'}
                              onChange={() => {
                                setImportMode('full');
                                setSelectedTranslations(manifest.translations.map((translation) => translation.id));
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
                              onChange={() => setImportMode('selective')}
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
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTranslations([
                                          ...selectedTranslations,
                                          translation.id,
                                        ]);
                                      } else {
                                        setSelectedTranslations(
                                          selectedTranslations.filter((id) => id !== translation.id)
                                        );
                                      }
                                    }}
                                    className="h-4 w-4"
                                  />
                                  <label
                                    htmlFor={`translation-${translation.id}`}
                                    className="text-sm"
                                  >
                                    <span className="font-medium">
                                      {translation.name || 'Unknown Translation'}
                                    </span>
                                    <span className="text-muted-foreground ml-2">
                                      ({translation.language.name || 'Unknown Language'})
                                    </span>
                                  </label>
                                </div>
                              ))}
                          </div>
                        )}

                        {importMode === 'selective' && selectedTranslations.length === 0 && (
                          <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                            Please select at least one translation to import.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                {/* Multiple Repositories Selection */}
                {multipleRepositories && multipleRepositories.length > 1 && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium">Multiple Repositories Found</h4>
                      <p className="text-sm text-muted-foreground">
                        The selected directory contains multiple Bible repositories. Please choose
                        which one to import:
                      </p>
                      <div className="space-y-2">
                        {multipleRepositories.map((repo, index) => (
                          <button
                            key={index}
                            type="button"
                            className={`w-full rounded-lg border p-3 text-left transition-colors ${
                              selectedRepository === repo.path
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => handleRepositorySelection(repo.path)}
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
                                    {repo.manifest?.repository?.name || 'Unknown Repository'}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {repo.manifest?.repository?.description ||
                                    'No description available'}
                                </p>
                                <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                                  <span>
                                    Language:{' '}
                                    {getManifestLanguageName(repo.manifest)}
                                  </span>
                                  <span>
                                    Version: v{repo.manifest?.repository?.version || 'Unknown'}
                                  </span>
                                  <span>
                                    Books: {getManifestBookCount(repo.manifest)}
                                  </span>
                                </div>
                                {!repo.validation.valid && repo.validation.errors.length > 0 && (
                                  <div className="mt-2">
                                    <span className="text-xs text-red-600">
                                      Errors:{' '}
                                      {repo.validation.errors.map((e) => e.message).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {selectedRepository === repo.path && (
                                <CheckCircle className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Repository Preview */}
                {manifest && validation?.valid && manifest.repository && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="font-medium">Repository Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Name:</span>
                          <div className="font-medium">
                            {manifest.repository?.name || 'Unknown'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Language:</span>
                          <div className="font-medium">{getManifestLanguageName(manifest)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Version:</span>
                          <div className="font-medium">
                            v{manifest.repository?.version || '0.0.0'}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Books:</span>
                          <div className="font-medium">{getManifestBookCount(manifest)}</div>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {manifest.repository?.description || 'No description available'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Import Progress */}
                {importProgress && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Import Progress</span>
                        <span className="text-sm text-muted-foreground">
                          {getProgressPercentage()}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage()}%` }}
                        />
                      </div>
                      <p className="text-sm font-medium">
                        {getProgressStageLabel(importProgress.stage)}
                      </p>
                      <p className="text-xs text-muted-foreground">{importProgress.message}</p>
                      {typeof importProgress.total_books === 'number' &&
                        typeof importProgress.processed_books === 'number' && (
                          <p className="text-xs text-muted-foreground">
                            {importProgress.processed_books}/{importProgress.total_books} books
                          </p>
                        )}
                    </div>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div className="space-y-4">
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {importResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="font-medium">
                          {importResult.success ? 'Import Successful!' : 'Import Failed'}
                        </span>
                      </div>

                      {importResult.success ? (
                        <p className="text-sm text-muted-foreground">
                          Successfully imported {importResult.books_imported} books.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {importResult.errors.map((error, index) => (
                            <div
                              key={index}
                              className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded"
                            >
                              {error.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="flex justify-end gap-2 p-6 pt-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                {importResult?.success ? 'Close' : 'Cancel'}
              </Button>
              {validation?.valid &&
                !importResult?.success &&
                (!multipleRepositories || selectedRepository) && (
                  <Button
                    onClick={handleImport}
                    disabled={
                      isImporting ||
                      (importMode === 'selective' && selectedTranslations.length === 0)
                    }
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
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
