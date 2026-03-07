import {
  DebugCollector,
  SystemInfo,
  ApplicationState,
  UserAction,
  LogEntry,
  LogContext,
  PerformanceMetric,
} from '@/types/logging';
import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';
import { useRepositoryStore, useUIStore, useReadingStore } from '@/stores';

const APP_SETTINGS_DB_KEY = 'app_settings';

interface BrowserMemoryInfo {
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface NetworkConnectionInfo {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkConnectionInfo;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

class DebugCollectorService implements DebugCollector {
  async collectSystemInfo(): Promise<SystemInfo> {
    return {
      platform: navigator.platform,
      arch: 'unknown',
      version: navigator.appVersion,
      nodeVersion: 'unknown',
      electronVersion: 'unknown',
      chromeVersion: this.getChromeVersion(),
      memory: this.getMemoryInfo(),
      cpu: this.getCPUInfo(),
      screen: this.getScreenInfo(),
    };
  }

  private getChromeVersion(): string {
    const match = navigator.userAgent.match(/Chrome\/([0-9.]+)/);
    return match ? match[1] : 'unknown';
  }

  private getMemoryInfo(): SystemInfo['memory'] {
    const browserPerformance = performance as Performance & { memory?: BrowserMemoryInfo };

    if (browserPerformance.memory) {
      const memory = browserPerformance.memory;
      return {
        total: memory.totalJSHeapSize || 0,
        used: memory.usedJSHeapSize || 0,
        available: memory.totalJSHeapSize - memory.usedJSHeapSize || 0,
      };
    }

    return {
      total: 0,
      used: 0,
      available: 0,
    };
  }

  private getCPUInfo(): SystemInfo['cpu'] {
    return {
      model: 'unknown',
      cores: navigator.hardwareConcurrency || 1,
      usage: undefined,
    };
  }

  private getScreenInfo(): SystemInfo['screen'] {
    return {
      width: screen.width,
      height: screen.height,
      devicePixelRatio: window.devicePixelRatio,
    };
  }

  async collectApplicationState(): Promise<ApplicationState> {
    // Get current store states
    const repositoryState = useRepositoryStore.getState();
    const uiState = useUIStore.getState();
    const readingState = useReadingStore.getState();

    // Get settings from database
    let settings: LogContext = {};
    try {
      const settingsData = await window.database.getSetting(APP_SETTINGS_DB_KEY);
      if (settingsData) {
        const parsedSettings = JSON.parse(settingsData) as unknown;
        settings = isRecord(parsedSettings) ? parsedSettings : { value: parsedSettings };
      }
    } catch (_error) {
      logger.warn(
        'Failed to read settings for debug collection',
        {
          error: _error instanceof Error ? _error.message : String(_error),
        },
        'debug'
      );
    }

    return {
      currentView: uiState.currentView,
      repositories: repositoryState.repositories.length,
      currentRepository: repositoryState.currentRepository?.name,
      currentBook: repositoryState.currentBook?.name,
      currentChapter: repositoryState.currentChapter?.number,
      settings,
      storeState: {
        repository: {
          repositoriesCount: repositoryState.repositories.length,
          booksCount: repositoryState.books.length,
          versesCount: repositoryState.verses.length,
          isLoading: repositoryState.isLoading,
          hasError: !!repositoryState.error,
        },
        ui: {
          currentView: uiState.currentView,
          viewHistoryLength: uiState.viewHistory.length,
          notificationsCount: uiState.notifications.length,
          sidebarOpen: uiState.sidebarOpen,
          sidebarWidth: uiState.sidebarWidth,
          globalLoading: uiState.globalLoading.isLoading,
          hasGlobalError: !!uiState.globalError,
        },
        reading: {
          hasCurrentLocation: !!readingState.currentLocation,
          historyCount: readingState.history.length,
          bookmarksCount: readingState.bookmarks.length,
          readingMode: readingState.readingMode,
          autoScroll: readingState.autoScroll,
        },
      },
    };
  }

  collectUserActions(count: number = 50): UserAction[] {
    return logger.getUserActions(count);
  }

  collectLogs(count: number = 100): LogEntry[] {
    return logger.getRecentLogs(count);
  }

  collectPerformanceMetrics(count: number = 50): PerformanceMetric[] {
    return performanceMonitor.getMetrics().slice(-count);
  }

  async generateDebugReport(): Promise<{
    systemInfo: SystemInfo;
    applicationState: ApplicationState;
    userActions: UserAction[];
    logs: LogEntry[];
    performanceMetrics: PerformanceMetric[];
    timestamp: string;
  }> {
    logger.info('Generating debug report', {}, 'debug');

    const [systemInfo] = await Promise.all([this.collectSystemInfo()]);

    const applicationState = await this.collectApplicationState();

    const report = {
      systemInfo,
      applicationState,
      userActions: this.collectUserActions(100),
      logs: this.collectLogs(200),
      performanceMetrics: this.collectPerformanceMetrics(100),
      timestamp: new Date().toISOString(),
    };

    logger.info(
      'Debug report generated',
      {
        systemInfo: !!report.systemInfo,
        applicationState: !!report.applicationState,
        userActionsCount: report.userActions.length,
        logsCount: report.logs.length,
        metricsCount: report.performanceMetrics.length,
      },
      'debug'
    );

    return report;
  }

  async exportDebugReport(): Promise<string> {
    const report = await this.generateDebugReport();

    const exportData = {
      ...report,
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: 'Zaphnath Bible Reader Debug Collector',
        version: logger.getVersion(),
        sessionId: logger.getSessionId(),
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Additional utility methods
  async collectNetworkInfo(): Promise<{
    online: boolean;
    connection?: NetworkConnectionInfo;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  }> {
    const networkInfo: {
      online: boolean;
      connection?: NetworkConnectionInfo;
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
    } = {
      online: navigator.onLine,
    };

    // Get network connection info if available
    const navigatorWithConnection = navigator as NavigatorWithConnection;
    if (navigatorWithConnection.connection) {
      networkInfo.connection = {
        effectiveType: navigatorWithConnection.connection.effectiveType,
        downlink: navigatorWithConnection.connection.downlink,
        rtt: navigatorWithConnection.connection.rtt,
        saveData: navigatorWithConnection.connection.saveData,
      };
      networkInfo.effectiveType = networkInfo.connection.effectiveType;
      networkInfo.downlink = networkInfo.connection.downlink;
      networkInfo.rtt = networkInfo.connection.rtt;
    }

    return networkInfo;
  }

  collectLocalStorageInfo(): {
    keys: string[];
    totalSize: number;
    items: Record<string, number>;
  } {
    const keys = Object.keys(localStorage);
    const items: Record<string, number> = {};
    let totalSize = 0;

    for (const key of keys) {
      try {
        const value = localStorage.getItem(key) || '';
        const size = new Blob([value]).size;
        items[key] = size;
        totalSize += size;
      } catch {
        items[key] = 0;
      }
    }

    return {
      keys,
      totalSize,
      items,
    };
  }

  collectBrowserInfo(): {
    userAgent: string;
    language: string;
    languages: readonly string[];
    cookieEnabled: boolean;
    doNotTrack: string | null;
    maxTouchPoints: number;
    vendor: string;
    vendorSub: string;
    productSub: string;
  } {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      maxTouchPoints: navigator.maxTouchPoints,
      vendor: navigator.vendor,
      vendorSub: navigator.vendorSub,
      productSub: navigator.productSub,
    };
  }

  async generateComprehensiveReport(): Promise<string> {
    const [basicReport, networkInfo, localStorageInfo, browserInfo] = await Promise.all([
      this.generateDebugReport(),
      this.collectNetworkInfo(),
      Promise.resolve(this.collectLocalStorageInfo()),
      Promise.resolve(this.collectBrowserInfo()),
    ]);

    const comprehensiveReport = {
      ...basicReport,
      networkInfo,
      localStorageInfo,
      browserInfo,
      performanceSummary: performanceMonitor.getMetricsSummary(),
      memoryUsage: performanceMonitor.getMemoryUsage(),
      metadata: {
        reportType: 'comprehensive',
        generatedAt: new Date().toISOString(),
        version: logger.getVersion(),
        sessionId: logger.getSessionId(),
      },
    };

    return JSON.stringify(comprehensiveReport, null, 2);
  }
}

// Create singleton instance
export const debugCollector = new DebugCollectorService();

// Export for use in other modules
export default debugCollector;
