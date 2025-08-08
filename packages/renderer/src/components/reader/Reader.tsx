import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRepositoryStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'


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
      <Card>
        <CardHeader>
          <CardTitle>Bible Reader</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Select a repository from Repositories to start reading.</p>
        </CardContent>
      </Card>
    )
  }

  const percent = Math.round(progress * 100)

  return (
    <div className="grid grid-cols-12 gap-4">
      {/* Books list */}
      <div className="col-span-12 lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{currentRepository.name} — Books</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[70vh] overflow-auto space-y-1">
              {books.map(b => (
                <Button
                  key={b.id}
                  variant={currentBook?.id === b.id ? 'secondary' : 'ghost'}
                  className="w-full justify-start h-8"
                  onClick={() => handleSelectBook(b.id)}
                >
                  <span className="mr-2 text-xs text-muted-foreground w-8 text-right">{b.order}</span>
                  <span className="truncate">{b.name}</span>
                </Button>
              ))}
              {books.length === 0 && (
                <div className="text-sm text-muted-foreground">No books found for this repository.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reading area */}
      <div className="col-span-12 lg:col-span-9">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                {/* Breadcrumbs */}
                <div className="text-xs text-muted-foreground">
                  <span>Reader</span>
                  <span className="mx-1">/</span>
                  <span>{currentRepository.name}</span>
                  {currentBook && <>
                    <span className="mx-1">/</span>
                    <span>{currentBook.name}</span>
                  </>}
                  {currentChapter && <>
                    <span className="mx-1">/</span>
                    <span>Chapter {currentChapter.number}</span>
                  </>}
                </div>
                <CardTitle className="text-base mt-1">
                  {currentBook ? `${currentBook.name}` : 'Select a book'}
                  {currentChapter ? ` — Chapter ${currentChapter.number}` : ''}
                </CardTitle>
              </div>
              {currentBook && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeChapter(Math.max(1, (chapterSelect || 1) - 1))}
                    disabled={!chapterSelect || chapterSelect <= 1}
                  >
                    Prev
                  </Button>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={chapterSelect ?? ''}
                    onChange={(e) => handleChangeChapter(Number(e.target.value))}
                  >
                    <option value="" disabled>Chapter</option>
                    {chaptersForCurrentBook.map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleChangeChapter(Math.min((currentBook?.chapter_count || 1), (chapterSelect || 1) + 1))}
                    disabled={!chapterSelect || (currentBook ? chapterSelect >= currentBook.chapter_count : true)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            {/* Progress bar */}
            {currentBook && (
              <div className="mt-3">
                <div className="h-1.5 w-full bg-muted rounded">
                  <div className="h-1.5 bg-primary rounded" style={{ width: `${percent}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{percent}% — {verses.length} verses</div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {!currentBook && (
              <p className="text-muted-foreground">Choose a book from the left to start reading.</p>
            )}
            {currentBook && (
              <div ref={scrollRef} className="space-y-3 max-h-[70vh] overflow-auto pr-2">
                {verses.map(v => (
                  <div key={v.id} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-6 text-right select-none leading-7">{v.number}</span>
                    <p className="leading-7 whitespace-pre-wrap break-words">{v.text}</p>
                  </div>
                ))}
                {verses.length === 0 && (
                  <div className="text-sm text-muted-foreground">No verses found.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

