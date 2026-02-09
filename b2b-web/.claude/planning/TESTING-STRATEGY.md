# Frontend Testing Strategy

> **Team:** Frontend (Portal & Admin Apps)
> **Last Updated:** 2024-01-20
> **Owner:** Frontend Team Lead

## Overview

This document outlines the testing strategy for the B2B Web frontend, covering Portal (customer-facing) and Admin applications.

---

## Test Types

| Test Type | Tool | Purpose | Location |
|-----------|------|---------|----------|
| Unit | Vitest + RTL | Test components/hooks in isolation | `**/*.test.tsx` |
| Feature | Vitest + RTL | Test user flows within a feature | `__tests__/[feature]/` |
| E2E | Playwright | Test complete user journeys | `e2e/` |
| Accessibility | axe-core | Test WCAG 2.1 AA compliance | `a11y/` |
| Visual | Storybook | Visual regression testing | `stories/` |
| Performance | Lighthouse CI | Test Core Web Vitals | CI pipeline |

---

## Test Infrastructure

### Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 1.4.0 | Test runner |
| @testing-library/react | 14.2.2 | React testing utilities |
| @testing-library/user-event | - | User interaction simulation |
| Playwright | - | E2E testing (planned) |
| axe-core | - | Accessibility testing |
| Lighthouse CI | - | Performance testing |

### Configuration Files

| File | Purpose |
|------|---------|
| `vitest.config.ts` | Root Vitest configuration |
| `vitest.setup.ts` | Global test setup (mocks, cleanup) |
| `playwright.config.ts` | Playwright E2E configuration (planned) |

---

## Test File Organization

### Directory Structure

```
b2b-web/
├── vitest.config.ts                    # Root config
├── vitest.setup.ts                     # Global setup
├── test/
│   └── setup/
│       ├── index.ts                    # Test data & setup functions
│       ├── render-utils.tsx            # Custom render with providers
│       └── api-mocks.ts                # API mock utilities
├── apps/
│   ├── portal/
│   │   └── src/
│   │       ├── __tests__/              # Feature tests
│   │       │   ├── catalog/
│   │       │   │   └── catalog.test.tsx
│   │       │   ├── cart/
│   │       │   │   └── cart.test.tsx
│   │       │   └── orders/
│   │       │       └── orders.test.tsx
│   │       └── e2e/                    # E2E tests (planned)
│   │           └── specs/
│   └── admin/
│       └── src/
│           ├── __tests__/              # Feature tests
│           │   ├── orders/
│           │   │   └── orders-admin.test.tsx
│           │   └── users/
│           │       └── users-admin.test.tsx
│           └── e2e/                    # E2E tests (planned)
├── packages/
│   ├── ui/
│   │   └── src/
│   │       └── components/
│   │           ├── button.tsx
│   │           └── button.test.tsx     # Co-located tests
│   └── auth/
│       └── src/
│           └── __tests__/
│               └── auth.test.ts
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `[component].test.tsx` | `button.test.tsx` |
| Feature test | `[feature].test.tsx` | `catalog.test.tsx` |
| E2E test | `[flow].e2e.spec.ts` | `checkout.e2e.spec.ts` |
| A11y test | `[page].a11y.spec.ts` | `portal.a11y.spec.ts` |

---

## Test Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test --coverage

# Run in watch mode
pnpm test:watch

# Run specific feature tests
pnpm test --testPathPattern="catalog"
pnpm test --testPathPattern="cart"
pnpm test --testPathPattern="orders"

# Run tests for specific app
pnpm test --testPathPattern="portal"
pnpm test --testPathPattern="admin"

# Run package tests
pnpm test --testPathPattern="packages/ui"
pnpm test --testPathPattern="packages/auth"

# Run E2E tests (planned)
pnpm test:e2e
pnpm test:e2e:portal
pnpm test:e2e:admin

# Run accessibility tests (planned)
pnpm test:a11y
```

---

## Writing Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Feature Test Example

