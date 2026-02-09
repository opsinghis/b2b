# Test Dependencies & Prerequisites

## Overview

This document maps test prerequisites and data setup requirements. Tests are organized by feature with clear dependency chains.

---

## Dependency Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEST DATA HIERARCHY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Level 0: Platform Setup                                         │
│  └── Database initialized                                        │
│  └── Redis available                                             │
│  └── MinIO available (for files)                                │
│                                                                  │
│  Level 1: Tenant Setup                                           │
│  └── Create Tenant (organization)                               │
│  └── Configure Tenant settings                                  │
│                                                                  │
│  Level 2: User Setup                                             │
│  └── Create Admin User (for tenant)                             │
│  └── Create Customer Users                                      │
│  └── Create Partner Users (if B2B)                              │
│                                                                  │
│  Level 3: Catalog Setup                                          │
│  └── Create Categories                                          │
│  └── Create Master Products                                     │
│  └── Grant Tenant Product Access                                │
│  └── Set Pricing Rules                                          │
│                                                                  │
│  Level 4: Business Data                                          │
│  └── Create Cart (per user)                                     │
│  └── Create Orders (historical)                                 │
│  └── Create Quotes                                              │
│  └── Create Contracts                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Feature Test Prerequisites

### Authentication Feature (`auth`)

| Prerequisite | Setup Script | Required For |
|--------------|--------------|--------------|
| Tenant exists | `setup:tenant` | All auth tests |
| Valid user credentials | `setup:users` | Login tests |
| Invalid user (for negative tests) | Built-in | Login failure tests |

```typescript
// test/setup/auth.setup.ts
beforeAll(async () => {
  await setupTenant();
  await setupUsers(['customer', 'admin']);
});
```

### Catalog Feature (`catalog`)

| Prerequisite | Setup Script | Required For |
|--------------|--------------|--------------|
| Tenant exists | `setup:tenant` | All catalog tests |
| Categories created | `setup:categories` | Category filter tests |
| Products in catalog | `setup:products` | Product listing tests |
| Product images | `setup:product-images` | Image display tests |
| Tenant product access | `setup:tenant-access` | Tenant catalog tests |
| Customer user logged in | `setup:auth` | Authenticated catalog tests |

```typescript
// test/setup/catalog.setup.ts
beforeAll(async () => {
  await setupTenant();
  await setupCategories(10);
  await setupProducts(100);
  await grantTenantAccess();
  await loginAsCustomer();
});
```

### Cart Feature (`cart`)

| Prerequisite | Setup Script | Required For |
|--------------|--------------|--------------|
| All catalog prerequisites | `setup:catalog` | Adding items |
| Customer user logged in | `setup:auth` | Cart operations |
| Products available | `setup:products` | Add to cart |
| Pricing configured | `setup:pricing` | Price calculations |

```typescript
// test/setup/cart.setup.ts
beforeAll(async () => {
  await setupCatalog(); // Includes tenant, products
  await setupPricing();
  await loginAsCustomer();
});
```

### Orders Feature (`orders`)

| Prerequisite | Setup Script | Required For |
|--------------|--------------|--------------|
| All cart prerequisites | `setup:cart` | Order creation |
| Payment method configured | `setup:payment` | Checkout |
| Shipping configured | `setup:shipping` | Delivery tests |
| Historical orders (optional) | `setup:orders` | Order history tests |

```typescript
// test/setup/orders.setup.ts
beforeAll(async () => {
  await setupCart(); // Includes catalog, auth
  await setupPayment();
  await setupShipping();
  await setupHistoricalOrders(5); // For history tests
});
```

### Quotes Feature (`quotes`)

| Prerequisite | Setup Script | Required For |
|--------------|--------------|--------------|
| Catalog setup | `setup:catalog` | Quote items |
| Customer user | `setup:auth` | Quote submission |
| Sales rep user | `setup:sales-users` | Quote approval |

```typescript
// test/setup/quotes.setup.ts
beforeAll(async () => {
  await setupCatalog();
  await setupUsers(['customer', 'sales_rep']);
});
```

### Contracts Feature (`contracts`)

| Prerequisite | Setup Script | Required For |
|--------------|--------------|--------------|
| Tenant setup | `setup:tenant` | Contract creation |
| Partner setup | `setup:partner` | Partner contracts |
| Customer user | `setup:auth` | Contract viewing |
| Admin user | `setup:admin` | Contract management |

```typescript
// test/setup/contracts.setup.ts
beforeAll(async () => {
  await setupTenant();
  await setupPartner();
  await setupUsers(['customer', 'admin']);
  await setupContracts(3);
});
```

### Admin Features (`admin`)

| Prerequisite | Setup Script | Required For |
|--------------|--------------|--------------|
| Tenant setup | `setup:tenant` | All admin tests |
| Admin user | `setup:admin` | Admin access |
| Products for management | `setup:products` | Product admin |
| Orders for management | `setup:orders` | Order admin |
| Users for management | `setup:users` | User admin |

