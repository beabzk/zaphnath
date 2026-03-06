import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useNavigation, type AppView } from './Navigation';
import { useSidebar } from '@/stores';
import {
  BookOpen,
  Library,
  Bookmark,
  StickyNote,
  Highlighter,
  Calendar,
  Search,
  Settings,
  Download,
  X,
  Bug,
} from 'lucide-react';

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  view: AppView;
  badge?: string;
}

const navigationItems: NavItem[] = [
  { icon: BookOpen, label: 'Reader', view: 'reader' },
  { icon: Library, label: 'Repositories', view: 'repositories' },
  { icon: Search, label: 'Search', view: 'search' },
];

const studyItems: NavItem[] = [
  { icon: Bookmark, label: 'Bookmarks', view: 'bookmarks' },
  { icon: StickyNote, label: 'Notes', view: 'notes' },
  { icon: Highlighter, label: 'Highlights', view: 'highlights' },
  { icon: Calendar, label: 'Reading Plans', view: 'reading-plans' },
];

export function Sidebar() {
  const { currentView, setCurrentView } = useNavigation();
  const { isOpen, close, width } = useSidebar();
  const systemItems: NavItem[] = [
    { icon: Download, label: 'Downloads', view: 'downloads' },
    { icon: Settings, label: 'Settings', view: 'settings' },
    ...(import.meta.env.DEV ? [{ icon: Bug, label: 'Debug', view: 'debug' as AppView }] : []),
  ];

  const NavSection = ({ title, items }: { title: string; items: NavItem[] }) => (
    <div className="space-y-1.5">
      <h3 className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.14em]">
        {title}
      </h3>
      {items.map((item) => {
        const isActive = currentView === item.view;
        return (
          <Button
            key={item.label}
            variant={isActive ? 'secondary' : 'ghost'}
            className={cn(
              'h-8 w-full justify-start gap-2.5 rounded-lg px-2.5 text-[13px]',
              isActive && 'border border-border/65 bg-secondary shadow-sm'
            )}
            onClick={() => setCurrentView(item.view)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </Button>
        );
      })}
    </div>
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          'desktop-surface transition-all duration-300 ease-in-out',
          'hidden overflow-hidden lg:block',
          isOpen && 'lg:block',
          isOpen &&
            'block fixed left-[var(--workspace-padding)] top-[calc(var(--titlebar-height)+var(--workspace-padding-y))] z-50 h-[calc(100vh-var(--titlebar-height)-var(--footer-height)-1rem)] lg:relative lg:left-0 lg:top-0 lg:h-auto lg:z-auto'
        )}
        style={{ width: isOpen ? `${width}px` : '0px' }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2 lg:hidden">
            <span className="text-sm font-semibold">Navigation</span>
            <Button variant="ghost" size="icon" onClick={close} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-b border-border/60 px-3 py-2.5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Workspace
            </p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-3">
            <NavSection title="Main" items={navigationItems} />
            <Separator />
            <NavSection title="Study Tools" items={studyItems} />
            <Separator />
            <NavSection title="System" items={systemItems} />
          </div>
        </div>
      </aside>
    </>
  );
}
