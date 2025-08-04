import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ErrorFallbackProps } from './ErrorBoundary'
import { logger } from '@/services/logger'
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Copy, 
  Download, 
  ChevronDown, 
  ChevronUp,
  Home
} from 'lucide-react'

export function ErrorFallback({ 
  error, 
  errorInfo, 
  resetError, 
  retryCount, 
  canRetry 
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopyError = async () => {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      
      logger.logUserAction({
        type: 'click',
        target: 'copy-error-details',
        details: { errorId: errorInfo.id }
      })
    } catch (err) {
      logger.warn('Failed to copy error details', { error: err instanceof Error ? err.message : String(err) }, 'ui')
    }
  }

  const handleDownloadReport = () => {
    const report = {
      error: {
        message: error.message,
        stack: error.stack
      },
      errorInfo,
      systemInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      recentLogs: logger.getRecentLogs(20),
      recentErrors: logger.getRecentErrors(5)
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `error-report-${errorInfo.id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    logger.logUserAction({
      type: 'click',
      target: 'download-error-report',
      details: { errorId: errorInfo.id }
    })
  }

  const handleRetry = () => {
    logger.info('User initiated error boundary retry', {
      errorId: errorInfo.id,
      retryCount: retryCount + 1
    }, 'ui')
    
    resetError()
  }

  const handleGoHome = () => {
    logger.logUserAction({
      type: 'navigation',
      target: 'error-fallback-home',
      details: { errorId: errorInfo.id }
    })
    
    window.location.href = '/'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-red-900">Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. We've logged the details to help us fix this issue.
              </CardDescription>
            </div>
            <Badge className={getSeverityColor(errorInfo.severity)}>
              {errorInfo.severity}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Summary */}
          <div className="space-y-3">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-medium text-red-900 mb-2">Error Details</h3>
              <p className="text-sm text-red-700 font-mono break-all">
                {error.message}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-red-600 mt-2">
                  Retry attempt: {retryCount}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Error ID:</span>
                <p className="font-mono text-xs break-all">{errorInfo.id}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="capitalize">{errorInfo.category}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Time:</span>
                <p>{new Date(errorInfo.timestamp).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Session:</span>
                <p className="font-mono text-xs">{errorInfo.sessionId.slice(-8)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {canRetry && (
              <Button onClick={handleRetry} className="flex-1 min-w-[120px]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button variant="outline" onClick={handleGoHome} className="flex-1 min-w-[120px]">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCopyError}
              disabled={copied}
            >
              <Copy className="h-3 w-3 mr-2" />
              {copied ? 'Copied!' : 'Copy Error'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              <Download className="h-3 w-3 mr-2" />
              Download Report
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowDetails(!showDetails)}
            >
              <Bug className="h-3 w-3 mr-2" />
              {showDetails ? 'Hide' : 'Show'} Details
              {showDetails ? (
                <ChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>
          </div>

          {/* Technical Details */}
          {showDetails && (
            <>
              <Separator />
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Stack Trace</h4>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 font-mono">
                    {error.stack || 'No stack trace available'}
                  </pre>
                </div>

                {errorInfo.componentStack && (
                  <div>
                    <h4 className="font-medium mb-2">Component Stack</h4>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 font-mono">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}

                {errorInfo.context && Object.keys(errorInfo.context).length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Context</h4>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40 font-mono">
                      {JSON.stringify(errorInfo.context, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Help Text */}
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              If this error persists, please try refreshing the page or restarting the application.
            </p>
            <p>
              You can help us improve by downloading the error report and sharing it with our support team.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Minimal error fallback for critical errors
export function MinimalErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-red-50">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
        <h1 className="text-xl font-semibold text-red-900">Critical Error</h1>
        <p className="text-red-700 max-w-md">
          The application encountered a critical error and cannot continue.
        </p>
        <p className="text-sm text-red-600 font-mono break-all">
          {error.message}
        </p>
        <div className="space-x-2">
          <Button onClick={resetError} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={() => window.location.reload()}>
            Reload App
          </Button>
        </div>
      </div>
    </div>
  )
}
