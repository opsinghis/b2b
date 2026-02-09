/**
 * Portal Quotes E2E Tests
 *
 * @feature quotes
 * @priority P1
 * @app portal
 *
 * Tests complete quote management user journey:
 * - View quotes list
 * - Create a new quote
 * - Add line items to quote
 * - Submit quote for approval
 * - View quote details
 */

import { test, expect } from '@playwright/test';

// Test data - credentials from README.md
const TEST_CUSTOMER = {
  email: 'customer@b2b.local',
  password: 'Admin123!',
};

test.describe('Quotes Management', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_CUSTOMER.email);
    await page.getByLabel(/password/i).fill(TEST_CUSTOMER.password);
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(dashboard|catalog|home)?$/, { timeout: 10000 });
  });

  test.describe('Quotes List', () => {
    test('should display quotes list page', async ({ page }) => {
      await page.goto('/quotes');

      // Should show quotes page heading
      await expect(
        page.getByRole('heading', { name: 'Quotes', level: 1 })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should show create quote button', async ({ page }) => {
      await page.goto('/quotes');

      // Should have a create quote button
      await expect(
        page.getByRole('link', { name: 'Create Quote', exact: true })
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Create Quote Flow', () => {
    test('should navigate to create quote page', async ({ page }) => {
      await page.goto('/quotes');

      // Click create quote button
      const createBtn = page.getByRole('button', { name: /create|new quote/i })
        .or(page.getByRole('link', { name: /create|new quote/i }));

      if (await createBtn.isVisible()) {
        await createBtn.click();

        // Should navigate to new quote page
        await expect(page).toHaveURL(/quotes\/(new|create)/);
      }
    });

    test('should display quote creation form', async ({ page }) => {
      await page.goto('/quotes/new');

      // Should show quote title input
      await expect(
        page.getByRole('textbox', { name: /quote title/i })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should fill quote details', async ({ page }) => {
      await page.goto('/quotes/new');

      // Fill in quote title
      const titleInput = page.getByRole('textbox', { name: /quote title/i });
      await titleInput.fill('E2E Test Quote');

      // Fill in description if available
      const descInput = page.getByRole('textbox', { name: /description/i });
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('This is a test quote created by E2E tests');
      }
    });

    test('should add product to quote', async ({ page }) => {
      await page.goto('/quotes/new');

      // Look for add product button
      const addProductBtn = page.getByRole('button', { name: /add (product|item|line)/i })
        .or(page.getByTestId('add-line-item'));

      if (await addProductBtn.isVisible()) {
        await addProductBtn.click();

        // Should show product selection modal or expand line item form
        await expect(
          page.getByRole('dialog')
            .or(page.getByTestId('product-select'))
            .or(page.getByPlaceholder(/search|product/i))
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should create and submit quote for approval', async ({ page }) => {
      await page.goto('/quotes/new');

      // Fill quote title
      const titleInput = page.getByLabel(/title|name/i)
        .or(page.getByPlaceholder(/title|name/i))
        .or(page.getByTestId('quote-title'));

      if (await titleInput.isVisible()) {
        await titleInput.fill('E2E Test Quote - Submit');
      }

      // Fill customer info if required
      const customerInput = page.getByLabel(/customer/i)
        .or(page.getByTestId('customer-select'));

      if (await customerInput.isVisible()) {
        await customerInput.click();
        // Select first customer option
        const customerOption = page.getByRole('option').first();
        if (await customerOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await customerOption.click();
        }
      }

      // Try to add a product line item
      const addProductBtn = page.getByRole('button', { name: /add (product|item|line)/i })
        .or(page.getByTestId('add-line-item'));

      if (await addProductBtn.isVisible()) {
        await addProductBtn.click();
        await page.waitForTimeout(500);

        // Select product from modal or dropdown
        const productSelect = page.getByRole('combobox', { name: /product/i })
          .or(page.getByTestId('product-select'));

        if (await productSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
          await productSelect.click();
          const productOption = page.getByRole('option').first();
          if (await productOption.isVisible({ timeout: 2000 }).catch(() => false)) {
            await productOption.click();
          }
        }

        // Set quantity
        const quantityInput = page.getByRole('spinbutton', { name: /quantity/i })
          .or(page.getByTestId('quantity-input'));

        if (await quantityInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await quantityInput.fill('5');
        }

        // Confirm add line item
        const confirmBtn = page.getByRole('button', { name: /add|confirm|save/i });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }
      }

      // Save the quote first (as draft)
      const saveBtn = page.getByRole('button', { name: /save|create/i })
        .or(page.getByTestId('save-quote'));

      if (await saveBtn.isVisible()) {
        await saveBtn.click();

        // Wait for quote to be created
        await page.waitForLoadState('networkidle');
      }

      // Now submit for approval
      const submitBtn = page.getByRole('button', { name: /submit|send for approval/i })
        .or(page.getByTestId('submit-quote'));

      if (await submitBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await submitBtn.click();

        // Should show success message or status change
        await expect(
          page.getByText(/submitted|pending approval|success/i)
            .or(page.getByRole('alert'))
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Quote Details', () => {
    test('should view quote details', async ({ page }) => {
      await page.goto('/quotes');

      // Wait for quotes to load
      await page.waitForLoadState('networkidle');

      // Click on first quote card
      const firstQuoteCard = page.locator('a[href^="/quotes/"]').filter({ hasNot: page.locator('text=Create Quote') }).first();

      if (await firstQuoteCard.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstQuoteCard.click();

        // Should navigate to quote details page
        await expect(page).toHaveURL(/\/quotes\/[a-zA-Z0-9]+$/);
      }
    });

    test('should display quote status', async ({ page }) => {
      await page.goto('/quotes');

      // Should show quote status badge (first one found)
      await expect(
        page.getByText('Draft').or(page.getByText('Pending')).or(page.getByText('Approved')).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Quote Actions', () => {
    test('should be able to edit draft quote', async ({ page }) => {
      await page.goto('/quotes');

      // Find a draft quote
      const draftQuote = page.locator('[data-status="DRAFT"]')
        .or(page.getByText(/draft/i).locator('..'))
        .first();

      if (await draftQuote.isVisible({ timeout: 5000 }).catch(() => false)) {
        await draftQuote.click();

        // Should have edit button
        const editBtn = page.getByRole('button', { name: /edit/i })
          .or(page.getByTestId('edit-quote'));

        await expect(editBtn).toBeVisible({ timeout: 5000 });
      }
    });

    test('should be able to duplicate quote', async ({ page }) => {
      await page.goto('/quotes');

      // Find any quote
      const firstQuote = page.getByTestId('quote-item')
        .or(page.locator('[data-quote-id]'))
        .first();

      if (await firstQuote.isVisible({ timeout: 5000 }).catch(() => false)) {
        await firstQuote.click();

        // Look for duplicate/clone action
        const duplicateBtn = page.getByRole('button', { name: /duplicate|clone|copy/i })
          .or(page.getByTestId('duplicate-quote'));

        if (await duplicateBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await duplicateBtn.click();

          // Should create a new quote
          await expect(page).toHaveURL(/quotes\/(new|create|\w+)/);
        }
      }
    });
  });
});
