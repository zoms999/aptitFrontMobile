import { Page, expect } from '@playwright/test'

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Login with test credentials
   */
  async login(email = 'test@example.com', password = 'password') {
    await this.page.goto('/login')
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
    await expect(this.page).toHaveURL('/dashboard')
  }

  /**
   * Wait for PWA to be ready
   */
  async waitForPWA() {
    await this.page.waitForFunction(() => {
      return 'serviceWorker' in navigator && navigator.serviceWorker.ready
    })
  }

  /**
   * Simulate touch gesture
   */
  async swipe(selector: string, direction: 'left' | 'right' | 'up' | 'down', distance = 100) {
    const element = this.page.locator(selector)
    const box = await element.boundingBox()
    
    if (!box) throw new Error(`Element ${selector} not found`)
    
    const startX = box.x + box.width / 2
    const startY = box.y + box.height / 2
    
    let endX = startX
    let endY = startY
    
    switch (direction) {
      case 'left':
        endX = startX - distance
        break
      case 'right':
        endX = startX + distance
        break
      case 'up':
        endY = startY - distance
        break
      case 'down':
        endY = startY + distance
        break
    }
    
    await this.page.mouse.move(startX, startY)
    await this.page.mouse.down()
    await this.page.mouse.move(endX, endY)
    await this.page.mouse.up()
  }

  /**
   * Check if element is in viewport
   */
  async isInViewport(selector: string): Promise<boolean> {
    return await this.page.locator(selector).evaluate((element) => {
      const rect = element.getBoundingClientRect()
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
      )
    })
  }

  /**
   * Wait for network to be idle
   */
  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Take a screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    })
  }

  /**
   * Check accessibility violations
   */
  async checkA11y() {
    // Basic accessibility checks
    const violations = await this.page.evaluate(() => {
      const issues = []
      
      // Check for missing alt text on images
      const images = document.querySelectorAll('img:not([alt])')
      if (images.length > 0) {
        issues.push(`${images.length} images missing alt text`)
      }
      
      // Check for missing form labels
      const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
      const unlabeledInputs = Array.from(inputs).filter(input => {
        const id = input.getAttribute('id')
        return !id || !document.querySelector(`label[for="${id}"]`)
      })
      
      if (unlabeledInputs.length > 0) {
        issues.push(`${unlabeledInputs.length} form inputs missing labels`)
      }
      
      // Check for missing heading hierarchy
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      if (headings.length === 0) {
        issues.push('No headings found on page')
      }
      
      return issues
    })
    
    return violations
  }

  /**
   * Measure page performance
   */
  async measurePerformance() {
    const metrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      }
    })
    
    return metrics
  }

  /**
   * Simulate network conditions
   */
  async simulateNetworkConditions(type: 'slow3g' | 'fast3g' | 'offline') {
    const conditions = {
      slow3g: { downloadThroughput: 500 * 1024, uploadThroughput: 500 * 1024, latency: 400 },
      fast3g: { downloadThroughput: 1.6 * 1024 * 1024, uploadThroughput: 750 * 1024, latency: 150 },
      offline: { offline: true },
    }
    
    await this.page.context().setOffline(type === 'offline')
    
    if (type !== 'offline') {
      // Note: Playwright doesn't have built-in network throttling like Puppeteer
      // This would need to be implemented with route interception
      await this.page.context().route('**/*', async (route) => {
        const delay = conditions[type].latency
        await new Promise(resolve => setTimeout(resolve, delay))
        await route.continue()
      })
    }
  }

  /**
   * Check if PWA is installable
   */
  async isPWAInstallable(): Promise<boolean> {
    return await this.page.evaluate(() => {
      return new Promise((resolve) => {
        let installPromptEvent: any = null
        
        const handler = (e: Event) => {
          installPromptEvent = e
          resolve(true)
        }
        
        window.addEventListener('beforeinstallprompt', handler)
        
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
          resolve(false)
        }
        
        // Timeout after 5 seconds
        setTimeout(() => {
          window.removeEventListener('beforeinstallprompt', handler)
          resolve(!!installPromptEvent)
        }, 5000)
      })
    })
  }

  /**
   * Fill form with test data
   */
  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      await this.page.fill(`[data-testid="${field}"]`, value)
    }
  }

  /**
   * Wait for element to be stable (not moving)
   */
  async waitForStable(selector: string, timeout = 5000) {
    const element = this.page.locator(selector)
    
    await this.page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel)
        if (!el) return false
        
        const rect1 = el.getBoundingClientRect()
        
        return new Promise(resolve => {
          setTimeout(() => {
            const rect2 = el.getBoundingClientRect()
            resolve(
              rect1.top === rect2.top &&
              rect1.left === rect2.left &&
              rect1.width === rect2.width &&
              rect1.height === rect2.height
            )
          }, 100)
        })
      },
      selector,
      { timeout }
    )
  }
}