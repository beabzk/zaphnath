// Logging and error handling type definitions for Zaphnath Bible Reader

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface LogEntry {
  id: string
  timestamp: string
  level: LogLevel
  message: string
  category: string
  context?: Record<string, any>
  stack?: string
  userId?: string
  sessionId: string
  version: string
  platform: string
}

export interface ErrorInfo {
  id: string
  timestamp: string
  message: string
  stack?: string
  componentStack?: string
  category: ErrorCategory
  severity: ErrorSeverity
  context?: Record<string, any>
  userAgent?: string
  url?: string
  userId?: string
  sessionId: string
  version: string
  reproductionSteps?: string[]
  expectedBehavior?: string
  actualBehavior?: string
}

export type ErrorCategory = 
  | 'ui' 
  | 'api' 
  | 'database' 
  | 'repository' 
  | 'import' 
  | 'validation' 
  | 'performance' 
  | 'network' 
  | 'storage' 
  | 'unknown'

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface PerformanceMetric {
  id: string
  timestamp: string
  name: string
  category: PerformanceCategory
  duration: number
  startTime: number
  endTime: number
  context?: Record<string, any>
  sessionId: string
  version: string
}

export type PerformanceCategory = 
  | 'page-load' 
  | 'component-render' 
  | 'api-call' 
  | 'database-query' 
  | 'import-operation' 
  | 'search' 
  | 'navigation' 
  | 'user-interaction'

export interface CrashReport {
  id: string
  timestamp: string
  error: ErrorInfo
  systemInfo: SystemInfo
  applicationState: ApplicationState
  userActions: UserAction[]
  logs: LogEntry[]
  performanceMetrics: PerformanceMetric[]
}

export interface SystemInfo {
  platform: string
  arch: string
  version: string
  nodeVersion: string
  electronVersion: string
  chromeVersion: string
  memory: {
    total: number
    used: number
    available: number
  }
  cpu: {
    model: string
    cores: number
    usage?: number
  }
  screen: {
    width: number
    height: number
    devicePixelRatio: number
  }
}

export interface ApplicationState {
  currentView: string
  repositories: number
  currentRepository?: string
  currentBook?: string
  currentChapter?: number
  settings: Record<string, any>
  storeState: Record<string, any>
}

export interface UserAction {
  id: string
  timestamp: string
  type: UserActionType
  target: string
  details?: Record<string, any>
}

export type UserActionType = 
  | 'click' 
  | 'navigation' 
  | 'input' 
  | 'scroll' 
  | 'keyboard' 
  | 'import' 
  | 'search' 
  | 'settings-change'

export interface LoggerConfig {
  level: LogLevel
  enableConsole: boolean
  enableFile: boolean
  enableRemote: boolean
  maxLogEntries: number
  maxFileSize: number
  remoteEndpoint?: string
  categories: {
    [category: string]: LogLevel
  }
}

export interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
  errorId?: string
  retryCount: number
  lastErrorTime?: number
}

export interface ErrorReportingConfig {
  enabled: boolean
  autoReport: boolean
  includeSystemInfo: boolean
  includeApplicationState: boolean
  includeUserActions: boolean
  includeLogs: boolean
  includePerformanceMetrics: boolean
  maxUserActions: number
  maxLogEntries: number
  maxPerformanceMetrics: number
}

// Logger interface
export interface Logger {
  error(message: string, context?: Record<string, any>, category?: string): void
  warn(message: string, context?: Record<string, any>, category?: string): void
  info(message: string, context?: Record<string, any>, category?: string): void
  debug(message: string, context?: Record<string, any>, category?: string): void
  
  logPerformance(metric: Omit<PerformanceMetric, 'id' | 'timestamp' | 'sessionId' | 'version'>): void
  logUserAction(action: Omit<UserAction, 'id' | 'timestamp'>): void
  
  getRecentLogs(count?: number): LogEntry[]
  getRecentErrors(count?: number): ErrorInfo[]
  getRecentMetrics(count?: number): PerformanceMetric[]
  
  exportLogs(): string
  clearLogs(): void
  
  setLevel(level: LogLevel): void
  setConfig(config: Partial<LoggerConfig>): void
}

// Error reporter interface
export interface ErrorReporter {
  reportError(error: ErrorInfo): Promise<void>
  reportCrash(crashReport: CrashReport): Promise<void>
  
  setConfig(config: Partial<ErrorReportingConfig>): void
  setUserContext(userId?: string, metadata?: Record<string, any>): void
  
  generateCrashReport(error: ErrorInfo): Promise<CrashReport>
}

// Performance monitor interface
export interface PerformanceMonitor {
  startTiming(name: string, category: PerformanceCategory): string
  endTiming(timingId: string, context?: Record<string, any>): PerformanceMetric | null
  
  measureAsync<T>(
    name: string, 
    category: PerformanceCategory, 
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T>
  
  measureSync<T>(
    name: string, 
    category: PerformanceCategory, 
    fn: () => T,
    context?: Record<string, any>
  ): T
  
  getMetrics(category?: PerformanceCategory): PerformanceMetric[]
  clearMetrics(): void
}

// Debug information collector interface
export interface DebugCollector {
  collectSystemInfo(): Promise<SystemInfo>
  collectApplicationState(): ApplicationState
  collectUserActions(count?: number): UserAction[]
  collectLogs(count?: number): LogEntry[]
  collectPerformanceMetrics(count?: number): PerformanceMetric[]
  
  generateDebugReport(): Promise<{
    systemInfo: SystemInfo
    applicationState: ApplicationState
    userActions: UserAction[]
    logs: LogEntry[]
    performanceMetrics: PerformanceMetric[]
    timestamp: string
  }>
  
  exportDebugReport(): Promise<string>
}
