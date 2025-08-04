import {
  Logger,
  LogEntry,
  LogLevel,
  LoggerConfig,
  PerformanceMetric,
  UserAction,
  ErrorInfo,
} from "@/types/logging";

class LoggerService implements Logger {
  private config: LoggerConfig = {
    level: "info",
    enableConsole: true,
    enableFile: false,
    enableRemote: false,
    maxLogEntries: 1000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    categories: {},
  };

  private logs: LogEntry[] = [];
  private errors: ErrorInfo[] = [];
  private metrics: PerformanceMetric[] = [];
  private userActions: UserAction[] = [];
  private sessionId: string;
  private version: string;

  constructor() {
    this.sessionId = this.generateId();
    this.version = "1.0.0"; // TODO: Get from package.json

    // Initialize with system info
    this.info("Logger initialized", { sessionId: this.sessionId }, "system");

    // Set up error listeners
    this.setupErrorListeners();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupErrorListeners(): void {
    // Global error handler
    window.addEventListener("error", (event) => {
      this.error(
        "Uncaught error",
        {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
        "ui"
      );
    });

    // Unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      this.error(
        "Unhandled promise rejection",
        {
          reason: event.reason,
          stack: event.reason?.stack,
        },
        "api"
      );
    });
  }

  private shouldLog(level: LogLevel, category?: string): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    };

    // Check category-specific level
    if (category && this.config.categories[category]) {
      return levels[level] >= levels[this.config.categories[category]];
    }

    // Check global level
    return levels[level] >= levels[this.config.level];
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    category: string = "general"
  ): LogEntry {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      message,
      category,
      context,
      sessionId: this.sessionId,
      version: this.version,
      platform: navigator.platform,
    };

    // Add stack trace for errors
    if (level === "error") {
      entry.stack = new Error().stack;
    }

    return entry;
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);

    // Maintain max log entries
    if (this.logs.length > this.config.maxLogEntries) {
      this.logs = this.logs.slice(-this.config.maxLogEntries);
    }

    // Console output
    if (this.config.enableConsole) {
      const consoleMethod = entry.level === "debug" ? "log" : entry.level;
      console[consoleMethod](
        `[${entry.level.toUpperCase()}] ${entry.category}: ${entry.message}`,
        entry.context || ""
      );
    }

    // File output (if enabled)
    if (this.config.enableFile) {
      this.writeToFile(entry);
    }

    // Remote output (if enabled)
    if (this.config.enableRemote) {
      this.sendToRemote(entry);
    }
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      // @ts-ignore - APIs will be available at runtime
      await window.logger?.writeToFile?.(entry);
    } catch (error) {
      console.error("Failed to write log to file:", error);
    }
  }

  private async sendToRemote(entry: LogEntry): Promise<void> {
    try {
      if (this.config.remoteEndpoint) {
        await fetch(this.config.remoteEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(entry),
        });
      }
    } catch (error) {
      console.error("Failed to send log to remote:", error);
    }
  }

  // Public logging methods
  error(
    message: string,
    context?: Record<string, any>,
    category: string = "general"
  ): void {
    if (!this.shouldLog("error", category)) return;

    const entry = this.createLogEntry("error", message, context, category);
    this.addLogEntry(entry);

    // Also add to errors collection
    const errorInfo: ErrorInfo = {
      id: entry.id,
      timestamp: entry.timestamp,
      message,
      stack: entry.stack,
      category: category as any,
      severity: "medium",
      context,
      sessionId: this.sessionId,
      version: this.version,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    this.errors.push(errorInfo);
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }
  }

  warn(
    message: string,
    context?: Record<string, any>,
    category: string = "general"
  ): void {
    if (!this.shouldLog("warn", category)) return;
    this.addLogEntry(this.createLogEntry("warn", message, context, category));
  }

  info(
    message: string,
    context?: Record<string, any>,
    category: string = "general"
  ): void {
    if (!this.shouldLog("info", category)) return;
    this.addLogEntry(this.createLogEntry("info", message, context, category));
  }

  debug(
    message: string,
    context?: Record<string, any>,
    category: string = "general"
  ): void {
    if (!this.shouldLog("debug", category)) return;
    this.addLogEntry(this.createLogEntry("debug", message, context, category));
  }

  logPerformance(
    metric: Omit<
      PerformanceMetric,
      "id" | "timestamp" | "sessionId" | "version"
    >
  ): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      version: this.version,
    };

    this.metrics.push(fullMetric);
    if (this.metrics.length > 500) {
      this.metrics = this.metrics.slice(-500);
    }

    this.debug(
      `Performance: ${metric.name} took ${metric.duration}ms`,
      metric.context,
      "performance"
    );
  }

  logUserAction(action: Omit<UserAction, "id" | "timestamp">): void {
    const fullAction: UserAction = {
      ...action,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    this.userActions.push(fullAction);
    if (this.userActions.length > 200) {
      this.userActions = this.userActions.slice(-200);
    }

    this.debug(
      `User action: ${action.type} on ${action.target}`,
      action.details,
      "user-action"
    );
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  getRecentErrors(count: number = 20): ErrorInfo[] {
    return this.errors.slice(-count);
  }

  getRecentMetrics(count: number = 50): PerformanceMetric[] {
    return this.metrics.slice(-count);
  }

  exportLogs(): string {
    const exportData = {
      sessionId: this.sessionId,
      version: this.version,
      timestamp: new Date().toISOString(),
      logs: this.logs,
      errors: this.errors,
      metrics: this.metrics,
      userActions: this.userActions,
      config: this.config,
    };

    return JSON.stringify(exportData, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    this.errors = [];
    this.metrics = [];
    this.userActions = [];
    this.info("Logs cleared", {}, "system");
  }

  setLevel(level: LogLevel): void {
    this.config.level = level;
    this.info(`Log level set to ${level}`, { level }, "system");
  }

  setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
    this.info("Logger config updated", { config }, "system");
  }

  // Additional utility methods
  getUserActions(count: number = 50): UserAction[] {
    return this.userActions.slice(-count);
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getVersion(): string {
    return this.version;
  }

  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// Create singleton instance
export const logger = new LoggerService();

// Export for use in other modules
export default logger;
