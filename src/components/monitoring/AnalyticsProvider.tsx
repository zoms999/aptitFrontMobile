/**
 * Analytics Provider Component
 * Provides analytics context and automatic tracking
 */

'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import monitoring from '../../lib/monitoring';
import { useAuth } from '../../contexts/AuthContext';

interface AnalyticsContextType {
  trackEvent: (event: string, properties?: Record<string, any>) => void;
  trackPageView: (page: string) => void;
  trackTestCompletion: (testId: string, duration: number, score: number) => void;
  trackPWAInstall: () => void;
  trackPWAUsage: () => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | undefined>(undefined);

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  // Set user ID when user changes
  useEffect(() => {
    if (user?.id) {
      monitoring.setUserId(user.id);
    }
  }, [user?.id]);

  // Track page views automatically
  useEffect(() => {
    monitoring.trackPageView(pathname);
  }, [pathname]);

  // Track PWA usage on mount
  useEffect(() => {
    monitoring.trackPWAUsage();
  }, []);

  // Set up PWA install tracking
  useEffect(() => {
    let deferredPrompt: any;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      deferredPrompt = e;
      
      // Track that install prompt was shown
      monitoring.trackEvent('pwa_install_prompt_shown', {
        platform: getPlatform()
      });
    };

    const handleAppInstalled = () => {
      monitoring.trackPWAInstall();
      deferredPrompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Track session duration
  useEffect(() => {
    const sessionStart = Date.now();
    
    const trackSessionEnd = () => {
      const sessionDuration = Date.now() - sessionStart;
      monitoring.trackEvent('session_end', {
        duration: sessionDuration,
        pages_visited: getVisitedPages()
      });
    };

    // Track session end on page unload
    window.addEventListener('beforeunload', trackSessionEnd);
    
    // Track session end on visibility change (mobile app switching)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        trackSessionEnd();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', trackSessionEnd);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Track performance metrics
  useEffect(() => {
    // Track initial page load performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          
          if (navigation) {
            monitoring.trackEvent('page_load_performance', {
              loadTime: navigation.loadEventEnd - navigation.navigationStart,
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
              firstPaint: getFirstPaint(),
              firstContentfulPaint: getFirstContentfulPaint()
            });
          }
        }, 0);
      });
    }
  }, []);

  const contextValue: AnalyticsContextType = {
    trackEvent: monitoring.trackEvent.bind(monitoring),
    trackPageView: monitoring.trackPageView.bind(monitoring),
    trackTestCompletion: monitoring.trackTestCompletion.bind(monitoring),
    trackPWAInstall: monitoring.trackPWAInstall.bind(monitoring),
    trackPWAUsage: monitoring.trackPWAUsage.bind(monitoring)
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsContextType {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}

// Utility functions
function getPlatform(): string {
  if (typeof navigator === 'undefined') return 'server';
  
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('android')) return 'android';
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
  if (userAgent.includes('windows')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
}

function getVisitedPages(): string[] {
  // This would need to be implemented with a state management solution
  // For now, return current page
  return [window.location.pathname];
}

function getFirstPaint(): number | null {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : null;
  }
  return null;
}

function getFirstContentfulPaint(): number | null {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : null;
  }
  return null;
}