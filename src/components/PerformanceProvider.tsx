'use client';

import { useEffect } from 'react';
import { initializePerformanceMonitoring } from '@/lib/performance';
import { preloadCriticalResources } from '@/lib/preloader';

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // Initialize performance monitoring
    const monitor = initializePerformanceMonitoring();
    
    // Preload critical resources
    preloadCriticalResources();
    
    // Cleanup on unmount
    return () => {
      if (monitor) {
        monitor.disconnect();
      }
    };
  }, []);

  return <>{children}</>;
}