```typescript
// test/setup/admin.setup.ts
beforeAll(async () => {
  await setupTenant();
  await setupFullCatalog();
  await setupOrders(10);
  await setupUsers(['admin', 'customer', 'sales_rep']);
  await loginAsAdmin();
});
```

---

## Setup Scripts

### Core Setup Functions

```typescript
// test/setup/index.ts

export async function setupPlatform() {
  // Level 0: Ensure database, redis, minio are ready
  await waitForDatabase();
  await waitForRedis();
  await waitForMinio();
}

export async function setupTenant(name = 'Test Tenant') {
  // Level 1: Create tenant
  return prisma.tenant.upsert({
    where: { slug: 'test-tenant' },
    create: {
      name,
      slug: 'test-tenant',
      settings: { currency: 'USD', locale: 'en-US' }
    },
    update: {}
  });
}

export async function setupUsers(roles: string[]) {
  // Level 2: Create users by role
  const users = {};
  for (const role of roles) {
    users[role] = await createUser(role);
  }
  return users;
}

export async function setupCategories(count = 10) {
  // Level 3: Create categories
  return Promise.all(
    Array(count).fill(null).map((_, i) =>
      prisma.category.create({
        data: { name: `Category ${i}`, slug: `category-${i}` }
      })
    )
  );
}

export async function setupProducts(count = 100) {
  // Level 3: Create products with tenant access
  const products = await createProducts(count);
  await grantTenantAccess(products);
  return products;
}

export async function setupCatalog() {
  // Convenience: Full catalog setup
  await setupTenant();
  await setupCategories();
  await setupProducts();
}

export async function setupCart() {
  // Convenience: Cart-ready setup
  await setupCatalog();
  await setupUsers(['customer']);
  await setupPricing();
}

export async function setupOrders(count = 5) {
  // Create historical orders
  await setupCart();
  return createOrders(count);
}
```

---

## Feature-to-Test File Mapping

### Naming Convention

```
test/
├── unit/                           # Unit tests
│   ├── auth/                       # Feature: auth
│   │   ├── login.spec.ts
│   │   └── logout.spec.ts
│   ├── catalog/                    # Feature: catalog
│   │   ├── product-list.spec.ts
│   │   ├── product-search.spec.ts
│   │   └── category-filter.spec.ts
│   ├── cart/                       # Feature: cart
│   │   ├── add-item.spec.ts
│   │   ├── update-quantity.spec.ts
│   │   └── remove-item.spec.ts
│   └── orders/                     # Feature: orders
│       ├── create-order.spec.ts
│       └── order-history.spec.ts
│
├── feature/                        # Feature tests (Playwright)
│   ├── auth/
│   │   └── auth.feature.spec.ts
│   ├── catalog/
│   │   └── catalog.feature.spec.ts
│   ├── cart/
│   │   └── cart.feature.spec.ts
│   └── orders/
│       └── orders.feature.spec.ts
│
├── e2e/                            # E2E tests
│   ├── auth.e2e.spec.ts
│   ├── shopping-flow.e2e.spec.ts
│   └── order-management.e2e.spec.ts
│
├── a11y/                           # Accessibility tests
│   ├── portal/
│   │   └── portal.a11y.spec.ts
│   └── admin/
│       └── admin.a11y.spec.ts
│
├── perf/                           # Performance tests
│   ├── catalog-load.perf.spec.ts
│   └── checkout-flow.perf.spec.ts
│
└── setup/                          # Setup scripts
    ├── index.ts
    ├── tenant.setup.ts
    ├── users.setup.ts
    ├── catalog.setup.ts
    ├── cart.setup.ts
    └── orders.setup.ts
```

### Test Tags for Filtering

Each test file should include tags for easy filtering:

```typescript
// test/feature/catalog/catalog.feature.spec.ts

/**
 * @feature catalog
 * @module product-listing
 * @priority P0
 * @dependencies tenant, products
 */
describe('Catalog Feature', () => {
  // Tests tagged with feature name
});
```

---

## Running Tests by Feature

### Command Pattern

```bash
# Run all tests for a feature
/test feature:catalog           # All catalog tests (unit + feature + e2e)
/test feature:cart              # All cart tests
/test feature:orders            # All orders tests
/test feature:auth              # All auth tests

# Run specific test type for a feature
/test unit:catalog              # Unit tests only
/test feature:catalog           # Feature tests only
/test e2e:catalog               # E2E tests only

# Run tests with dependencies setup
/test feature:cart --setup      # Setup cart prerequisites, then run tests
```

### Feature Test Registry

