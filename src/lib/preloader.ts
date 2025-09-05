'use client';

/**
 * Resource preloading utilities for performance optimization
 */

interface PreloadOptions {
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch';
  crossOrigin?: 'anonymous' | 'use-credentials';
  type?: string;
  media?: string;
  priority?: 'high' | 'low' | 'auto';
}

class ResourcePreloader {
  private static instance: ResourcePreloader;
  private preloadedResources = new Set<string>();
  private preloadQueue: Array<{ url: string; options: PreloadOptions }> = [];
  private isProcessing = false;

  static getInstance(): ResourcePreloader {
    if (!ResourcePreloader.instance) {
      ResourcePreloader.instance = new ResourcePreloader();
    }
    return ResourcePreloader.instance;
  }

  /**
   * Preload a resource using link rel="preload"
   */
  preload(url: string, options: PreloadOptions = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.preloadedResources.has(url)) {
        resolve();
        return;
      }

      if (typeof document === 'undefined') {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      if (options.as) link.as = options.as;
      if (options.crossOrigin) link.crossOrigin = options.crossOrigin;
      if (options.type) link.type = options.type;
      if (options.media) link.media = options.media;

      link.onload = () => {
        this.preloadedResources.add(url);
        resolve();
      };

      link.onerror = () => {
        console.warn(`Failed to preload resource: ${url}. This is non-critical and the app will continue to work.`);
        // Don't reject for missing resources, just resolve to prevent app crashes
        resolve();
      };

      document.head.appendChild(link);
    });
  }

  /**
   * Preload multiple resources with priority queue
   */
  async preloadBatch(resources: Array<{ url: string; options?: PreloadOptions }>) {
    const highPriority = resources.filter(r => r.options?.priority === 'high');
    const normalPriority = resources.filter(r => !r.options?.priority || r.options.priority === 'auto');
    const lowPriority = resources.filter(r => r.options?.priority === 'low');

    // Process high priority first
    await Promise.all(highPriority.map(r => this.preload(r.url, r.options)));
    
    // Then normal priority
    await Promise.all(normalPriority.map(r => this.preload(r.url, r.options)));
    
    // Finally low priority
    await Promise.all(lowPriority.map(r => this.preload(r.url, r.options)));
  }

  /**
   * Preload critical fonts
   */
  preloadFonts(fontUrls: string[]) {
    return Promise.all(
      fontUrls.map(url => 
        this.preload(url, {
          as: 'font',
          crossOrigin: 'anonymous',
          priority: 'high'
        })
      )
    );
  }

  /**
   * Preload critical images
   */
  preloadImages(imageUrls: string[]) {
    return Promise.all(
      imageUrls.map(url => 
        this.preload(url, {
          as: 'image',
          priority: 'high'
        })
      )
    );
  }

  /**
   * Preload API endpoints
   */
  preloadAPI(endpoints: string[]) {
    return Promise.all(
      endpoints.map(url => 
        this.preload(url, {
          as: 'fetch',
          crossOrigin: 'anonymous',
          priority: 'auto'
        })
      )
    );
  }

  /**
   * Prefetch resources for future navigation
   */
  prefetch(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof document === 'undefined') {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to prefetch resource: ${url}`));

      document.head.appendChild(link);
    });
  }

  /**
   * Preconnect to external domains
   */
  preconnect(origins: string[]) {
    if (typeof document === 'undefined') return;

    origins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  }

  /**
   * DNS prefetch for external domains
   */
  dnsPrefetch(domains: string[]) {
    if (typeof document === 'undefined') return;

    domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      document.head.appendChild(link);
    });
  }

  /**
   * Check if resource is already preloaded
   */
  isPreloaded(url: string): boolean {
    return this.preloadedResources.has(url);
  }

  /**
   * Clear preloaded resources cache
   */
  clearCache() {
    this.preloadedResources.clear();
  }
}

// Singleton instance
export const preloader = ResourcePreloader.getInstance();

// Convenience functions
export const preloadResource = (url: string, options?: PreloadOptions) => 
  preloader.preload(url, options);

export const preloadBatch = (resources: Array<{ url: string; options?: PreloadOptions }>) =>
  preloader.preloadBatch(resources);

export const preloadFonts = (fontUrls: string[]) => 
  preloader.preloadFonts(fontUrls);

export const preloadImages = (imageUrls: string[]) => 
  preloader.preloadImages(imageUrls);

export const preloadAPI = (endpoints: string[]) => 
  preloader.preloadAPI(endpoints);

export const prefetchResource = (url: string) => 
  preloader.prefetch(url);

export const preconnectOrigins = (origins: string[]) => 
  preloader.preconnect(origins);

export const dnsPrefetchDomains = (domains: string[]) => 
  preloader.dnsPrefetch(domains);

/**
 * Critical resource preloading for mobile app
 */
export function preloadCriticalResources() {
  // Preload critical fonts (if available)
  preloadFonts([
    '/fonts/inter-var.woff2',
    '/fonts/inter-var-latin.woff2',
  ]).catch(() => {
    console.warn('Some fonts failed to preload, using fallback fonts');
  });

  // Preload critical images (if available)
  preloadImages([
    '/icons/icon-192.png',
  ]).catch(() => {
    console.warn('Some icons failed to preload, app will use fallback icons');
  });

  // Preconnect to external services
  preconnectOrigins([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ]);

  // DNS prefetch for analytics and monitoring
  dnsPrefetchDomains([
    'https://www.google-analytics.com',
    'https://vitals.vercel-analytics.com',
  ]);
}

/**
 * Route-based preloading
 */
export function preloadRouteResources(route: string) {
  const routeResources: Record<string, string[]> = {
    '/dashboard': ['/api/tests', '/api/results/recent'],
    '/test': ['/api/tests'],
    '/results': ['/api/results', '/api/analytics'],
    '/profile': ['/api/profile', '/api/preferences'],
  };

  const resources = routeResources[route];
  if (resources) {
    preloadAPI(resources);
  }
}

/**
 * Intersection Observer based preloading
 */
export function createIntersectionPreloader(
  element: Element,
  resources: Array<{ url: string; options?: PreloadOptions }>
) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          preloadBatch(resources);
          observer.unobserve(element);
        }
      });
    },
    {
      rootMargin: '50px',
      threshold: 0.1,
    }
  );

  observer.observe(element);
  return observer;
}