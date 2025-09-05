import React, { Suspense } from 'react';

export function createLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactElement
) {
  const LazyComponent = React.lazy(importFn);

  return function LazyWrapper(props: React.ComponentProps<T>) {
    const defaultFallback = React.createElement('div', {
      className: 'animate-pulse bg-gray-200 rounded h-32'
    });
    
    return React.createElement(
      Suspense,
      { fallback: fallback || defaultFallback },
      React.createElement(LazyComponent, props)
    );
  };
}

// Default loading skeletons
export const DefaultSkeleton = React.createElement('div', {
  className: 'animate-pulse bg-gray-200 rounded p-4'
}, [
  React.createElement('div', { key: '1', className: 'h-4 bg-gray-300 rounded w-3/4 mb-2' }),
  React.createElement('div', { key: '2', className: 'h-4 bg-gray-300 rounded w-1/2' })
]);

export const CardSkeleton = React.createElement('div', {
  className: 'animate-pulse'
}, [
  React.createElement('div', { key: '1', className: 'h-64 bg-gray-200 rounded-lg mb-4' }),
  React.createElement('div', { key: '2', className: 'flex space-x-4' }, [
    React.createElement('div', { key: '1', className: 'h-4 bg-gray-300 rounded w-1/4' }),
    React.createElement('div', { key: '2', className: 'h-4 bg-gray-300 rounded w-1/4' }),
    React.createElement('div', { key: '3', className: 'h-4 bg-gray-300 rounded w-1/4' })
  ])
]);

export const ListSkeleton = React.createElement('div', {
  className: 'animate-pulse space-y-4'
}, [
  React.createElement('div', { key: '1', className: 'h-8 bg-gray-200 rounded w-1/2' }),
  React.createElement('div', { key: '2', className: 'h-32 bg-gray-200 rounded' }),
  React.createElement('div', { key: '3', className: 'grid grid-cols-2 gap-4' }, [
    React.createElement('div', { key: '1', className: 'h-20 bg-gray-200 rounded' }),
    React.createElement('div', { key: '2', className: 'h-20 bg-gray-200 rounded' })
  ])
]);

export const ProfileSkeleton = React.createElement('div', {
  className: 'animate-pulse space-y-6'
}, [
  React.createElement('div', { key: '1', className: 'flex items-center space-x-4' }, [
    React.createElement('div', { key: '1', className: 'w-16 h-16 bg-gray-200 rounded-full' }),
    React.createElement('div', { key: '2', className: 'space-y-2' }, [
      React.createElement('div', { key: '1', className: 'h-4 bg-gray-200 rounded w-32' }),
      React.createElement('div', { key: '2', className: 'h-3 bg-gray-200 rounded w-24' })
    ])
  ]),
  React.createElement('div', { key: '2', className: 'space-y-4' }, [
    React.createElement('div', { key: '1', className: 'h-12 bg-gray-200 rounded' }),
    React.createElement('div', { key: '2', className: 'h-12 bg-gray-200 rounded' }),
    React.createElement('div', { key: '3', className: 'h-12 bg-gray-200 rounded' })
  ])
]);

// Lazy loading utilities
export function lazyLoadWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3
): React.LazyExoticComponent<T> {
  return React.lazy(async () => {
    let lastError: Error | null = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        
        // Wait before retrying
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError;
  });
}

// Preload component for better UX
export function preloadComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): void {
  if (typeof window !== 'undefined') {
    // Use requestIdleCallback if available
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        importFn().catch(() => {
          // Ignore preload errors
        });
      });
    } else {
      // Fallback to setTimeout
      setTimeout(() => {
        importFn().catch(() => {
          // Ignore preload errors
        });
      }, 100);
    }
  }
}

// Intersection Observer based lazy loading
export function createIntersectionLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: IntersectionObserverInit = {}
) {
  return function IntersectionLazyWrapper(props: React.ComponentProps<T>) {
    const [shouldLoad, setShouldLoad] = React.useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1, ...options }
      );

      if (ref.current) {
        observer.observe(ref.current);
      }

      return () => observer.disconnect();
    }, []);

    if (!shouldLoad) {
      return React.createElement('div', {
        ref,
        className: 'animate-pulse bg-gray-200 rounded h-32'
      });
    }

    const LazyComponent = React.lazy(importFn);
    
    return React.createElement(
      Suspense,
      { fallback: DefaultSkeleton },
      React.createElement(LazyComponent, props)
    );
  };
}