```typescript
// test/features.registry.ts

export const FEATURES = {
  auth: {
    name: 'Authentication',
    paths: ['test/unit/auth', 'test/feature/auth', 'test/e2e/auth'],
    setup: 'setup:auth',
    dependencies: ['tenant', 'users'],
    priority: 'P0'
  },
  catalog: {
    name: 'Catalog',
    paths: ['test/unit/catalog', 'test/feature/catalog'],
    setup: 'setup:catalog',
    dependencies: ['tenant', 'categories', 'products'],
    priority: 'P0'
  },
  cart: {
    name: 'Shopping Cart',
    paths: ['test/unit/cart', 'test/feature/cart'],
    setup: 'setup:cart',
    dependencies: ['catalog', 'pricing', 'auth'],
    priority: 'P0'
  },
  orders: {
    name: 'Orders',
    paths: ['test/unit/orders', 'test/feature/orders', 'test/e2e/orders'],
    setup: 'setup:orders',
    dependencies: ['cart', 'payment', 'shipping'],
    priority: 'P0'
  },
  quotes: {
    name: 'Quotes',
    paths: ['test/unit/quotes', 'test/feature/quotes'],
    setup: 'setup:quotes',
    dependencies: ['catalog', 'auth'],
    priority: 'P1'
  },
  contracts: {
    name: 'Contracts',
    paths: ['test/unit/contracts', 'test/feature/contracts'],
    setup: 'setup:contracts',
    dependencies: ['tenant', 'partner', 'users'],
    priority: 'P1'
  },
  admin: {
    name: 'Admin Portal',
    paths: ['test/unit/admin', 'test/feature/admin', 'test/e2e/admin'],
    setup: 'setup:admin',
    dependencies: ['tenant', 'products', 'orders', 'users'],
    priority: 'P1'
  }
};
```

---

## Test Data Fixtures

### Fixture Files

```
test/fixtures/
├── tenants/
│   ├── default-tenant.json
│   └── multi-tenant.json
├── users/
│   ├── customer.json
│   ├── admin.json
│   └── sales-rep.json
├── products/
│   ├── basic-products.json
│   └── full-catalog.json
├── categories/
│   └── default-categories.json
├── orders/
│   ├── pending-orders.json
│   └── completed-orders.json
└── contracts/
    └── sample-contracts.json
```

### Fixture Loading

```typescript
// test/fixtures/loader.ts

export async function loadFixture(name: string) {
  const path = `test/fixtures/${name}.json`;
  const data = await fs.readFile(path, 'utf8');
  return JSON.parse(data);
}

export async function seedDatabase(fixtures: string[]) {
  for (const fixture of fixtures) {
    const data = await loadFixture(fixture);
    await insertData(data);
  }
}
```

---

## Dependency Resolution

### Automatic Setup

When running tests, dependencies are resolved automatically:

```typescript
// test/setup/resolver.ts

export async function resolveAndSetup(feature: string) {
  const featureConfig = FEATURES[feature];
  const setupOrder = resolveDependencies(featureConfig.dependencies);

  console.log(`Setting up: ${setupOrder.join(' → ')}`);

  for (const dep of setupOrder) {
    await runSetup(dep);
  }
}

function resolveDependencies(deps: string[]): string[] {
  // Topological sort of dependencies
  const resolved: string[] = [];
  const seen = new Set<string>();

  function visit(dep: string) {
    if (seen.has(dep)) return;
    seen.add(dep);

    const config = FEATURES[dep];
    if (config?.dependencies) {
      config.dependencies.forEach(visit);
    }
    resolved.push(dep);
  }

  deps.forEach(visit);
  return resolved;
}
```

### Example: Cart Feature Setup

```
/test feature:cart --setup

Resolving dependencies for: cart
  → tenant (Level 1)
  → categories (Level 3)
  → products (Level 3)
  → pricing (Level 3)
  → users (Level 2)
  → auth (authenticate)

Setting up: tenant → users → categories → products → pricing → auth
✓ Tenant created: test-tenant
✓ Users created: customer@test.com, admin@test.com
✓ Categories created: 10
✓ Products created: 100
✓ Pricing configured
✓ Authenticated as: customer@test.com

Running cart tests...
```

---

## Quick Reference

### Feature → Test Mapping

| Feature | Unit Tests | Feature Tests | E2E Tests | Setup |
|---------|------------|---------------|-----------|-------|
| `auth` | `test/unit/auth/**` | `test/feature/auth/**` | `test/e2e/auth**` | `setup:auth` |
| `catalog` | `test/unit/catalog/**` | `test/feature/catalog/**` | - | `setup:catalog` |
| `cart` | `test/unit/cart/**` | `test/feature/cart/**` | `test/e2e/shopping**` | `setup:cart` |
| `orders` | `test/unit/orders/**` | `test/feature/orders/**` | `test/e2e/order**` | `setup:orders` |
| `quotes` | `test/unit/quotes/**` | `test/feature/quotes/**` | - | `setup:quotes` |
| `contracts` | `test/unit/contracts/**` | `test/feature/contracts/**` | - | `setup:contracts` |
| `admin` | `test/unit/admin/**` | `test/feature/admin/**` | `test/e2e/admin**` | `setup:admin` |

### Setup Dependency Chain

```
Platform → Tenant → Users → Categories → Products → Pricing → Cart → Orders
                  ↓
                Partner → Contracts
```

### Commands

```bash
# Run tests with automatic setup
/test feature:catalog --setup
/test feature:cart --setup
/test feature:orders --setup

# Run tests without setup (assumes data exists)
/test feature:catalog
/test unit:cart
/test e2e:orders

# Run specific setup only
/test setup:tenant
/test setup:catalog
/test setup:cart
```