```typescript
/**
 * @feature catalog
 * @priority P0
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderAsCustomer, userEvent } from '../../../test/setup/render-utils';
import { mockCatalogApi, resetAllMocks } from '../../../test/setup/api-mocks';

vi.mock('@b2b/api-client', () => ({
  catalogApi: mockCatalogApi,
}));

describe('Catalog Feature', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Product Search', () => {
    it('should filter products by search query', async () => {
      mockCatalogApi.searchProducts.mockResolvedValueOnce({
        data: [{ id: '1', name: 'Test Product' }],
        total: 1,
      });

      const user = userEvent.setup();
      renderAsCustomer(<CatalogPage />);

      await user.type(screen.getByRole('searchbox'), 'Test');

      await waitFor(() => {
        expect(screen.getByText('Test Product')).toBeInTheDocument();
      });
    });
  });
});
```

### Using Custom Render Utilities

```typescript
import {
  renderAsCustomer,   // Render with customer session
  renderAsAdmin,      // Render with admin session
  renderAsGuest,      // Render without authentication
  renderWithProviders // Render with custom session
} from '../../../test/setup/render-utils';

// Customer view
renderAsCustomer(<CartPage />);

// Admin view
renderAsAdmin(<OrdersManagement />);

// Guest view (unauthenticated)
renderAsGuest(<LoginPage />);

// Custom session
renderWithProviders(<Profile />, {
  session: customSession,
  authStatus: 'authenticated'
});
```

---

## Test Coverage Requirements

### Coverage Thresholds

| Metric | Target | Minimum |
|--------|--------|---------|
| Lines | 80% | 70% |
| Branches | 75% | 65% |
| Functions | 85% | 75% |
| Statements | 80% | 70% |

### Priority Coverage

| Priority | Coverage Requirement |
|----------|---------------------|
| P0 (Critical) | 100% unit + feature + E2E |
| P1 (Important) | 100% unit + feature |
| P2 (Nice-to-have) | 80% unit |

---

## CI/CD Integration

### Test Execution Pipeline

```yaml
# .github/workflows/test.yml
name: Frontend Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test --coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm exec playwright install
      - run: pnpm test:e2e

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:a11y

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: treosh/lighthouse-ci-action@v10
```

### Quality Gates

| Gate | Requirement |
|------|-------------|
| Unit test coverage | ≥ 80% |
| All tests passing | 100% |
| No critical a11y violations | 0 |
| Lighthouse performance | ≥ 90 |

---

## Identified Testing Gaps & Lessons Learned

> **Date:** 2026-02-08
> **Context:** Order Journey Bugs (BUG-010, BUG-011, BUG-012)

### The Problem

Despite having unit tests, integration tests, and E2E tests that all passed, basic order journey functionality was broken in production:

| Bug | Description | Root Cause |
|-----|-------------|------------|
| BUG-010 | Missing payment methods | Seed data not populated |
| BUG-011 | Order creation 400 error | API contract mismatch - frontend sends `shippingAddressId`, backend expected `shippingAddress` object |
| BUG-012 | Order detail page crash | Next.js 15 `use(params)` pattern incompatibility |

### Why Existing Tests Missed These

| Test Type | Why It Missed BUG-011 (API Contract Mismatch) |
|-----------|-----------------------------------------------|
| **Unit Tests** | Mock HTTP layer - test service logic with whatever DTO structure provided |
| **Integration Tests** | Tested with backend's expected structure, not what frontend actually sends |
| **E2E Tests** | Either didn't exist for checkout, or used backend-compatible payloads |

| Test Type | Why It Missed BUG-012 (Runtime Error) |
|-----------|---------------------------------------|
| **Unit/Component Tests** | Mock `params` or `useParams`, never invoke real routing |
| **E2E Tests** | May run against different Next.js version or mock routing |

### The Core Gap: No Contract Testing

```
Frontend expects:  { shippingAddressId: "abc", paymentMethodId: "xyz" }
Backend expects:   { shippingAddress: { street1: "...", city: "..." } }

Unit tests pass ✓ (each side works with ITS expected format)
Integration tests pass ✓ (test backend with backend's format)
E2E tests pass ✓ (if they exist, likely use backend's format)

But real user flow fails ✗
```

### Recommended Additions to Test Strategy

#### 1. Contract Testing (HIGH PRIORITY)

Add API contract validation between frontend and backend:

