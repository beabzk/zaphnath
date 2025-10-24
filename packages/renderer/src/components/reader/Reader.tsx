import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRepositoryStore } from '@/stores'


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
  const scrollRef = useRef<HTMLDivElement | null>(null)

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
        {/* Minimal header bar */}
        <div className="px-4 py-2 border-b border-border flex items-center justify-between min-h-[48px]">
          <div className="flex items-center gap-3">
            {currentBook && currentChapter ? (
              <>
                <h1 className="text-lg font-medium">{currentBook.name}</h1>
                <span className="text-muted-foreground">Chapter {currentChapter.number}</span>
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
        
        {/* Progress indicator - thin line */}
        {currentBook && currentChapter && (
          <div className="h-0.5 bg-muted relative">
            <div className="h-full bg-primary/60 transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
        )}
        
        {/* Main reading content */}
        {!currentBook ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Choose a book from the sidebar to start reading</p>
          </div>
        ) : (
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-3xl mx-auto">
              {verses.map(v => (
                <div key={v.id} className="flex items-start gap-3 mb-4">
                  <span className="text-xs text-muted-foreground/60 w-6 text-right select-none mt-1 flex-shrink-0">
                    {v.number}
                  </span>
                  <p className="text-base leading-relaxed">{v.text}</p>
                </div>
              ))}
              {verses.length === 0 && (
                <div className="text-sm text-muted-foreground">Loading verses...</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

