/**
 * Admin Authentication E2E Tests
 *
 * @feature auth
 * @priority P0
 * @app admin
 *
 * Tests admin authentication user journeys:
 * - Admin login with valid credentials
 * - Role-based access verification
 * - Non-admin access denial
 * - Admin logout
 */

import { test, expect } from '@playwright/test';

// Test data - credentials from README.md
const TEST_ADMIN = {
  email: 'admin@b2b.local',
  password: 'Admin123!',
};

const TEST_CUSTOMER = {
  email: 'customer@b2b.local',
  password: 'Admin123!',
};

test.describe('Admin Authentication', () => {
  test.describe('Admin Login Flow', () => {
    test('should display admin login page correctly', async ({ page }) => {
      await page.goto('/login');

      // Verify login form elements
      await expect(page.getByRole('heading', { name: /admin|sign in|login/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
    });

    test('should login successfully with admin credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in admin credentials
      await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
      await page.getByLabel(/password/i).fill(TEST_ADMIN.password);

      // Submit form
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should redirect to admin dashboard
      await expect(page).toHaveURL(/\/(dashboard|admin|orders)?$/);

      // Should show admin navigation
      await expect(
        page.getByRole('navigation').or(page.getByRole('link', { name: /orders/i }))
      ).toBeVisible();
    });

    test('should deny access to non-admin users', async ({ page }) => {
      await page.goto('/login');

      // Try login with customer credentials
      await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
      await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should show access denied or stay on login
      await expect(
        page.getByText(/access denied|not authorized|admin only/i)
          .or(page.locator('[data-testid="error-message"]'))
      ).toBeVisible({ timeout: 5000 }).catch(() => {
        // Or should remain on login page
        expect(page.url()).toContain('login');
      });
    });
  });

  test.describe('Admin Role Verification', () => {
    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
      await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL(/\/(dashboard|admin|orders)?$/);
    });

    test('should show admin-only navigation items', async ({ page }) => {
      // Admin should see management links
      await expect(
        page.getByRole('link', { name: /orders/i })
          .or(page.getByRole('link', { name: /users/i }))
          .or(page.getByRole('link', { name: /products/i }))
      ).toBeVisible();
    });

    test('should access order management', async ({ page }) => {
      await page.goto('/orders');

      // Should load order management page
      await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();
    });

    test('should access user management', async ({ page }) => {
      await page.goto('/users');

      // Should load user management page
      await expect(
        page.getByRole('heading', { name: /users/i })
          .or(page.getByText(/user management/i))
      ).toBeVisible();
    });
  });

  test.describe('Admin Logout', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
      await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL(/\/(dashboard|admin|orders)?$/);
    });

    test('should logout admin successfully', async ({ page }) => {
      // Find and click logout
      const accountBtn = page.getByRole('button', { name: /account|admin|profile/i });
      if (await accountBtn.isVisible()) {
        await accountBtn.click();
      }

      await page.getByRole('button', { name: /logout|sign out/i }).click();

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });
  });
});
