import { useState, useMemo, useCallback } from 'react'
import {
  StickyNote,
  Search,
  Trash2,
  Pencil,
  BookOpen,
  Tag,
  X,
  Clock,
} from 'lucide-react'
import { useReadingStore, useRepositoryStore } from '@/stores'
import { useNavigation } from '@/components/layout/Navigation'
import { NoteDialog } from '@/components/reader/NoteDialog'
import type { Note } from '@/types/store'

type SortMode = 'newest' | 'oldest' | 'updated'

export function NotesView() {
  const { notes, removeNote } = useReadingStore()
  const { books, loadBooks, setCurrentBook, loadChapter } = useRepositoryStore()
  const { setCurrentView } = useNavigation()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)

  // Collect all unique tags across notes
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    notes.forEach((n) => n.tags?.forEach((t) => tagSet.add(t)))
    return Array.from(tagSet).sort()
  }, [notes])

  // Filter notes by search query and active tag
  const filteredNotes = useMemo(() => {
    let result = [...notes]

    if (activeTag) {
      result = result.filter((n) => n.tags?.includes(activeTag))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (n) =>
          (n.title && n.title.toLowerCase().includes(q)) ||
          n.content.toLowerCase().includes(q) ||
          n.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }

    // Sort
    result.sort((a, b) => {
      switch (sortMode) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'updated':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        default:
          return 0
      }
    })

    return result
  }, [notes, searchQuery, activeTag, sortMode])

  // Group filtered notes by book_id
  const groupedNotes = useMemo(() => {
    const groups = new Map<string, Note[]>()
    filteredNotes.forEach((n) => {
      const list = groups.get(n.book_id) ?? []
      list.push(n)
      groups.set(n.book_id, list)
    })
    return groups
  }, [filteredNotes])

  // Resolve book_id to display name
  const bookNameMap = useMemo(() => {
    const map = new Map<string, string>()
    books.forEach((b) => map.set(b.id, b.name))
    return map
  }, [books])

  const getBookName = (bookId: string) => bookNameMap.get(bookId) ?? `Book ${bookId}`

  // Navigate to the verse in the reader
  const handleNavigate = useCallback(
    async (note: Note) => {
      if (books.length === 0 && note.repository_id) {
        await loadBooks(note.repository_id)
      }

      const book = books.find((b) => b.id === note.book_id)
      if (book) {
        setCurrentBook(book)
        await loadChapter(book.id, note.chapter_number)
      }

      setCurrentView('reader')
    },
    [books, loadBooks, setCurrentBook, loadChapter, setCurrentView]
  )

  const handleDelete = (id: string) => {
    removeNote(id)
    setDeletingNoteId(null)
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

  const formatDateTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  // Empty state
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <StickyNote className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-medium mb-1">No notes yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Right-click on any verse in the reader and select "Add Note" to start
          writing study notes.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search, sort and filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
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
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="px-2 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="updated">Recently updated</option>
        </select>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
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

      {/* Notes list grouped by book */}
      {filteredNotes.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          No notes match your search.
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(groupedNotes.entries()).map(([bookId, items]) => (
            <div key={bookId}>
              {/* Book group header */}
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {getBookName(bookId)}
                <span className="text-xs">({items.length})</span>
              </h3>

              <div className="space-y-2">
                {items.map((note) => (
                  <div
                    key={note.id}
                    className="group border border-border rounded-md p-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      {/* Note info - clickable to navigate */}
                      <button
                        className="flex-1 text-left"
                        onClick={() => handleNavigate(note)}
                      >
                        <div className="flex items-center gap-2">
                          <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            {note.title ||
                              `${getBookName(note.book_id)} ${note.chapter_number}:${note.verse_number}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getBookName(note.book_id)} {note.chapter_number}:
                            {note.verse_number}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-3 pl-5.5 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={() => setEditingNote(note)}
                          className="p-1.5 hover:bg-accent rounded transition-colors"
                          title="Edit note"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {deletingNoteId === note.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(note.id)}
                              className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingNoteId(null)}
                              className="px-2 py-1 text-xs hover:bg-accent rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingNoteId(note.id)}
                            className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded transition-colors"
                            title="Delete note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tags and dates */}
                    <div className="flex items-center gap-2 mt-2 pl-5.5">
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map((tag) => (
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
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <Clock className="w-3 h-3" />
                        {note.updated_at !== note.created_at ? (
                          <span title={`Created: ${formatDateTime(note.created_at)}`}>
                            Updated {formatDate(note.updated_at)}
                          </span>
                        ) : (
                          <span>{formatDate(note.created_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <NoteDialog
        editNote={editingNote}
        onClose={() => setEditingNote(null)}
      />
    </div>
  )
}
