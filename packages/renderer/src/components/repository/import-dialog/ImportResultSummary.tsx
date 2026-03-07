import { AlertCircle, CheckCircle } from 'lucide-react';
import type { ImportResult } from './shared';

interface ImportResultSummaryProps {
  result: ImportResult;
}

export function ImportResultSummary({ result }: ImportResultSummaryProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {result.success ? (
          <CheckCircle className="h-5 w-5 text-green-600" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-600" />
        )}
        <span className="font-medium">
          {result.success ? 'Import Successful!' : 'Import Failed'}
        </span>
      </div>

      {result.success ? (
        <p className="text-sm text-muted-foreground">
          Successfully imported {result.books_imported} books.
        </p>
      ) : (
        <div className="space-y-2">
          {result.errors.map((error, index) => (
            <div
              key={`${error.code}-${index}`}
              className="rounded bg-red-50 p-2 text-sm text-red-600 dark:bg-red-950/20"
            >
              {error.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
