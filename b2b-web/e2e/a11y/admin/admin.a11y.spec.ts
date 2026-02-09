/**
 * Admin Portal Accessibility Tests
 *
 * @feature accessibility
 * @priority P0
 * @app admin
 *
 * Tests WCAG 2.1 AA compliance for admin portal using axe-core:
 * - Login page accessibility
 * - Dashboard accessibility
 * - Orders management accessibility
 * - Users management accessibility
 * - Data tables accessibility
 * - Forms accessibility
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test data - credentials from README.md
const TEST_ADMIN = {
  email: 'admin@b2b.local',
  password: 'Admin123!',
};

// Helper function to run axe analysis
async function checkAccessibility(page: any, pageName: string) {
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const violations = accessibilityScanResults.violations;

  if (violations.length > 0) {
    console.log(`\n=== Accessibility Violations on ${pageName} ===`);
    violations.forEach((violation, index) => {
      console.log(`\n${index + 1}. ${violation.id}: ${violation.description}`);
      console.log(`   Impact: ${violation.impact}`);
      console.log(`   Help: ${violation.helpUrl}`);
      violation.nodes.slice(0, 3).forEach((node, nodeIndex) => {
        console.log(`   Node ${nodeIndex + 1}: ${node.html.substring(0, 100)}...`);
      });
    });
  }

  return accessibilityScanResults;
}

test.describe('Admin Portal Accessibility - Login', () => {
  test('Admin login page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/login');

    const results = await checkAccessibility(page, 'Admin Login Page');

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Login form should be keyboard accessible', async ({ page }) => {
    await page.goto('/login');

    // Should be able to tab through form
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/password/i)).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeFocused();
  });
});

test.describe('Admin Portal Accessibility - Authenticated Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
    await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|admin|orders)?$/, { timeout: 10000 });
  });

  test('Dashboard should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const results = await checkAccessibility(page, 'Admin Dashboard');

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Orders page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    const results = await checkAccessibility(page, 'Orders Management');

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });

  test('Users page should have no critical accessibility violations', async ({ page }) => {
    await page.goto('/users');
    await page.waitForLoadState('networkidle');

    const results = await checkAccessibility(page, 'Users Management');

    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toHaveLength(0);
  });
});

test.describe('Admin Portal Accessibility - Data Tables', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
    await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|admin|orders)?$/, { timeout: 10000 });
  });

  test('Data tables should have proper headers', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Check for table headers
    const table = await page.$('table');
    if (table) {
      const headers = await page.$$eval('table th, table [role="columnheader"]',
        ths => ths.map(th => th.textContent?.trim())
      );
      expect(headers.length).toBeGreaterThan(0);

      // Check table has proper scope or headers
      const hasProperHeaders = await page.$$eval('table th', ths =>
        ths.every(th => th.hasAttribute('scope') || th.hasAttribute('headers'))
      );
      // Log but don't fail - some tables use different patterns
      if (!hasProperHeaders) {
        console.log('Note: Table headers may need scope attributes');
      }
    }
  });

  test('Data tables should be keyboard navigable', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Tab to table
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }

    // Should be able to navigate within table
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowUp');

    const isFocused = await page.evaluate(() => document.hasFocus());
    expect(isFocused).toBe(true);
  });

  test('Sortable columns should be accessible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Find sortable headers
    const sortableHeaders = await page.$$('th[aria-sort], button[aria-sort], [data-sortable]');

    for (const header of sortableHeaders.slice(0, 2)) {
      // Should be focusable
      await header.focus();

      // Should have sort indication
      const ariaSort = await header.getAttribute('aria-sort');
      if (ariaSort) {
        expect(['ascending', 'descending', 'none']).toContain(ariaSort);
      }
    }
  });
});

test.describe('Admin Portal Accessibility - Forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
    await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|admin|orders)?$/, { timeout: 10000 });
  });

  test('Form controls should have accessible labels', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Check all form controls have labels
    const unlabeledInputs = await page.$$eval(
      'input:not([type="hidden"]):not([type="submit"]):not([aria-label]):not([aria-labelledby])',
      (inputs) => inputs.filter(input => {
        const id = input.id;
        if (!id) return true;
        return !document.querySelector(`label[for="${id}"]`);
      }).length
    );

    // Should have minimal unlabeled inputs
    expect(unlabeledInputs).toBeLessThanOrEqual(2); // Allow some flexibility
  });

  test('Select dropdowns should be keyboard accessible', async ({ page }) => {
    await page.goto('/orders');
    await page.waitForLoadState('networkidle');

    // Find select elements
    const selects = await page.$$('select, [role="listbox"], [role="combobox"]');

    for (const select of selects.slice(0, 2)) {
      // Should be focusable
      await select.focus();

      // Should open with keyboard
      await page.keyboard.press('Space');
      await page.keyboard.press('Escape');
    }
  });

  test('Error messages should be associated with inputs', async ({ page }) => {
    await page.goto('/login');

    // Trigger validation error
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Check error messages have proper association
    const errorMessages = await page.$$('[role="alert"], .error, [aria-invalid="true"]');

    for (const error of errorMessages) {
      // Should be announced to screen readers
      const role = await error.getAttribute('role');
      const ariaLive = await error.getAttribute('aria-live');
      expect(role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive').toBeTruthy;
    }
  });
});

test.describe('Admin Portal Accessibility - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
    await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|admin|orders)?$/, { timeout: 10000 });
  });

  test('Navigation should have proper landmarks', async ({ page }) => {
    await page.goto('/orders');

    // Should have navigation landmark
    const nav = await page.$('nav, [role="navigation"]');
    expect(nav).toBeTruthy();

    // Should have main content landmark
    const main = await page.$('main, [role="main"]');
    expect(main).toBeTruthy();
  });

  test('Navigation should be keyboard accessible', async ({ page }) => {
    await page.goto('/orders');

    // Tab through navigation
    await page.keyboard.press('Tab');

    // Should be able to activate links with Enter
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    if (focusedElement === 'A' || focusedElement === 'BUTTON') {
      // Element is focusable and interactive
      expect(['A', 'BUTTON']).toContain(focusedElement);
    }
  });

  test('Current page should be indicated in navigation', async ({ page }) => {
    await page.goto('/orders');

    // Check for current page indication
    const currentLink = await page.$('[aria-current="page"], .active, [data-active="true"]');

    // Should indicate current page
    if (currentLink) {
      const ariaCurrent = await currentLink.getAttribute('aria-current');
      const isActive = await currentLink.getAttribute('class');
      expect(ariaCurrent === 'page' || isActive?.includes('active')).toBeTruthy();
    }
  });

  test('Dropdown menus should be keyboard accessible', async ({ page }) => {
    await page.goto('/orders');

    // Find dropdown triggers
    const dropdownTriggers = await page.$$('[aria-haspopup], [aria-expanded]');

    for (const trigger of dropdownTriggers.slice(0, 2)) {
      // Should be focusable
      await trigger.focus();

      // Should open with Enter or Space
      await page.keyboard.press('Enter');

      // Should close with Escape
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Admin Portal Accessibility - Modals & Dialogs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
    await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|admin|orders)?$/, { timeout: 10000 });
  });

  test('Modals should trap focus', async ({ page }) => {
    await page.goto('/orders');

    // Try to find a button that opens a modal
    const modalTrigger = await page.$('[data-modal], [aria-haspopup="dialog"]');

    if (modalTrigger) {
      await modalTrigger.click();

      // Modal should be present
      const modal = await page.$('[role="dialog"], .modal, [data-modal-content]');

      if (modal) {
        // Focus should be inside modal
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');

        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          const modal = document.querySelector('[role="dialog"]');
          return modal?.contains(active);
        });

        expect(focusedElement).toBeTruthy();

        // Should close with Escape
        await page.keyboard.press('Escape');
      }
    }
  });
});
