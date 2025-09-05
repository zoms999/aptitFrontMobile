import { test as setup, expect } from '@playwright/test'

const authFile = 'playwright/.auth/user.json'

setup('authenticate', async ({ page }) => {
  // Perform authentication steps
  await page.goto('/login')
  
  // Fill login form
  await page.fill('[data-testid="email-input"]', 'test@example.com')
  await page.fill('[data-testid="password-input"]', 'password')
  
  // Click login button
  await page.click('[data-testid="login-button"]')
  
  // Wait for successful login
  await expect(page).toHaveURL('/dashboard')
  
  // Ensure we're logged in by checking for user-specific content
  await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  
  // Save authentication state
  await page.context().storageState({ path: authFile })
})