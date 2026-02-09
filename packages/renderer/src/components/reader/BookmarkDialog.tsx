import { useState, useEffect, useRef } from 'react'
import { X, Bookmark } from 'lucide-react'
import { useReadingStore } from '@/stores'
import type { Bookmark as BookmarkType } from '@/types/store'

interface BookmarkDialogProps {
  /** When set, the dialog opens in "add" mode for this verse */
  verse?: {
    repositoryId: string
    bookId: string
    bookName: string
    chapterNumber: number
    verseNumber: number
    verseText: string
  } | null
  /** When set, the dialog opens in "edit" mode for this bookmark */
  editBookmark?: BookmarkType | null
  onClose: () => void
}

export function BookmarkDialog({ verse, editBookmark, onClose }: BookmarkDialogProps) {
  const { addBookmark, updateBookmark } = useReadingStore()
  const isEdit = !!editBookmark
  const dialogRef = useRef<HTMLDivElement>(null)

  const defaultTitle = verse
    ? `${verse.bookName} ${verse.chapterNumber}:${verse.verseNumber}`
    : editBookmark?.title ?? ''

  const [title, setTitle] = useState(isEdit ? (editBookmark?.title ?? '') : defaultTitle)
  const [note, setNote] = useState(isEdit ? (editBookmark?.note ?? '') : '')
  const [tagsInput, setTagsInput] = useState(
    isEdit ? (editBookmark?.tags?.join(', ') ?? '') : ''
  )

  // Reset fields when dialog opens with new data
  useEffect(() => {
    if (verse) {
      setTitle(`${verse.bookName} ${verse.chapterNumber}:${verse.verseNumber}`)
      setNote('')
      setTagsInput('')
    } else if (editBookmark) {
      setTitle(editBookmark.title ?? '')
      setNote(editBookmark.note ?? '')
      setTagsInput(editBookmark.tags?.join(', ') ?? '')
    }
  }, [verse, editBookmark])

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose()
    }
  }

  const parseTags = (input: string): string[] =>
    input
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

  const handleSave = () => {
    if (isEdit && editBookmark) {
      updateBookmark(editBookmark.id, {
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        tags: parseTags(tagsInput),
      })
    } else if (verse) {
      addBookmark({
        repository_id: verse.repositoryId,
        book_id: verse.bookId,
        chapter_number: verse.chapterNumber,
        verse_number: verse.verseNumber,
        title: title.trim() || undefined,
        note: note.trim() || undefined,
        tags: parseTags(tagsInput),
      })
    }
    onClose()
  }

  const isOpen = !!(verse || editBookmark)
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className="bg-popover border border-border shadow-lg w-full max-w-md mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4" />
            <h3 className="text-sm font-medium">
              {isEdit ? 'Edit Bookmark' : 'Add Bookmark'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verse preview */}
        {verse && (
          <div className="px-4 py-2 bg-muted/30 border-b border-border">
            <p className="text-xs text-muted-foreground">
              {verse.bookName} {verse.chapterNumber}:{verse.verseNumber}
            </p>
            <p className="text-sm mt-1 line-clamp-2">{verse.verseText}</p>
          </div>
        )}

        {/* Form */}
        <div className="px-4 py-3 space-y-3">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bookmark title"
              className="w-full px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note..."
              rows={3}
              className="w-full px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. faith, prayer, promise"
              className="w-full px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {parseTags(tagsInput).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {parseTags(tagsInput).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-0.5 text-xs bg-secondary text-secondary-foreground rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Add Bookmark'}
          </button>
        </div>
      </div>
    </div>
  )
}
