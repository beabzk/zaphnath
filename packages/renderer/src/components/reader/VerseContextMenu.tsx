import { useEffect, useRef } from 'react'
import { Copy, Highlighter, BookmarkPlus, BookmarkMinus, StickyNote, X, GitCompare } from 'lucide-react'

interface VerseContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onCopy: () => void
  onHighlight: (color: string) => void
  onBookmark: () => void
  onNote: () => void
  onClearHighlight: () => void
  onCompare: () => void
  hasHighlight: boolean
  hasBookmark?: boolean
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'bg-yellow-200/40 dark:bg-yellow-500/20' },
  { name: 'Green', value: 'bg-green-200/40 dark:bg-green-500/20' },
  { name: 'Blue', value: 'bg-blue-200/40 dark:bg-blue-500/20' },
  { name: 'Purple', value: 'bg-purple-200/40 dark:bg-purple-500/20' },
  { name: 'Pink', value: 'bg-pink-200/40 dark:bg-pink-500/20' },
  { name: 'Orange', value: 'bg-orange-200/40 dark:bg-orange-500/20' },
]

export function VerseContextMenu({
  x,
  y,
  onClose,
  onCopy,
  onHighlight,
  onBookmark,
  onNote,
  onClearHighlight,
  onCompare,
  hasHighlight,
  hasBookmark = false,
}: VerseContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 bg-popover border border-border shadow-lg"
      style={{ left: x, top: y }}
    >
      {/* Copy */}
      <button
        onClick={() => {
          onCopy()
          onClose()
        }}
        className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors text-left"
      >
        <Copy className="w-4 h-4" />
        Copy Verse
      </button>

      {/* Compare */}
      <button
        onClick={() => {
          onCompare()
          onClose()
        }}
        className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors text-left"
      >
        <GitCompare className="w-4 h-4" />
        Compare Translations
      </button>

      {/* Highlight submenu */}
      <div className="border-t border-border">
        <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
          <Highlighter className="w-3 h-3" />
          Highlight Color
        </div>
        <div className="grid grid-cols-3 gap-1 px-2 py-2">
          {HIGHLIGHT_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => {
                onHighlight(color.value)
                onClose()
              }}
              className={`h-8 ${color.value} border border-border hover:border-foreground transition-colors`}
              title={color.name}
            />
          ))}
        </div>
        {hasHighlight && (
          <button
            onClick={() => {
              onClearHighlight()
              onClose()
            }}
            className="w-full px-3 py-1.5 text-sm flex items-center gap-2 hover:bg-accent transition-colors text-left"
          >
            <X className="w-4 h-4" />
            Clear Highlight
          </button>
        )}
      </div>

      {/* Bookmark */}
      <button
        onClick={() => {
          onBookmark()
          onClose()
        }}
        className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors text-left border-t border-border"
      >
        {hasBookmark ? (
          <><BookmarkMinus className="w-4 h-4" /> Remove Bookmark</>
        ) : (
          <><BookmarkPlus className="w-4 h-4" /> Add Bookmark</>
        )}
      </button>

      {/* Note */}
      <button
        onClick={() => {
          onNote()
          onClose()
        }}
        className="w-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-accent transition-colors text-left"
      >
        <StickyNote className="w-4 h-4" />
        Add Note
      </button>
    </div>
  )
}
