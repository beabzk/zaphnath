import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createTranslationRepository } from '@/lib/repositoryTranslations';
import type { TranslationInfo } from '@/types/store';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Globe,
  Info,
  Languages,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import type { DeleteTarget, RepositoryListRepository } from './repositoryListTypes';

interface RepositoryListItemProps {
  currentRepositoryId: string | null;
  isExpanded: boolean;
  repo: RepositoryListRepository;
  translationError?: string;
  translationsLoading: boolean;
  translationsByParent: Record<string, TranslationInfo[]>;
  onRepositorySelect: (repository: RepositoryListRepository) => void;
  onRequestDelete: (target: DeleteTarget) => void;
  onToggleParentExpansion: (parentId: string) => void;
}

function getLanguageDisplay(language: string) {
  const languageNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese',
    it: 'Italian',
    ru: 'Russian',
    zh: 'Chinese',
    ar: 'Arabic',
    he: 'Hebrew',
    el: 'Greek',
  };

  return languageNames[language] || language.toUpperCase();
}

function RepositoryTranslationChildren({
  currentRepositoryId,
  parentRepository,
  parentTranslations,
  translationError,
  translationsLoading,
  translationsLoaded,
  onRepositorySelect,
}: {
  currentRepositoryId: string | null;
  parentRepository: RepositoryListRepository;
  parentTranslations: TranslationInfo[];
  translationError?: string;
  translationsLoading: boolean;
  translationsLoaded: boolean;
  onRepositorySelect: (repository: RepositoryListRepository) => void;
}) {
  return (
    <div className="ml-6 pl-4 border-l-2 border-border space-y-0">
      {translationsLoading && (
        <div className="p-2 text-xs text-muted-foreground border-b border-border/50">
          Loading translations...
        </div>
      )}
      {translationError && (
        <div className="p-2 text-xs text-destructive border-b border-border/50">
          {translationError}
        </div>
      )}
      {!translationsLoading &&
        !translationError &&
        translationsLoaded &&
        parentTranslations.length === 0 && (
          <div className="p-2 text-xs text-muted-foreground border-b border-border/50">
            No translations available
          </div>
        )}
      {parentTranslations.map((translation) => (
        <div
          key={translation.id}
          className={`border-b border-border/50 p-2 transition-all ${
            currentRepositoryId === translation.id ? 'bg-accent/20' : ''
          }`}
        >
          <button
            type="button"
            className="w-full text-left transition-colors hover:bg-accent/30"
            aria-pressed={currentRepositoryId === translation.id}
            onClick={() => {
              const translationRepo = createTranslationRepository(parentRepository, translation);
              onRepositorySelect(translationRepo);
            }}
          >
            <div className="mb-2 flex items-center gap-2">
              {currentRepositoryId === translation.id && (
                <CheckCircle className="h-3 w-3 text-primary" />
              )}
              <BookOpen className="h-3 w-3 text-green-600" />
              <span className="font-medium text-sm">{translation.name}</span>
              <Badge variant="outline" className="text-xs">
                {translation.language}
              </Badge>
              {translation.status !== 'active' && (
                <Badge variant="secondary" className="text-xs">
                  {translation.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{translation.book_count || 'Unknown'} books</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Directory: {translation.directory}</span>
              </div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

export function RepositoryListItem({
  currentRepositoryId,
  isExpanded,
  repo,
  translationError,
  translationsLoading,
  translationsByParent,
  onRepositorySelect,
  onRequestDelete,
  onToggleParentExpansion,
}: RepositoryListItemProps) {
  const hasLoadedTranslations =
    repo.type === 'parent' && Object.prototype.hasOwnProperty.call(translationsByParent, repo.id);
  const parentTranslations = repo.type === 'parent' ? (repo.translations ?? []) : [];
  const translationCount =
    repo.type === 'parent'
      ? hasLoadedTranslations
        ? parentTranslations.length
        : (repo.translation_count ?? 0)
      : 0;

  return (
    <div className="space-y-2">
      <div
        className={`flex items-start gap-2 border-b border-border p-3 transition-all ${
          currentRepositoryId === repo.id ? 'bg-accent/20' : ''
        }`}
      >
        <button
          type="button"
          className={`flex-1 space-y-2 text-left transition-colors ${
            repo.type === 'parent' ? 'hover:text-foreground' : 'hover:bg-accent/30'
          }`}
          aria-expanded={repo.type === 'parent' ? isExpanded : undefined}
          aria-pressed={repo.type !== 'parent' ? currentRepositoryId === repo.id : undefined}
          onClick={() => {
            if (repo.type === 'parent') {
              onToggleParentExpansion(repo.id);
              return;
            }

            onRepositorySelect(repo);
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {repo.type === 'parent' && (
                <div className="p-1">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              )}

              {repo.type === 'parent' ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : (
                <BookOpen className="h-4 w-4 text-green-600" />
              )}

              <h3 className="font-medium">{repo.name}</h3>

              {repo.type === 'parent' && (
                <Badge variant="secondary" className="text-xs">
                  <Languages className="h-3 w-3 mr-1" />
                  {translationCount} translations
                </Badge>
              )}

              {currentRepositoryId === repo.id && (
                <Badge variant="default" className="text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Current
                </Badge>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{repo.description}</p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {repo.language && (
              <div className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                <span>{getLanguageDisplay(repo.language)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>v{repo.version}</span>
            </div>
            {repo.type !== 'parent' && (
              <div className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                <span>{repo.book_count || 'Unknown'} books</span>
              </div>
            )}
          </div>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Repository actions for ${repo.name}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Info className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                onRequestDelete({ id: repo.id, name: repo.name });
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {repo.type === 'parent' && isExpanded && (
        <RepositoryTranslationChildren
          currentRepositoryId={currentRepositoryId}
          parentRepository={repo}
          parentTranslations={parentTranslations}
          translationError={translationError}
          translationsLoading={translationsLoading}
          translationsLoaded={hasLoadedTranslations}
          onRepositorySelect={onRepositorySelect}
        />
      )}
    </div>
  );
}
