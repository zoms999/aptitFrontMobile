import { test, expect } from '@playwright/test'

test.describe('Performance Testing', () => {
  test('should load pages within acceptable time limits', async ({ page }) => {
    // Test homepage performance
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('should have good Core Web Vitals scores', async ({ page }) => {
    await page.goto('/')
    
    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {}
        
        // Largest Contentful Paint (LCP)
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1]
          vitals.lcp = lastEntry.startTime
        }).observe({ entryTypes: ['largest-contentful-paint'] })
        
        // First Input Delay (FID) - simulated
        vitals.fid = 0 // Will be measured during actual interactions
        
        // Cumulative Layout Shift (CLS)
        let clsValue = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          vitals.cls = clsValue
        }).observe({ entryTypes: ['layout-shift'] })
        
        // Wait for measurements
        setTimeout(() => resolve(vitals), 2000)
      })
    })
    
    // LCP should be under 2.5 seconds
    expect(vitals.lcp).toBeLessThan(2500)
    
    // CLS should be under 0.1
    expect(vitals.cls).toBeLessThan(0.1)
  })

  test('should optimize images for mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await page.goto('/')
    
    // Check if images are properly optimized
    const images = page.locator('img')
    const count = await images.count()
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i)
      
      // Check if images have proper loading attributes
      const loading = await img.getAttribute('loading')
      const srcset = await img.getAttribute('srcset')
      
      // Images should use lazy loading or be critical
      expect(loading === 'lazy' || loading === 'eager').toBe(true)
      
      // Images should have responsive srcset for mobile
      if (srcset) {
        expect(srcset).toContain('w') // Width descriptors
      }
    }
  })

  test('should minimize bundle size', async ({ page }) => {
    // Intercept network requests to measure bundle sizes
    const bundles = []
    
    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('/_next/static/chunks/') && url.endsWith('.js')) {
        bundles.push({
          url,
          size: response.headers()['content-length'] || 0,
        })
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Main bundle should be reasonably sized
    const mainBundle = bundles.find(b => b.url.includes('main'))
    if (mainBundle) {
      expect(parseInt(mainBundle.size)).toBeLessThan(500000) // 500KB
    }
  })

  test('should use efficient caching strategies', async ({ page }) => {
    await page.goto('/')
    
    // Check if static assets have proper cache headers
    const responses = []
    
    page.on('response', (response) => {
      const url = response.url()
      if (url.includes('/_next/static/') || url.includes('/images/')) {
        responses.push({
          url,
          cacheControl: response.headers()['cache-control'],
        })
      }
    })
    
    await page.reload()
    
    // Static assets should have long cache times
    responses.forEach(response => {
      if (response.cacheControl) {
        expect(response.cacheControl).toMatch(/max-age=\d+/)
      }
    })
  })

  test('should handle slow network conditions', async ({ page, context }) => {
    // Simulate slow 3G network
    await context.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)) // Add 100ms delay
      await route.continue()
    })
    
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    const loadTime = Date.now() - startTime
    
    // Should still load within reasonable time on slow network
    expect(loadTime).toBeLessThan(5000)
    
    // Critical content should be visible
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
  })

  test('should preload critical resources', async ({ page }) => {
    await page.goto('/')
    
    // Check if critical resources are preloaded
    const preloadLinks = page.locator('link[rel="preload"]')
    const count = await preloadLinks.count()
    
    expect(count).toBeGreaterThan(0)
    
    // Check if fonts are preloaded
    const fontPreloads = page.locator('link[rel="preload"][as="font"]')
    const fontCount = await fontPreloads.count()
    
    if (fontCount > 0) {
      // Font preloads should have crossorigin attribute
      for (let i = 0; i < fontCount; i++) {
        const link = fontPreloads.nth(i)
        await expect(link).toHaveAttribute('crossorigin')
      }
    }
  })

  test('should minimize layout shifts', async ({ page }) => {
    await page.goto('/')
    
    // Measure layout shifts during page load
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0
        
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
        }).observe({ entryTypes: ['layout-shift'] })
        
        // Wait for page to stabilize
        setTimeout(() => resolve(clsValue), 3000)
      })
    })
    
    // CLS should be minimal
    expect(cls).toBeLessThan(0.1)
  })

  test('should optimize for mobile CPU and memory', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await page.goto('/')
    
    // Measure memory usage
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        }
      }
      return null
    })
    
    if (memoryInfo) {
      // Memory usage should be reasonable for mobile
      const memoryUsageMB = memoryInfo.usedJSHeapSize / (1024 * 1024)
      expect(memoryUsageMB).toBeLessThan(50) // Less than 50MB
    }
  })

  test('should handle concurrent users efficiently', async ({ browser }) => {
    // Simulate multiple concurrent users
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ])
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    )
    
    // Load pages concurrently
    const startTime = Date.now()
    await Promise.all(
      pages.map(page => page.goto('/'))
    )
    const loadTime = Date.now() - startTime
    
    // Should handle concurrent loads efficiently
    expect(loadTime).toBeLessThan(5000)
    
    // Clean up
    await Promise.all(contexts.map(context => context.close()))
  })
})