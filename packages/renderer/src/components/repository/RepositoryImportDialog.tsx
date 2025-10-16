import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RepositoryDiscovery } from './RepositoryDiscovery'
import { filesystem, repository } from '@app/preload'
import {
  Download,
  FolderOpen,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Search
} from 'lucide-react'

interface ImportProgress {
  stage: string
  progress: number
  message?: string
}

interface ValidationResult {
  valid: boolean
  errors: Array<{ code: string; message: string; severity: string }>
  warnings: Array<{ code: string; message: string }>
}

interface ImportResult {
  success: boolean
  books_imported: number
  translations_imported?: number
  errors?: string[]
  repository_id?: string
}

interface TranslationInfo {
  id: string
  name: string
  directory: string
  language: { code: string; name: string }
  status: string
}

interface RepositoryManifest {
  repository: {
    id: string
    name: string
    description: string
    type?: string
  }
  translations?: TranslationInfo[]
}

interface RepositoryImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImportComplete: () => void
}

export function RepositoryImportDialog({ isOpen, onClose, onImportComplete }: RepositoryImportDialogProps) {
  const [importUrl, setImportUrl] = useState('')
  const [importType, setImportType] = useState<'url' | 'file' | 'discover'>('discover')
  const [isValidating, setIsValidating] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  // New state for hierarchical repositories
  const [repositoryManifest, setRepositoryManifest] = useState<RepositoryManifest | null>(null)
  const [selectedTranslations, setSelectedTranslations] = useState<string[]>([])
  const [importMode, setImportMode] = useState<'full' | 'selective'>('full')
  const [manifest, setManifest] = useState<any>(null)
  const [multipleRepositories, setMultipleRepositories] = useState<Array<{ path: string; manifest: any; validation: ValidationResult }> | null>(null)
  const [selectedRepository, setSelectedRepository] = useState<string | null>(null)

  const handleValidate = async () => {
    if (!importUrl.trim()) return

    try {
      setIsValidating(true)
      setValidation(null)
      setManifest(null)
      setMultipleRepositories(null)
      setSelectedRepository(null)

      // Check if this is a local directory path
      const isLocalPath = importType === 'file' && !importUrl.startsWith('http')

      if (isLocalPath) {
        // Try scanning for multiple repositories first
        const scanResult = await repository.scanDirectory(importUrl.trim())

        if (scanResult.repositories.length > 1) {
          // Multiple repositories found - show selection UI
          setMultipleRepositories(scanResult.repositories)
          setValidation({
            valid: true,
            errors: [],
            warnings: scanResult.errors.map(error => ({
              code: 'SCAN_WARNING',
              message: error,
              severity: 'warning' as const
            }))
          })
          return
        } else if (scanResult.repositories.length === 1) {
          // Single repository found - use it directly
          const repo = scanResult.repositories[0]
          setValidation(repo.validation)
          if (repo.validation.valid) {
            setManifest(repo.manifest)
            // Update the import URL to the specific repository path
            setImportUrl(repo.path)
          }
          return
        }
        // If no repositories found, fall through to regular validation
      }

      // Regular single repository validation
      const validationResult = await repository.validate(importUrl.trim())
      setValidation(validationResult)

      if (validationResult.valid) {
        const manifestData = await repository.getManifest(importUrl.trim())
        setManifest(manifestData)
        setRepositoryManifest(manifestData)

        // If this is a parent repository, initialize translation selection
        if ((manifestData as any).repository?.type === 'parent' && (manifestData as any).translations) {
          setSelectedTranslations((manifestData as any).translations.map((t: TranslationInfo) => t.id))
        }
      }
    } catch (error) {
      setValidation({
        valid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          severity: 'error'
        }],
        warnings: []
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleRepositorySelection = (repositoryPath: string) => {
    if (!multipleRepositories) return

    const selectedRepo = multipleRepositories.find(repo => repo.path === repositoryPath)
    if (selectedRepo) {
      setSelectedRepository(repositoryPath)
      setImportUrl(repositoryPath)
      setManifest(selectedRepo.manifest)
      setValidation(selectedRepo.validation)
    }
  }

  const handleImport = async () => {
    if (!validation?.valid || !importUrl.trim()) return

    try {
      setIsImporting(true)
      setImportProgress({ stage: 'Starting import...', progress: 0 })
      setImportResult(null)

      const importOptions = {
        validate_checksums: true,
        overwrite_existing: false,
        import_type: importMode,
        selected_translations: importMode === 'selective' ? selectedTranslations : undefined,
        // Note: progress_callback cannot be passed through IPC, so we remove it
        // Progress updates will be handled differently in the future
      }

      const result = await repository.import(importUrl.trim(), importOptions)

      setImportResult(result)
      
      if (result.success) {
        setTimeout(() => {
          onImportComplete()
          handleClose()
        }, 2000)
      }
    } catch (error) {
      setImportResult({
        success: false,
        books_imported: 0,
        errors: [error instanceof Error ? error.message : 'Import failed']
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleFileSelect = async () => {
    try {
      const result = await filesystem.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Repository Directory'
      })

      if (result && !result.canceled && result.filePaths.length > 0) {
        setImportUrl(`file://${result.filePaths[0]}`)
        setImportType('file')
      }
    } catch (error) {
      console.error('File selection failed:', error)
    }
  }

  const handleRepositorySelect = async (url: string) => {
    setImportUrl(url)
    // Stay on discover tab, don't switch to URL tab
    // setImportType('url')

    // Immediately validate the selected repository
    try {
      setIsValidating(true)
      setValidation(null)
      setManifest(null)
      setRepositoryManifest(null)

      const validationResult = await repository.validate(url.trim())
      setValidation(validationResult)

      if (validationResult.valid) {
        const manifestData = await repository.getManifest(url.trim())
        setManifest(manifestData)
        setRepositoryManifest(manifestData)

        // If this is a parent repository, initialize translation selection
        if ((manifestData as any).repository?.type === 'parent' && (manifestData as any).translations) {
          setSelectedTranslations((manifestData as any).translations.map((t: TranslationInfo) => t.id))
        }
      }
    } catch (error) {
      setValidation({
        valid: false,
        errors: [{
          code: 'VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Validation failed',
          severity: 'error'
        }],
        warnings: []
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleClose = () => {
    setImportUrl('')
    setImportType('discover')
    setValidation(null)
    setManifest(null)
    setImportProgress(null)
    setImportResult(null)
    setMultipleRepositories(null)
    setSelectedRepository(null)
    setIsValidating(false)
    setIsImporting(false)
    onClose()
  }

  const getProgressPercentage = () => {
    if (!importProgress) return 0
    return Math.min(100, Math.max(0, importProgress.progress))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-6 max-h-screen">
        <div className="h-full max-h-[90vh] flex flex-col">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Import Repository</CardTitle>
                  <CardDescription>
                    Add a new Bible repository using ZBRS standard
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <div className="flex-1 flex flex-col overflow-hidden">
              <CardContent className="space-y-6 flex-1 overflow-y-auto p-6">
            {/* Import Source Selection */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={importType === 'discover' ? 'default' : 'outline'}
                  onClick={() => setImportType('discover')}
                  className="flex-1"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Discover
                </Button>
                <Button
                  variant={importType === 'url' ? 'default' : 'outline'}
                  onClick={() => setImportType('url')}
                  className="flex-1"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  URL
                </Button>
                <Button
                  variant={importType === 'file' ? 'default' : 'outline'}
                  onClick={() => setImportType('file')}
                  className="flex-1"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Local Directory
                </Button>
              </div>

              {importType === 'discover' ? (
                <div className="space-y-4">
                  <RepositoryDiscovery onRepositorySelect={handleRepositorySelect} />

                  {/* Show validation results and import options when a repository is selected */}
                  {importUrl && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="text-sm font-medium">Selected Repository</div>
                      <div className="text-sm text-muted-foreground break-all">{importUrl}</div>

                      {isValidating && (
                        <div className="flex items-center gap-2 text-sm">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Validating repository...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : importType === 'url' ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Repository URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/bible-repository/"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <Button onClick={handleValidate} disabled={isValidating || !importUrl.trim()}>
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Validate'
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Local Directory</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Select a directory..."
                      value={importUrl.replace('file://', '')}
                      readOnly
                      className="flex-1 rounded-md border border-input bg-muted px-3 py-2 text-sm"
                    />
                    <Button onClick={handleFileSelect}>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Browse
                    </Button>
                  </div>
                  {importUrl && (
                    <Button onClick={handleValidate} disabled={isValidating} className="w-full">
                      {isValidating ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Validate Repository
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Validation Results */}
            {validation && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {validation.valid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {validation.valid ? 'Repository Valid' : 'Validation Failed'}
                    </span>
                  </div>

                  {validation.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-red-600">Errors:</h4>
                      {validation.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          {error.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {validation.warnings.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-yellow-600">Warnings:</h4>
                      {validation.warnings.map((warning, index) => (
                        <div key={index} className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20 p-2 rounded">
                          {warning.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Translation Selection for Parent Repositories */}
            {validation?.valid && repositoryManifest?.repository?.type === 'parent' && (repositoryManifest as any).translations && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Translation Selection</h4>
                  <p className="text-sm text-muted-foreground">
                    This is a parent repository containing multiple translations. Choose which translations to import:
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="import-all"
                        name="import-mode"
                        checked={importMode === 'full'}
                        onChange={() => {
                          setImportMode('full')
                          setSelectedTranslations((repositoryManifest as any).translations.map((t: TranslationInfo) => t.id))
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor="import-all" className="text-sm font-medium">
                        Import all translations ({(repositoryManifest as any).translations.length})
                      </label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="import-selective"
                        name="import-mode"
                        checked={importMode === 'selective'}
                        onChange={() => setImportMode('selective')}
                        className="h-4 w-4"
                      />
                      <label htmlFor="import-selective" className="text-sm font-medium">
                        Select specific translations
                      </label>
                    </div>
                  </div>

                  {importMode === 'selective' && (
                    <div className="space-y-2 pl-6">
                      {(repositoryManifest as any).translations.map((translation: TranslationInfo) => (
                        <div key={translation.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`translation-${translation.id}`}
                            checked={selectedTranslations.includes(translation.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTranslations([...selectedTranslations, translation.id])
                              } else {
                                setSelectedTranslations(selectedTranslations.filter(id => id !== translation.id))
                              }
                            }}
                            className="h-4 w-4"
                          />
                          <label htmlFor={`translation-${translation.id}`} className="text-sm">
                            <span className="font-medium">{translation.name || 'Unknown Translation'}</span>
                            <span className="text-muted-foreground ml-2">({translation.language?.name || 'Unknown Language'})</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {importMode === 'selective' && selectedTranslations.length === 0 && (
                    <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                      Please select at least one translation to import.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Multiple Repositories Selection */}
            {multipleRepositories && multipleRepositories.length > 1 && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Multiple Repositories Found</h4>
                  <p className="text-sm text-muted-foreground">
                    The selected directory contains multiple Bible repositories. Please choose which one to import:
                  </p>
                  <div className="space-y-2">
                    {multipleRepositories.map((repo, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                          selectedRepository === repo.path
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => handleRepositorySelection(repo.path)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              {repo.validation.valid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-red-600" />
                              )}
                              <span className="font-medium">{repo.manifest?.repository?.name || 'Unknown Repository'}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {repo.manifest?.repository?.description || 'No description available'}
                            </p>
                            <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                              <span>Language: {repo.manifest?.repository?.language?.name || 'Unknown'}</span>
                              <span>Version: v{repo.manifest?.repository?.version || 'Unknown'}</span>
                              <span>Books: {repo.manifest?.content?.books_count || 'Unknown'}</span>
                            </div>
                            {!repo.validation.valid && repo.validation.errors.length > 0 && (
                              <div className="mt-2">
                                <span className="text-xs text-red-600">
                                  Errors: {repo.validation.errors.map(e => e.message).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                          {selectedRepository === repo.path && (
                            <CheckCircle className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Repository Preview */}
            {manifest && validation?.valid && manifest.repository && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Repository Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <div className="font-medium">{manifest.repository?.name || 'Unknown'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Language:</span>
                      <div className="font-medium">{manifest.repository?.language?.name || 'Unknown'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Version:</span>
                      <div className="font-medium">v{manifest.repository?.version || '0.0.0'}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Books:</span>
                      <div className="font-medium">{manifest.content?.books_count || 0}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{manifest.repository?.description || 'No description available'}</p>
                </div>
              </div>
            )}

            {/* Import Progress */}
            {importProgress && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Import Progress</span>
                    <span className="text-sm text-muted-foreground">{getProgressPercentage()}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">{importProgress.stage}</p>
                  {importProgress.message && (
                    <p className="text-xs text-muted-foreground">{importProgress.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {importResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="font-medium">
                      {importResult.success ? 'Import Successful!' : 'Import Failed'}
                    </span>
                  </div>
                  
                  {importResult.success ? (
                    <p className="text-sm text-muted-foreground">
                      Successfully imported {importResult.books_imported} books.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {importResult.errors?.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
              </CardContent>
            </div>

            {/* Action Buttons - Fixed at bottom */}
            <div className="flex justify-end gap-2 p-6 pt-4 border-t flex-shrink-0">
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                {importResult?.success ? 'Close' : 'Cancel'}
              </Button>
              {validation?.valid && !importResult?.success && (!multipleRepositories || selectedRepository) && (
                <Button
                  onClick={handleImport}
                  disabled={
                    isImporting ||
                    (importMode === 'selective' && selectedTranslations.length === 0)
                  }
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      {repositoryManifest?.repository?.type === 'parent'
                        ? `Import ${importMode === 'selective' ? selectedTranslations.length : (repositoryManifest as any).translations?.length || 0} Translation${(importMode === 'selective' ? selectedTranslations.length : (repositoryManifest as any).translations?.length || 0) !== 1 ? 's' : ''}`
                        : 'Import Repository'
                      }
                    </>
                  )}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
