import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { Bookmark as BookmarkIcon, StickyNote } from 'lucide-react';

interface VerseItemProps {
  domId: string;
  verse: { id: string; number: number; text: string };
  highlight?: { color: string };
  isSelected: boolean;
  isBookmarked: boolean;
  hasNote: boolean;
  showNumber: boolean;
  spacing: number;
  onInView: (inView: boolean) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

export function VerseItem({
  domId,
  verse,
  highlight,
  isSelected,
  isBookmarked,
  hasNote,
  showNumber,
  spacing,
  onInView,
  onContextMenu,
}: VerseItemProps) {
  const { ref, inView } = useInView({
    threshold: 0.5,
    trackVisibility: true,
    delay: 100,
  });

  useEffect(() => {
    onInView(inView);
  }, [inView, onInView]);

  return (
    <div
      id={domId}
      ref={ref}
      className={`-mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-1.5 transition-colors ${
        highlight ? highlight.color : ''
      } ${isSelected ? 'ring-1 ring-primary/60' : ''} hover:bg-accent/40`}
      style={{ marginBottom: `${spacing * 4}px` }}
      onContextMenu={onContextMenu}
    >
      {showNumber && (
        <span className="mt-1 w-6 flex-shrink-0 select-none text-right text-xs text-muted-foreground/60">
          {verse.number}
        </span>
      )}
      <p className="flex-1">{verse.text}</p>
      {hasNote && <StickyNote className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />}
      {isBookmarked && (
        <BookmarkIcon className="mt-1 h-3.5 w-3.5 flex-shrink-0 fill-primary text-primary" />
      )}
    </div>
  );
}
