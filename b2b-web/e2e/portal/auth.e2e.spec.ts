/**
 * Portal Authentication E2E Tests
 *
 * @feature auth
 * @priority P0
 * @app portal
 *
 * Tests critical authentication user journeys:
 * - Customer login with valid credentials
 * - Invalid credentials handling
 * - Logout functionality
 * - Session persistence
 */

import { test, expect } from '@playwright/test';

// Test data - credentials from README.md
const TEST_CUSTOMER = {
  email: 'customer@b2b.local',
  password: 'Admin123!',
};

const INVALID_CREDENTIALS = {
  email: 'nonexistent@b2b.local',
  password: 'WrongPassword123!',
};

test.describe('Portal Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login page correctly', async ({ page }) => {
      await page.goto('/login');

      // Verify login form elements are present
      await expect(page.getByRole('heading', { name: /sign in|login/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in credentials
      await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
      await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);

      // Submit form
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should redirect to dashboard or catalog
      await expect(page).toHaveURL(/\/(dashboard|catalog|home)?$/);

      // Should show user is logged in
      await expect(
        page.getByRole('button', { name: /account|profile|logout/i }).or(
          page.getByText(TEST_CUSTOMER.email)
        )
      ).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill in invalid credentials
      await page.getByLabel(/email/i).fill(INVALID_CREDENTIALS.email);
      await page.getByLabel(/password/i).fill(INVALID_CREDENTIALS.password);

      // Submit form
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should show error message
      await expect(
        page.getByText(/invalid|incorrect|failed|error/i)
      ).toBeVisible();

      // Should remain on login page
      await expect(page).toHaveURL(/login/);
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/login');

      // Try to submit without filling fields
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should show validation errors
      await expect(
        page.getByText(/required|enter|provide/i)
      ).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
      await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL(/\/(dashboard|catalog|home)?$/);
    });

    test('should logout successfully', async ({ page }) => {
      // Find and click logout
      const accountButton = page.getByRole('button', { name: /account|profile|user/i });
      if (await accountButton.isVisible()) {
        await accountButton.click();
      }

      await page.getByRole('button', { name: /logout|sign out/i }).click();

      // Should redirect to login page
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route', async ({ page }) => {
      // Try to access protected route without auth
      await page.goto('/orders');

      // Should redirect to login
      await expect(page).toHaveURL(/login/);
    });

    test('should redirect back after login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/cart');

      // Should redirect to login with return URL
      await expect(page).toHaveURL(/login/);

      // Login
      await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
      await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should redirect back to cart (or dashboard)
      await expect(page).toHaveURL(/\/(cart|dashboard|home)?$/);
    });
  });
});
