import { useState, useEffect, useCallback } from 'react'
import { Search, X, Filter } from 'lucide-react'
import Fuse from 'fuse.js'
import { useRepositoryStore, useSearch } from '@/stores'

interface SearchFilters {
  repositories: string[]
  testament: 'all' | 'old' | 'new'
  books: string[]
}

export function SearchInterface() {
  const { query, results, loading, setQuery, setResults, setLoading } = useSearch()
  const { repositories } = useRepositoryStore()
  
  const [filters, setFilters] = useState<SearchFilters>({
    repositories: [],
    testament: 'all',
    books: [],
  })
  const [showFilters, setShowFilters] = useState(false)
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [fuse, setFuse] = useState<Fuse<Zaphnath.BibleVerse> | null>(null)

  // Initialize Fuse.js index
  useEffect(() => {
    const initializeSearch = async () => {
      try {
        console.log('[SearchInterface] Initializing search index...')
        setLoading(true)
        
        if (!window.database?.searchVerses) {
          console.error('[SearchInterface] window.database.searchVerses is not available')
          setLoading(false)
          return
        }
        
        console.log('[SearchInterface] Calling window.database.searchVerses("")...')
        const allVerses = await window.database.searchVerses('') || []
        console.log(`[SearchInterface] Loaded ${allVerses.length} verses for indexing`)
        
        if (allVerses.length > 0) {
          console.log('[SearchInterface] Sample verse:', allVerses[0])
        }
        
        const fuseInstance = new Fuse(allVerses, {
          keys: ['text', 'book_name'],
          threshold: 0.3,
          includeScore: true,
          includeMatches: true,
        })
        
        console.log('[SearchInterface] Fuse.js index created successfully')
        setFuse(fuseInstance)
        setLoading(false)
      } catch (error) {
        console.error('[SearchInterface] Failed to initialize search:', error)
        setLoading(false)
      }
    }
    
    initializeSearch()
  }, [setLoading])

  // Perform search
  const performSearch = useCallback((searchQuery: string) => {
    console.log(`[SearchInterface] performSearch called with query: "${searchQuery}"`)
    
    if (!fuse) {
      console.error('[SearchInterface] Fuse instance is null, cannot search')
      setResults([])
      return
    }
    
    if (!searchQuery.trim()) {
      console.log('[SearchInterface] Empty query, clearing results')
      setResults([])
      return
    }

    console.log('[SearchInterface] Starting Fuse.js search...')
    setLoading(true)
    
    // Search with Fuse.js
    let fuseResults = fuse.search(searchQuery)
    console.log(`[SearchInterface] Fuse.js found ${fuseResults.length} results`)
    
    // Apply filters
    if (filters.repositories.length > 0) {
      fuseResults = fuseResults.filter(r => 
        filters.repositories.includes(r.item.repository_id)
      )
    }
    
    if (filters.testament !== 'all') {
      const testamentMap = { old: 'OT', new: 'NT' } as const
      const targetTestament = testamentMap[filters.testament as 'old' | 'new']
      fuseResults = fuseResults.filter(r => 
        r.item.testament === targetTestament
      )
    }
    
    if (filters.books.length > 0) {
      fuseResults = fuseResults.filter(r => 
        filters.books.includes(r.item.book_id.toString())
      )
    }
    
    // Convert to SearchResult format
    const searchResults = fuseResults.map(r => ({
      id: r.item.id.toString(),
      repository_id: r.item.repository_id,
      book_id: r.item.book_id.toString(),
      book_name: r.item.book_name || 'Unknown',
      chapter_number: r.item.chapter,
      verse_number: r.item.verse,
      verse_text: r.item.text,
      highlight_start: r.matches?.[0]?.indices?.[0]?.[0],
      highlight_end: r.matches?.[0]?.indices?.[0]?.[1],
    }))
    
    setResults(searchResults)
    setLoading(false)
    
    // Add to history
    if (searchQuery && !searchHistory.includes(searchQuery)) {
      setSearchHistory([searchQuery, ...searchHistory].slice(0, 10))
    }
  }, [fuse, filters, setResults, setLoading, searchHistory])

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setQuery(value)
    if (value.length >= 2) {
      performSearch(value)
    } else {
      setResults([])
    }
  }

  // Clear search
  const handleClearSearch = () => {
    setQuery('')
    setResults([])
  }

  // Handle result click
  const handleResultClick = (result: typeof results[0]) => {
    // TODO: Navigate to verse
    console.log('Navigate to:', result)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Header */}
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold mb-4">Search Bible</h2>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search for verses..."
            className="w-full pl-10 pr-20 py-2 bg-background border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && (
              <button
                onClick={handleClearSearch}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1 hover:bg-accent rounded transition-colors ${showFilters ? 'bg-accent' : ''}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 p-3 bg-muted border border-border">
            <div className="space-y-3">
              {/* Testament Filter */}
              <div>
                <label className="text-sm font-medium mb-1 block">Testament</label>
                <select
                  value={filters.testament}
                  onChange={(e) => setFilters({ ...filters, testament: e.target.value as any })}
                  className="w-full px-2 py-1 bg-background border border-border text-sm"
                >
                  <option value="all">All</option>
                  <option value="old">Old Testament</option>
                  <option value="new">New Testament</option>
                </select>
              </div>

              {/* Repository Filter */}
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

        {/* Search History */}
        {searchHistory.length > 0 && !query && (
          <div className="mt-3">
            <div className="text-xs font-medium text-muted-foreground mb-1">Recent Searches</div>
            <div className="flex flex-wrap gap-1">
              {searchHistory.map((term, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setQuery(term)
                    performSearch(term)
                  }}
                  className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 transition-colors"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-4 text-center text-muted-foreground">
            Searching...
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="p-4 text-center text-muted-foreground">
            No results found for "{query}"
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <div className="px-4 py-2 text-sm text-muted-foreground border-b border-border">
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>
            <div className="divide-y divide-border">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {result.book_name} {result.chapter_number}:{result.verse_number}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">
                    {result.verse_text}
                  </p>
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
  )
}
