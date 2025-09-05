'use client';

import { useState, useEffect } from 'react';
import { getMemoryUsage, getNetworkInfo, getBatteryInfo } from '@/lib/performance';

interface PerformanceMetrics {
  cacheHitRate: number;
  networkMetrics: {
    requests: number;
    failures: number;
    averageResponseTime: number;
  };
  cacheSize: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercentage: number;
  };
  networkInfo?: {
    effectiveType: string;
    downlink: number;
    rtt: number;
    saveData: boolean;
  };
  batteryInfo?: {
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
  };
}

export function PerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Get service worker metrics
        const swMetrics = await getServiceWorkerMetrics();
        
        // Get browser metrics
        const memoryUsage = getMemoryUsage();
        const networkInfo = getNetworkInfo();
        const batteryInfo = await getBatteryInfo();

        setMetrics({
          ...swMetrics,
          memoryUsage,
          networkInfo,
          batteryInfo,
        });
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
      }
    };

    if (isVisible) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isVisible]);

  const getServiceWorkerMetrics = (): Promise<Partial<PerformanceMetrics>> => {
    return new Promise((resolve) => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_PERFORMANCE_METRICS' },
          [messageChannel.port2]
        );
        
        // Timeout after 2 seconds
        setTimeout(() => {
          resolve({
            cacheHitRate: 0,
            networkMetrics: { requests: 0, failures: 0, averageResponseTime: 0 },
            cacheSize: 0,
          });
        }, 2000);
      } else {
        resolve({
          cacheHitRate: 0,
          networkMetrics: { requests: 0, failures: 0, averageResponseTime: 0 },
          cacheSize: 0,
        });
      }
    });
  };

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        title="Performance Metrics"
      >
        📊
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Performance Metrics</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {metrics ? (
            <div className="space-y-3 text-sm">
              {/* Cache Metrics */}
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Cache Performance</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Hit Rate: {metrics.cacheHitRate.toFixed(1)}%</div>
                  <div>Cache Size: {metrics.cacheSize} items</div>
                </div>
              </div>
              
              {/* Network Metrics */}
              <div>
                <h4 className="font-medium text-gray-700 mb-1">Network</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Requests: {metrics.networkMetrics.requests}</div>
                  <div>Failures: {metrics.networkMetrics.failures}</div>
                  <div className="col-span-2">
                    Avg Response: {metrics.networkMetrics.averageResponseTime.toFixed(0)}ms
                  </div>
                </div>
              </div>
              
              {/* Memory Usage */}
              {metrics.memoryUsage && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Memory</h4>
                  <div className="text-xs">
                    <div>Used: {(metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(1)} MB</div>
                    <div>Total: {(metrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(1)} MB</div>
                    <div>Usage: {metrics.memoryUsage.usagePercentage.toFixed(1)}%</div>
                  </div>
                </div>
              )}
              
              {/* Network Info */}
              {metrics.networkInfo && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Connection</h4>
                  <div className="text-xs">
                    <div>Type: {metrics.networkInfo.effectiveType}</div>
                    <div>Speed: {metrics.networkInfo.downlink} Mbps</div>
                    <div>RTT: {metrics.networkInfo.rtt}ms</div>
                    {metrics.networkInfo.saveData && (
                      <div className="text-orange-600">Data Saver: ON</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Battery Info */}
              {metrics.batteryInfo && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1">Battery</h4>
                  <div className="text-xs">
                    <div>Level: {(metrics.batteryInfo.level * 100).toFixed(0)}%</div>
                    <div>Status: {metrics.batteryInfo.charging ? 'Charging' : 'Discharging'}</div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-4">
              Loading metrics...
            </div>
          )}
        </div>
      )}
    </div>
  );
}