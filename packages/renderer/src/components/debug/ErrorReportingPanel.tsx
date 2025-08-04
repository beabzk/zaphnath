import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/services/logger'
import { debugCollector } from '@/services/debugCollector'
import { performanceMonitor } from '@/services/performanceMonitor'
import { getVersionInfo } from '@/lib/version'
import { ErrorInfo, LogEntry, PerformanceMetric } from '@/types/logging'
import { 
  AlertTriangle, 
  Bug, 
  Download, 
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff,
  Clock,
  Activity,
  HardDrive,
  Zap
} from 'lucide-react'

export function ErrorReportingPanel() {
  const [errors, setErrors] = useState<ErrorInfo[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [selectedError, setSelectedError] = useState<ErrorInfo | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [showMetrics, setShowMetrics] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  useEffect(() => {
    loadData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadData = () => {
    setErrors(logger.getRecentErrors(20))
    setLogs(logger.getRecentLogs(50))
    setMetrics(performanceMonitor.getMetrics().slice(-30))
  }

  const handleClearLogs = () => {
    logger.clearLogs()
    performanceMonitor.clearMetrics()
    loadData()
    setSelectedError(null)
  }

  const handleDownloadReport = async () => {
    setIsGeneratingReport(true)
    try {
      const report = await debugCollector.generateComprehensiveReport()
      
      const blob = new Blob([report], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `zaphnath-debug-report-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      logger.logUserAction({
        type: 'click',
        target: 'download-debug-report',
        details: { errorsCount: errors.length, logsCount: logs.length }
      })
    } catch (error) {
      logger.error('Failed to generate debug report', {
        error: error instanceof Error ? error.message : String(error)
      }, 'debug')
    } finally {
      setIsGeneratingReport(false)
    }
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

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600'
      case 'warn': return 'text-yellow-600'
      case 'info': return 'text-blue-600'
      case 'debug': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const memoryUsage = performanceMonitor.getMemoryUsage()
  const metricsSummary = performanceMonitor.getMetricsSummary()
  const versionInfo = getVersionInfo()

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bug className="h-5 w-5" />
                Error Reporting & Debug Panel
              </CardTitle>
              <CardDescription>
                Monitor application errors, logs, and performance metrics
              </CardDescription>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={loadData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={handleDownloadReport} 
                variant="outline" 
                size="sm"
                disabled={isGeneratingReport}
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingReport ? 'Generating...' : 'Download Report'}
              </Button>
              <Button 
                onClick={handleClearLogs} 
                variant="outline" 
                size="sm"
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <div className="text-2xl font-bold">{errors.length}</div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{logs.length}</div>
                <div className="text-sm text-muted-foreground">Log Entries</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{metricsSummary.total}</div>
                <div className="text-sm text-muted-foreground">Performance Metrics</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {memoryUsage ? `${memoryUsage.percentage.toFixed(1)}%` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground">Memory Usage</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-600" />
              <div>
                <div className="text-2xl font-bold">{versionInfo.versionWithPrefix}</div>
                <div className="text-sm text-muted-foreground">
                  App Version{versionInfo.isPrerelease ? ' (Pre)' : ''}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recent Errors ({errors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {errors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No errors recorded in this session
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((error) => (
                <div
                  key={error.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedError?.id === error.id 
                      ? 'bg-muted border-primary' 
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getSeverityColor(error.severity)}>
                          {error.severity}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {error.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{error.message}</p>
                    </div>
                  </div>
                  
                  {selectedError?.id === error.id && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="text-xs text-muted-foreground">
                        <div>Error ID: {error.id}</div>
                        <div>Session: {error.sessionId}</div>
                        <div>URL: {error.url}</div>
                      </div>
                      
                      {error.stack && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Stack Trace</h4>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                      
                      {error.context && Object.keys(error.context).length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Context</h4>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(error.context, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Logs Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Logs ({logs.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
            >
              {showLogs ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showLogs ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        
        {showLogs && (
          <CardContent>
            <div className="space-y-1 max-h-96 overflow-auto">
              {logs.map((log) => (
                <div key={log.id} className="text-xs font-mono p-2 border-l-2 border-l-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`font-medium ${getLogLevelColor(log.level)}`}>
                      [{log.level.toUpperCase()}]
                    </span>
                    <span className="text-muted-foreground">
                      {log.category}:
                    </span>
                    <span>{log.message}</span>
                  </div>
                  {log.context && Object.keys(log.context).length > 0 && (
                    <div className="mt-1 text-muted-foreground">
                      {JSON.stringify(log.context)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Performance Metrics ({metrics.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetrics(!showMetrics)}
            >
              {showMetrics ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showMetrics ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        
        {showMetrics && (
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-auto">
              {metrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <div className="font-medium text-sm">{metric.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {metric.category} • {new Date(metric.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{formatDuration(metric.duration)}</div>
                    {metric.duration > 1000 && (
                      <Badge variant="destructive" className="text-xs">Slow</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
