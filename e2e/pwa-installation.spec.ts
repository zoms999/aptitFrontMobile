import { test, expect } from '@playwright/test'

test.describe('PWA Installation', () => {
  test('should show install prompt on mobile devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await page.goto('/')
    
    // Wait for PWA install prompt to appear
    await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible({ timeout: 10000 })
    
    // Check install button is present
    const installButton = page.locator('[data-testid="pwa-install-button"]')
    await expect(installButton).toBeVisible()
    await expect(installButton).toBeEnabled()
  })

  test('should handle PWA installation flow', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await page.goto('/')
    
    // Mock beforeinstallprompt event
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt')
      Object.defineProperty(event, 'prompt', {
        value: () => Promise.resolve(),
      })
      Object.defineProperty(event, 'userChoice', {
        value: Promise.resolve({ outcome: 'accepted' }),
      })
      window.dispatchEvent(event)
    })
    
    // Wait for install prompt
    await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible()
    
    // Click install button
    await page.click('[data-testid="pwa-install-button"]')
    
    // Verify installation success message
    await expect(page.locator('[data-testid="pwa-install-success"]')).toBeVisible()
  })

  test('should register service worker', async ({ page }) => {
    await page.goto('/')
    
    // Check if service worker is registered
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration()
          return !!registration
        } catch (error) {
          return false
        }
      }
      return false
    })
    
    expect(swRegistered).toBe(true)
  })

  test('should work in standalone mode', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Simulate standalone mode
    await page.addInitScript(() => {
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        writable: false,
      })
    })
    
    await page.goto('/')
    
    // Check if app detects standalone mode
    const isStandalone = await page.evaluate(() => {
      return window.navigator.standalone || 
             window.matchMedia('(display-mode: standalone)').matches
    })
    
    expect(isStandalone).toBe(true)
    
    // Verify standalone-specific UI elements
    await expect(page.locator('[data-testid="standalone-header"]')).toBeVisible()
  })

  test('should cache resources for offline use', async ({ page }) => {
    await page.goto('/')
    
    // Wait for service worker to cache resources
    await page.waitForTimeout(2000)
    
    // Check if critical resources are cached
    const cacheStatus = await page.evaluate(async () => {
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        const cache = await caches.open(cacheNames[0])
        const cachedRequests = await cache.keys()
        return cachedRequests.length > 0
      }
      return false
    })
    
    expect(cacheStatus).toBe(true)
  })

  test('should show offline indicator when network is unavailable', async ({ page, context }) => {
    await page.goto('/')
    
    // Simulate offline mode
    await context.setOffline(true)
    
    // Trigger a network request to detect offline state
    await page.reload()
    
    // Check if offline indicator is shown
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible()
    
    // Restore online mode
    await context.setOffline(false)
    
    // Check if offline indicator is hidden
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible()
  })

  test('should handle manifest.json correctly', async ({ page }) => {
    // Check if manifest is linked in HTML
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
    
    // Fetch and validate manifest content
    const response = await page.request.get('/manifest.json')
    expect(response.status()).toBe(200)
    
    const manifest = await response.json()
    expect(manifest.name).toBe('Aptit Mobile')
    expect(manifest.short_name).toBe('Aptit')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons).toHaveLength(2)
  })
})