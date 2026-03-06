import { AlertCircle, CheckCircle } from 'lucide-react';
import type { ValidationResult } from './shared';

interface ValidationSummaryProps {
  validation: ValidationResult;
}

export function ValidationSummary({ validation }: ValidationSummaryProps) {
  return (
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
              key={`${error.code}-${index}`}
              className="rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/20"
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
              key={`${warning.code}-${index}`}
              className="rounded bg-yellow-50 p-2 text-sm text-yellow-600 dark:bg-yellow-950/20"
            >
              {warning.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

