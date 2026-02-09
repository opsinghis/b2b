# Frontend Test Coverage Matrix

> **Team:** Frontend (Portal & Admin Apps)
> **Last Updated:** 2026-02-08
> **Owner:** Frontend Team Lead

## Philosophy: Behavior-Driven Test Coverage

We measure **behavior coverage** - every user interaction should be tested:
- Every user story has corresponding tests
- Every critical user journey has E2E coverage
- Every component has unit test coverage
- Every edge case is documented and tested

---

## How to Add New Test Coverage

### Adding a New User Journey

1. **Define the Journey** in the table below with:
   - Journey name and user story
   - Required test types (Unit, Feature, E2E)
   - Priority (P0 = critical, P1 = important, P2 = nice-to-have)

2. **Create Test Files** following naming convention:
   ```
   apps/portal/src/__tests__/[feature]/[feature].test.tsx
   apps/admin/src/__tests__/[feature]/[feature].test.tsx
   ```

3. **Add Feature Tag** for test filtering:
   ```typescript
   /**
    * @feature [feature-name]
    * @priority P0
    */
   describe('[Feature] Tests', () => { ... });
   ```

4. **Update this Matrix** with coverage status

### Adding a New Component

1. **Create co-located test file**:
   ```
   packages/ui/src/components/[component].tsx
   packages/ui/src/components/[component].test.tsx
   ```

2. **Required Test Coverage**:
   - Rendering (all variants/states)
   - User interactions
   - Accessibility (keyboard, screen reader)
   - Edge cases

---

## Critical User Journeys - Portal (Customer)

| Journey | User Story | Unit | Feature | E2E | Priority | Owner |
|---------|-----------|------|---------|-----|----------|-------|
| **Authentication** |
| Login | As a customer, I can login with email/password | ✅ | ✅ | ✅ | P0 | @frontend |
| Logout | As a customer, I can securely logout | ✅ | ✅ | ✅ | P0 | @frontend |
| Session Expiry | As a customer, I'm redirected when session expires | ✅ | ✅ | ✅ | P0 | @frontend |
| Password Reset | As a customer, I can reset my password | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| **Catalog Browsing** |
| View Products | As a customer, I can browse products | ✅ | ✅ | ✅ | P0 | @frontend |
| Search | As a customer, I can search for products | ✅ | ✅ | ✅ | P0 | @frontend |
| Filter | As a customer, I can filter by category | ✅ | ✅ | ✅ | P1 | @frontend |
| Product Detail | As a customer, I can view product details | ✅ | ✅ | ✅ | P0 | @frontend |
| Pagination | As a customer, I can navigate through pages | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| **Shopping Cart** |
| Add to Cart | As a customer, I can add products to cart | ✅ | ✅ | ✅ | P0 | @frontend |
| Update Quantity | As a customer, I can change item quantities | ✅ | ✅ | ✅ | P0 | @frontend |
| Remove Item | As a customer, I can remove items from cart | ✅ | ✅ | ✅ | P0 | @frontend |
| Cart Persistence | As a customer, my cart persists across sessions | ✅ | ✅ | ✅ | P0 | @frontend |
| Cart Summary | As a customer, I see accurate cart totals | ✅ | ✅ | ⬜ | P0 | @frontend |
| **Checkout** |
| View Cart Total | As a customer, I see accurate pricing | ✅ | ✅ | ✅ | P0 | @frontend |
| Place Order | As a customer, I can place an order | ✅ | ✅ | ✅ | P0 | @frontend |
| Order Confirmation | As a customer, I receive order confirmation | ✅ | ✅ | ✅ | P0 | @frontend |
| Payment Selection | As a customer, I can select payment method | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| **Order Management** |
| View Orders | As a customer, I can view my order history | ✅ | ✅ | ✅ | P0 | @frontend |
| Order Details | As a customer, I can view order details | ✅ | ✅ | ✅ | P1 | @frontend |
| Track Order | As a customer, I can track order status | ✅ | ✅ | ✅ | P1 | @frontend |
| Cancel Order | As a customer, I can cancel pending orders | ✅ | ⬜ | ⬜ | P2 | @frontend |
| **Quotes** |
| View Quotes List | As a customer, I can view my quotes | ⬜ | ⬜ | ✅ | P1 | @frontend |
| Create Quote | As a customer, I can create a new quote | ⬜ | ⬜ | ✅ | P1 | @frontend |
| Add Line Items | As a customer, I can add products to a quote | ⬜ | ⬜ | ✅ | P1 | @frontend |
| Submit for Approval | As a customer, I can submit a quote for approval | ⬜ | ⬜ | ✅ | P1 | @frontend |
| View Quote Details | As a customer, I can view quote details | ⬜ | ⬜ | ✅ | P1 | @frontend |
| Edit Draft Quote | As a customer, I can edit draft quotes | ⬜ | ⬜ | ✅ | P1 | @frontend |
| Duplicate Quote | As a customer, I can duplicate a quote | ⬜ | ⬜ | ✅ | P2 | @frontend |
| Accept Quote | As a customer, I can accept an approved quote | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| **Contracts** |
| View Contracts | As a customer, I can view my contracts | ⬜ | ⬜ | ⬜ | P2 | @frontend |
| Contract Pricing | As a customer, I see contract-specific pricing | ⬜ | ⬜ | ⬜ | P2 | @frontend |

