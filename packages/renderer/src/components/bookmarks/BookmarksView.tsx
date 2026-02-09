import { useState, useMemo, useCallback } from 'react'
import {
  Bookmark,
  Search,
  Trash2,
  Pencil,
  BookOpen,
  Tag,
  X,
} from 'lucide-react'
import { useReadingStore, useRepositoryStore } from '@/stores'
import { useNavigation } from '@/components/layout/Navigation'
import { BookmarkDialog } from '@/components/reader/BookmarkDialog'
import type { Bookmark as BookmarkType } from '@/types/store'

export function BookmarksView() {
  const { bookmarks, removeBookmark } = useReadingStore()
  const { books, loadBooks, setCurrentBook, loadChapter } =
    useRepositoryStore()
  const { setCurrentView } = useNavigation()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [editingBookmark, setEditingBookmark] = useState<BookmarkType | null>(null)
  const [deletingBookmarkId, setDeletingBookmarkId] = useState<string | null>(null)

  // Collect all unique tags across bookmarks
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    bookmarks.forEach((b) => b.tags?.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [bookmarks])

  // Filter bookmarks by search query and active tag
  const filteredBookmarks = useMemo(() => {
    let result = [...bookmarks]

    if (activeTag) {
      result = result.filter((b) => b.tags?.includes(activeTag))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (b) =>
          (b.title && b.title.toLowerCase().includes(q)) ||
          (b.note && b.note.toLowerCase().includes(q)) ||
          b.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }

    return result
  }, [bookmarks, searchQuery, activeTag])

  // Group filtered bookmarks by book_id (we'll show the book_id as the group name
  // and resolve it to a real name if the book is currently loaded)
  const groupedBookmarks = useMemo(() => {
    const groups = new Map<string, BookmarkType[]>()
    // Sort by chapter then verse within each group
    const sorted = [...filteredBookmarks].sort((a, b) => {
      if (a.book_id !== b.book_id) return a.book_id.localeCompare(b.book_id)
      if (a.chapter_number !== b.chapter_number) return a.chapter_number - b.chapter_number
      return a.verse_number - b.verse_number
    })
    sorted.forEach((b) => {
      const list = groups.get(b.book_id) ?? []
      list.push(b)
      groups.set(b.book_id, list)
    })
    return groups
  }, [filteredBookmarks])

  // Resolve book_id to a display name using the loaded books list
  const bookNameMap = useMemo(() => {
    const map = new Map<string, string>()
    books.forEach((b) => map.set(b.id, b.name))
    return map
  }, [books])

  const getBookName = (bookId: string) => bookNameMap.get(bookId) ?? `Book ${bookId}`

  // Navigate to the verse in the reader
  const handleNavigate = useCallback(
    async (bookmark: BookmarkType) => {
      // If the books aren't loaded for this repository, load them first
      if (books.length === 0 && bookmark.repository_id) {
        await loadBooks(bookmark.repository_id)
      }

      // Find the book object to set as current
      const book = books.find((b) => b.id === bookmark.book_id)
      if (book) {
        setCurrentBook(book)
        await loadChapter(book.id, bookmark.chapter_number)
      }

      setCurrentView('reader')
    },
    [books, loadBooks, setCurrentBook, loadChapter, setCurrentView]
  )

  const handleDelete = (id: string) => {
    removeBookmark(id)
    setDeletingBookmarkId(null)
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
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Bookmark className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium mb-1">No bookmarks yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Right-click on any verse in the reader and select "Add Bookmark" to save
          verses for quick access.
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
            placeholder="Search bookmarks..."
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
          {filteredBookmarks.length} bookmark{filteredBookmarks.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTag(null)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
              !activeTag
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                activeTag === tag
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <Tag className="w-3 h-3" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Bookmark list grouped by book */}
      {filteredBookmarks.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No bookmarks match your search.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedBookmarks.entries()).map(([bookId, items]) => (
            <div key={bookId}>
              {/* Book group header */}
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {getBookName(bookId)}
                <span className="text-xs">({items.length})</span>
              </h3>

              <div className="space-y-2">
                {items.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="group border border-border rounded-md p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Bookmark info - clickable to navigate */}
                      <button
                        className="flex-1 text-left"
                        onClick={() => handleNavigate(bookmark)}
                      >
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-3.5 h-3.5 text-primary fill-primary flex-shrink-0" />
                          <span className="text-sm font-medium">
                            {bookmark.title ||
                              `${getBookName(bookmark.book_id)} ${bookmark.chapter_number}:${bookmark.verse_number}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getBookName(bookmark.book_id)} {bookmark.chapter_number}:
                            {bookmark.verse_number}
                          </span>
                        </div>
                        {bookmark.note && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 pl-5.5">
                            {bookmark.note}
                          </p>
                        )}
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => setEditingBookmark(bookmark)}
                          className="p-1.5 hover:bg-accent rounded transition-colors"
                          title="Edit bookmark"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deletingBookmarkId === bookmark.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(bookmark.id)}
                              className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingBookmarkId(null)}
                              className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingBookmarkId(bookmark.id)}
                            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                            title="Delete bookmark"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tags and date */}
                    <div className="flex items-center gap-2 mt-2 pl-5.5">
                      {bookmark.tags && bookmark.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {bookmark.tags.map((tag) => (
                            <button
                              key={tag}
                              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                              className="inline-flex items-center px-1.5 py-0.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDate(bookmark.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <BookmarkDialog
        editBookmark={editingBookmark}
        onClose={() => setEditingBookmark(null)}
      />
    </div>
  )
}
