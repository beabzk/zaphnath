import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useInView } from 'react-intersection-observer'
import { useRepositoryStore, useReadingStore } from '@/stores'
import { ChevronRight, Bookmark as BookmarkIcon, StickyNote } from 'lucide-react'
import { VerseContextMenu } from './VerseContextMenu'
import { ReadingControls, ReadingPreferences, PRESETS } from './ReadingControls'
import { VerseComparison } from './VerseComparison'
import { BookmarkDialog } from './BookmarkDialog'
import { NoteDialog } from './NoteDialog'


export function Reader() {
  const {
    currentRepository,
    books,
    currentBook,
    currentChapter,
    verses,
    loadBooks,
    setCurrentBook,
    loadChapter,
  } = useRepositoryStore()

  const [chapterSelect, setChapterSelect] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentVerseNumber, setCurrentVerseNumber] = useState<number>(1)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; verseId: string; verseNumber: number } | null>(null)
  const [selectedVerses] = useState<Set<string>>(new Set())
  const [readingPrefs, setReadingPrefs] = useState<ReadingPreferences>(PRESETS.reading)
  const [comparisonVerse, setComparisonVerse] = useState<{ bookId: string; chapter: number; verse: number } | null>(null)
  const [bookmarkDialogVerse, setBookmarkDialogVerse] = useState<{
    repositoryId: string
    bookId: string
    bookName: string
    chapterNumber: number
    verseNumber: number
    verseText: string
  } | null>(null)
  const [noteDialogVerse, setNoteDialogVerse] = useState<{
    repositoryId: string
    bookId: string
    bookName: string
    chapterNumber: number
    verseNumber: number
    verseText: string
  } | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const { highlights, addHighlight, removeHighlight, bookmarks, removeBookmark, notes } = useReadingStore()

  // Context menu handlers
  const handleVerseContextMenu = useCallback((e: React.MouseEvent, verseId: string, verseNumber: number) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, verseId, verseNumber })
  }, [])

  const handleCopyVerse = useCallback(() => {
    if (!contextMenu || !currentBook) return
    const verse = verses.find(v => v.id === contextMenu.verseId)
    if (verse) {
      const reference = `${currentBook.name} ${currentChapter?.number}:${verse.number}`
      const text = `${reference} - ${verse.text}`
      navigator.clipboard.writeText(text)
    }
  }, [contextMenu, verses, currentBook, currentChapter])

  const handleHighlight = useCallback((color: string) => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) return
    
    addHighlight({
      repository_id: currentRepository.id,
      book_id: currentBook.id,
      chapter_number: currentChapter.number,
      verse_number: contextMenu.verseNumber,
      color
    })
  }, [contextMenu, currentRepository, currentBook, currentChapter, addHighlight])

  const handleClearHighlight = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook) return
    const highlight = highlights.find(h => 
      h.repository_id === currentRepository.id &&
      h.book_id === currentBook.id &&
      h.chapter_number === currentChapter?.number && 
      h.verse_number === contextMenu.verseNumber
    )
    if (highlight) {
      removeHighlight(highlight.id)
    }
  }, [contextMenu, highlights, currentRepository, currentBook, currentChapter, removeHighlight])

  const handleBookmark = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) return

    const existingBookmark = bookmarks.find(
      b => b.repository_id === currentRepository.id &&
           b.book_id === currentBook.id &&
           b.chapter_number === currentChapter.number &&
           b.verse_number === contextMenu.verseNumber
    )

    if (existingBookmark) {
      removeBookmark(existingBookmark.id)
    } else {
      const verse = verses.find(v => v.id === contextMenu.verseId)
      setBookmarkDialogVerse({
        repositoryId: currentRepository.id,
        bookId: currentBook.id,
        bookName: currentBook.name,
        chapterNumber: currentChapter.number,
        verseNumber: contextMenu.verseNumber,
        verseText: verse?.text ?? '',
      })
    }
  }, [contextMenu, currentRepository, currentBook, currentChapter, bookmarks, removeBookmark, verses])

  const handleNote = useCallback(() => {
    if (!contextMenu || !currentRepository || !currentBook || !currentChapter) return

    const verse = verses.find(v => v.id === contextMenu.verseId)
    setNoteDialogVerse({
      repositoryId: currentRepository.id,
      bookId: currentBook.id,
      bookName: currentBook.name,
      chapterNumber: currentChapter.number,
      verseNumber: contextMenu.verseNumber,
      verseText: verse?.text ?? '',
    })
  }, [contextMenu, currentRepository, currentBook, currentChapter, verses])

  const handleCompare = useCallback(() => {
    if (!contextMenu || !currentBook || !currentChapter) return
    
    setComparisonVerse({
      bookId: currentBook.id,
      chapter: currentChapter.number,
      verse: contextMenu.verseNumber
    })
  }, [contextMenu, currentBook, currentChapter])

  // When repository changes and books are empty, load books
  useEffect(() => {
    if (currentRepository && books.length === 0) {
      loadBooks(currentRepository.id)
    }
  }, [currentRepository, books.length, loadBooks])

  // When book changes, if no chapter loaded, load chapter 1
  useEffect(() => {
    if (currentBook && !currentChapter) {
      loadChapter(currentBook.id, 1)
      setChapterSelect(1)
    }
  }, [currentBook, currentChapter, loadChapter])

  // Sync chapterSelect when chapter changes
  useEffect(() => {
    if (currentChapter?.number) {
      setChapterSelect(currentChapter.number)
      // Reset scroll to top on chapter change
      if (scrollRef.current) scrollRef.current.scrollTop = 0
    }
  }, [currentChapter?.number])

  const chaptersForCurrentBook = useMemo(() => {
    return currentBook ? Array.from({ length: currentBook.chapter_count }, (_, i) => i + 1) : []
  }, [currentBook])

  const handleSelectBook = (bookId: string) => {
    const book = books.find(b => b.id === bookId)
    if (book) {
      setCurrentBook(book)
      loadChapter(book.id, 1)
      setChapterSelect(1)
    }
  }

  const handleChangeChapter = useCallback((num: number) => {
    if (currentBook) {
      const clamped = Math.max(1, Math.min(currentBook.chapter_count, num))
      setChapterSelect(clamped)
      loadChapter(currentBook.id, clamped)
    }
  }, [currentBook, loadChapter])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!currentBook) return
      const container = scrollRef.current
      const delta = 70
      const page = container ? Math.floor(container.clientHeight * 0.9) : 500

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          handleChangeChapter((chapterSelect || 1) + 1)
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleChangeChapter((chapterSelect || 1) - 1)
          break
        case 'ArrowDown':
          if (container) { container.scrollBy({ top: delta, behavior: 'smooth' }) }
          break
        case 'ArrowUp':
          if (container) { container.scrollBy({ top: -delta, behavior: 'smooth' }) }
          break
        case 'PageDown':
          if (container) { container.scrollBy({ top: page, behavior: 'smooth' }) }
          break
        case 'PageUp':
          if (container) { container.scrollBy({ top: -page, behavior: 'smooth' }) }
          break
        case 'Home':
          if (e.ctrlKey) {
            e.preventDefault()
            handleChangeChapter(1)
          } else if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' })
          }
          break
        case 'End':
          if (e.ctrlKey) {
            e.preventDefault()
            handleChangeChapter(currentBook.chapter_count)
          } else if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
          }
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [currentBook, chapterSelect, handleChangeChapter])

  // Progress tracking by scroll position
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const max = Math.max(1, el.scrollHeight - el.clientHeight)
      setProgress(Math.max(0, Math.min(1, el.scrollTop / max)))
    }
    onScroll()
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [currentBook, currentChapter, verses.length])

  if (!currentRepository) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Select a repository from Repositories to start reading.</p>
      </div>
    )
  }

  const percent = Math.round(progress * 100)

  return (
    <div className="h-full flex">
      {/* Books list - minimal sidebar */}
      <div className="w-52 border-r border-border flex flex-col h-full">
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-sm font-medium">{currentRepository.name}</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {books.map(b => (
            <button
              key={b.id}
              className={`w-full text-left px-3 py-1.5 hover:bg-accent/50 transition-colors flex items-center gap-2 text-sm ${
                currentBook?.id === b.id ? 'bg-accent text-accent-foreground' : ''
              }`}
              onClick={() => handleSelectBook(b.id)}
            >
              <span className="text-xs text-muted-foreground w-5 text-right flex-shrink-0">{b.order}</span>
              <span className="flex-1">{b.name}</span>
            </button>
          ))}
          {books.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No books found</div>
          )}
        </div>
      </div>

      {/* Reading area - maximized */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header with breadcrumb navigation */}
        <div className="px-4 py-3 border-b border-border min-h-[56px]">
          {/* Breadcrumb */}
          {currentBook && currentChapter && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span className="hover:text-foreground cursor-pointer transition-colors">
                {currentRepository?.name}
              </span>
              <ChevronRight className="w-3 h-3" />
              <span className="hover:text-foreground cursor-pointer transition-colors">
                {currentBook.name}
              </span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground font-medium">
                Chapter {currentChapter.number}
              </span>
              {currentVerseNumber > 0 && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-foreground font-medium">
                    Verse {currentVerseNumber}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Navigation controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {currentBook && currentChapter ? (
                <>
                  <h1 className="text-base font-medium">{currentBook.name} {currentChapter.number}</h1>
                  <span className="text-xs text-muted-foreground">({verses.length} verses)</span>
                </>
              ) : (
                <span className="text-muted-foreground">Select a book to begin reading</span>
              )}
            </div>
            
            {currentBook && (
              <div className="flex items-center gap-1">
              <button
                className="px-3 py-1 text-sm hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleChangeChapter(Math.max(1, (chapterSelect || 1) - 1))}
                disabled={!chapterSelect || chapterSelect <= 1}
              >
                ←
              </button>
              <select
                className="bg-transparent border-0 px-2 py-1 text-sm focus:outline-none cursor-pointer"
                value={chapterSelect ?? ''}
                onChange={(e) => handleChangeChapter(Number(e.target.value))}
              >
                {chaptersForCurrentBook.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <button
                className="px-3 py-1 text-sm hover:bg-accent/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleChangeChapter(Math.min((currentBook?.chapter_count || 1), (chapterSelect || 1) + 1))}
                disabled={!chapterSelect || (currentBook ? chapterSelect >= currentBook.chapter_count : true)}
              >
                →
              </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Progress indicator - thin line */}
        {currentBook && currentChapter && (
          <div className="h-0.5 bg-muted relative">
            <div className="h-full bg-primary/60 transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        )}

        {/* Reading Controls */}
        {currentBook && currentChapter && (
          <ReadingControls preferences={readingPrefs} onChange={setReadingPrefs} />
        )}
        
        {/* Main reading content */}
        {!currentBook ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Choose a book from the sidebar to start reading</p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
            <div 
              className="mx-auto"
              style={{ 
                maxWidth: `${readingPrefs.maxWidth}px`,
                fontFamily: readingPrefs.fontFamily,
                fontSize: `${readingPrefs.fontSize}px`,
                lineHeight: readingPrefs.lineHeight,
                textAlign: readingPrefs.textAlign,
              }}
            >
            {verses.map((v) => {
                const highlight = highlights.find(h => 
                  h.repository_id === currentRepository?.id &&
                  h.book_id === currentBook?.id &&
                  h.chapter_number === currentChapter?.number && 
                  h.verse_number === v.number
                )
                const isBookmarked = bookmarks.some(
                  b => b.book_id === currentBook?.id &&
                       b.chapter_number === currentChapter?.number &&
                       b.verse_number === v.number
                )
                const hasNote = notes.some(
                  n => n.book_id === currentBook?.id &&
                       n.chapter_number === currentChapter?.number &&
                       n.verse_number === v.number
                )
                return (
                  <VerseItem
                    key={v.id}
                    verse={v}
                    highlight={highlight}
                    isSelected={selectedVerses.has(v.id)}
                    isBookmarked={isBookmarked}
                    hasNote={hasNote}
                    showNumber={readingPrefs.verseNumbers}
                    spacing={readingPrefs.verseSpacing}
                    onInView={(inView) => {
                      if (inView) {
                        setCurrentVerseNumber(v.number)
                      }
                    }}
                    onContextMenu={(e) => handleVerseContextMenu(e, v.id, v.number)}
                  />
                )
              })}
              {verses.length === 0 && (
                <div className="text-sm text-muted-foreground">Loading verses...</div>
              )}
            </div>
          </div>
        )}
        
        {/* Context Menu */}
        {contextMenu && (
          <VerseContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            onCopy={handleCopyVerse}
            onHighlight={handleHighlight}
            onBookmark={handleBookmark}
            onNote={handleNote}
            onClearHighlight={handleClearHighlight}
            onCompare={handleCompare}
            hasHighlight={highlights.some(h => 
              h.repository_id === currentRepository?.id &&
              h.book_id === currentBook?.id &&
              h.chapter_number === currentChapter?.number && 
              h.verse_number === contextMenu.verseNumber
            )}
            hasBookmark={bookmarks.some(
              b => b.book_id === currentBook?.id &&
                   b.chapter_number === currentChapter?.number &&
                   b.verse_number === contextMenu.verseNumber
            )}
          />
        )}

        {/* Bookmark Dialog */}
        <BookmarkDialog
          verse={bookmarkDialogVerse}
          onClose={() => setBookmarkDialogVerse(null)}
        />

        {/* Note Dialog */}
        <NoteDialog
          verse={noteDialogVerse}
          onClose={() => setNoteDialogVerse(null)}
        />

        {/* Verse Comparison Modal */}
        {comparisonVerse && (
          <VerseComparison
            bookId={comparisonVerse.bookId}
            chapterNumber={comparisonVerse.chapter}
            verseNumber={comparisonVerse.verse}
            onClose={() => setComparisonVerse(null)}
          />
        )}
      </div>
    </div>
  )
}

// Individual verse component with intersection observer
interface VerseItemProps {
  verse: { id: string; number: number; text: string }
  highlight?: { color: string }
  isSelected: boolean
  isBookmarked: boolean
  hasNote: boolean
  showNumber: boolean
  spacing: number
  onInView: (inView: boolean) => void
  onContextMenu: (e: React.MouseEvent) => void
}

function VerseItem({ verse, highlight, isSelected, isBookmarked, hasNote, showNumber, spacing, onInView, onContextMenu }: VerseItemProps) {
  const { ref, inView } = useInView({
    threshold: 0.5,
    trackVisibility: true,
    delay: 100,
  })

  useEffect(() => {
    onInView(inView)
  }, [inView, onInView])

  return (
    <div
      ref={ref}
      className={`flex items-start gap-3 px-2 py-1 -mx-2 rounded transition-colors ${
        highlight ? highlight.color : ''
      } ${isSelected ? 'ring-1 ring-primary' : ''} cursor-pointer hover:bg-accent/30`}
      style={{ marginBottom: `${spacing * 4}px` }}
      onContextMenu={onContextMenu}
    >
      {showNumber && (
        <span className="text-xs text-muted-foreground/60 w-6 text-right select-none mt-1 flex-shrink-0">
          {verse.number}
        </span>
      )}
      <p className={showNumber ? 'flex-1' : 'flex-1'}>{verse.text}</p>
      {hasNote && (
        <StickyNote className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-1" />
      )}
      {isBookmarked && (
        <BookmarkIcon className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-1 fill-primary" />
      )}
    </div>
  )
}