```typescript
// test/contract/order-api.contract.spec.ts
import { describe, it, expect } from 'vitest';
import openapiSpec from '../../packages/api-client/openapi.json';

describe('Order API Contract', () => {
  it('frontend CreateOrderDto matches backend schema', () => {
    const backendSchema = openapiSpec.components.schemas.CreateOrderDto;

    // Validate frontend's expected fields exist in backend
    expect(backendSchema.properties).toHaveProperty('shippingAddressId');
    expect(backendSchema.properties).toHaveProperty('billingAddressId');
    expect(backendSchema.properties).toHaveProperty('deliveryMethodId');
    expect(backendSchema.properties).toHaveProperty('paymentMethodId');
  });
});
```

#### 2. True E2E Tests with Real Backend

Add Playwright tests that hit real frontend AND real backend:

```typescript
// e2e/specs/order-journey.e2e.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Order Journey', () => {
  test('complete order flow: catalog → cart → checkout → order detail', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'customer@b2b.local');
    await page.fill('[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Add to cart
    await page.goto('/catalog');
    await page.click('[data-testid="add-to-cart"]');

    // Checkout
    await page.goto('/checkout');
    await page.selectOption('[name="shippingAddressId"]', { index: 0 });
    await page.selectOption('[name="paymentMethodId"]', { index: 0 });
    await page.click('[data-testid="place-order"]');

    // Verify order detail page loads
    await expect(page).toHaveURL(/\/orders\/[a-z0-9]+/);
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
  });
});
```

#### 3. Smoke Tests (Post-Deploy)

Add critical path smoke tests that run after deployment:

```typescript
// test/smoke/critical-paths.smoke.spec.ts
const CRITICAL_PATHS = [
  { name: 'Login', path: '/login', expect: 'form' },
  { name: 'Catalog', path: '/catalog', expect: 'product-grid' },
  { name: 'Cart', path: '/cart', expect: 'cart-container' },
  { name: 'Checkout', path: '/checkout', expect: 'checkout-form' },
  { name: 'Orders', path: '/orders', expect: 'orders-list' },
];

test.describe('Smoke Tests', () => {
  for (const route of CRITICAL_PATHS) {
    test(`${route.name} page loads`, async ({ page }) => {
      await page.goto(route.path);
      await expect(page.locator(`[data-testid="${route.expect}"]`)).toBeVisible();
    });
  }
});
```

#### 4. API Client Generation

Generate frontend API client from backend OpenAPI spec to ensure type safety:

```bash
# In CI/CD pipeline
npm run generate:api-client  # Generates types from backend OpenAPI
npm run typecheck            # Fails if frontend uses wrong types
```

### Action Items

| Priority | Action | Owner | Status |
|----------|--------|-------|--------|
| P0 | Add contract tests for order API | - | TODO |
| P0 | Add E2E test for complete order journey | - | TODO |
| P1 | Add smoke tests for critical paths | - | TODO |
| P1 | Set up API client generation from OpenAPI | - | TODO |
| P2 | Add seed data validation tests | - | TODO |

### Test Pyramid Adjustment

Current pyramid is missing the contract testing layer:

```
        /\
       /E2E\          ← Browser-based, real backend
      /------\
     /Contract\       ← NEW: API schema validation
    /----------\
   /Integration \     ← API-level tests
  /--------------\
 /   Unit Tests   \   ← Component/function isolation
/------------------\
```

---

## Related Documentation

- [TEST-COVERAGE-MATRIX.md](./TEST-COVERAGE-MATRIX.md) - Detailed coverage tracking
- [TEST-DEPENDENCIES.md](./TEST-DEPENDENCIES.md) - Test prerequisites and setup
- [test.md](../commands/test.md) - Test command reference

---

## Extending the Strategy

### Adding a New Test Type

1. Update this document with the new test type
2. Add tooling to `package.json`
3. Create configuration file if needed
4. Add to CI/CD pipeline
5. Document in test commands
6. Update coverage matrix

### Onboarding New Team Members

1. Read this strategy document
2. Review TEST-COVERAGE-MATRIX.md
3. Run existing tests locally
4. Write a simple component test
5. Write a feature test with mocks
6. Review PR feedback on tests