---

## Critical User Journeys - Admin Portal

| Journey | User Story | Unit | Feature | E2E | Priority | Owner |
|---------|-----------|------|---------|-----|----------|-------|
| **Authentication** |
| Admin Login | As an admin, I can login securely | ✅ | ✅ | ✅ | P0 | @frontend |
| Role Check | As an admin, I see admin-only features | ✅ | ✅ | ✅ | P0 | @frontend |
| **Order Management** |
| View All Orders | As an admin, I can view all tenant orders | ✅ | ✅ | ✅ | P0 | @frontend |
| Update Order Status | As an admin, I can update order status | ✅ | ✅ | ✅ | P0 | @frontend |
| View Order Details | As an admin, I can view order details | ✅ | ✅ | ✅ | P0 | @frontend |
| Filter Orders | As an admin, I can filter orders by status | ✅ | ⬜ | ✅ | P1 | @frontend |
| Search Orders | As an admin, I can search orders | ⬜ | ⬜ | ✅ | P1 | @frontend |
| Add Tracking | As an admin, I can add tracking info | ⬜ | ⬜ | ✅ | P1 | @frontend |
| **User Management** |
| View Users | As an admin, I can view tenant users | ✅ | ✅ | ✅ | P1 | @frontend |
| View User Details | As an admin, I can view user details | ✅ | ⬜ | ✅ | P1 | @frontend |
| Create User | As an admin, I can create new users | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| Manage Roles | As an admin, I can assign user roles | ✅ | ✅ | ✅ | P1 | @frontend |
| Deactivate User | As an admin, I can deactivate users | ✅ | ⬜ | ⬜ | P2 | @frontend |
| **Quote Management (Admin)** |
| View All Quotes | As an admin, I can view all tenant quotes | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| Approve Quote | As an admin, I can approve quotes | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| Reject Quote | As an admin, I can reject quotes | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| **Catalog Management** |
| View Products | As an admin, I can view all products | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| Create Product | As an admin, I can add new products | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| Edit Product | As an admin, I can update products | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| **Reporting** |
| View Dashboard | As an admin, I can see KPI dashboard | ⬜ | ⬜ | ⬜ | P1 | @frontend |
| Export Reports | As an admin, I can export reports | ⬜ | ⬜ | ⬜ | P2 | @frontend |

---

## Component Coverage Matrix

### packages/ui Components

| Component | Unit | Visual | A11y | Interactions | Owner |
|-----------|------|--------|------|--------------| ------|
| Button | ✅ | ⬜ | ✅ | ✅ | @frontend |
| Input | ✅ | ⬜ | ✅ | ✅ | @frontend |
| Select | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |
| Modal | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |
| Table | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |
| Card | ⬜ | ⬜ | ⬜ | - | @frontend |
| Badge | ⬜ | ⬜ | ⬜ | - | @frontend |
| Toast | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |
| Pagination | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |
| Loading | ⬜ | ⬜ | ⬜ | - | @frontend |
| DatePicker | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |
| Checkbox | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |
| Switch | ⬜ | ⬜ | ⬜ | ⬜ | @frontend |

### Portal App Components

