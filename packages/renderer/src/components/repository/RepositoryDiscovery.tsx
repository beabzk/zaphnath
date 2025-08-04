import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Download,
  Globe,
  Calendar,
  BookOpen,
  Shield,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

interface RepositoryIndexEntry {
  id: string
  name: string
  url: string
  language: string
  license: string
  verified: boolean
  last_updated: string
  description?: string
  tags?: string[]
}

interface RepositoryDiscoveryProps {
  onRepositorySelect: (url: string) => void
}

export function RepositoryDiscovery({ onRepositorySelect }: RepositoryDiscoveryProps) {
  const [repositories, setRepositories] = useState<RepositoryIndexEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')

  useEffect(() => {
    loadRepositories()
  }, [])

  const loadRepositories = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // @ts-ignore - APIs will be available at runtime
      const repos = await window.repository?.discover?.()
      setRepositories(repos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to discover repositories')
    } finally {
      setLoading(false)
    }
  }

  const filteredRepositories = repositories.filter(repo => {
    const matchesSearch = !searchTerm || 
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesLanguage = selectedLanguage === 'all' || repo.language === selectedLanguage
    
    return matchesSearch && matchesLanguage
  })

  const availableLanguages = Array.from(new Set(repositories.map(repo => repo.language)))

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString()
    } catch {
      return dateString
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
          <CardTitle>Discover Repositories</CardTitle>
          <CardDescription>Finding available Bible repositories...</CardDescription>
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
          <CardTitle>Discover Repositories</CardTitle>
          <CardDescription>Error discovering repositories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive mb-4">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
          <Button onClick={loadRepositories}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Discover Repositories</span>
          <Button onClick={loadRepositories} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardTitle>
        <CardDescription>
          Browse and import Bible repositories from the community
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedLanguage === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedLanguage('all')}
            >
              All Languages
            </Button>
            {availableLanguages.map(lang => (
              <Button
                key={lang}
                variant={selectedLanguage === lang ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLanguage(lang)}
              >
                {getLanguageDisplay(lang)}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Repository List */}
        {filteredRepositories.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Repositories Found</h3>
            <p className="text-muted-foreground">
              {searchTerm || selectedLanguage !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'No repositories are currently available for discovery.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredRepositories.map((repo) => (
              <div
                key={repo.id}
                className="p-4 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{repo.name}</h3>
                      {repo.verified && (
                        <Badge variant="default" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    {repo.description && (
                      <p className="text-sm text-muted-foreground">{repo.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <span>{getLanguageDisplay(repo.language)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Updated {formatDate(repo.last_updated)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>License: {repo.license}</span>
                      </div>
                    </div>

                    {repo.tags && repo.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {repo.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button 
                    onClick={() => onRepositorySelect(repo.url)}
                    size="sm"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Import
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Showing {filteredRepositories.length} of {repositories.length} repositories
        </div>
      </CardContent>
    </Card>
  )
}
