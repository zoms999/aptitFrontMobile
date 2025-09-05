import { test, expect, devices } from '@playwright/test'

test.describe('Cross-Browser Mobile Testing', () => {
  const mobileDevices = [
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'Pixel 5', device: devices['Pixel 5'] },
    { name: 'iPad Pro', device: devices['iPad Pro'] },
  ]

  mobileDevices.forEach(({ name, device }) => {
    test.describe(`${name} Tests`, () => {
      test.use(device)

      test('should load homepage correctly', async ({ page }) => {
        await page.goto('/')
        
        // Check if main content is visible
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
        
        // Check if navigation is present
        await expect(page.locator('nav')).toBeVisible()
        
        // Check if PWA install prompt appears (mobile only)
        if (device.isMobile) {
          await expect(page.locator('[data-testid="pwa-install-prompt"]')).toBeVisible({ timeout: 10000 })
        }
      })

      test('should handle touch interactions', async ({ page }) => {
        test.skip(!device.isMobile, 'Touch interactions are mobile-specific')
        
        await page.goto('/dashboard')
        
        // Test tap interactions
        const button = page.locator('[data-testid="nav-test"]')
        await button.tap()
        
        await expect(page).toHaveURL('/test')
      })

      test('should support device-specific features', async ({ page }) => {
        await page.goto('/')
        
        // Check viewport dimensions
        const viewport = page.viewportSize()
        expect(viewport?.width).toBe(device.viewport?.width)
        expect(viewport?.height).toBe(device.viewport?.height)
        
        // Check user agent
        const userAgent = await page.evaluate(() => navigator.userAgent)
        expect(userAgent).toContain(device.userAgent?.split(' ')[0] || '')
      })

      test('should handle orientation changes', async ({ page }) => {
        test.skip(!device.isMobile, 'Orientation changes are mobile-specific')
        
        await page.goto('/test')
        
        // Test portrait orientation
        await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
        
        // Switch to landscape (swap width and height)
        const originalViewport = page.viewportSize()
        if (originalViewport) {
          await page.setViewportSize({
            width: originalViewport.height,
            height: originalViewport.width,
          })
        }
        
        // Content should still be accessible
        await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
      })

      test('should render fonts correctly', async ({ page }) => {
        await page.goto('/')
        
        // Check if custom fonts are loaded
        const fontFaces = await page.evaluate(() => {
          return Array.from(document.fonts).map(font => ({
            family: font.family,
            status: font.status,
          }))
        })
        
        // At least some fonts should be loaded
        const loadedFonts = fontFaces.filter(font => font.status === 'loaded')
        expect(loadedFonts.length).toBeGreaterThan(0)
      })

      test('should handle CSS features correctly', async ({ page }) => {
        await page.goto('/')
        
        // Check if CSS Grid is supported and working
        const gridSupport = await page.evaluate(() => {
          const testEl = document.createElement('div')
          testEl.style.display = 'grid'
          return testEl.style.display === 'grid'
        })
        
        expect(gridSupport).toBe(true)
        
        // Check if Flexbox is supported
        const flexSupport = await page.evaluate(() => {
          const testEl = document.createElement('div')
          testEl.style.display = 'flex'
          return testEl.style.display === 'flex'
        })
        
        expect(flexSupport).toBe(true)
      })

      test('should handle JavaScript features', async ({ page }) => {
        await page.goto('/')
        
        // Check modern JavaScript features
        const jsFeatures = await page.evaluate(() => {
          return {
            asyncAwait: typeof (async () => {}) === 'function',
            arrow: typeof (() => {}) === 'function',
            destructuring: (() => {
              try {
                const [a] = [1]
                return true
              } catch {
                return false
              }
            })(),
            modules: typeof (globalThis as any).import === 'function',
          }
        })
        
        expect(jsFeatures.asyncAwait).toBe(true)
        expect(jsFeatures.arrow).toBe(true)
        expect(jsFeatures.destructuring).toBe(true)
      })

      test('should handle media queries correctly', async ({ page }) => {
        await page.goto('/')
        
        // Check if device-specific media queries work
        const mediaQueries = await page.evaluate(() => {
          return {
            mobile: window.matchMedia('(max-width: 768px)').matches,
            tablet: window.matchMedia('(min-width: 769px) and (max-width: 1024px)').matches,
            desktop: window.matchMedia('(min-width: 1025px)').matches,
            touch: window.matchMedia('(pointer: coarse)').matches,
          }
        })
        
        if (device.isMobile) {
          expect(mediaQueries.mobile || mediaQueries.tablet).toBe(true)
          expect(mediaQueries.touch).toBe(true)
        }
      })

      test('should handle network conditions', async ({ page, context }) => {
        // Simulate slow network
        await context.route('**/*', async (route) => {
          await new Promise(resolve => setTimeout(resolve, 50))
          await route.continue()
        })
        
        const startTime = Date.now()
        await page.goto('/')
        await page.waitForLoadState('domcontentloaded')
        const loadTime = Date.now() - startTime
        
        // Should handle slow network gracefully
        expect(loadTime).toBeLessThan(10000)
        
        // Critical content should still load
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
      })

      test('should maintain functionality across page reloads', async ({ page }) => {
        await page.goto('/dashboard')
        
        // Interact with the page
        const testNav = page.locator('[data-testid="nav-test"]')
        if (device.isMobile) {
          await testNav.tap()
        } else {
          await testNav.click()
        }
        
        await expect(page).toHaveURL('/test')
        
        // Reload the page
        await page.reload()
        
        // Should maintain state and functionality
        await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
      })

      test('should handle form inputs correctly', async ({ page }) => {
        await page.goto('/login')
        
        // Test text input
        const emailInput = page.locator('[data-testid="email-input"]')
        await emailInput.fill('test@example.com')
        
        const emailValue = await emailInput.inputValue()
        expect(emailValue).toBe('test@example.com')
        
        // Test password input
        const passwordInput = page.locator('[data-testid="password-input"]')
        await passwordInput.fill('password123')
        
        const passwordValue = await passwordInput.inputValue()
        expect(passwordValue).toBe('password123')
        
        // Check input types are correct
        const emailType = await emailInput.getAttribute('type')
        const passwordType = await passwordInput.getAttribute('type')
        
        expect(emailType).toBe('email')
        expect(passwordType).toBe('password')
      })
    })
  })

  test('should work consistently across all mobile browsers', async ({ browser }) => {
    // Test the same functionality across different mobile contexts
    const contexts = await Promise.all([
      browser.newContext(devices['iPhone 12']),
      browser.newContext(devices['Pixel 5']),
      browser.newContext(devices['iPad Pro']),
    ])
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    )
    
    // Load the same page on all devices
    await Promise.all(
      pages.map(page => page.goto('/dashboard'))
    )
    
    // Check if core functionality works on all devices
    for (const page of pages) {
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()
    }
    
    // Clean up
    await Promise.all(contexts.map(context => context.close()))
  })
})