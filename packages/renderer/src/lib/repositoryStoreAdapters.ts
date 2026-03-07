import type { ErrorState, ImportProgress, ValidationResult } from '@/types/store';

function toErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export function toRepositoryError(error: unknown, fallbackMessage: string): ErrorState {
  return {
    hasError: true,
    message: toErrorMessage(error, fallbackMessage),
    timestamp: new Date().toISOString(),
  };
}

export function toImportProgressState(progress: Zaphnath.ImportProgress): ImportProgress {
  return {
    stage: progress.stage,
    progress: progress.progress,
    message: progress.message,
    total_books: progress.total_books,
    imported_books: progress.processed_books,
  };
}

export function toCompletedImportProgress(result: Zaphnath.ImportResult): ImportProgress {
  return {
    stage: 'Import completed successfully',
    progress: 100,
    message: `Imported ${result.books_imported} books`,
  };
}

export function toImportFailureMessage(result: Zaphnath.ImportResult | null | undefined): string {
  return result?.errors?.map((error) => error.message).join(', ') || 'Import failed';
}

export function toRendererValidationResult(result: Zaphnath.ValidationResult): ValidationResult {
  return {
    valid: result.valid,
    errors: (result.errors || []).map((error) => ({
      code: error.code,
      message: error.message,
      severity: error.severity ?? 'error',
    })),
    warnings: (result.warnings || []).map((warning) => ({
      code: warning.code,
      message: warning.message,
      severity: 'warning',
    })),
  };
}

export function toValidationErrorResult(error: unknown): ValidationResult {
  return {
    valid: false,
    errors: [
      {
        code: 'VALIDATION_ERROR',
        message: toErrorMessage(error, 'Validation failed'),
        severity: 'error',
      },
    ],
    warnings: [],
  };
}
