import { test, expect } from '@playwright/test'

test.describe('Mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('should display mobile navigation on small screens', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Check if mobile navigation is visible
    const mobileNav = page.locator('[data-testid="mobile-navigation"]')
    await expect(mobileNav).toBeVisible()
    
    // Check if all navigation items are present
    await expect(page.locator('[data-testid="nav-dashboard"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-test"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-results"]')).toBeVisible()
    await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible()
  })

  test('should navigate between pages using mobile navigation', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Navigate to test page
    await page.click('[data-testid="nav-test"]')
    await expect(page).toHaveURL('/test')
    
    // Check if test page content is visible
    await expect(page.locator('[data-testid="test-page"]')).toBeVisible()
    
    // Navigate to results page
    await page.click('[data-testid="nav-results"]')
    await expect(page).toHaveURL('/results')
    
    // Navigate to profile page
    await page.click('[data-testid="nav-profile"]')
    await expect(page).toHaveURL('/profile')
    
    // Navigate back to dashboard
    await page.click('[data-testid="nav-dashboard"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('should highlight active navigation item', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Dashboard should be active initially
    const dashboardNav = page.locator('[data-testid="nav-dashboard"]')
    await expect(dashboardNav).toHaveClass(/active|text-blue-600/)
    
    // Navigate to test page and check active state
    await page.click('[data-testid="nav-test"]')
    const testNav = page.locator('[data-testid="nav-test"]')
    await expect(testNav).toHaveClass(/active|text-blue-600/)
    
    // Dashboard should no longer be active
    await expect(dashboardNav).not.toHaveClass(/active|text-blue-600/)
  })

  test('should have proper touch targets for mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    const navItems = page.locator('[data-testid^="nav-"]')
    const count = await navItems.count()
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i)
      const box = await item.boundingBox()
      
      // Check minimum touch target size (44px)
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
    }
  })

  test('should support keyboard navigation', async ({ page }) => {
    // Focus first navigation item
    await page.keyboard.press('Tab')
    const firstNav = page.locator('[data-testid="nav-dashboard"]')
    await expect(firstNav).toBeFocused()
    
    // Navigate with arrow keys
    await page.keyboard.press('ArrowRight')
    const secondNav = page.locator('[data-testid="nav-test"]')
    await expect(secondNav).toBeFocused()
    
    // Activate with Enter
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL('/test')
  })

  test('should handle orientation changes', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Test portrait orientation
    await page.setViewportSize({ width: 375, height: 812 })
    const mobileNav = page.locator('[data-testid="mobile-navigation"]')
    await expect(mobileNav).toBeVisible()
    
    // Test landscape orientation
    await page.setViewportSize({ width: 812, height: 375 })
    await expect(mobileNav).toBeVisible()
    
    // Navigation should still work in landscape
    await page.click('[data-testid="nav-test"]')
    await expect(page).toHaveURL('/test')
  })

  test('should show navigation labels on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    // Check if navigation labels are visible
    await expect(page.locator('text=대시보드')).toBeVisible()
    await expect(page.locator('text=테스트')).toBeVisible()
    await expect(page.locator('text=결과')).toBeVisible()
    await expect(page.locator('text=프로필')).toBeVisible()
  })

  test('should have proper ARIA labels for accessibility', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices')
    
    const navigation = page.locator('[data-testid="mobile-navigation"]')
    await expect(navigation).toHaveAttribute('role', 'navigation')
    await expect(navigation).toHaveAttribute('aria-label', '메인 네비게이션')
    
    // Check individual nav items have proper labels
    const navItems = page.locator('[data-testid^="nav-"]')
    const count = await navItems.count()
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i)
      await expect(item).toHaveAttribute('aria-label')
    }
  })
})