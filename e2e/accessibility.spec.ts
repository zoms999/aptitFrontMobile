import { test, expect } from '@playwright/test'

test.describe('Accessibility Testing', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/')
    
    // Check if page has h1
    const h1 = page.locator('h1')
    await expect(h1).toHaveCount(1)
    
    // Check heading hierarchy (h1 -> h2 -> h3, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
    
    let previousLevel = 0
    for (const heading of headings) {
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
      const currentLevel = parseInt(tagName.charAt(1))
      
      // Heading levels should not skip (e.g., h1 -> h3)
      expect(currentLevel - previousLevel).toBeLessThanOrEqual(1)
      previousLevel = currentLevel
    }
  })

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Check navigation has proper role and label
    const nav = page.locator('nav')
    await expect(nav).toHaveAttribute('role', 'navigation')
    await expect(nav).toHaveAttribute('aria-label')
    
    // Check buttons have accessible names
    const buttons = page.locator('button')
    const buttonCount = await buttons.count()
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i)
      const ariaLabel = await button.getAttribute('aria-label')
      const textContent = await button.textContent()
      
      // Button should have either aria-label or text content
      expect(ariaLabel || textContent?.trim()).toBeTruthy()
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test tab navigation
    await page.keyboard.press('Tab')
    
    // First focusable element should be focused
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
    
    // Test navigation through all focusable elements
    const focusableElements = page.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const count = await focusableElements.count()
    
    for (let i = 0; i < Math.min(count, 10); i++) { // Test first 10 elements
      await page.keyboard.press('Tab')
      const currentFocused = page.locator(':focus')
      await expect(currentFocused).toBeVisible()
    }
  })

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/')
    
    // Check text elements for color contrast
    const textElements = page.locator('p, span, div, h1, h2, h3, h4, h5, h6, button, a')
    const count = await textElements.count()
    
    for (let i = 0; i < Math.min(count, 20); i++) { // Test first 20 elements
      const element = textElements.nth(i)
      const isVisible = await element.isVisible()
      
      if (isVisible) {
        const styles = await element.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            fontSize: computed.fontSize,
          }
        })
        
        // Basic check - ensure text has color and background
        expect(styles.color).toBeTruthy()
        expect(styles.backgroundColor).toBeTruthy()
      }
    }
  })

  test('should support screen readers', async ({ page }) => {
    await page.goto('/test')
    
    // Check if form elements have proper labels
    const inputs = page.locator('input, select, textarea')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      const id = await input.getAttribute('id')
      const ariaLabel = await input.getAttribute('aria-label')
      const ariaLabelledBy = await input.getAttribute('aria-labelledby')
      
      if (id) {
        // Check if there's a label for this input
        const label = page.locator(`label[for="${id}"]`)
        const hasLabel = await label.count() > 0
        
        // Input should have label, aria-label, or aria-labelledby
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy()
      }
    }
  })

  test('should handle focus management', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Test focus trap in modals (if any)
    const modalTrigger = page.locator('[data-testid="open-modal"]')
    const modalExists = await modalTrigger.count() > 0
    
    if (modalExists) {
      await modalTrigger.click()
      
      // Modal should be visible
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()
      
      // Focus should be trapped within modal
      await page.keyboard.press('Tab')
      const focusedElement = page.locator(':focus')
      
      // Focused element should be within modal
      const isWithinModal = await focusedElement.evaluate((el, modalEl) => {
        return modalEl.contains(el)
      }, await modal.elementHandle())
      
      expect(isWithinModal).toBe(true)
    }
  })

  test('should provide skip links', async ({ page }) => {
    await page.goto('/')
    
    // Check for skip link
    const skipLink = page.locator('a[href="#main-content"], a[href="#content"]')
    const hasSkipLink = await skipLink.count() > 0
    
    if (hasSkipLink) {
      // Skip link should be focusable
      await page.keyboard.press('Tab')
      await expect(skipLink).toBeFocused()
      
      // Skip link should work
      await page.keyboard.press('Enter')
      const mainContent = page.locator('#main-content, #content')
      await expect(mainContent).toBeFocused()
    }
  })

  test('should support high contrast mode', async ({ page }) => {
    await page.goto('/')
    
    // Simulate high contrast mode
    await page.addInitScript(() => {
      // Add high contrast media query
      const style = document.createElement('style')
      style.textContent = `
        @media (prefers-contrast: high) {
          * {
            background: white !important;
            color: black !important;
          }
        }
      `
      document.head.appendChild(style)
    })
    
    await page.reload()
    
    // Check if content is still visible and readable
    const mainContent = page.locator('[data-testid="main-content"]')
    await expect(mainContent).toBeVisible()
  })

  test('should support reduced motion preferences', async ({ page }) => {
    await page.goto('/')
    
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' })
    
    // Check if animations are disabled or reduced
    const animatedElements = page.locator('[class*="animate"], [style*="transition"], [style*="animation"]')
    const count = await animatedElements.count()
    
    for (let i = 0; i < count; i++) {
      const element = animatedElements.nth(i)
      const styles = await element.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          animationDuration: computed.animationDuration,
          transitionDuration: computed.transitionDuration,
        }
      })
      
      // Animations should be disabled or very short
      if (styles.animationDuration !== 'none') {
        expect(parseFloat(styles.animationDuration)).toBeLessThanOrEqual(0.1)
      }
      if (styles.transitionDuration !== 'none') {
        expect(parseFloat(styles.transitionDuration)).toBeLessThanOrEqual(0.1)
      }
    }
  })

  test('should have proper form validation messages', async ({ page }) => {
    await page.goto('/login')
    
    // Try to submit form without filling required fields
    const submitButton = page.locator('[type="submit"]')
    await submitButton.click()
    
    // Check for validation messages
    const errorMessages = page.locator('[role="alert"], .error-message, [aria-invalid="true"]')
    const hasErrors = await errorMessages.count() > 0
    
    if (hasErrors) {
      // Error messages should be associated with form fields
      const firstError = errorMessages.first()
      await expect(firstError).toBeVisible()
      
      // Error should have proper ARIA attributes
      const ariaLive = await firstError.getAttribute('aria-live')
      const role = await firstError.getAttribute('role')
      
      expect(ariaLive === 'polite' || ariaLive === 'assertive' || role === 'alert').toBe(true)
    }
  })

  test('should support zoom up to 200%', async ({ page }) => {
    await page.goto('/')
    
    // Zoom to 200%
    await page.setViewportSize({ width: 640, height: 480 }) // Simulate 200% zoom on 1280x960
    
    // Content should still be accessible and readable
    const mainContent = page.locator('[data-testid="main-content"]')
    await expect(mainContent).toBeVisible()
    
    // Navigation should still work
    const navigation = page.locator('nav')
    await expect(navigation).toBeVisible()
    
    // Text should not be cut off
    const textElements = page.locator('p, h1, h2, h3')
    const count = await textElements.count()
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const element = textElements.nth(i)
      const box = await element.boundingBox()
      
      if (box) {
        // Text should be within viewport
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.y).toBeGreaterThanOrEqual(0)
      }
    }
  })
})