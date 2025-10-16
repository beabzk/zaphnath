import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  Calendar,
  Globe,
  Info,
  MoreVertical,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Languages
} from 'lucide-react'
import { repository } from '@app/preload'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Repository {
  id: string
  name: string
  description: string
  language?: string // Optional for parent repositories
  version: string
  created_at: string
  updated_at: string
  type?: 'parent' | 'translation'
  parent_id?: string
  book_count?: number
  verse_count?: number
  translations?: TranslationInfo[]
}

interface TranslationInfo {
  id: string
  name: string
  directory: string
  language: string
  status: string
  book_count?: number
  verse_count?: number
}

interface RepositoryListProps {
  onImportClick: () => void
  onRepositorySelect?: (repository: Repository) => void
}

export function RepositoryList({ onImportClick, onRepositorySelect }: RepositoryListProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null)
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const repos = await repository.list() as Repository[]
      
      // Filter out translation repositories that have a parent
      // They should only show up as nested items under their parent
      const filteredRepos = (repos || []).filter(repo => {
        // Show parent repositories
        if (repo.type === 'parent') return true
        // Show standalone translations (no parent_id)
        if (repo.type === 'translation' && !repo.parent_id) return true
        // Hide translations that belong to a parent
        if (repo.type === 'translation' && repo.parent_id) return false
        // Show any other repositories (backwards compatibility)
        return true
      })
      
      // For each parent repository, fetch its translations
      for (const repo of filteredRepos) {
        if (repo.type === 'parent') {
          try {
            const translations = await repository.getTranslations(repo.id)
            // Convert the database format to the expected format
            // Use translation_id (the actual repository ID) not the composite id
            repo.translations = translations?.map(t => ({
              id: t.translation_id || t.id,  // translation_id is the actual repository ID in books table
              name: t.translation_name || t.name,
              directory: t.directory_name || t.directory,
              language: t.language_code || t.language,
              status: t.status || 'active',
              book_count: t.book_count,
              verse_count: t.verse_count
            })) || []
          } catch (error) {
            console.error(`Failed to fetch translations for ${repo.id}:`, error)
            repo.translations = []
          }
        }
      }
      
      setRepositories(filteredRepos)

      // Set first repository as selected if none selected
      if (filteredRepos.length > 0 && !selectedRepository) {
        setSelectedRepository(filteredRepos[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  const handleRepositorySelect = (repository: Repository) => {
    setSelectedRepository(repository.id)
    onRepositorySelect?.(repository)
  }

  const toggleParentExpansion = (parentId: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev)
      if (newSet.has(parentId)) {
        newSet.delete(parentId)
      } else {
        newSet.add(parentId)
      }
      return newSet
    })
  }

  const handleDeleteRepository = async (repositoryId: string) => {
    if (!confirm('Are you sure you want to delete this repository? This action cannot be undone.')) {
      return
    }

    try {
      // TODO: Implement repository deletion API
      console.log('Delete repository:', repositoryId)
      await loadRepositories() // Refresh list
    } catch (err) {
      console.error('Failed to delete repository:', err)
    }
  }



  const getLanguageDisplay = (language: string) => {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'pt': 'Portuguese',
      'it': 'Italian',
      'ru': 'Russian',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'he': 'Hebrew',
      'el': 'Greek'
    }
    return languageNames[language] || language.toUpperCase()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installed Repositories</CardTitle>
          <CardDescription>Loading your Bible repositories...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installed Repositories</CardTitle>
          <CardDescription>Error loading repositories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Button onClick={loadRepositories} className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (repositories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installed Repositories</CardTitle>
          <CardDescription>No Bible repositories found</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Repositories Installed</h3>
          <p className="text-muted-foreground mb-4">
            Import your first Bible repository to get started with reading and studying.
          </p>
          <Button onClick={onImportClick}>
            <Download className="h-4 w-4 mr-2" />
            Import Repository
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Installed Repositories</span>
          <Button onClick={onImportClick} size="sm">
            <Download className="h-4 w-4 mr-2" />
            Import
          </Button>
        </CardTitle>
        <CardDescription>
          {repositories.length} repository{repositories.length !== 1 ? 's' : ''} available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {repositories.map((repo) => (
          <div key={repo.id} className="space-y-2">
            {/* Parent Repository or Standalone Translation */}
            <div
              className={`p-4 rounded-lg border transition-all ${
                repo.type === 'parent' ? 'cursor-default' : 'cursor-pointer hover:bg-accent/50'
              } ${
                selectedRepository === repo.id ? 'border-primary bg-accent/20' : 'border-border'
              }`}
              onClick={() => {
                if (repo.type === 'parent') {
                  toggleParentExpansion(repo.id)
                } else {
                  handleRepositorySelect(repo)
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {repo.type === 'parent' && (
                      <div className="p-1">
                        {expandedParents.has(repo.id) ? (
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
                        {repo.translations?.length || 0} translations
                      </Badge>
                    )}

                    {selectedRepository === repo.id && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
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
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
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
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteRepository(repo.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Expanded Translations for Parent Repositories */}
            {repo.type === 'parent' && expandedParents.has(repo.id) && repo.translations && (
              <div className="ml-8 space-y-2">
                {repo.translations.map((translation) => (
                  <div
                    key={translation.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-accent/50 ${
                      selectedRepository === translation.id ? 'border-primary bg-accent/20' : 'border-dashed border-muted-foreground/30 bg-muted/20'
                    }`}
                    onClick={() => {
                      // Create a repository object for the translation
                      const translationRepo: Repository = {
                        id: translation.id,
                        name: translation.name,
                        description: `${translation.name} from ${repo.name}`,
                        language: translation.language,
                        version: repo.version,
                        created_at: repo.created_at,
                        updated_at: repo.updated_at,
                        type: 'translation',
                        parent_id: repo.id,
                        book_count: translation.book_count,
                        verse_count: translation.verse_count
                      }
                      handleRepositorySelect(translationRepo)
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {selectedRepository === translation.id && (
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
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
