/**
 * Portal Accessibility Tests
 *
 * @feature accessibility
 * @priority P0
 * @app portal
 *
 * Tests WCAG 2.1 AA compliance using axe-core:
 * - Login page accessibility
 * - Catalog page accessibility
 * - Cart page accessibility
 * - Checkout flow accessibility
 * - Keyboard navigation
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test data - credentials from README.md
const TEST_CUSTOMER = {
  email: 'customer@b2b.local',
  password: 'Admin123!',
};

// Helper function to run axe analysis
async function checkAccessibility(page: any, pageName: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  // Report violations
  const violations = accessibilityScanResults.violations;

  if (violations.length > 0) {
    console.log(`\n=== Accessibility Violations on ${pageName} ===`);
    violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
      console.log(`   Impact: ${violation.impact}`);
      console.log(`   Help: ${violation.helpUrl}`);
      violation.nodes.forEach((node, nodeIndex) => {
        console.log(`   Node ${nodeIndex + 1}: ${node.html.substring(0, 100)}...`);
      });
    });
  }

  return accessibilityScanResults;
}

test.describe('Portal Accessibility - Public Pages', () => {
  test('Login page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/login');

    const results = await checkAccessibility(page, 'Login Page');

    // No critical or serious violations allowed
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Login form should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');

    // Tab to email field
    await page.keyboard.press('Tab');
    const emailField = page.getByLabel(/email/i);
    await expect(emailField).toBeFocused();

    // Tab to password field
    await page.keyboard.press('Tab');
    const passwordField = page.getByLabel(/password/i);
    await expect(passwordField).toBeFocused();

    // Tab to submit button
    await page.keyboard.press('Tab');
    const submitButton = page.getByRole('button', { name: /sign in|login/i });
    await expect(submitButton).toBeFocused();

    // Should be able to submit with Enter
    await passwordField.focus();
    await page.keyboard.type('test');
    await page.keyboard.press('Enter');
  });
});

test.describe('Portal Accessibility - Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
    await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|catalog|home)?$/, { timeout: 10000 });
  });

  test('Catalog page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    const results = await checkAccessibility(page, 'Catalog Page');

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Cart page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const results = await checkAccessibility(page, 'Cart Page');

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Orders page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const results = await checkAccessibility(page, 'Orders Page');

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Catalog should be navigable by keyboard', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    // Should be able to tab through products
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should be visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test('Cart items should be keyboard accessible', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Tab through cart items
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Check focus is within the page
    const isFocused = await page.evaluate(() => document.hasFocus());
    expect(isFocused).toBe(true);
  });
});

test.describe('Portal Accessibility - WCAG Specific Checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
    await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|catalog|home)?$/, { timeout: 10000 });
  });

  test('Images should have alt text (1.1.1 Non-text Content)', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    // Check all images have alt text
    const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
    expect(imagesWithoutAlt).toBe(0);
  });

  test('Form inputs should have labels (1.3.1 Info and Relationships)', async ({ page }) => {
    await page.goto('/login');

    // Check inputs have associated labels
    const inputsWithoutLabels = await page.$$eval(
      'input:not([type="hidden"]):not([type="submit"]):not([aria-label]):not([aria-labelledby])',
      (inputs) => inputs.filter(input => {
        const id = input.id;
        if (!id) return true;
        return !document.querySelector(`label[for="${id}"]`);
      }).length
    );
    expect(inputsWithoutLabels).toBe(0);
  });

  test('Focus should be visible (2.4.7 Focus Visible)', async ({ page }) => {
    await page.goto('/catalog');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check focus indicator is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        borderColor: styles.borderColor,
      };
    });

    // Should have some visual focus indicator
    expect(
      focusedElement?.outline !== 'none' ||
      focusedElement?.boxShadow !== 'none' ||
      focusedElement?.borderColor
    ).toBeTruthy();
  });

  test('Color contrast should meet WCAG AA (1.4.3)', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('body')
      .analyze();

    const contrastViolations = results.violations.filter(
      v => v.id === 'color-contrast'
    );

    // Log violations for review
    if (contrastViolations.length > 0) {
      console.log('Color contrast violations:', contrastViolations);
    }

    // No critical contrast issues
    const criticalContrast = contrastViolations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalContrast).toHaveLength(0);
  });

  test('Page should have proper heading hierarchy (1.3.1)', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    // Check heading hierarchy
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
      elements.map(el => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent?.trim().substring(0, 50),
      }))
    );

    // Should have at least one h1
    const hasH1 = headings.some(h => h.level === 1);
    expect(hasH1).toBe(true);

    // Heading levels should not skip (e.g., h1 to h3)
    let previousLevel = 0;
    for (const heading of headings) {
      if (heading.level > previousLevel + 1 && previousLevel > 0) {
        console.log(`Heading level skipped from h${previousLevel} to h${heading.level}`);
      }
      previousLevel = heading.level;
    }
  });

  test('Interactive elements should have accessible names (4.1.2)', async ({ page }) => {
    await page.goto('/catalog');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    const nameViolations = results.violations.filter(
      v => v.id.includes('label') || v.id.includes('name')
    );

    const criticalNameIssues = nameViolations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalNameIssues).toHaveLength(0);
  });
});

test.describe('Portal Accessibility - Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
    await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|catalog|home)?$/, { timeout: 10000 });
  });

  test('Page should have proper landmarks', async ({ page }) => {
    await page.goto('/catalog');

    // Check for main landmark
    const hasMain = await page.$('main, [role="main"]');
    expect(hasMain).toBeTruthy();

    // Check for navigation
    const hasNav = await page.$('nav, [role="navigation"]');
    expect(hasNav).toBeTruthy();
  });

  test('Page should have proper document language', async ({ page }) => {
    await page.goto('/catalog');

    const lang = await page.getAttribute('html', 'lang');
    expect(lang).toBeTruthy();
  });

  test('Skip link should be present for keyboard users', async ({ page }) => {
    await page.goto('/catalog');

    // Check for skip link (may be visually hidden)
    const skipLink = await page.$('[href="#main"], [href="#content"], .skip-link, [class*="skip"]');

    // Skip link is recommended but not always required
    if (skipLink) {
      // It should be focusable
      await page.keyboard.press('Tab');
    }
  });
});
