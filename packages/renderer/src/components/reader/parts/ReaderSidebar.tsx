import type { Book, Repository } from '@/types/store';

interface ReaderSidebarProps {
  currentRepository: Repository;
  testament: 'old' | 'new';
  filteredBooks: Book[];
  currentBookId?: string;
  hasBooks: boolean;
  onTestamentChange: (testament: 'old' | 'new') => void;
  onSelectBook: (bookId: string) => void;
}

export function ReaderSidebar({
  currentRepository,
  testament,
  filteredBooks,
  currentBookId,
  hasBooks,
  onTestamentChange,
  onSelectBook,
}: ReaderSidebarProps) {
  return (
    <div className="flex h-full w-56 flex-col border-r border-border/70 bg-muted/25">
      <div className="border-b border-border/70 px-3 py-3">
        <h3 className="mb-2 text-sm font-semibold tracking-tight">{currentRepository.name}</h3>
        <div className="flex gap-1">
          <button
            className={`flex-1 rounded-md px-2 py-1 text-xs transition-colors ${
              testament === 'old' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50'
            }`}
            onClick={() => onTestamentChange('old')}
          >
            Old Testament
          </button>
          <button
            className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
              testament === 'new' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent/50'
            }`}
            onClick={() => onTestamentChange('new')}
          >
            New Testament
          </button>
        </div>
      </div>
      <div className="scrollbar-subtle flex-1 overflow-y-auto p-1.5">
        {filteredBooks.map((book) => (
          <button
            key={book.id}
            className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent/60 ${
              currentBookId === book.id ? 'bg-accent text-accent-foreground shadow-sm' : ''
            }`}
            onClick={() => onSelectBook(book.id)}
          >
            <span className="w-5 flex-shrink-0 text-right text-xs text-muted-foreground">
              {book.order}
            </span>
            <span className="flex-1">{book.name}</span>
          </button>
        ))}
        {!hasBooks && <div className="px-3 py-2 text-sm text-muted-foreground">No books found</div>}
      </div>
    </div>
  );
}
