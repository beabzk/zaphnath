import React, { useEffect, useMemo, useState } from 'react'
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

  const handleChangeChapter = (num: number) => {
    if (currentBook) {
      setChapterSelect(num)
      loadChapter(currentBook.id, num)
    }
  }

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
              <CardTitle className="text-base">
                {currentBook ? `${currentBook.name}` : 'Select a book'}
                {currentChapter ? ` — Chapter ${currentChapter.number}` : ''}
              </CardTitle>
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
          </CardHeader>
          <CardContent>
            {!currentBook && (
              <p className="text-muted-foreground">Choose a book from the left to start reading.</p>
            )}
            {currentBook && (
              <div className="space-y-3">
                {verses.map(v => (
                  <div key={v.id} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground w-6 text-right select-none">{v.number}</span>
                    <p className="leading-7">{v.text}</p>
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

