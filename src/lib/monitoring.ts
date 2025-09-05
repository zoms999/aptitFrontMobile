/**
 * Monitoring and Analytics Library
 * Handles error tracking, performance monitoring, and user analytics
 */

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  additionalData?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userId?: string;
  sessionId: string;
  additionalData?: Record<string, any>;
}

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
  url: string;
}

class MonitoringService {
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean;
  private apiEndpoint: string;
  private batchSize: number = 10;
  private batchTimeout: number = 5000;
  private errorQueue: ErrorReport[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private analyticsQueue: AnalyticsEvent[] = [];
  private batchTimer?: NodeJS.Timeout;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true';
    this.apiEndpoint = '/api/monitoring';
    
    if (typeof window !== 'undefined') {
      this.initializeClientSide();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeClientSide(): void {
    // Set up error handlers
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    
    // Set up performance monitoring
    this.setupPerformanceMonitoring();
    
    // Set up visibility change tracking
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    
    // Set up beforeunload for final batch send
    window.addEventListener('beforeunload', this.flushQueues.bind(this));
    
    // Start batch processing
    this.startBatchProcessing();
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Error Tracking
  reportError(error: Error, additionalData?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const errorReport: ErrorReport = {
      message: error.message,
      stack: error.stack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      additionalData
    };

    this.errorQueue.push(errorReport);
    this.processBatchIfNeeded();
  }

  private handleGlobalError(event: ErrorEvent): void {
    this.reportError(new Error(event.message), {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      type: 'global-error'
    });
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    this.reportError(error, {
      type: 'unhandled-rejection'
    });
  }

  // Performance Monitoring
  reportMetric(name: string, value: number, additionalData?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userId: this.userId,
      sessionId: this.sessionId,
      additionalData
    };

    this.metricsQueue.push(metric);
    this.processBatchIfNeeded();
  }

  private setupPerformanceMonitoring(): void {
    // Core Web Vitals
    this.measureCoreWebVitals();
    
    // Navigation timing
    this.measureNavigationTiming();
    
    // Resource timing
    this.measureResourceTiming();
    
    // Custom performance marks
    this.setupCustomMarks();
  }

  private measureCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.reportMetric('lcp', lastEntry.startTime, {
            element: lastEntry.element?.tagName
          });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (e) {
        // LCP not supported
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.reportMetric('fid', entry.processingStart - entry.startTime, {
              eventType: entry.name
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (e) {
        // FID not supported
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.reportMetric('cls', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (e) {
        // CLS not supported
      }
    }
  }

  private measureNavigationTiming(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (navigation) {
            this.reportMetric('ttfb', navigation.responseStart - navigation.fetchStart);
            this.reportMetric('dom-content-loaded', navigation.domContentLoadedEventEnd - navigation.navigationStart);
            this.reportMetric('load-complete', navigation.loadEventEnd - navigation.navigationStart);
            this.reportMetric('dns-lookup', navigation.domainLookupEnd - navigation.domainLookupStart);
            this.reportMetric('tcp-connect', navigation.connectEnd - navigation.connectStart);
          }
        }, 0);
      });
    }
  }

  private measureResourceTiming(): void {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: PerformanceResourceTiming) => {
            // Only track critical resources
            if (entry.name.includes('.js') || entry.name.includes('.css') || entry.name.includes('/api/')) {
              this.reportMetric('resource-load-time', entry.duration, {
                resourceType: entry.initiatorType,
                resourceName: entry.name.split('/').pop(),
                transferSize: entry.transferSize
              });
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        // Resource timing not supported
      }
    }
  }

  private setupCustomMarks(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Mark when React hydration completes
      const originalConsoleError = console.error;
      console.error = (...args) => {
        if (args[0]?.includes?.('Hydration')) {
          performance.mark('hydration-error');
          this.reportMetric('hydration-error', performance.now());
        }
        originalConsoleError.apply(console, args);
      };
    }
  }

  // Analytics Events
  trackEvent(event: string, properties: Record<string, any> = {}): void {
    if (!this.isEnabled) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        viewport: typeof window !== 'undefined' ? {
          width: window.innerWidth,
          height: window.innerHeight
        } : null,
        connection: this.getConnectionInfo()
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      url: typeof window !== 'undefined' ? window.location.href : ''
    };

    this.analyticsQueue.push(analyticsEvent);
    this.processBatchIfNeeded();
  }

  // PWA-specific tracking
  trackPWAInstall(): void {
    this.trackEvent('pwa_install', {
      installPromptShown: true,
      platform: this.getPlatform()
    });
  }

  trackPWAUsage(): void {
    if (typeof window !== 'undefined') {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      this.trackEvent('pwa_usage', {
        isStandalone,
        platform: this.getPlatform()
      });
    }
  }

  trackTestCompletion(testId: string, duration: number, score: number): void {
    this.trackEvent('test_completed', {
      testId,
      duration,
      score,
      platform: this.getPlatform(),
      deviceType: this.getDeviceType()
    });
  }

  trackPageView(page: string): void {
    this.trackEvent('page_view', {
      page,
      referrer: typeof document !== 'undefined' ? document.referrer : '',
      platform: this.getPlatform()
    });
  }

  // Utility methods
  private getPlatform(): string {
    if (typeof navigator === 'undefined') return 'server';
    
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('windows')) return 'windows';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('linux')) return 'linux';
    return 'unknown';
  }

  private getDeviceType(): string {
    if (typeof window === 'undefined') return 'server';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private getConnectionInfo(): any {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'hidden') {
      this.flushQueues();
    }
  }

  // Batch processing
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.batchTimeout);
  }

  private processBatchIfNeeded(): void {
    const totalItems = this.errorQueue.length + this.metricsQueue.length + this.analyticsQueue.length;
    if (totalItems >= this.batchSize) {
      this.processBatch();
    }
  }

  private async processBatch(): Promise<void> {
    if (this.errorQueue.length === 0 && this.metricsQueue.length === 0 && this.analyticsQueue.length === 0) {
      return;
    }

    const batch = {
      errors: this.errorQueue.splice(0, this.batchSize),
      metrics: this.metricsQueue.splice(0, this.batchSize),
      analytics: this.analyticsQueue.splice(0, this.batchSize)
    };

    try {
      await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(batch)
      });
    } catch (error) {
      // If sending fails, put items back in queue (up to a limit)
      if (batch.errors.length < 100) this.errorQueue.unshift(...batch.errors);
      if (batch.metrics.length < 100) this.metricsQueue.unshift(...batch.metrics);
      if (batch.analytics.length < 100) this.analyticsQueue.unshift(...batch.analytics);
    }
  }

  private flushQueues(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.processBatch();
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

export default monitoring;
export type { ErrorReport, PerformanceMetric, AnalyticsEvent };