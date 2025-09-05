/**
 * Performance Monitor Component
 * Displays real-time performance metrics in development
 */

'use client';

import React, { useState, useEffect } from 'react';
import monitoring from '../../lib/monitoring';

interface PerformanceData {
  fps: number;
  memory: {
    used: number;
    total: number;
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
  };
  vitals: {
    lcp?: number;
    fid?: number;
    cls?: number;
  };
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export default function PerformanceMonitor({ 
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right'
}: PerformanceMonitorProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceData>({
    fps: 0,
    memory: { used: 0, total: 0 },
    timing: { domContentLoaded: 0, loadComplete: 0 },
    vitals: {}
  });

  useEffect(() => {
    if (!enabled) return;

    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    // FPS monitoring
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        setPerformanceData(prev => ({ ...prev, fps }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };

    // Memory monitoring
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setPerformanceData(prev => ({
          ...prev,
          memory: {
            used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(memory.totalJSHeapSize / 1024 / 1024)
          }
        }));
      }
    };

    // Navigation timing
    const measureTiming = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        setPerformanceData(prev => ({
          ...prev,
          timing: {
            domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.navigationStart),
            loadComplete: Math.round(navigation.loadEventEnd - navigation.navigationStart)
          }
        }));
      }
    };

    // Core Web Vitals monitoring
    const measureVitals = () => {
      if ('PerformanceObserver' in window) {
        // LCP
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            setPerformanceData(prev => ({
              ...prev,
              vitals: { ...prev.vitals, lcp: Math.round(lastEntry.startTime) }
            }));
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        } catch (e) {
          // LCP not supported
        }

        // FID
        try {
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              const fid = Math.round(entry.processingStart - entry.startTime);
              setPerformanceData(prev => ({
                ...prev,
                vitals: { ...prev.vitals, fid }
              }));
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
        } catch (e) {
          // FID not supported
        }

        // CLS
        try {
          let clsValue = 0;
          const clsObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            setPerformanceData(prev => ({
              ...prev,
              vitals: { ...prev.vitals, cls: Math.round(clsValue * 1000) / 1000 }
            }));
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
        } catch (e) {
          // CLS not supported
        }
      }
    };

    // Start monitoring
    measureFPS();
    measureTiming();
    measureVitals();
    
    const memoryInterval = setInterval(measureMemory, 1000);

    return () => {
      cancelAnimationFrame(animationId);
      clearInterval(memoryInterval);
    };
  }, [enabled]);

  if (!enabled) return null;

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  const getPerformanceColor = (metric: string, value: number): string => {
    switch (metric) {
      case 'fps':
        if (value >= 55) return 'text-green-600';
        if (value >= 30) return 'text-yellow-600';
        return 'text-red-600';
      case 'lcp':
        if (value <= 2500) return 'text-green-600';
        if (value <= 4000) return 'text-yellow-600';
        return 'text-red-600';
      case 'fid':
        if (value <= 100) return 'text-green-600';
        if (value <= 300) return 'text-yellow-600';
        return 'text-red-600';
      case 'cls':
        if (value <= 0.1) return 'text-green-600';
        if (value <= 0.25) return 'text-yellow-600';
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50`}>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs font-mono hover:bg-opacity-90 transition-opacity"
      >
        {isVisible ? '📊 Hide' : '📊 Perf'}
      </button>

      {/* Performance panel */}
      {isVisible && (
        <div className="mt-2 bg-black bg-opacity-90 text-white p-3 rounded text-xs font-mono min-w-[200px]">
          <div className="mb-2 font-bold text-yellow-400">Performance Monitor</div>
          
          {/* FPS */}
          <div className="flex justify-between mb-1">
            <span>FPS:</span>
            <span className={getPerformanceColor('fps', performanceData.fps)}>
              {performanceData.fps}
            </span>
          </div>

          {/* Memory */}
          <div className="flex justify-between mb-1">
            <span>Memory:</span>
            <span className="text-blue-400">
              {performanceData.memory.used}MB / {performanceData.memory.total}MB
            </span>
          </div>

          {/* Timing */}
          <div className="flex justify-between mb-1">
            <span>DCL:</span>
            <span className="text-purple-400">
              {performanceData.timing.domContentLoaded}ms
            </span>
          </div>
          
          <div className="flex justify-between mb-1">
            <span>Load:</span>
            <span className="text-purple-400">
              {performanceData.timing.loadComplete}ms
            </span>
          </div>

          {/* Core Web Vitals */}
          {performanceData.vitals.lcp && (
            <div className="flex justify-between mb-1">
              <span>LCP:</span>
              <span className={getPerformanceColor('lcp', performanceData.vitals.lcp)}>
                {performanceData.vitals.lcp}ms
              </span>
            </div>
          )}

          {performanceData.vitals.fid && (
            <div className="flex justify-between mb-1">
              <span>FID:</span>
              <span className={getPerformanceColor('fid', performanceData.vitals.fid)}>
                {performanceData.vitals.fid}ms
              </span>
            </div>
          )}

          {performanceData.vitals.cls !== undefined && (
            <div className="flex justify-between mb-1">
              <span>CLS:</span>
              <span className={getPerformanceColor('cls', performanceData.vitals.cls)}>
                {performanceData.vitals.cls}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-2 pt-2 border-t border-gray-600">
            <button
              onClick={() => {
                monitoring.trackEvent('performance_snapshot', {
                  ...performanceData,
                  timestamp: Date.now()
                });
                console.log('Performance snapshot sent to monitoring');
              }}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded mr-2"
            >
              Snapshot
            </button>
            
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'performance' in window) {
                  performance.mark('manual-mark');
                  console.log('Performance mark created');
                }
              }}
              className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
            >
              Mark
            </button>
          </div>
        </div>
      )}
    </div>
  );
}