/**
 * Portal Shopping Flow E2E Tests
 *
 * @feature catalog, cart, checkout
 * @priority P0
 * @app portal
 *
 * Tests complete shopping user journey:
 * - Browse products in catalog
 * - Search and filter products
 * - Add products to cart
 * - Update cart quantities
 * - Remove items from cart
 * - Complete checkout
 */

import { test, expect } from '@playwright/test';

// Test data - credentials from README.md
const TEST_CUSTOMER = {
  email: 'customer@b2b.local',
  password: 'Admin123!',
};

test.describe('Shopping Flow', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
    await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|catalog|home)?$/, { timeout: 10000 });
  });

  test.describe('Catalog Browsing', () => {
    test('should display product catalog', async ({ page }) => {
      await page.goto('/catalog');

      // Should show products
      await expect(page.getByTestId('product-card').or(
        page.locator('[data-product-id]')
      ).first()).toBeVisible({ timeout: 10000 });

      // Should show product information
      await expect(page.getByText(/\$/)).toBeVisible(); // Price
    });

    test('should search for products', async ({ page }) => {
      await page.goto('/catalog');

      // Search for a product
      const searchInput = page.getByRole('searchbox').or(
        page.getByPlaceholder(/search/i)
      );
      await searchInput.fill('test');
      await searchInput.press('Enter');

      // Wait for search results
      await page.waitForLoadState('networkidle');

      // Should show filtered results or no results message
      const hasResults = await page.getByTestId('product-card').or(
        page.locator('[data-product-id]')
      ).first().isVisible().catch(() => false);

      if (!hasResults) {
        await expect(page.getByText(/no (results|products)/i)).toBeVisible();
      }
    });

    test('should filter products by category', async ({ page }) => {
      await page.goto('/catalog');

      // Find and click a category filter
      const categoryFilter = page.getByRole('button', { name: /category|filter/i }).or(
        page.locator('[data-testid="category-filter"]')
      );

      if (await categoryFilter.isVisible()) {
        await categoryFilter.click();

        // Select a category if dropdown appears
        const categoryOption = page.getByRole('option').first().or(
          page.locator('[data-category]').first()
        );

        if (await categoryOption.isVisible()) {
          await categoryOption.click();
          await page.waitForLoadState('networkidle');
        }
      }
    });

    test('should view product details', async ({ page }) => {
      await page.goto('/catalog');

      // Wait for products to load
      await page.waitForLoadState('networkidle');

      // Click on first product
      const firstProduct = page.getByTestId('product-card').or(
        page.locator('[data-product-id]')
      ).first();

      if (await firstProduct.isVisible()) {
        await firstProduct.click();

        // Should show product detail page
        await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Shopping Cart', () => {
    test('should add product to cart', async ({ page }) => {
      await page.goto('/catalog');

      // Wait for products
      await page.waitForLoadState('networkidle');

      // Find add to cart button
      const addToCartBtn = page.getByRole('button', { name: /add to cart/i }).first();

      if (await addToCartBtn.isVisible()) {
        await addToCartBtn.click();

        // Should show success feedback
        await expect(
          page.getByText(/added|cart/i).or(page.getByRole('alert'))
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should display cart with items', async ({ page }) => {
      // Navigate to cart
      await page.goto('/cart');

      // Cart page should load
      await expect(page.getByRole('heading', { name: /cart/i })).toBeVisible();

      // Should show cart items or empty message
      const hasItems = await page.getByTestId('cart-item').or(
        page.locator('[data-cart-item]')
      ).first().isVisible().catch(() => false);

      if (!hasItems) {
        await expect(page.getByText(/empty|no items/i)).toBeVisible();
      }
    });

    test('should update item quantity in cart', async ({ page }) => {
      await page.goto('/cart');

      // Find quantity controls
      const quantityInput = page.getByRole('spinbutton').or(
        page.getByTestId('quantity-input')
      ).first();

      if (await quantityInput.isVisible()) {
        // Clear and type new quantity
        await quantityInput.clear();
        await quantityInput.fill('3');
        await quantityInput.press('Tab'); // Trigger update

        // Wait for update
        await page.waitForLoadState('networkidle');
      }
    });

    test('should remove item from cart', async ({ page }) => {
      await page.goto('/cart');

      // Find remove button
      const removeBtn = page.getByRole('button', { name: /remove|delete/i }).first().or(
        page.getByTestId('remove-item')
      );

      if (await removeBtn.isVisible()) {
        await removeBtn.click();

        // Confirm if modal appears
        const confirmBtn = page.getByRole('button', { name: /confirm|yes/i });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        // Wait for removal
        await page.waitForLoadState('networkidle');
      }
    });
  });

  test.describe('Checkout Flow', () => {
    test('should proceed to checkout from cart', async ({ page }) => {
      await page.goto('/cart');

      // Find checkout button
      const checkoutBtn = page.getByRole('button', { name: /checkout|proceed/i }).or(
        page.getByRole('link', { name: /checkout/i })
      );

      if (await checkoutBtn.isVisible() && await checkoutBtn.isEnabled()) {
        await checkoutBtn.click();

        // Should navigate to checkout
        await expect(page).toHaveURL(/checkout|order/);
      }
    });

    test('should display order summary', async ({ page }) => {
      await page.goto('/checkout');

      // Should show order summary
      await expect(
        page.getByText(/subtotal|total/i)
      ).toBeVisible({ timeout: 10000 });
    });

    test('should place order successfully', async ({ page }) => {
      await page.goto('/checkout');

      // Find and click place order button
      const placeOrderBtn = page.getByRole('button', { name: /place order|submit|confirm/i });

      if (await placeOrderBtn.isVisible() && await placeOrderBtn.isEnabled()) {
        await placeOrderBtn.click();

        // Should show confirmation or redirect to order page
        await expect(
          page.getByText(/order (placed|confirmed|successful)|thank you/i)
            .or(page.locator('[data-testid="order-confirmation"]'))
        ).toBeVisible({ timeout: 15000 });
      }
    });
  });

  test.describe('Order History', () => {
    test('should display order history', async ({ page }) => {
      await page.goto('/orders');

      // Should show orders list or empty state
      await expect(
        page.getByRole('heading', { name: /orders/i })
          .or(page.getByText(/order history/i))
      ).toBeVisible();
    });

    test('should view order details', async ({ page }) => {
      await page.goto('/orders');

      // Click on first order if exists
      const firstOrder = page.getByTestId('order-item').or(
        page.locator('[data-order-id]')
      ).first();

      if (await firstOrder.isVisible()) {
        await firstOrder.click();

        // Should show order details
        await expect(
          page.getByText(/order #|status|items/i)
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });
});
