import type { ImportProgress } from './shared';
import { getProgressPercentage, getProgressStageLabel } from './shared';

interface ImportProgressSummaryProps {
  progress: ImportProgress;
}

export function ImportProgressSummary({ progress }: ImportProgressSummaryProps) {
  const progressPercentage = getProgressPercentage(progress);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">Import Progress</span>
        <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      <p className="text-sm font-medium">{getProgressStageLabel(progress.stage)}</p>
      <p className="text-xs text-muted-foreground">{progress.message}</p>
      {typeof progress.total_books === 'number' && typeof progress.processed_books === 'number' && (
        <p className="text-xs text-muted-foreground">
          {progress.processed_books}/{progress.total_books} books
        </p>
      )}
    </div>
  );
}

