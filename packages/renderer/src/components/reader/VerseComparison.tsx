import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Copy, Download } from 'lucide-react';
import { useRepositoryStore } from '@/stores';
import { repository } from '@app/preload';

interface ComparisonVerse {
  repositoryId: string;
  repositoryName: string;
  text: string;
}

interface VerseComparisonProps {
  bookId: string;
  bookName: string;
  bookAbbreviation: string;
  bookOrder: number;
  chapterNumber: number;
  verseNumber: number;
  onClose: () => void;
}

export function VerseComparison({
  bookId,
  bookName,
  bookAbbreviation,
  bookOrder,
  chapterNumber,
  verseNumber,
  onClose,
}: VerseComparisonProps) {
  const { repositories } = useRepositoryStore();
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [verses, setVerses] = useState<ComparisonVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const availableRepos = useMemo(
    () => repositories.filter((r) => r.type === 'translation' || !r.parent_id),
    [repositories]
  );

  useEffect(() => {
    if (availableRepos.length > 0 && selectedRepos.length === 0) {
      const initialSelection = availableRepos
        .slice(0, Math.min(2, availableRepos.length))
        .map((r) => r.id);
      setSelectedRepos(initialSelection);
    }
  }, [availableRepos, selectedRepos.length]);

  useEffect(() => {
    if (selectedRepos.length === 0) {
      setVerses([]);
      return;
    }

    let ignore = false;

    const loadVerses = async () => {
      setLoading(true);
      try {
        const loadedVerses = await Promise.all(
          selectedRepos.map(async (repoId): Promise<ComparisonVerse | null> => {
            const repo = availableRepos.find((candidate) => candidate.id === repoId);
            if (!repo) {
              return null;
            }

            const books = await repository.getBooks(repoId);
            const matchingBook =
              books.find((candidate) => candidate.order === bookOrder) ??
              books.find((candidate) => candidate.abbreviation === bookAbbreviation) ??
              books.find(
                (candidate) => candidate.name.toLowerCase() === bookName.toLowerCase()
              );

            if (!matchingBook) {
              return null;
            }

            const chapter = await repository.getChapter(String(matchingBook.id), chapterNumber);
            const verse = chapter.verses.find((candidate) => candidate.verse === verseNumber);
            if (!verse) {
              return null;
            }

            return {
              repositoryId: repoId,
              repositoryName: repo.name,
              text: verse.text,
            };
          })
        );

        if (!ignore) {
          setVerses(
            loadedVerses.filter((verse): verse is ComparisonVerse => verse !== null)
          );
        }
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load comparison verses:', error);
          setVerses([]);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void loadVerses();

    return () => {
      ignore = true;
    };
  }, [availableRepos, bookAbbreviation, bookName, bookOrder, chapterNumber, selectedRepos, verseNumber]);

  const handleToggleRepo = (repoId: string) => {
    setSelectedRepos((prev) =>
      prev.includes(repoId) ? prev.filter((id) => id !== repoId) : [...prev, repoId]
    );
  };

  const handleCopyAll = () => {
    const text = verses.map((v) => `${v.repositoryName}:\n${v.text}`).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  const handleExport = () => {
    const text = verses.map((v) => `${v.repositoryName}:\n${v.text}`).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${bookId}-${chapterNumber}-${verseNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-background border border-border w-full max-w-5xl max-h-[90vh] flex flex-col shadow-lg">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Verse Comparison</h2>
            <p className="text-sm text-muted-foreground">
              {bookName} {chapterNumber}:{verseNumber}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAll}
              className="p-2 hover:bg-accent rounded transition-colors"
              title="Copy all"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={handleExport}
              className="p-2 hover:bg-accent rounded transition-colors"
              title="Export"
            >
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-accent rounded transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex">
          {/* Translation selector sidebar */}
          <div className="w-64 border-r border-border p-3 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Translations</h3>
              <span className="text-xs text-muted-foreground">{selectedRepos.length} selected</span>
            </div>
            <div className="space-y-1">
              {availableRepos.map((repo) => (
                <label
                  key={repo.id}
                  className="flex items-center gap-2 p-2 hover:bg-accent rounded cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRepos.includes(repo.id)}
                    onChange={() => handleToggleRepo(repo.id)}
                    className="w-4 h-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{repo.name}</div>
                    {repo.language && (
                      <div className="text-xs text-muted-foreground">{repo.language}</div>
                    )}
                  </div>
                </label>
              ))}
              {availableRepos.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No translations available
                </div>
              )}
            </div>
          </div>

          {/* Comparison view */}
          <div className="flex-1 p-4">
            {loading && (
              <div className="text-center text-muted-foreground py-8">Loading verses...</div>
            )}

            {!loading && selectedRepos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Plus className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  Select translations from the sidebar to compare
                </p>
              </div>
            )}

            {!loading && verses.length > 0 && (
              <div className="space-y-6">
                {verses.map((verse) => (
                  <div
                    key={verse.repositoryId}
                    className="border-b border-border pb-4 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold">{verse.repositoryName}</h4>
                      <button
                        onClick={() => navigator.clipboard.writeText(verse.text)}
                        className="p-1 hover:bg-accent rounded transition-colors"
                        title="Copy this verse"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-base leading-relaxed">{verse.text}</p>
                  </div>
                ))}
              </div>
            )}

            {!loading && selectedRepos.length > 0 && verses.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Verse not found in selected translations
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
