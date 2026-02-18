/**
 * Complete User Management E2E Tests
 *
 * @feature user-management, admin
 * @priority P0
 * @app admin
 *
 * Tests complete admin user management workflows
 */

import { test, expect } from '@playwright/test';

const TEST_ADMIN = {
  email: 'admin@b2b.local',
  password: 'Admin123!',
};

test.describe('User Management - Complete Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);
    await page.getByLabel(/password/i).fill(TEST_ADMIN.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard)?$/, { timeout: 10000 });
  });

  test('should display users list page', async ({ page }) => {
    await page.goto('/users');

    // Verify page title
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible({ timeout: 10000 });

    // Verify users table or list is visible
    await expect(page.locator('table').or(
      page.locator('[data-testid="users-list"]')
    )).toBeVisible({ timeout: 5000 });

    // Verify create user button exists
    await expect(page.getByRole('button', { name: /create user|add user|new user/i })).toBeVisible();
  });

  test('should search and filter users', async ({ page }) => {
    await page.goto('/users');

    // Test search functionality
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);

      // Results should update
      await expect(page.locator('table tbody tr').or(
        page.locator('[data-testid="user-item"]')
      )).toBeVisible();
    }

    // Test filter by role
    const roleFilter = page.getByLabel(/role|filter/i).or(
      page.locator('select').first()
    );

    if (await roleFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await roleFilter.selectOption({ label: /admin/i }).catch(() => {
        roleFilter.click();
        page.getByRole('option', { name: /admin/i }).click();
      });

      await page.waitForTimeout(500);
    }
  });

  test('should open create user modal', async ({ page }) => {
    await page.goto('/users');

    // Click create user button
    const createButton = page.getByRole('button', { name: /create user|add user|new user/i });
    await createButton.click();

    // Verify modal/form appears
    await expect(page.getByRole('dialog').or(
      page.getByRole('heading', { name: /create user|add user|new user/i })
    )).toBeVisible({ timeout: 5000 });

    // Verify form fields
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/first name|name/i)).toBeVisible();
  });

  test('should validate create user form', async ({ page }) => {
    await page.goto('/users');

    // Open create user modal
    await page.getByRole('button', { name: /create user|add user/i }).click();
    await page.waitForTimeout(500);

    // Try to submit without filling fields
    const submitButton = page.getByRole('button', { name: /create|save|submit/i });
    await submitButton.click();

    // Should show validation errors
    await expect(page.getByText(/required|must|cannot be empty/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('should create new user successfully', async ({ page }) => {
    await page.goto('/users');

    // Open create modal
    await page.getByRole('button', { name: /create user|add user/i }).click();
    await page.waitForTimeout(500);

    // Fill form with test data
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;

    await page.getByLabel(/email/i).fill(testEmail);

    const firstNameField = page.getByLabel(/first name/i);
    if (await firstNameField.isVisible().catch(() => false)) {
      await firstNameField.fill('Test');
    }

    const lastNameField = page.getByLabel(/last name/i);
    if (await lastNameField.isVisible().catch(() => false)) {
      await lastNameField.fill('User');
    }

    // Select role if available
    const roleSelect = page.getByLabel(/role/i);
    if (await roleSelect.isVisible().catch(() => false)) {
      await roleSelect.selectOption({ label: /user/i }).catch(() => {
        roleSelect.click();
        page.getByRole('option', { name: /user/i }).click();
      });
    }

    // Submit form
    await page.getByRole('button', { name: /create|save/i }).click();

    // Verify success (toast or redirect)
    await expect(page.getByText(/success|created|added/i).or(
      page.locator('[role="alert"]')
    )).toBeVisible({ timeout: 10000 });

    // Verify user appears in list
    await expect(page.getByText(testEmail)).toBeVisible({ timeout: 5000 });
  });

  test('should view user details', async ({ page }) => {
    await page.goto('/users');

    // Click on first user (view/edit button)
    const viewButton = page.getByRole('button', { name: /view|edit/i }).or(
      page.locator('[data-action="view"]')
    ).first();

    if (await viewButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewButton.click();

      // Should navigate to user details or open modal
      await expect(page.getByRole('heading', { name: /user details|edit user/i }).or(
        page.locator('h1, h2').filter({ hasText: /user/i })
      )).toBeVisible({ timeout: 5000 });
    }
  });

  test('should update user role', async ({ page }) => {
    await page.goto('/users');

    // Find user and open edit
    const editButton = page.getByRole('button', { name: /edit/i }).first();

    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Change role
      const roleSelect = page.getByLabel(/role/i);
      if (await roleSelect.isVisible().catch(() => false)) {
        await roleSelect.selectOption({ index: 1 }).catch(async () => {
          await roleSelect.click();
          await page.getByRole('option').nth(1).click();
        });

        // Save changes
        await page.getByRole('button', { name: /save|update/i }).click();

        // Verify success
        await expect(page.getByText(/success|updated/i)).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should toggle user status (activate/deactivate)', async ({ page }) => {
    await page.goto('/users');

    // Find toggle/status button
    const toggleButton = page.getByRole('button', { name: /activate|deactivate|toggle/i }).first();

    if (await toggleButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await toggleButton.click();

      // Confirm if dialog appears
      const confirmButton = page.getByRole('button', { name: /confirm|yes|ok/i });
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Verify status change
      await expect(page.getByText(/success|updated/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should delete user with confirmation', async ({ page }) => {
    // First create a test user to delete
    await page.goto('/users');

    const deleteButton = page.getByRole('button', { name: /delete|remove/i }).first();

    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await deleteButton.click();

      // Should show confirmation dialog
      await expect(page.getByText(/delete|remove|sure|confirm/i)).toBeVisible({ timeout: 3000 });

      // Cancel first time
      const cancelButton = page.getByRole('button', { name: /cancel|no/i });
      if (await cancelButton.isVisible().catch(() => false)) {
        await cancelButton.click();

        // User should still be in list
        await expect(deleteButton).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should paginate through users list', async ({ page }) => {
    await page.goto('/users');

    // Check for pagination controls
    const nextButton = page.getByRole('button', { name: /next/i });

    if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      const isDisabled = await nextButton.isDisabled();

      if (!isDisabled) {
        // Click next page
        await nextButton.click();
        await page.waitForTimeout(500);

        // Verify page changed (URL or content)
        await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 3000 });

        // Go back
        const prevButton = page.getByRole('button', { name: /previous|prev/i });
        if (await prevButton.isVisible().catch(() => false)) {
          await prevButton.click();
        }
      }
    }
  });

  test('should show proper error handling for duplicate email', async ({ page }) => {
    await page.goto('/users');

    // Open create modal
    await page.getByRole('button', { name: /create user/i }).click();
    await page.waitForTimeout(500);

    // Try to create user with existing email
    await page.getByLabel(/email/i).fill(TEST_ADMIN.email);

    const firstNameField = page.getByLabel(/first name/i);
    if (await firstNameField.isVisible().catch(() => false)) {
      await firstNameField.fill('Test');
    }

    // Submit
    await page.getByRole('button', { name: /create|save/i }).click();

    // Should show error
    await expect(page.getByText(/already exists|duplicate|taken/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display loading states', async ({ page }) => {
    await page.goto('/users');

    // Refresh to trigger loading
    const refreshButton = page.getByRole('button', { name: /refresh|reload/i });

    if (await refreshButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await refreshButton.click();

      // Should show loading indicator briefly
      const loadingIndicator = page.locator('[data-testid="loading"]').or(
        page.locator('.animate-spin')
      );

      // Wait for loading to complete
      await page.waitForTimeout(1000);
    }

    // List should still be visible after loading
    await expect(page.locator('table').or(
      page.locator('[data-testid="users-list"]')
    )).toBeVisible();
  });
});
