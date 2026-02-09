import { useState, useMemo, useCallback } from 'react'
import {
  Highlighter,
  Search,
  Trash2,
  BookOpen,
  X,
} from 'lucide-react'
import { useReadingStore, useRepositoryStore } from '@/stores'
import { useNavigation } from '@/components/layout/Navigation'
import type { Highlight } from '@/types/store'

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'bg-yellow-200/40 dark:bg-yellow-500/20' },
  { name: 'Green', value: 'bg-green-200/40 dark:bg-green-500/20' },
  { name: 'Blue', value: 'bg-blue-200/40 dark:bg-blue-500/20' },
  { name: 'Purple', value: 'bg-purple-200/40 dark:bg-purple-500/20' },
  { name: 'Pink', value: 'bg-pink-200/40 dark:bg-pink-500/20' },
  { name: 'Orange', value: 'bg-orange-200/40 dark:bg-orange-500/20' },
]

function getColorName(colorValue: string): string {
  return HIGHLIGHT_COLORS.find((c) => c.value === colorValue)?.name ?? 'Custom'
}

export function HighlightsView() {
  const { highlights, removeHighlight, updateHighlight } = useReadingStore()
  const { books, loadBooks, setCurrentBook, loadChapter } =
    useRepositoryStore()
  const { setCurrentView } = useNavigation()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeColor, setActiveColor] = useState<string | null>(null)
  const [deletingHighlightId, setDeletingHighlightId] = useState<string | null>(null)

  // Resolve book_id to display name
  const bookNameMap = useMemo(() => {
    const map = new Map<string, string>()
    books.forEach((b) => map.set(b.id, b.name))
    return map
  }, [books])

  // Collect all unique colors used across highlights
  const usedColors = useMemo(() => {
    const colorSet = new Set<string>()
    highlights.forEach((h) => colorSet.add(h.color))
    return HIGHLIGHT_COLORS.filter((c) => colorSet.has(c.value))
  }, [highlights])

  // Filter highlights by search query and active color
  const filteredHighlights = useMemo(() => {
    let result = [...highlights]

    if (activeColor) {
      result = result.filter((h) => h.color === activeColor)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((h) => {
        const bookName = bookNameMap.get(h.book_id) ?? ''
        const ref = `${bookName} ${h.chapter_number}:${h.verse_number}`
        return ref.toLowerCase().includes(q) || getColorName(h.color).toLowerCase().includes(q)
      })
    }

    return result
  }, [highlights, searchQuery, activeColor, bookNameMap])

  // Group filtered highlights by book_id
  const groupedHighlights = useMemo(() => {
    const groups = new Map<string, Highlight[]>()
    const sorted = [...filteredHighlights].sort((a, b) => {
      if (a.book_id !== b.book_id) return a.book_id.localeCompare(b.book_id)
      if (a.chapter_number !== b.chapter_number) return a.chapter_number - b.chapter_number
      return a.verse_number - b.verse_number
    })
    sorted.forEach((h) => {
      const list = groups.get(h.book_id) ?? []
      list.push(h)
      groups.set(h.book_id, list)
    })
    return groups
  }, [filteredHighlights])

  const getBookName = (bookId: string) => bookNameMap.get(bookId) ?? `Book ${bookId}`

  // Navigate to the verse in the reader
  const handleNavigate = useCallback(
    async (highlight: Highlight) => {
      if (books.length === 0 && highlight.repository_id) {
        await loadBooks(highlight.repository_id)
      }

      const book = books.find((b) => b.id === highlight.book_id)
      if (book) {
        setCurrentBook(book)
        await loadChapter(book.id, highlight.chapter_number)
      }

      setCurrentView('reader')
    },
    [books, loadBooks, setCurrentBook, loadChapter, setCurrentView]
  )

  const handleDelete = (id: string) => {
    removeHighlight(id)
    setDeletingHighlightId(null)
  }

  const handleChangeColor = (highlightId: string, newColor: string) => {
    updateHighlight(highlightId, { color: newColor })
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return iso
    }
  }

  // Empty state
  if (highlights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Highlighter className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium mb-1">No highlights yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Right-click on any verse in the reader and pick a highlight color to
          mark verses for quick reference.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search highlights..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-accent rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredHighlights.length} highlight{filteredHighlights.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Color filter chips */}
      {usedColors.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveColor(null)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
              !activeColor
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All
          </button>
          {usedColors.map((color) => (
            <button
              key={color.value}
              onClick={() => setActiveColor(activeColor === color.value ? null : color.value)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors ${
                activeColor === color.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <span className={`w-3 h-3 rounded-sm ${color.value} border border-border`} />
              {color.name}
            </button>
          ))}
        </div>
      )}

      {/* Highlights list grouped by book */}
      {filteredHighlights.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No highlights match your search.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedHighlights.entries()).map(([bookId, items]) => (
            <div key={bookId}>
              {/* Book group header */}
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {getBookName(bookId)}
                <span className="text-xs">({items.length})</span>
              </h3>

              <div className="space-y-2">
                {items.map((highlight) => (
                  <div
                    key={highlight.id}
                    className="group border border-border rounded-md p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Highlight info - clickable to navigate */}
                      <button
                        className="flex-1 text-left"
                        onClick={() => handleNavigate(highlight)}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-4 h-4 rounded-sm flex-shrink-0 border border-border ${highlight.color}`}
                          />
                          <span className="text-sm font-medium">
                            {getBookName(highlight.book_id)} {highlight.chapter_number}:
                            {highlight.verse_number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getColorName(highlight.color)}
                          </span>
                        </div>
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {/* Color change dropdown */}
                        <div className="relative group/color">
                          <button
                            className="p-1.5 hover:bg-accent rounded transition-colors"
                            title="Change color"
                          >
                            <Highlighter className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover/color:block bg-popover border border-border shadow-lg rounded-md p-2">
                            <div className="grid grid-cols-3 gap-1">
                              {HIGHLIGHT_COLORS.map((color) => (
                                <button
                                  key={color.name}
                                  onClick={() => handleChangeColor(highlight.id, color.value)}
                                  className={`h-6 w-6 rounded-sm ${color.value} border border-border hover:border-foreground transition-colors ${
                                    highlight.color === color.value ? 'ring-1 ring-primary' : ''
                                  }`}
                                  title={color.name}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        {deletingHighlightId === highlight.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(highlight.id)}
                              className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingHighlightId(null)}
                              className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingHighlightId(highlight.id)}
                            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                            title="Remove highlight"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-2 mt-2 pl-6">
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(highlight.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
