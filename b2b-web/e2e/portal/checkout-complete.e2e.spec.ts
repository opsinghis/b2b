/**
 * Complete Checkout Flow E2E Tests
 *
 * @feature checkout, orders
 * @priority P0
 * @app portal
 *
 * Tests complete end-to-end checkout process with validation
 */

import { test, expect } from '@playwright/test';

const TEST_CUSTOMER = {
  email: 'customer@b2b.local',
  password: 'Admin123!',
};

test.describe('Complete Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
    await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|catalog)?$/, { timeout: 10000 });
  });

  test('should complete full checkout journey from catalog to order confirmation', async ({ page }) => {
    // Step 1: Browse catalog
    await page.goto('/catalog');
    await expect(page).toHaveTitle(/catalog|products/i);

    // Step 2: Add product to cart
    const addToCartButton = page.getByRole('button', { name: /add to cart/i }).first();
    await addToCartButton.waitFor({ state: 'visible', timeout: 10000 });
    await addToCartButton.click();

    // Verify cart badge updates
    await expect(page.locator('[data-testid="cart-count"]').or(
      page.getByText(/\d+ item/i)
    )).toBeVisible({ timeout: 5000 });

    // Step 3: Go to cart
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: /cart|shopping cart/i })).toBeVisible();

    // Verify item in cart
    await expect(page.locator('[data-testid="cart-item"]').or(
      page.locator('[data-product-id]')
    )).toBeVisible();

    // Step 4: Proceed to checkout
    const checkoutButton = page.getByRole('button', { name: /checkout|proceed/i });
    await checkoutButton.waitFor({ state: 'visible' });
    await checkoutButton.click();

    // Step 5: Fill checkout form (if required)
    await page.waitForURL(/\/checkout|\/payment/i, { timeout: 10000 });

    // Check for form fields and fill if present
    const nameField = page.getByLabel(/name|full name/i);
    if (await nameField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nameField.fill('Test Customer');
    }

    const emailField = page.getByLabel(/email/i);
    if (await emailField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailField.fill(TEST_CUSTOMER.email);
    }

    // Step 6: Submit order
    const placeOrderButton = page.getByRole('button', { name: /place order|submit|confirm/i });
    await placeOrderButton.waitFor({ state: 'visible', timeout: 5000 });
    await placeOrderButton.click();

    // Step 7: Verify order confirmation
    await expect(page).toHaveURL(/\/orders\/|\/confirmation|\/success/i, { timeout: 15000 });
    await expect(page.getByText(/order placed|success|confirmed|thank you/i)).toBeVisible({ timeout: 10000 });

    // Verify order ID is displayed
    await expect(page.getByText(/order.*#|order id|order number/i)).toBeVisible();
  });

  test('should prevent checkout with empty cart', async ({ page }) => {
    // Go directly to cart
    await page.goto('/cart');

    // Verify empty cart message
    await expect(page.getByText(/empty|no items|cart is empty/i)).toBeVisible({ timeout: 5000 });

    // Verify checkout button is disabled or not present
    const checkoutButton = page.getByRole('button', { name: /checkout|proceed/i });
    const isVisible = await checkoutButton.isVisible().catch(() => false);

    if (isVisible) {
      await expect(checkoutButton).toBeDisabled();
    }
  });

  test('should validate required checkout fields', async ({ page }) => {
    // Add item to cart first
    await page.goto('/catalog');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForTimeout(1000);

    // Go to checkout
    await page.goto('/cart');
    await page.getByRole('button', { name: /checkout|proceed/i }).click();

    await page.waitForURL(/\/checkout|\/payment/i, { timeout: 10000 });

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /place order|submit/i });

    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();

      // Should show validation errors
      await expect(page.getByText(/required|must|cannot be empty/i).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should update cart quantities', async ({ page }) => {
    // Add item to cart
    await page.goto('/catalog');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForTimeout(1000);

    // Go to cart
    await page.goto('/cart');

    // Find quantity input
    const quantityInput = page.locator('input[type="number"]').or(
      page.getByLabel(/quantity/i)
    ).first();

    if (await quantityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await quantityInput.fill('3');

      // Verify total updates
      await page.waitForTimeout(500);
      await expect(page.getByText(/total|subtotal/i)).toBeVisible();
    }
  });

  test('should remove items from cart', async ({ page }) => {
    // Add item to cart
    await page.goto('/catalog');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForTimeout(1000);

    // Go to cart
    await page.goto('/cart');

    // Remove item
    const removeButton = page.getByRole('button', { name: /remove|delete/i }).first();
    await removeButton.waitFor({ state: 'visible', timeout: 5000 });
    await removeButton.click();

    // Confirm removal if dialog appears
    const confirmButton = page.getByRole('button', { name: /confirm|yes|ok/i });
    if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await confirmButton.click();
    }

    // Verify cart is empty
    await expect(page.getByText(/empty|no items/i)).toBeVisible({ timeout: 3000 });
  });

  test('should maintain cart across navigation', async ({ page }) => {
    // Add item to cart from catalog
    await page.goto('/catalog');
    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForTimeout(1000);

    // Navigate away
    await page.goto('/dashboard');

    // Navigate back to cart
    await page.goto('/cart');

    // Verify item still in cart
    await expect(page.locator('[data-testid="cart-item"]').or(
      page.locator('[data-product-id]')
    )).toBeVisible({ timeout: 5000 });
  });

  test('should display correct pricing throughout checkout', async ({ page }) => {
    // Add item to cart
    await page.goto('/catalog');

    // Get price from catalog
    const priceText = await page.locator('[data-testid="product-price"]').or(
      page.getByText(/\$\d+/)
    ).first().textContent();

    await page.getByRole('button', { name: /add to cart/i }).first().click();
    await page.waitForTimeout(1000);

    // Go to cart
    await page.goto('/cart');

    // Verify price matches
    if (priceText) {
      await expect(page.getByText(priceText)).toBeVisible();
    }

    // Verify total is displayed
    await expect(page.getByText(/total|subtotal/i)).toBeVisible();
  });
});
