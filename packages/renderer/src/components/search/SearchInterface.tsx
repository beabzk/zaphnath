import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Filter } from 'lucide-react';
import Fuse from 'fuse.js';
import { useRepositoryStore, useReadingStore, useSearch } from '@/stores';
import { useNavigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import type { SearchResult } from '@/types/store';
import { createTranslationRepository } from '@/lib/repositoryTranslations';

interface SearchFilters {
  repositories: string[];
  testament: 'all' | 'old' | 'new';
  books: string[];
}

type SearchMode = 'fuzzy' | 'exact_phrase' | 'all_words';

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 100;

export function SearchInterface() {
  const { query, results, loading, setQuery, setResults, setLoading } = useSearch();
  const {
    currentRepository,
    books,
    setCurrentRepository,
    repositories,
    loadBooks,
    loadRepositories,
    loadTranslations,
    setCurrentBook,
    loadChapter,
  } = useRepositoryStore();
  const { setCurrentLocation } = useReadingStore();
  const { setCurrentView } = useNavigation();

  const [filters, setFilters] = useState<SearchFilters>({
    repositories: [],
    testament: 'all',
    books: [],
  });
  const [searchMode, setSearchMode] = useState<SearchMode>('fuzzy');
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [fuse, setFuse] = useState<Fuse<Zaphnath.BibleVerse> | null>(null);
  const [allVerses, setAllVerses] = useState<Zaphnath.BibleVerse[]>([]);
  const [resultsCapped, setResultsCapped] = useState(false);

  const repositoryIndexSignature = useMemo(
    () =>
      repositories
        .map((repo) => `${repo.id}:${repo.updated_at}`)
        .sort()
        .join('|'),
    [repositories]
  );

  const resolveRepositoryForResult = useCallback(
    async (repositoryId: string) => {
      const currentState = useRepositoryStore.getState();
      const existingRepository =
        currentState.repositories.find((repo) => repo.id === repositoryId) || null;
      if (existingRepository) {
        return existingRepository;
      }

      try {
        if (currentState.repositories.length === 0) {
          await loadRepositories();
        }

        const listedRepositories = useRepositoryStore.getState().repositories;
        const directMatch = listedRepositories.find((repo) => repo.id === repositoryId) || null;
        if (directMatch) {
          return directMatch;
        }

        for (const parentRepository of listedRepositories) {
          if (parentRepository.type !== 'parent') {
            continue;
          }

          const translations =
            useRepositoryStore.getState().translationsByParent[parentRepository.id] ||
            (await loadTranslations(parentRepository.id));
          const translation =
            translations.find((item) => item.id === repositoryId) || null;

          if (!translation) {
            continue;
          }

          return createTranslationRepository(parentRepository, translation, {
            id: repositoryId,
          });
        }
      } catch (error) {
        console.error(
          '[SearchInterface] Failed to resolve repository metadata:',
          error,
          repositoryId
        );
      }

      return {
        id: repositoryId,
        name: repositoryId,
        description: `Translation ${repositoryId}`,
        language: 'en',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        type: 'translation' as const,
      };
    },
    [loadRepositories, loadTranslations]
  );

  const verseMatchesFilters = useCallback(
    (verse: Zaphnath.BibleVerse) => {
      if (filters.repositories.length > 0 && !filters.repositories.includes(verse.repository_id)) {
        return false;
      }

      if (filters.testament !== 'all') {
        const testamentMap = { old: 'OT', new: 'NT' } as const;
        const targetTestament = testamentMap[filters.testament];
        if (verse.testament !== targetTestament) {
          return false;
        }
      }

      if (filters.books.length > 0 && !filters.books.includes(verse.book_id.toString())) {
        return false;
      }

      return true;
    },
    [filters]
  );

  // Initialize/rebuild Fuse.js index when repository data changes
  useEffect(() => {
    let isCancelled = false;

    const initializeSearch = async () => {
      try {
        setLoading(true);

        if (!window.database?.searchVerses) {
          console.error('[SearchInterface] window.database.searchVerses is not available');
          if (!isCancelled) {
            setAllVerses([]);
            setFuse(null);
          }
          return;
        }

        const loadedVerses = (await window.database.searchVerses('')) || [];
        if (isCancelled) {
          return;
        }

        const fuseInstance = new Fuse(loadedVerses, {
          keys: ['text', 'book_name'],
          threshold: 0.3,
          includeScore: true,
          includeMatches: true,
        });

        setAllVerses(loadedVerses);
        setFuse(fuseInstance);
      } catch (error) {
        console.error('[SearchInterface] Failed to initialize search:', error);
        if (!isCancelled) {
          setAllVerses([]);
          setFuse(null);
          setResults([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    initializeSearch();

    return () => {
      isCancelled = true;
    };
  }, [repositoryIndexSignature, setLoading, setResults]);

  // Perform search
  const performSearch = useCallback(
    (searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      const normalizedQuery = trimmedQuery.toLowerCase();
      if (!normalizedQuery || normalizedQuery.length < MIN_SEARCH_LENGTH) {
        setResults([]);
        setResultsCapped(false);
        setLoading(false);
        return;
      }

      setLoading(true);

      let searchResults: SearchResult[] = [];
      let totalMatches = 0;

      if (searchMode === 'fuzzy') {
        if (!fuse) {
          setResults([]);
          setResultsCapped(false);
          setLoading(false);
          return;
        }

        const filteredFuseResults = fuse
          .search(trimmedQuery)
          .filter((match) => verseMatchesFilters(match.item));

        totalMatches = filteredFuseResults.length;

        searchResults = filteredFuseResults.slice(0, MAX_SEARCH_RESULTS).map((match) => ({
          id: match.item.id.toString(),
          repository_id: match.item.repository_id,
          book_id: match.item.book_id.toString(),
          book_name: match.item.book_name || 'Unknown',
          chapter_number: match.item.chapter,
          verse_number: match.item.verse,
          verse_text: match.item.text,
          highlight_start: match.matches?.[0]?.indices?.[0]?.[0],
          highlight_end: match.matches?.[0]?.indices?.[0]?.[1],
        }));
      } else {
        const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);
        const literalMatches = allVerses.filter((verse) => {
          if (!verseMatchesFilters(verse)) {
            return false;
          }

          const verseText = verse.text.toLowerCase();
          if (searchMode === 'exact_phrase') {
            return verseText.includes(normalizedQuery);
          }

          return queryTerms.every((term) => verseText.includes(term));
        });

        totalMatches = literalMatches.length;

        searchResults = literalMatches.slice(0, MAX_SEARCH_RESULTS).map((verse) => ({
          id: verse.id.toString(),
          repository_id: verse.repository_id,
          book_id: verse.book_id.toString(),
          book_name: verse.book_name || 'Unknown',
          chapter_number: verse.chapter,
          verse_number: verse.verse,
          verse_text: verse.text,
        }));
      }

      setResultsCapped(totalMatches > MAX_SEARCH_RESULTS);
      setResults(searchResults);
      setLoading(false);

      // Add to history
      setSearchHistory((previousHistory) => {
        if (previousHistory.includes(trimmedQuery)) {
          return previousHistory;
        }

        return [trimmedQuery, ...previousHistory].slice(0, 10);
      });
    },
    [allVerses, fuse, searchMode, setResults, setLoading, verseMatchesFilters]
  );

  // Re-run search whenever active query dependencies (filters, mode, index) change
  useEffect(() => {
    if (query.trim().length >= MIN_SEARCH_LENGTH) {
      performSearch(query);
    } else {
      setResults([]);
      setResultsCapped(false);
      setLoading(false);
    }
  }, [performSearch, query, setLoading, setResults]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value.trim().length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setResultsCapped(false);
      setLoading(false);
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setQuery('');
    setResults([]);
    setResultsCapped(false);
    setLoading(false);
  };

  const handleTestamentChange = (testament: SearchFilters['testament']) => {
    setFilters((previous) => ({ ...previous, testament }));
  };

  const handleSearchModeChange = (mode: SearchMode) => {
    setSearchMode(mode);
  };

  const searchModeDescription =
    searchMode === 'fuzzy'
      ? 'Typo-tolerant matching'
      : searchMode === 'exact_phrase'
        ? 'Literal contiguous phrase matching'
        : 'All words must appear in the verse';

  // Handle result click
  const handleResultClick = useCallback(
    async (result: SearchResult) => {
      const repositoryId = result.repository_id;
      const bookId = result.book_id;
      const chapterNumber = result.chapter_number;
      const verseNumber = result.verse_number;

      try {
        const isCurrentRepository = currentRepository?.id === repositoryId;
        const targetRepository = await resolveRepositoryForResult(repositoryId);

        if (!isCurrentRepository) {
          setCurrentRepository(targetRepository);
        }

        if (!isCurrentRepository || books.length === 0) {
          await loadBooks(repositoryId);
        }

        const latestBooks = useRepositoryStore.getState().books;
        const targetBook = latestBooks.find((book) => book.id === bookId) || null;
        if (targetBook) {
          setCurrentBook(targetBook);
          await loadChapter(bookId, chapterNumber);
        }

        setCurrentLocation({
          repository_id: repositoryId,
          book_id: bookId,
          chapter_number: chapterNumber,
          verse_number: verseNumber,
        });
        setCurrentView('reader');
      } catch (error) {
        console.error('[SearchInterface] Failed to navigate to verse:', error, result);
      }
    },
    [
      books.length,
      currentRepository?.id,
      loadBooks,
      loadChapter,
      resolveRepositoryForResult,
      setCurrentBook,
      setCurrentLocation,
      setCurrentRepository,
      setCurrentView,
    ]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border/70 bg-muted/20 p-4">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Search Bible</h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search for verses..."
            className="w-full rounded-lg border border-border/70 bg-background/90 py-2 pl-10 pr-20 text-sm"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <Button onClick={handleClearSearch} variant="ghost" size="icon" className="h-7 w-7">
                <X className="w-4 h-4" />
              </Button>
            )}
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant={showFilters ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 rounded-lg border border-border/70 bg-muted/50 p-3">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Search Type</label>
                <select
                  value={searchMode}
                  onChange={(e) => handleSearchModeChange(e.target.value as SearchMode)}
                  className="w-full border border-border/70 bg-background/90 px-2 py-1 text-sm"
                >
                  <option value="fuzzy">Fuzzy (default)</option>
                  <option value="exact_phrase">Exact Phrase</option>
                  <option value="all_words">All Words</option>
                </select>
                <div className="mt-1 text-xs text-muted-foreground">{searchModeDescription}</div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Testament</label>
                <select
                  value={filters.testament}
                  onChange={(e) => handleTestamentChange(e.target.value as SearchFilters['testament'])}
                  className="w-full border border-border/70 bg-background/90 px-2 py-1 text-sm"
                >
                  <option value="all">All</option>
                  <option value="old">Old Testament</option>
                  <option value="new">New Testament</option>
                </select>
              </div>

              {repositories.length > 1 && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Translations</label>
                  <div className="text-xs text-muted-foreground">
                    {repositories.length} available
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {searchHistory.length > 0 && !query && (
          <div className="mt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Recent Searches</div>
            <div className="flex flex-wrap gap-1">
              {searchHistory.map((term, i) => (
                <Button
                  key={i}
                  onClick={() => {
                    setQuery(term);
                    performSearch(term);
                  }}
                  variant="secondary"
                  size="sm"
                  className="h-6 px-2 text-xs"
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="scrollbar-subtle flex-1 overflow-y-auto">
        {loading && <div className="p-4 text-center text-muted-foreground">Searching...</div>}

        {!loading && query && results.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No results found for "{query}"
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border/70 bg-muted/15">
              {results.length} result{results.length !== 1 ? 's' : ''} found
              {resultsCapped && ` (showing first ${MAX_SEARCH_RESULTS})`}
            </div>
            <div className="divide-y divide-border/70">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-accent/45 transition-colors"
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {result.book_name} {result.chapter_number}:{result.verse_number}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{result.verse_text}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && !query && (
          <div className="p-4 text-center text-muted-foreground">
            Enter a search term to find verses
          </div>
        )}
      </div>
    </div>
  );
}
