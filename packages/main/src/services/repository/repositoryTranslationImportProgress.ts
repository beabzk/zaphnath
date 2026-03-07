import type { RepositoryBookImportProgress } from './repositoryBookImporter.js';
import type { ImportProgress } from './types.js';

const bookImportProgressStart = 60;
const bookImportProgressRange = 35;

export function createTranslationBookImportProgressReporter(
  reportProgress: (progress: ImportProgress) => void
): (progress: RepositoryBookImportProgress) => void {
  return (progress) => {
    if (progress.stage === 'preparing') {
      reportProgress({
        stage: 'processing',
        progress: bookImportProgressStart,
        message: `Preparing to import ${progress.totalBooks} books...`,
        total_books: progress.totalBooks,
        processed_books: progress.processedBooks,
      });
      return;
    }

    const normalizedProgress =
      progress.totalBooks === 0 ? 0 : progress.processedBooks / progress.totalBooks;
    const mappedProgress = Math.round(
      bookImportProgressStart + normalizedProgress * bookImportProgressRange
    );

    if (progress.stage === 'processing') {
      reportProgress({
        stage: 'processing',
        progress: mappedProgress,
        message: `Importing book ${progress.currentBook}...`,
        current_book: progress.currentBook,
        total_books: progress.totalBooks,
        processed_books: progress.processedBooks,
      });
      return;
    }

    reportProgress({
      stage: 'processing',
      progress: mappedProgress,
      message: `Imported ${progress.importedCount}/${progress.totalBooks} books`,
      current_book: progress.currentBook,
      total_books: progress.totalBooks,
      processed_books: progress.processedBooks,
    });
  };
}

export function createTranslationImportCompleteProgress(importedCount: number): ImportProgress {
  return {
    stage: 'complete',
    progress: 100,
    message: `Import complete! ${importedCount} books imported.`,
  };
}
