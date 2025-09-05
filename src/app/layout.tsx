import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PWAProvider } from '@/components/PWAProvider'
import { OfflineIndicator } from '@/components/OfflineIndicator'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'
import { NavigationProvider } from '@/contexts/NavigationContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { LocalizationProvider } from '@/contexts/LocalizationContext'
import { PWAShell } from '@/components/mobile'
import { PerformanceProvider } from '@/components/PerformanceProvider'
import { PerformanceMetrics } from '@/components/PerformanceMetrics'
import { ClientOnlyOfflineManager } from '@/components/offline/ClientOnlyOfflineManager'
import { AccessibilityProvider } from '@/components/accessibility/AccessibilityProvider'
import { AnalyticsProvider } from '@/components/monitoring/AnalyticsProvider'
import ErrorBoundary from '@/components/monitoring/ErrorBoundary'
import PerformanceMonitor from '@/components/monitoring/PerformanceMonitor'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Aptit Mobile',
  description: 'Mobile aptitude testing application',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Aptit Mobile',
    startupImage: [
      {
        url: '/icons/icon-192.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'Aptit Mobile',
    'application-name': 'Aptit Mobile',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="h-full">
      <head>
        {/* PWA meta tags */}
        <meta name="theme-color" content="#3b82f6" />
        <meta name="background-color" content="#ffffff" />
        <meta name="display" content="standalone" />
        <meta name="orientation" content="portrait-primary" />
        
        {/* iOS specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Aptit Mobile" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/manifest.json" as="fetch" crossOrigin="anonymous" />
        <link rel="preload" href="/sw.js" as="script" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS prefetch for performance */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body className={`${inter.className} h-full antialiased bg-white`}>
        <ErrorBoundary>
          <PerformanceProvider>
            <PWAProvider>
              <AuthProvider>
                <AnalyticsProvider>
                  <ThemeProvider>
                    <LocalizationProvider>
                      <NavigationProvider>
                        <AccessibilityProvider>
                          <ClientOnlyOfflineManager enableAutoSync enablePrefetch>
                            <div className="flex flex-col h-full safe-area-inset relative">
                              {/* Main content with proper landmarks */}
                              <main id="main-content" className="flex-1">
                                <PWAShell>
                                  {children}
                                </PWAShell>
                              </main>
                              
                              {/* PWA install prompt */}
                              <PWAInstallPrompt />
                              
                              {/* Performance metrics (development only) */}
                              <PerformanceMetrics />
                              
                              {/* Performance monitor (development only) */}
                              <PerformanceMonitor />
                            </div>
                          </ClientOnlyOfflineManager>
                        </AccessibilityProvider>
                      </NavigationProvider>
                    </LocalizationProvider>
                  </ThemeProvider>
                </AnalyticsProvider>
              </AuthProvider>
            </PWAProvider>
          </PerformanceProvider>
        </ErrorBoundary>
        
        {/* Performance monitoring and service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize performance monitoring
              if (typeof window !== 'undefined') {
                // Web Vitals tracking
                function sendToAnalytics(metric) {
                  // Send to your analytics service
                  console.log('Performance metric:', metric);
                }
                
                // Core Web Vitals
                function getCLS(onPerfEntry) {
                  new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                      if (!entry.hadRecentInput) {
                        onPerfEntry({
                          name: 'CLS',
                          value: entry.value,
                          rating: entry.value <= 0.1 ? 'good' : entry.value <= 0.25 ? 'needs-improvement' : 'poor'
                        });
                      }
                    });
                  }).observe({entryTypes: ['layout-shift']});
                }
                
                function getFID(onPerfEntry) {
                  new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                      const fid = entry.processingStart - entry.startTime;
                      onPerfEntry({
                        name: 'FID',
                        value: fid,
                        rating: fid <= 100 ? 'good' : fid <= 300 ? 'needs-improvement' : 'poor'
                      });
                    });
                  }).observe({entryTypes: ['first-input']});
                }
                
                function getLCP(onPerfEntry) {
                  new PerformanceObserver((list) => {
                    list.getEntries().forEach((entry) => {
                      onPerfEntry({
                        name: 'LCP',
                        value: entry.startTime,
                        rating: entry.startTime <= 2500 ? 'good' : entry.startTime <= 4000 ? 'needs-improvement' : 'poor'
                      });
                    });
                  }).observe({entryTypes: ['largest-contentful-paint']});
                }
                
                // Initialize tracking
                getCLS(sendToAnalytics);
                getFID(sendToAnalytics);
                getLCP(sendToAnalytics);
              }
              
              // Service worker registration
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}