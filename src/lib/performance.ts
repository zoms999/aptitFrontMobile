'use client';

/**
 * Performance monitoring utilities for mobile optimization
 */

// Core Web Vitals tracking
export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Performance observer for tracking metrics
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, WebVitalsMetric> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Largest Contentful Paint (LCP)
    this.observeMetric('largest-contentful-paint', (entry) => {
      this.recordMetric('LCP', entry.startTime, this.getLCPRating(entry.startTime));
    });

    // First Input Delay (FID)
    this.observeMetric('first-input', (entry) => {
      const fid = entry.processingStart - entry.startTime;
      this.recordMetric('FID', fid, this.getFIDRating(fid));
    });

    // Cumulative Layout Shift (CLS)
    this.observeMetric('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        const cls = entry.value;
        this.recordMetric('CLS', cls, this.getCLSRating(cls));
      }
    });

    // Time to First Byte (TTFB)
    this.observeNavigation();
  }

  private observeMetric(entryType: string, callback: (entry: any) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach(callback);
      });
      observer.observe({ entryTypes: [entryType] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Failed to observe ${entryType}:`, error);
    }
  }

  private observeNavigation() {
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          const ttfb = entry.responseStart - entry.requestStart;
          this.recordMetric('TTFB', ttfb, this.getTTFBRating(ttfb));
        });
      });
      observer.observe({ entryTypes: ['navigation'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('Failed to observe navigation:', error);
    }
  }

  private recordMetric(name: string, value: number, rating: 'good' | 'needs-improvement' | 'poor') {
    const metric: WebVitalsMetric = {
      name,
      value,
      rating,
      delta: value - (this.metrics.get(name)?.value || 0),
      id: `${name}-${Date.now()}`,
    };

    this.metrics.set(name, metric);
    this.reportMetric(metric);
  }

  private reportMetric(metric: WebVitalsMetric) {
    // Send to analytics service (implement based on your analytics provider)
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Google Analytics, Vercel Analytics, etc.
      console.log('Performance metric:', metric);
    }
  }

  private getLCPRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good';
    if (value <= 4000) return 'needs-improvement';
    return 'poor';
  }

  private getFIDRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 100) return 'good';
    if (value <= 300) return 'needs-improvement';
    return 'poor';
  }

  private getCLSRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 0.1) return 'good';
    if (value <= 0.25) return 'needs-improvement';
    return 'poor';
  }

  private getTTFBRating(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 800) return 'good';
    if (value <= 1800) return 'needs-improvement';
    return 'poor';
  }

  getMetrics(): WebVitalsMetric[] {
    return Array.from(this.metrics.values());
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Resource loading performance
export function measureResourceLoading(resourceUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name === resourceUrl) {
          const loadTime = entry.responseEnd - entry.startTime;
          resolve(loadTime);
          observer.disconnect();
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });
  });
}

// Component render performance
export function measureComponentRender<T extends (...args: any[]) => any>(
  component: T,
  componentName: string
): T {
  return ((...args: Parameters<T>) => {
    const startTime = performance.now();
    const result = component(...args);
    const endTime = performance.now();
    
    console.log(`${componentName} render time: ${endTime - startTime}ms`);
    
    return result;
  }) as T;
}

// Memory usage monitoring
export function getMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

// Network information
export function getNetworkInfo() {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return {
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }
  return null;
}

// Battery status (for mobile optimization)
export async function getBatteryInfo() {
  if ('getBattery' in navigator) {
    try {
      const battery = await (navigator as any).getBattery();
      return {
        charging: battery.charging,
        level: battery.level,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      };
    } catch (error) {
      console.warn('Battery API not available:', error);
    }
  }
  return null;
}

// Performance budget checker
export function checkPerformanceBudget() {
  const metrics = PerformanceMonitor.getInstance().getMetrics();
  const budget = {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    TTFB: 800,
  };

  const violations = metrics.filter(metric => {
    const budgetValue = budget[metric.name as keyof typeof budget];
    return budgetValue && metric.value > budgetValue;
  });

  return {
    passed: violations.length === 0,
    violations,
    score: ((metrics.length - violations.length) / metrics.length) * 100,
  };
}

// Initialize performance monitoring
export function initializePerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    const monitor = PerformanceMonitor.getInstance();
    
    // Report initial page load metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const budget = checkPerformanceBudget();
        console.log('Performance Budget Check:', budget);
      }, 1000);
    });

    return monitor;
  }
  return null;
}