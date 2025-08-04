import {
  PerformanceMonitor,
  PerformanceMetric,
  PerformanceCategory,
} from "@/types/logging";
import { logger } from "./logger";

interface ActiveTiming {
  id: string;
  name: string;
  category: PerformanceCategory;
  startTime: number;
  startMark: string;
  endMark: string;
}

class PerformanceMonitorService implements PerformanceMonitor {
  private activeTimings: Map<string, ActiveTiming> = new Map();
  private metrics: PerformanceMetric[] = [];
  private maxMetrics: number = 1000;

  constructor() {
    this.setupPerformanceObserver();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObserver(): void {
    // Observe navigation timing
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.handlePerformanceEntry(entry);
          }
        });

        observer.observe({
          entryTypes: ["navigation", "resource", "measure", "paint"],
        });
      } catch (error) {
        logger.warn(
          "Failed to setup PerformanceObserver",
          { error: error instanceof Error ? error.message : String(error) },
          "performance"
        );
      }
    }
  }

  private handlePerformanceEntry(entry: PerformanceEntry): void {
    let category: PerformanceCategory = "user-interaction";
    let name = entry.name;

    switch (entry.entryType) {
      case "navigation":
        category = "page-load";
        name = "page-load";
        break;
      case "resource":
        category = "api-call";
        name = `resource-${entry.name.split("/").pop()}`;
        break;
      case "measure":
        category = "component-render";
        break;
      case "paint":
        category = "page-load";
        break;
    }

    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      name,
      category,
      duration: entry.duration,
      startTime: entry.startTime,
      endTime: entry.startTime + entry.duration,
      context: {
        entryType: entry.entryType,
        transferSize: (entry as any).transferSize,
        decodedBodySize: (entry as any).decodedBodySize,
      },
      sessionId: logger.getSessionId(),
      version: logger.getVersion(),
    };

    this.addMetric(metric);
  }

  private addMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Maintain max metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log performance metric
    logger.logPerformance(metric);

    // Warn about slow operations
    if (metric.duration > 1000) {
      logger.warn(
        `Slow operation detected: ${metric.name} took ${metric.duration}ms`,
        {
          metric,
        },
        "performance"
      );
    }
  }

  startTiming(name: string, category: PerformanceCategory): string {
    const id = this.generateId();
    const startMark = `${name}-start-${id}`;
    const endMark = `${name}-end-${id}`;

    try {
      performance.mark(startMark);
    } catch (error) {
      logger.warn(
        "Failed to create performance mark",
        { error: error instanceof Error ? error.message : String(error), name },
        "performance"
      );
    }

    const timing: ActiveTiming = {
      id,
      name,
      category,
      startTime: performance.now(),
      startMark,
      endMark,
    };

    this.activeTimings.set(id, timing);

    logger.debug(`Started timing: ${name}`, { id, category }, "performance");

    return id;
  }

  endTiming(
    timingId: string,
    context?: Record<string, any>
  ): PerformanceMetric | null {
    const timing = this.activeTimings.get(timingId);
    if (!timing) {
      logger.warn(
        "Attempted to end unknown timing",
        { timingId },
        "performance"
      );
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - timing.startTime;

    try {
      performance.mark(timing.endMark);
      performance.measure(
        `${timing.name}-${timingId}`,
        timing.startMark,
        timing.endMark
      );
    } catch (error) {
      logger.warn(
        "Failed to create performance measure",
        {
          error: error instanceof Error ? error.message : String(error),
          name: timing.name,
        },
        "performance"
      );
    }

    const metric: PerformanceMetric = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      name: timing.name,
      category: timing.category,
      duration,
      startTime: timing.startTime,
      endTime,
      context,
      sessionId: logger.getSessionId(),
      version: logger.getVersion(),
    };

    this.addMetric(metric);
    this.activeTimings.delete(timingId);

    logger.debug(
      `Ended timing: ${timing.name} (${duration}ms)`,
      {
        id: timingId,
        duration,
        context,
      },
      "performance"
    );

    return metric;
  }

  async measureAsync<T>(
    name: string,
    category: PerformanceCategory,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const timingId = this.startTiming(name, category);

    try {
      const result = await fn();
      this.endTiming(timingId, { ...context, success: true });
      return result;
    } catch (error) {
      this.endTiming(timingId, {
        ...context,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  measureSync<T>(
    name: string,
    category: PerformanceCategory,
    fn: () => T,
    context?: Record<string, any>
  ): T {
    const timingId = this.startTiming(name, category);

    try {
      const result = fn();
      this.endTiming(timingId, { ...context, success: true });
      return result;
    } catch (error) {
      this.endTiming(timingId, {
        ...context,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  getMetrics(category?: PerformanceCategory): PerformanceMetric[] {
    if (category) {
      return this.metrics.filter((metric) => metric.category === category);
    }
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
    this.activeTimings.clear();

    // Clear performance marks and measures
    try {
      performance.clearMarks();
      performance.clearMeasures();
    } catch (error) {
      logger.warn(
        "Failed to clear performance marks/measures",
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "performance"
      );
    }

    logger.info("Performance metrics cleared", {}, "performance");
  }

  // Additional utility methods
  getAverageMetric(
    name: string,
    category?: PerformanceCategory
  ): number | null {
    const filteredMetrics = this.metrics.filter((metric) => {
      return (
        metric.name === name && (!category || metric.category === category)
      );
    });

    if (filteredMetrics.length === 0) return null;

    const total = filteredMetrics.reduce(
      (sum, metric) => sum + metric.duration,
      0
    );
    return total / filteredMetrics.length;
  }

  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    return this.metrics.filter((metric) => metric.duration > threshold);
  }

  getMetricsSummary(): {
    total: number;
    categories: Record<PerformanceCategory, number>;
    averageDuration: number;
    slowOperations: number;
  } {
    const categories: Record<PerformanceCategory, number> = {} as any;
    let totalDuration = 0;

    for (const metric of this.metrics) {
      categories[metric.category] = (categories[metric.category] || 0) + 1;
      totalDuration += metric.duration;
    }

    return {
      total: this.metrics.length,
      categories,
      averageDuration:
        this.metrics.length > 0 ? totalDuration / this.metrics.length : 0,
      slowOperations: this.getSlowOperations().length,
    };
  }

  // Memory usage monitoring
  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
  } | null {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
      };
    }
    return null;
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitorService();

// Export for use in other modules
export default performanceMonitor;
