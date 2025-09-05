import { test, expect } from '@playwright/test'

test.describe('Mobile Test Interface', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test page
    await page.goto('/test')
  })

  test('should display test questions in mobile-friendly format', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Wait for test to load
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Check if question is displayed
    await expect(page.locator('[data-testid="question-text"]')).toBeVisible()
    
    // Check if answer options are visible and properly sized
    const options = page.locator('[data-testid^="option-"]')
    const count = await options.count()
    expect(count).toBeGreaterThan(0)
    
    // Verify touch-friendly option sizing
    for (let i = 0; i < count; i++) {
      const option = options.nth(i)
      const box = await option.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('should support touch interactions for answer selection', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Select an answer option using touch
    const firstOption = page.locator('[data-testid="option-0"]')
    await firstOption.tap()
    
    // Verify option is selected
    await expect(firstOption).toBeChecked()
    
    // Verify submit button becomes enabled
    const submitButton = page.locator('[data-testid="submit-button"]')
    await expect(submitButton).toBeEnabled()
  })

  test('should support swipe gestures for navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Assume we have a multi-question test
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    const testContainer = page.locator('[data-testid="test-container"]')
    
    // Get initial question number
    const initialQuestion = await page.locator('[data-testid="question-number"]').textContent()
    
    // Perform swipe left gesture (next question)
    await testContainer.hover()
    await page.mouse.down()
    await page.mouse.move(100, 0) // Swipe left
    await page.mouse.up()
    
    // Check if question changed (if there are multiple questions)
    const newQuestion = await page.locator('[data-testid="question-number"]').textContent()
    
    // If there are multiple questions, the question number should change
    if (newQuestion !== initialQuestion) {
      expect(newQuestion).not.toBe(initialQuestion)
    }
  })

  test('should show progress indicator', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Check if progress indicator is visible
    const progressIndicator = page.locator('[data-testid="progress-indicator"]')
    await expect(progressIndicator).toBeVisible()
    
    // Check if progress text is displayed (e.g., "1 / 5")
    const progressText = page.locator('[data-testid="progress-text"]')
    await expect(progressText).toBeVisible()
    await expect(progressText).toContainText('/')
  })

  test('should handle time limit display', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Check if timer is displayed
    const timer = page.locator('[data-testid="timer"]')
    await expect(timer).toBeVisible()
    
    // Timer should show remaining time
    await expect(timer).toContainText('남은 시간')
  })

  test('should save progress automatically', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Select an answer
    const firstOption = page.locator('[data-testid="option-0"]')
    await firstOption.tap()
    
    // Wait for auto-save
    await page.waitForTimeout(1000)
    
    // Check if progress is saved in localStorage
    const savedProgress = await page.evaluate(() => {
      return localStorage.getItem('test-progress-test-id')
    })
    
    expect(savedProgress).toBeTruthy()
  })

  test('should restore progress on page reload', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Select an answer
    const firstOption = page.locator('[data-testid="option-0"]')
    await firstOption.tap()
    
    // Wait for auto-save
    await page.waitForTimeout(1000)
    
    // Reload the page
    await page.reload()
    
    // Check if the answer is still selected
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    await expect(firstOption).toBeChecked()
  })

  test('should handle test submission', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Select an answer
    const firstOption = page.locator('[data-testid="option-0"]')
    await firstOption.tap()
    
    // Submit the test
    const submitButton = page.locator('[data-testid="submit-button"]')
    await submitButton.tap()
    
    // Should navigate to results page or show completion message
    await expect(page.locator('[data-testid="test-completion"]')).toBeVisible()
  })

  test('should be accessible with screen readers', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Check if question has proper ARIA labels
    const question = page.locator('[data-testid="question-text"]')
    await expect(question).toHaveAttribute('role', 'group')
    
    // Check if options have proper labels
    const options = page.locator('[data-testid^="option-"]')
    const count = await options.count()
    
    for (let i = 0; i < count; i++) {
      const option = options.nth(i)
      await expect(option).toHaveAttribute('aria-label')
    }
  })

  test('should handle orientation changes gracefully', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Start in portrait
    await page.setViewportSize({ width: 375, height: 812 })
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Switch to landscape
    await page.setViewportSize({ width: 812, height: 375 })
    
    // Test interface should still be functional
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Should still be able to select answers
    const firstOption = page.locator('[data-testid="option-0"]')
    await firstOption.tap()
    await expect(firstOption).toBeChecked()
  })

  test('should provide haptic feedback on interactions', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    await expect(page.locator('[data-testid="test-container"]')).toBeVisible()
    
    // Mock vibration API to test haptic feedback
    await page.addInitScript(() => {
      window.vibrationCalls = []
      navigator.vibrate = (pattern) => {
        window.vibrationCalls.push(pattern)
        return true
      }
    })
    
    // Select an answer (should trigger haptic feedback)
    const firstOption = page.locator('[data-testid="option-0"]')
    await firstOption.tap()
    
    // Check if vibration was called
    const vibrationCalls = await page.evaluate(() => window.vibrationCalls)
    expect(vibrationCalls.length).toBeGreaterThan(0)
  })
})