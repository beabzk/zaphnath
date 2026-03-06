import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { filesystem, repository } from '@app/preload';
import type {
  ImportMode,
  ImportProgress,
  ImportResult,
  ImportSourceType,
  RepositoryManifest,
  ValidationResult,
} from './shared';
import { isParentManifest } from './shared';

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

interface UseRepositoryImportDialogStateArgs {
  onClose: () => void;
  onImportComplete: () => void;
}

export function useRepositoryImportDialogState({
  onClose,
  onImportComplete,
}: UseRepositoryImportDialogStateArgs) {
  const [dialogState, dispatch] = useReducer(dialogAsyncReducer, initialDialogAsyncState);
  const [importUrl, setImportUrl] = useState('');
  const [importType, setImportType] = useState<ImportSourceType>('discover');
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('full');
  const validationRequestIdRef = useRef(0);
  const importProgressUnsubscribeRef = useRef<(() => void) | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const invalidatePendingValidation = useCallback(() => {
    validationRequestIdRef.current += 1;
  }, []);

  const clearCloseTimeout = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  }, []);

  const applyManifestState = useCallback((manifestData: RepositoryManifest) => {
    if (isParentManifest(manifestData)) {
      setImportMode('full');
      setSelectedTranslations(manifestData.translations.map((translation) => translation.id));
      return;
    }

    setSelectedTranslations([]);
  }, []);

  const handleClose = useCallback(() => {
    invalidatePendingValidation();
    clearImportProgressSubscription();
    clearCloseTimeout();
    setImportUrl('');
    setImportType('discover');
    dispatch({ type: 'resetAll' });
    onClose();
  }, [clearCloseTimeout, clearImportProgressSubscription, invalidatePendingValidation, onClose]);

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
      invalidatePendingValidation();
      dispatch({ type: 'resetValidation' });
      return;
    }

    const timeoutId = setTimeout(() => {
      void validateSource(trimmedUrl, importType);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [importType, importUrl, invalidatePendingValidation, validateSource]);

  const handleRepositorySelection = useCallback(
    (repositoryPath: string) => {
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
    },
    [applyManifestState, multipleRepositories]
  );

  const handleImport = useCallback(async () => {
    if (!validation?.valid || !importUrl.trim()) return;

    try {
      invalidatePendingValidation();
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

      clearCloseTimeout();
      closeTimeoutRef.current = setTimeout(() => {
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
  }, [
    clearCloseTimeout,
    clearImportProgressSubscription,
    handleClose,
    importMode,
    importUrl,
    invalidatePendingValidation,
    onImportComplete,
    selectedTranslations,
    validation?.valid,
  ]);

  const handleFileSelect = useCallback(async () => {
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
  }, []);

  const handleRepositorySelect = useCallback(
    async (url: string) => {
      setImportUrl(url);
      await validateSource(url, 'discover');
    },
    [validateSource]
  );

  useEffect(() => {
    return () => {
      invalidatePendingValidation();
      clearImportProgressSubscription();
      clearCloseTimeout();
    };
  }, [clearCloseTimeout, clearImportProgressSubscription, invalidatePendingValidation]);

  return {
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
  };
}

