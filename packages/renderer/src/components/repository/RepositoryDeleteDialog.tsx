import { Button } from '@/components/ui/button';
import type { DeleteTarget } from './repositoryListTypes';

interface RepositoryDeleteDialogProps {
  deleteTarget: DeleteTarget | null;
  onCancel: () => void;
  onConfirm: (repositoryId: string) => void;
}

export function RepositoryDeleteDialog({
  deleteTarget,
  onCancel,
  onConfirm,
}: RepositoryDeleteDialogProps) {
  if (!deleteTarget) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-popover border border-border shadow-lg w-full max-w-md mx-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-medium">Delete Repository</h3>
          <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
        </div>
        <div className="px-4 py-3 space-y-2">
          <p className="text-sm">
            Delete <span className="font-medium">{deleteTarget.name}</span>?
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={() => onConfirm(deleteTarget.id)}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
