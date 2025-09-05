import { test, expect, devices } from '@playwright/test';

test.describe('Complete User Flow Integration Tests', () => {
  // Test on multiple devices
  const deviceConfigs = [
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
    { name: 'iPad', device: devices['iPad Pro'] }
  ];

  deviceConfigs.forEach(({ name, device }) => {
    test.describe(`${name} - Complete Flow`, () => {
      test.use({ ...device });

      test('complete user journey from signup to test completion', async ({ page }) => {
        // 1. Navigate to app and verify PWA features
        await page.goto('/');
        
        // Check PWA manifest is loaded
        const manifestLink = page.locator('link[rel="manifest"]');
        await expect(manifestLink).toBeAttached();
        
        // Check service worker registration
        const swRegistration = await page.evaluate(() => {
          return 'serviceWorker' in navigator;
        });
        expect(swRegistration).toBe(true);

        // 2. Test signup flow
        await page.click('[data-testid="signup-link"]');
        await expect(page).toHaveURL('/signup');
        
        // Fill signup form
        await page.fill('[data-testid="signup-name"]', 'Test User');
        await page.fill('[data-testid="signup-email"]', 'test@example.com');
        await page.fill('[data-testid="signup-password"]', 'TestPassword123!');
        await page.fill('[data-testid="signup-confirm-password"]', 'TestPassword123!');
        
        // Submit signup
        await page.click('[data-testid="signup-submit"]');
        
        // Should redirect to dashboard after successful signup
        await expect(page).toHaveURL('/dashboard');
        
        // 3. Test dashboard functionality
        await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="available-tests"]')).toBeVisible();
        
        // 4. Test navigation
        const navigation = page.locator('[data-testid="mobile-navigation"]');
        await expect(navigation).toBeVisible();
        
        // Test navigation to different sections
        await page.click('[data-testid="nav-tests"]');
        await expect(page).toHaveURL('/test');
        
        await page.click('[data-testid="nav-results"]');
        await expect(page).toHaveURL('/results');
        
        await page.click('[data-testid="nav-profile"]');
        await expect(page).toHaveURL('/profile');
        
        // Return to dashboard
        await page.click('[data-testid="nav-dashboard"]');
        await expect(page).toHaveURL('/dashboard');

        // 5. Start a test
        await page.click('[data-testid="start-test-button"]');
        
        // Should be on test page
        await expect(page.locator('[data-testid="test-interface"]')).toBeVisible();
        await expect(page.locator('[data-testid="question-display"]')).toBeVisible();
        await expect(page.locator('[data-testid="test-progress"]')).toBeVisible();
        
        // Answer first question
        await page.click('[data-testid="answer-option-0"]');
        await page.click('[data-testid="next-question"]');
        
        // Verify progress updated
        const progressBar = page.locator('[data-testid="progress-bar"]');
        const progressValue = await progressBar.getAttribute('aria-valuenow');
        expect(parseInt(progressValue || '0')).toBeGreaterThan(0);
        
        // Test swipe gesture (if supported)
        if (device.isMobile) {
          const questionContainer = page.locator('[data-testid="question-container"]');
          await questionContainer.swipe({ direction: 'left' });
          // Should advance to next question
        }
        
        // Complete a few more questions
        for (let i = 0; i < 3; i++) {
          await page.click('[data-testid="answer-option-0"]');
          await page.click('[data-testid="next-question"]');
        }
        
        // Submit test
        await page.click('[data-testid="submit-test"]');
        
        // 6. View results
        await expect(page.locator('[data-testid="results-summary"]')).toBeVisible();
        await expect(page.locator('[data-testid="results-chart"]')).toBeVisible();
        
        // Test results sharing
        await page.click('[data-testid="share-results"]');
        await expect(page.locator('[data-testid="share-modal"]')).toBeVisible();
        
        // 7. Test profile management
        await page.click('[data-testid="nav-profile"]');
        
        // Update profile
        await page.click('[data-testid="edit-profile"]');
        await page.fill('[data-testid="profile-name"]', 'Updated Test User');
        await page.click('[data-testid="save-profile"]');
        
        // Verify update
        await expect(page.locator('[data-testid="profile-name-display"]')).toContainText('Updated Test User');
        
        // 8. Test settings
        await page.click('[data-testid="settings-button"]');
        await expect(page.locator('[data-testid="settings-modal"]')).toBeVisible();
        
        // Change theme
        await page.click('[data-testid="theme-dark"]');
        
        // Verify dark theme applied
        const body = page.locator('body');
        await expect(body).toHaveClass(/dark/);
        
        // 9. Test logout
        await page.click('[data-testid="logout-button"]');
        await expect(page).toHaveURL('/login');
        
        // 10. Test login
        await page.fill('[data-testid="login-email"]', 'test@example.com');
        await page.fill('[data-testid="login-password"]', 'TestPassword123!');
        await page.click('[data-testid="login-submit"]');
        
        // Should return to dashboard
        await expect(page).toHaveURL('/dashboard');
      });

      test('offline functionality', async ({ page }) => {
        // Navigate to app
        await page.goto('/dashboard');
        
        // Go offline
        await page.context().setOffline(true);
        
        // Verify offline indicator appears
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
        
        // Try to navigate - should still work with cached content
        await page.click('[data-testid="nav-profile"]');
        await expect(page.locator('[data-testid="profile-page"]')).toBeVisible();
        
        // Try to submit data - should queue for later
        await page.click('[data-testid="edit-profile"]');
        await page.fill('[data-testid="profile-name"]', 'Offline Update');
        await page.click('[data-testid="save-profile"]');
        
        // Should show offline message
        await expect(page.locator('[data-testid="offline-queue-message"]')).toBeVisible();
        
        // Go back online
        await page.context().setOffline(false);
        
        // Verify data syncs
        await page.waitForTimeout(2000); // Wait for sync
        await expect(page.locator('[data-testid="sync-success-message"]')).toBeVisible();
      });

      test('accessibility features', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Test keyboard navigation
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        await expect(focusedElement).toBeVisible();
        
        // Test skip links
        await page.keyboard.press('Tab');
        const skipLink = page.locator('[data-testid="skip-to-main"]');
        if (await skipLink.isVisible()) {
          await skipLink.click();
          const mainContent = page.locator('main');
          await expect(mainContent).toBeFocused();
        }
        
        // Test ARIA labels
        const navigation = page.locator('[data-testid="mobile-navigation"]');
        await expect(navigation).toHaveAttribute('role', 'navigation');
        
        // Test high contrast mode
        await page.click('[data-testid="accessibility-settings"]');
        await page.click('[data-testid="high-contrast-toggle"]');
        
        const body = page.locator('body');
        await expect(body).toHaveClass(/high-contrast/);
      });

      test('performance metrics', async ({ page }) => {
        // Start performance monitoring
        await page.goto('/dashboard');
        
        // Check Core Web Vitals
        const performanceMetrics = await page.evaluate(() => {
          return new Promise((resolve) => {
            new PerformanceObserver((list) => {
              const entries = list.getEntries();
              const metrics = {};
              
              entries.forEach((entry) => {
                if (entry.entryType === 'navigation') {
                  metrics.loadTime = entry.loadEventEnd - entry.loadEventStart;
                }
                if (entry.entryType === 'paint') {
                  metrics[entry.name] = entry.startTime;
                }
              });
              
              resolve(metrics);
            }).observe({ entryTypes: ['navigation', 'paint'] });
            
            // Fallback timeout
            setTimeout(() => resolve({}), 5000);
          });
        });
        
        console.log('Performance metrics:', performanceMetrics);
        
        // Verify reasonable load times
        if (performanceMetrics.loadTime) {
          expect(performanceMetrics.loadTime).toBeLessThan(3000); // 3 seconds
        }
      });
    });
  });

  test('PWA installation flow', async ({ page, context }) => {
    await page.goto('/');
    
    // Simulate PWA installation prompt
    await page.evaluate(() => {
      window.dispatchEvent(new Event('beforeinstallprompt'));
    });
    
    // Check if install prompt appears
    const installPrompt = page.locator('[data-testid="pwa-install-prompt"]');
    if (await installPrompt.isVisible()) {
      await installPrompt.click();
      
      // Verify installation success message
      await expect(page.locator('[data-testid="pwa-install-success"]')).toBeVisible();
    }
  });

  test('error handling and recovery', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Simulate network error
    await page.route('**/api/**', route => {
      route.abort('failed');
    });
    
    // Try to perform an action that requires API
    await page.click('[data-testid="nav-tests"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // Should show retry option
    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    
    // Remove network error simulation
    await page.unroute('**/api/**');
    
    // Retry should work
    await retryButton.click();
    await expect(page.locator('[data-testid="tests-list"]')).toBeVisible();
  });
});