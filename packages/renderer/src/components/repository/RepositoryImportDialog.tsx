import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { RepositoryDiscovery } from './RepositoryDiscovery'
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
  warnings: Array<{ code: string; message: string; severity: string }>
}

interface ImportResult {
  success: boolean
  books_imported: number
  errors?: string[]
  repository_id?: string
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
  const [manifest, setManifest] = useState<any>(null)

  const handleValidate = async () => {
    if (!importUrl.trim()) return

    try {
      setIsValidating(true)
      setValidation(null)
      setManifest(null)

      // @ts-ignore - APIs will be available at runtime
      const validationResult = await window.repository?.validate?.(importUrl.trim())
      setValidation(validationResult)

      if (validationResult.valid) {
        // @ts-ignore
        const manifestData = await window.repository?.getManifest?.(importUrl.trim())
        setManifest(manifestData)
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

  const handleImport = async () => {
    if (!validation?.valid || !importUrl.trim()) return

    try {
      setIsImporting(true)
      setImportProgress({ stage: 'Starting import...', progress: 0 })
      setImportResult(null)

      // @ts-ignore - APIs will be available at runtime
      const result = await window.repository?.import?.(importUrl.trim(), {
        validate_checksums: true,
        overwrite_existing: false,
        progress_callback: (progress: ImportProgress) => {
          setImportProgress(progress)
        }
      })

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
      // @ts-ignore - Electron APIs will be available
      const result = await window.electronAPI?.showOpenDialog?.({
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

  const handleRepositorySelect = (url: string) => {
    setImportUrl(url)
    setImportType('url')
    handleValidate()
  }

  const handleClose = () => {
    setImportUrl('')
    setImportType('discover')
    setValidation(null)
    setManifest(null)
    setImportProgress(null)
    setImportResult(null)
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
      <div className="fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] p-6">
        <Card>
          <CardHeader>
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
          <CardContent className="space-y-6">
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
                  disabled
                  title="Local directory import coming in future sprint"
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Local Directory
                </Button>
              </div>

              {importType === 'discover' ? (
                <RepositoryDiscovery onRepositorySelect={handleRepositorySelect} />
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

            {/* Repository Preview */}
            {manifest && validation?.valid && (
              <div className="space-y-4">
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium">Repository Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <div className="font-medium">{manifest.repository.name}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Language:</span>
                      <div className="font-medium">{manifest.repository.language.name}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Version:</span>
                      <div className="font-medium">v{manifest.repository.version}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Books:</span>
                      <div className="font-medium">{manifest.content.books_count}</div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{manifest.repository.description}</p>
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

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                {importResult?.success ? 'Close' : 'Cancel'}
              </Button>
              {validation?.valid && !importResult?.success && (
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Import Repository
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
