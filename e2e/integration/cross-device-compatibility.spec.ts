import { test, expect, devices } from '@playwright/test';

test.describe('Cross-Device Compatibility Tests', () => {
  const testDevices = [
    { name: 'iPhone SE', config: devices['iPhone SE'] },
    { name: 'iPhone 12', config: devices['iPhone 12'] },
    { name: 'iPhone 12 Pro', config: devices['iPhone 12 Pro'] },
    { name: 'iPhone 13', config: devices['iPhone 13'] },
    { name: 'iPhone 14', config: devices['iPhone 14'] },
    { name: 'Samsung Galaxy S8', config: devices['Galaxy S8'] },
    { name: 'Samsung Galaxy S9+', config: devices['Galaxy S9+'] },
    { name: 'Samsung Galaxy Note 10', config: devices['Galaxy Note 10'] },
    { name: 'Samsung Galaxy S21', config: devices['Galaxy S21'] },
    { name: 'iPad Mini', config: devices['iPad Mini'] },
    { name: 'iPad Pro', config: devices['iPad Pro'] },
    { name: 'Desktop Chrome', config: devices['Desktop Chrome'] },
    { name: 'Desktop Firefox', config: devices['Desktop Firefox'] },
    { name: 'Desktop Safari', config: devices['Desktop Safari'] }
  ];

  testDevices.forEach(({ name, config }) => {
    test.describe(`${name} Compatibility`, () => {
      test.use({ ...config });

      test('responsive layout adaptation', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Get viewport dimensions
        const viewport = page.viewportSize();
        const isMobile = viewport && viewport.width < 768;
        const isTablet = viewport && viewport.width >= 768 && viewport.width < 1024;
        const isDesktop = viewport && viewport.width >= 1024;
        
        // Test navigation layout
        const navigation = page.locator('[data-testid="mobile-navigation"]');
        
        if (isMobile) {
          // Mobile should have bottom navigation
          await expect(navigation).toHaveClass(/bottom-navigation/);
          await expect(navigation).toBeVisible();
        } else if (isTablet) {
          // Tablet might have side navigation or adapted bottom nav
          await expect(navigation).toBeVisible();
        } else if (isDesktop) {
          // Desktop might have different navigation
          const desktopNav = page.locator('[data-testid="desktop-navigation"]');
          if (await desktopNav.isVisible()) {
            await expect(desktopNav).toBeVisible();
          } else {
            await expect(navigation).toBeVisible();
          }
        }
        
        // Test content layout
        const mainContent = page.locator('[data-testid="main-content"]');
        await expect(mainContent).toBeVisible();
        
        // Test grid layouts
        const testGrid = page.locator('[data-testid="test-grid"]');
        if (await testGrid.isVisible()) {
          const gridItems = testGrid.locator('[data-testid="test-card"]');
          const itemCount = await gridItems.count();
          
          if (isMobile && itemCount > 0) {
            // Mobile should show single column
            const firstItem = gridItems.first();
            const secondItem = gridItems.nth(1);
            
            if (itemCount > 1) {
              const firstBox = await firstItem.boundingBox();
              const secondBox = await secondItem.boundingBox();
              
              if (firstBox && secondBox) {
                // Items should be stacked vertically on mobile
                expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 10);
              }
            }
          }
        }
      });

      test('touch interactions and gestures', async ({ page }) => {
        if (!config.isMobile) {
          test.skip('Skipping touch tests on non-mobile device');
        }
        
        await page.goto('/test');
        
        // Start a test
        await page.click('[data-testid="start-test-button"]');
        
        // Test swipe gestures
        const questionContainer = page.locator('[data-testid="question-container"]');
        await expect(questionContainer).toBeVisible();
        
        // Swipe left to go to next question
        await questionContainer.swipe({ direction: 'left' });
        
        // Verify question changed
        const questionNumber = page.locator('[data-testid="question-number"]');
        await expect(questionNumber).toContainText('2');
        
        // Swipe right to go back
        await questionContainer.swipe({ direction: 'right' });
        await expect(questionNumber).toContainText('1');
        
        // Test touch targets
        const answerButtons = page.locator('[data-testid^="answer-option"]');
        const buttonCount = await answerButtons.count();
        
        for (let i = 0; i < buttonCount; i++) {
          const button = answerButtons.nth(i);
          const box = await button.boundingBox();
          
          if (box) {
            // Touch targets should be at least 44px
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(box.width).toBeGreaterThanOrEqual(44);
          }
        }
      });

      test('orientation changes', async ({ page }) => {
        if (!config.isMobile) {
          test.skip('Skipping orientation tests on non-mobile device');
        }
        
        await page.goto('/dashboard');
        
        // Test portrait orientation
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
        
        // Rotate to landscape
        await page.setViewportSize({ width: 812, height: 375 }); // iPhone landscape
        
        // Wait for orientation change handling
        await page.waitForTimeout(500);
        
        // Content should still be visible and properly laid out
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
        
        // Navigation should adapt
        const navigation = page.locator('[data-testid="mobile-navigation"]');
        await expect(navigation).toBeVisible();
        
        // Rotate back to portrait
        await page.setViewportSize({ width: 375, height: 812 });
        await page.waitForTimeout(500);
        
        await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
      });

      test('font scaling and readability', async ({ page }) => {
        await page.goto('/dashboard');
        
        // Test different font sizes
        const fontSizes = ['small', 'medium', 'large'];
        
        for (const fontSize of fontSizes) {
          // Set font size preference
          await page.click('[data-testid="accessibility-settings"]');
          await page.click(`[data-testid="font-size-${fontSize}"]`);
          
          // Verify text is readable
          const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span');
          const elementCount = await textElements.count();
          
          if (elementCount > 0) {
            const firstElement = textElements.first();
            const computedStyle = await firstElement.evaluate((el) => {
              return window.getComputedStyle(el).fontSize;
            });
            
            const fontSizeValue = parseInt(computedStyle);
            
            switch (fontSize) {
              case 'small':
                expect(fontSizeValue).toBeGreaterThanOrEqual(12);
                break;
              case 'medium':
                expect(fontSizeValue).toBeGreaterThanOrEqual(14);
                break;
              case 'large':
                expect(fontSizeValue).toBeGreaterThanOrEqual(18);
                break;
            }
          }
        }
      });

      test('performance on device', async ({ page }) => {
        // Start performance monitoring
        const startTime = Date.now();
        
        await page.goto('/dashboard');
        
        const loadTime = Date.now() - startTime;
        
        // Load time should be reasonable for device type
        if (config.isMobile) {
          expect(loadTime).toBeLessThan(5000); // 5 seconds for mobile
        } else {
          expect(loadTime).toBeLessThan(3000); // 3 seconds for desktop
        }
        
        // Test navigation performance
        const navStartTime = Date.now();
        await page.click('[data-testid="nav-tests"]');
        await page.waitForLoadState('networkidle');
        const navTime = Date.now() - navStartTime;
        
        expect(navTime).toBeLessThan(2000); // 2 seconds for navigation
        
        // Test memory usage (basic check)
        const memoryInfo = await page.evaluate(() => {
          return (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null;
        });
        
        if (memoryInfo) {
          // Memory usage should be reasonable
          const memoryUsageMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
          expect(memoryUsageMB).toBeLessThan(100); // Less than 100MB
        }
      });

      test('browser compatibility features', async ({ page }) => {
        await page.goto('/');
        
        // Test service worker support
        const swSupported = await page.evaluate(() => {
          return 'serviceWorker' in navigator;
        });
        
        if (swSupported) {
          // Service worker should register
          const swRegistration = await page.evaluate(async () => {
            try {
              const registration = await navigator.serviceWorker.register('/sw.js');
              return !!registration;
            } catch (error) {
              return false;
            }
          });
          
          expect(swRegistration).toBe(true);
        }
        
        // Test local storage
        const localStorageSupported = await page.evaluate(() => {
          try {
            localStorage.setItem('test', 'value');
            const value = localStorage.getItem('test');
            localStorage.removeItem('test');
            return value === 'value';
          } catch (error) {
            return false;
          }
        });
        
        expect(localStorageSupported).toBe(true);
        
        // Test IndexedDB
        const indexedDBSupported = await page.evaluate(() => {
          return 'indexedDB' in window;
        });
        
        expect(indexedDBSupported).toBe(true);
        
        // Test CSS features
        const cssSupported = await page.evaluate(() => {
          const testElement = document.createElement('div');
          testElement.style.display = 'grid';
          return testElement.style.display === 'grid';
        });
        
        expect(cssSupported).toBe(true);
      });

      test('input method compatibility', async ({ page }) => {
        await page.goto('/login');
        
        // Test text input
        const emailInput = page.locator('[data-testid="login-email"]');
        await emailInput.fill('test@example.com');
        await expect(emailInput).toHaveValue('test@example.com');
        
        // Test password input
        const passwordInput = page.locator('[data-testid="login-password"]');
        await passwordInput.fill('password123');
        await expect(passwordInput).toHaveValue('password123');
        
        // Test form submission
        await page.click('[data-testid="login-submit"]');
        
        // Should handle form submission appropriately
        // (Either show error for invalid credentials or redirect on success)
        const errorMessage = page.locator('[data-testid="error-message"]');
        const dashboard = page.locator('[data-testid="dashboard"]');
        
        // One of these should be visible
        const errorVisible = await errorMessage.isVisible();
        const dashboardVisible = await dashboard.isVisible();
        
        expect(errorVisible || dashboardVisible).toBe(true);
      });
    });
  });

  test('cross-browser consistency', async ({ page, browserName }) => {
    await page.goto('/dashboard');
    
    // Test basic functionality across browsers
    await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    
    // Test navigation
    await page.click('[data-testid="nav-tests"]');
    await expect(page).toHaveURL('/test');
    
    // Test form interactions
    await page.goto('/profile');
    const editButton = page.locator('[data-testid="edit-profile"]');
    if (await editButton.isVisible()) {
      await editButton.click();
      
      const nameInput = page.locator('[data-testid="profile-name"]');
      await nameInput.fill('Cross Browser Test');
      await expect(nameInput).toHaveValue('Cross Browser Test');
    }
    
    console.log(`Cross-browser test completed on ${browserName}`);
  });
});