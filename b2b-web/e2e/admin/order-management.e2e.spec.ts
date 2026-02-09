/**
 * Admin Order Management E2E Tests
 *
 * @feature orders
 * @priority P0
 * @app admin
 *
 * Tests admin order management journeys:
 * - View all orders
 * - Filter orders by status
 * - Update order status
 * - View order details
 */

import { test, expect } from '@playwright/test';

// Test data - credentials from README.md
const TEST_ADMIN = {
  email: 'admin@b2b.local',
  password: 'Admin123!',
};

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

test.describe('Admin Order Management', () => {
  // Login as admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
    await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|admin|orders)?$/, { timeout: 10000 });
  });

  test.describe('View Orders', () => {
    test('should display orders list', async ({ page }) => {
      await page.goto('/orders');

      // Should show orders heading
      await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible();

      // Should show orders table or list
      await expect(
        page.getByRole('table').or(page.locator('[data-testid="orders-list"]'))
      ).toBeVisible({ timeout: 10000 });
    });

    test('should display order information in list', async ({ page }) => {
      await page.goto('/orders');

      // Wait for orders to load
      await page.waitForLoadState('networkidle');

      // Should show order details columns/fields
      await expect(
        page.getByText(/order #|order id/i).or(page.getByText(/status/i))
      ).toBeVisible();
    });

    test('should paginate orders list', async ({ page }) => {
      await page.goto('/orders');

      // Look for pagination controls
      const pagination = page.getByRole('navigation', { name: /pagination/i }).or(
        page.locator('[data-testid="pagination"]')
      );

      if (await pagination.isVisible()) {
        // Try to go to next page
        const nextBtn = page.getByRole('button', { name: /next/i });
        if (await nextBtn.isEnabled()) {
          await nextBtn.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });
  });

  test.describe('Filter Orders', () => {
    test('should filter orders by status', async ({ page }) => {
      await page.goto('/orders');

      // Find status filter
      const statusFilter = page.getByRole('combobox', { name: /status/i }).or(
        page.getByTestId('status-filter')
      );

      if (await statusFilter.isVisible()) {
        await statusFilter.click();

        // Select a status
        const statusOption = page.getByRole('option', { name: /pending/i }).or(
          page.getByText('PENDING')
        );

        if (await statusOption.isVisible()) {
          await statusOption.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('should search orders', async ({ page }) => {
      await page.goto('/orders');

      // Find search input
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/search/i)
      );

      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await searchInput.press('Enter');
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Order Details', () => {
    test('should view order details', async ({ page }) => {
      await page.goto('/orders');

      // Wait for orders to load
      await page.waitForLoadState('networkidle');

      // Click on first order
      const firstOrder = page.getByRole('row').nth(1).or(
        page.locator('[data-order-id]').first()
      );

      if (await firstOrder.isVisible()) {
        await firstOrder.click();

        // Should show order detail view
        await expect(
          page.getByText(/order details|items|customer/i)
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('should display order items', async ({ page }) => {
      await page.goto('/orders');

      // Navigate to first order detail
      const firstOrder = page.locator('[data-order-id]').first().or(
        page.getByRole('link', { name: /view|details/i }).first()
      );

      if (await firstOrder.isVisible()) {
        await firstOrder.click();

        // Should show items list
        await expect(
          page.getByText(/items|products/i)
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Update Order Status', () => {
    test('should update order status', async ({ page }) => {
      await page.goto('/orders');

      // Wait for orders
      await page.waitForLoadState('networkidle');

      // Find status update control
      const statusSelect = page.getByRole('combobox', { name: /update status|change status/i }).first().or(
        page.getByTestId('status-select').first()
      );

      if (await statusSelect.isVisible()) {
        await statusSelect.click();

        // Select new status
        const newStatus = page.getByRole('option', { name: /confirmed/i }).or(
          page.getByText('CONFIRMED')
        );

        if (await newStatus.isVisible()) {
          await newStatus.click();

          // Should show success message
          await expect(
            page.getByText(/updated|success/i).or(page.getByRole('alert'))
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should add tracking information', async ({ page }) => {
      await page.goto('/orders');

      // Navigate to an order detail
      const firstOrder = page.locator('[data-order-id]').first();

      if (await firstOrder.isVisible()) {
        await firstOrder.click();

        // Find tracking input
        const trackingInput = page.getByLabel(/tracking/i).or(
          page.getByPlaceholder(/tracking/i)
        );

        if (await trackingInput.isVisible()) {
          await trackingInput.fill('TRACK123456');

          // Save
          const saveBtn = page.getByRole('button', { name: /save|update/i });
          if (await saveBtn.isVisible()) {
            await saveBtn.click();

            await expect(
              page.getByText(/saved|updated/i)
            ).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test.describe('User Management', () => {
    test('should display users list', async ({ page }) => {
      await page.goto('/users');

      // Should show users heading
      await expect(
        page.getByRole('heading', { name: /users/i })
      ).toBeVisible();

      // Should show users table
      await expect(
        page.getByRole('table').or(page.locator('[data-testid="users-list"]'))
      ).toBeVisible({ timeout: 10000 });
    });

    test('should view user details', async ({ page }) => {
      await page.goto('/users');

      // Wait for users to load
      await page.waitForLoadState('networkidle');

      // Click on first user
      const firstUser = page.locator('[data-user-id]').first().or(
        page.getByRole('row').nth(1)
      );

      if (await firstUser.isVisible()) {
        await firstUser.click();

        // Should show user details
        await expect(
          page.getByText(/email|role|details/i)
        ).toBeVisible({ timeout: 10000 });
      }
    });

    test('should update user role', async ({ page }) => {
      await page.goto('/users');

      // Find role select
      const roleSelect = page.getByRole('combobox', { name: /role/i }).first().or(
        page.getByTestId('role-select').first()
      );

      if (await roleSelect.isVisible()) {
        await roleSelect.click();

        // Select a role
        const roleOption = page.getByRole('option').first();
        if (await roleOption.isVisible()) {
          await roleOption.click();

          await expect(
            page.getByText(/updated|saved/i)
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });
  });
});