| Component | Unit | Feature | A11y | Owner |
|-----------|------|---------|------|-------|
| ProductCard | ⬜ | ⬜ | ⬜ | @frontend |
| ProductGrid | ⬜ | ⬜ | ⬜ | @frontend |
| CartItem | ⬜ | ⬜ | ⬜ | @frontend |
| CartSummary | ⬜ | ⬜ | ⬜ | @frontend |
| OrderList | ⬜ | ⬜ | ⬜ | @frontend |
| OrderDetail | ⬜ | ⬜ | ⬜ | @frontend |
| SearchBar | ⬜ | ⬜ | ⬜ | @frontend |
| CategoryFilter | ⬜ | ⬜ | ⬜ | @frontend |
| Header | ⬜ | ⬜ | ⬜ | @frontend |
| Footer | ⬜ | ⬜ | ⬜ | @frontend |
| Navigation | ⬜ | ⬜ | ⬜ | @frontend |

---

## Edge Cases & Error Handling

### Authentication Edge Cases
| Scenario | Test Type | Coverage | Owner |
|----------|-----------|----------|-------|
| Invalid credentials | Unit + E2E | ⬜ | @frontend |
| Expired token redirect | Unit + E2E | ⬜ | @frontend |
| Network error during login | Unit | ⬜ | @frontend |
| Session timeout | E2E | ⬜ | @frontend |

### Cart Edge Cases
| Scenario | Test Type | Coverage | Owner |
|----------|-----------|----------|-------|
| Empty cart checkout attempt | Unit + E2E | ⬜ | @frontend |
| Product out of stock | Unit + E2E | ⬜ | @frontend |
| Price change notification | Unit | ⬜ | @frontend |
| Maximum quantity exceeded | Unit + E2E | ⬜ | @frontend |

### Form Validation Edge Cases
| Scenario | Test Type | Coverage | Owner |
|----------|-----------|----------|-------|
| Empty required fields | Unit | ⬜ | @frontend |
| Invalid email format | Unit | ⬜ | @frontend |
| Password requirements | Unit | ⬜ | @frontend |
| Server validation errors | Unit | ⬜ | @frontend |

---

## Accessibility Coverage (WCAG 2.1 AA)

### Automated Checks
| Criterion | Tool | Coverage | Owner |
|-----------|------|----------|-------|
| 1.1.1 Non-text Content | axe-core | ⬜ | @frontend |
| 1.3.1 Info and Relationships | axe-core | ⬜ | @frontend |
| 1.4.3 Contrast (Minimum) | axe-core | ⬜ | @frontend |
| 2.1.1 Keyboard | Playwright | ⬜ | @frontend |
| 2.4.1 Bypass Blocks | axe-core | ⬜ | @frontend |
| 2.4.4 Link Purpose | axe-core | ⬜ | @frontend |
| 3.1.1 Language of Page | axe-core | ⬜ | @frontend |
| 4.1.1 Parsing | axe-core | ⬜ | @frontend |
| 4.1.2 Name, Role, Value | axe-core | ⬜ | @frontend |

---

## Performance Benchmarks (Core Web Vitals)

| Metric | Target | Warning | Fail | Current |
|--------|--------|---------|------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | < 4s | > 4s | TBD |
| FID (First Input Delay) | < 100ms | < 300ms | > 300ms | TBD |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 | > 0.25 | TBD |
| TTI (Time to Interactive) | < 3.8s | < 7.3s | > 7.3s | TBD |

---

## Coverage Thresholds

| Metric | Tool | Target | Current |
|--------|------|--------|---------|
| Line Coverage | Vitest | > 80% | TBD |
| Branch Coverage | Vitest | > 75% | TBD |
| Function Coverage | Vitest | > 85% | TBD |
| User Story Coverage | Manual | 100% P0/P1 | See tables above |
| A11y Violation Count | axe-core | 0 critical | TBD |

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented and passing |
| ⬜ | Not yet implemented |
| 🔄 | In progress |
| ❌ | Failing/blocked |

---

## Extending This Matrix

### To Add a New Feature Area:

1. Create a new section with the feature name
2. List all user stories with format:
   ```
   | [Action] | As a [role], I can [action] | Unit | Feature | E2E | Priority | Owner |
   ```
3. Set initial coverage status to ⬜
4. Assign owner
5. Create corresponding test files
6. Update status as tests are written

### To Add a New Component:

1. Add row to Component Coverage Matrix
2. Create test file with coverage for:
   - Unit tests (rendering, states, variants)
   - Visual tests (Storybook)
   - Accessibility tests (keyboard, screen reader)
   - Interaction tests (clicks, inputs)
