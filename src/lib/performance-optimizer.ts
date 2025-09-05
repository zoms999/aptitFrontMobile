/**
 * Performance optimization utilities for the mobile app
 */

// Bundle analysis and optimization
export class BundleOptimizer {
  static analyzeBundle() {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Analyze bundle size in development
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      const totalSize = scripts.reduce((total, script) => {
        const src = script.getAttribute('src');
        if (src && src.includes('/_next/')) {
          // Estimate size based on script name patterns
          return total + this.estimateScriptSize(src);
        }
        return total;
      }, 0);
      
      console.log(`Estimated bundle size: ${(totalSize / 1024).toFixed(2)} KB`);
      
      if (totalSize > 500 * 1024) { // 500KB threshold
        console.warn('Bundle size is large. Consider code splitting.');
      }
    }
  }
  
  private static estimateScriptSize(src: string): number {
    // Basic estimation based on common Next.js chunk patterns
    if (src.includes('framework')) return 50 * 1024; // ~50KB
    if (src.includes('main')) return 30 * 1024; // ~30KB
    if (src.includes('webpack')) return 10 * 1024; // ~10KB
    if (src.includes('pages')) return 20 * 1024; // ~20KB
    return 5 * 1024; // Default ~5KB
  }
}

// Critical resource preloader
export class CriticalResourcePreloader {
  private static preloadedResources = new Set<string>();
  
  static preloadCriticalResources() {
    const criticalResources = [
      '/api/auth/me', // User authentication check
      '/api/tests', // Available tests
      '/manifest.json', // PWA manifest
    ];
    
    criticalResources.forEach(resource => {
      this.preloadResource(resource);
    });
  }
  
  static preloadResource(url: string, type: 'fetch' | 'image' | 'script' = 'fetch') {
    if (this.preloadedResources.has(url)) return;
    
    this.preloadedResources.add(url);
    
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      switch (type) {
        case 'fetch':
          link.as = 'fetch';
          link.crossOrigin = 'anonymous';
          break;
        case 'image':
          link.as = 'image';
          break;
        case 'script':
          link.as = 'script';
          break;
      }
      
      document.head.appendChild(link);
    }
  }
  
  static preloadNextPage(path: string) {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = path;
        document.head.appendChild(link);
      });
    }
  }
}

// Memory management utilities
export class MemoryManager {
  private static observers = new Map<string, IntersectionObserver>();
  
  static createLazyLoadObserver(callback: (entries: IntersectionObserverEntry[]) => void) {
    const observer = new IntersectionObserver(callback, {
      rootMargin: '50px 0px',
      threshold: 0.1
    });
    
    return observer;
  }
  
  static cleanupObserver(id: string) {
    const observer = this.observers.get(id);
    if (observer) {
      observer.disconnect();
      this.observers.delete(id);
    }
  }
  
  static monitorMemoryUsage() {
    if (typeof window !== 'undefined' && 'performance' in window && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / (1024 * 1024);
      const totalMB = memory.totalJSHeapSize / (1024 * 1024);
      const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
      
      console.log(`Memory usage: ${usedMB.toFixed(2)}MB / ${totalMB.toFixed(2)}MB (Limit: ${limitMB.toFixed(2)}MB)`);
      
      // Warn if memory usage is high
      if (usedMB > limitMB * 0.8) {
        console.warn('High memory usage detected. Consider optimizing.');
      }
      
      return { used: usedMB, total: totalMB, limit: limitMB };
    }
    
    return null;
  }
  
  static forceGarbageCollection() {
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }
}

// Image optimization utilities
export class ImageOptimizer {
  static getOptimalImageSize(containerWidth: number, devicePixelRatio = 1): number {
    const baseSize = containerWidth * devicePixelRatio;
    
    // Round up to nearest common size for better caching
    const commonSizes = [320, 640, 768, 1024, 1280, 1920];
    return commonSizes.find(size => size >= baseSize) || baseSize;
  }
  
  static generateSrcSet(baseSrc: string, sizes: number[]): string {
    return sizes
      .map(size => `${baseSrc}?w=${size}&q=75 ${size}w`)
      .join(', ');
  }
  
  static lazyLoadImage(img: HTMLImageElement, src: string) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          img.classList.remove('lazy');
          observer.unobserve(img);
        }
      });
    });
    
    observer.observe(img);
  }
}

// Network optimization
export class NetworkOptimizer {
  private static connectionType: string | null = null;
  
  static getConnectionType(): string {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection.effectiveType || connection.type || 'unknown';
    }
    return 'unknown';
  }
  
  static isSlowConnection(): boolean {
    const connectionType = this.getConnectionType();
    return ['slow-2g', '2g'].includes(connectionType);
  }
  
  static adaptToConnection() {
    const isSlowConnection = this.isSlowConnection();
    
    if (isSlowConnection) {
      // Reduce image quality
      document.documentElement.classList.add('slow-connection');
      
      // Disable non-essential animations
      document.documentElement.style.setProperty('--animation-duration', '0s');
      
      // Reduce polling frequency
      return {
        imageQuality: 50,
        animationsEnabled: false,
        pollingInterval: 30000, // 30 seconds instead of 5
        prefetchEnabled: false
      };
    }
    
    return {
      imageQuality: 75,
      animationsEnabled: true,
      pollingInterval: 5000,
      prefetchEnabled: true
    };
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, number>();
  
  static startTiming(label: string) {
    this.metrics.set(label, performance.now());
  }
  
  static endTiming(label: string): number {
    const startTime = this.metrics.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      this.metrics.delete(label);
      
      console.log(`${label}: ${duration.toFixed(2)}ms`);
      
      // Send to analytics if duration is significant
      if (duration > 100) {
        this.reportPerformanceMetric(label, duration);
      }
      
      return duration;
    }
    return 0;
  }
  
  static measureCoreWebVitals() {
    if (typeof window === 'undefined') return;
    
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.startTime);
      this.reportPerformanceMetric('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
    
    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        console.log('FID:', entry.processingStart - entry.startTime);
        this.reportPerformanceMetric('FID', entry.processingStart - entry.startTime);
      });
    }).observe({ entryTypes: ['first-input'] });
    
    // Cumulative Layout Shift
    let clsValue = 0;
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      });
      console.log('CLS:', clsValue);
      this.reportPerformanceMetric('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }
  
  private static reportPerformanceMetric(name: string, value: number) {
    // Send to monitoring service
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'performance_metric', {
        metric_name: name,
        metric_value: Math.round(value),
        custom_parameter: navigator.userAgent
      });
    }
  }
}

// Initialize performance optimizations
export function initializePerformanceOptimizations() {
  if (typeof window !== 'undefined') {
    // Start monitoring
    PerformanceMonitor.measureCoreWebVitals();
    
    // Preload critical resources
    CriticalResourcePreloader.preloadCriticalResources();
    
    // Adapt to network conditions
    NetworkOptimizer.adaptToConnection();
    
    // Monitor memory usage periodically
    setInterval(() => {
      MemoryManager.monitorMemoryUsage();
    }, 30000); // Every 30 seconds
    
    // Analyze bundle in development
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        BundleOptimizer.analyzeBundle();
      }, 2000);
    }
  }
}