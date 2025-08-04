import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorBoundaryState, ErrorInfo as LogErrorInfo } from '@/types/logging'
import { logger } from '@/services/logger'
import { ErrorFallback } from './ErrorFallback'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  isolate?: boolean
  name?: string
}

export interface ErrorFallbackProps {
  error: Error
  errorInfo: LogErrorInfo
  resetError: () => void
  retryCount: number
  canRetry: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3
  private name: string

  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.name = props.name || 'ErrorBoundary'
    this.state = {
      hasError: false,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const logErrorInfo: LogErrorInfo = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      category: 'ui',
      severity: 'high',
      context: {
        boundaryName: this.name,
        retryCount: this.state.retryCount,
        props: this.props.isolate ? {} : this.props
      },
      sessionId: logger.getSessionId(),
      version: logger.getVersion(),
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    // Log the error
    logger.error(`Error caught by ${this.name}`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    }, 'ui')

    // Update state with error info
    this.setState({
      errorInfo: logErrorInfo,
      errorId: logErrorInfo.id
    })

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log user action
    logger.logUserAction({
      type: 'click',
      target: 'error-boundary',
      details: {
        boundaryName: this.name,
        errorMessage: error.message,
        retryCount: this.state.retryCount
      }
    })
  }

  resetError = () => {
    const { retryCount, lastErrorTime } = this.state
    const now = Date.now()
    
    // Reset retry count if enough time has passed
    const newRetryCount = lastErrorTime && (now - lastErrorTime) > 30000 
      ? 0 
      : retryCount + 1

    logger.info(`Resetting error boundary ${this.name}`, {
      retryCount: newRetryCount,
      timeSinceLastError: lastErrorTime ? now - lastErrorTime : 0
    }, 'ui')

    // Log user action
    logger.logUserAction({
      type: 'click',
      target: 'error-boundary-reset',
      details: {
        boundaryName: this.name,
        retryCount: newRetryCount
      }
    })

    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorId: undefined,
      retryCount: newRetryCount,
      lastErrorTime: now
    })
  }

  canRetry = (): boolean => {
    return this.state.retryCount < this.maxRetries
  }

  render() {
    if (this.state.hasError && this.state.error && this.state.errorInfo) {
      const FallbackComponent = this.props.fallback || ErrorFallback
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
          canRetry={this.canRetry()}
        />
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

// Hook for error boundary context
export function useErrorHandler() {
  return {
    reportError: (error: Error, context?: Record<string, any>) => {
      logger.error('Manual error report', {
        error: error.message,
        stack: error.stack,
        ...context
      }, 'ui')
    },
    
    reportWarning: (message: string, context?: Record<string, any>) => {
      logger.warn(message, context, 'ui')
    },
    
    reportInfo: (message: string, context?: Record<string, any>) => {
      logger.info(message, context, 'ui')
    }
  }
}

// Async error boundary for handling promise rejections
export class AsyncErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  componentDidMount() {
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
  }

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = new Error(event.reason?.message || 'Unhandled promise rejection')
    error.stack = event.reason?.stack

    this.componentDidCatch(error, {
      componentStack: 'Promise rejection in AsyncErrorBoundary'
    })
  }

  static getDerivedStateFromError = ErrorBoundary.getDerivedStateFromError
  componentDidCatch = ErrorBoundary.prototype.componentDidCatch
  resetError = ErrorBoundary.prototype.resetError
  canRetry = ErrorBoundary.prototype.canRetry
  render = ErrorBoundary.prototype.render
}
