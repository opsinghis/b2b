# Test Dependencies & Prerequisites (Backend API)

## Overview

This document maps test prerequisites and data setup requirements for the B2B API. Tests are organized by module with clear dependency chains.

---

## Dependency Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      TEST DATA HIERARCHY                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Level 0: Platform Setup                                         │
│  └── Database initialized (PostgreSQL)                          │
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

## Module Test Prerequisites

### Auth Module (`auth`)

| Prerequisite | Seed Scope | Required For |
|--------------|------------|--------------|
| Tenant exists | `tenants` | All auth tests |
| Valid user credentials | `users` | Login tests |
| Invalid user (for negative tests) | Built-in | Login failure tests |

```typescript
// test/setup/auth.setup.ts
beforeAll(async () => {
  await seedTenant();
  await seedUsers(['customer', 'admin']);
});
```

### Catalog Module (`catalog`, `master-catalog`, `tenant-catalog`)

| Prerequisite | Seed Scope | Required For |
|--------------|------------|--------------|
| Tenant exists | `tenants` | All catalog tests |
| Categories created | `categories` | Category filter tests |
| Products in master catalog | `products` | Product listing tests |
| Tenant product access | `tenant-access` | Tenant catalog tests |

```typescript
// test/setup/catalog.setup.ts
beforeAll(async () => {
  await seedTenant();
  await seedCategories(10);
  await seedProducts(100);
  await grantTenantAccess();
});
```

### Cart Module (`cart`)

| Prerequisite | Seed Scope | Required For |
|--------------|------------|--------------|
| All catalog prerequisites | `catalog` | Adding items |
| Customer user authenticated | `auth` | Cart operations |
| Products with pricing | `pricing` | Price calculations |

```typescript
// test/setup/cart.setup.ts
beforeAll(async () => {
  await seedCatalog(); // Includes tenant, products
  await seedPricing();
  await authenticateAsCustomer();
});
```

### Orders Module (`orders`)

| Prerequisite | Seed Scope | Required For |
|--------------|------------|--------------|
| All cart prerequisites | `cart` | Order creation |
| Historical orders (optional) | `orders` | Order history tests |

```typescript
// test/setup/orders.setup.ts
beforeAll(async () => {
  await seedCart(); // Includes catalog, auth
  await seedHistoricalOrders(5); // For history tests
});
```

### Quotes Module (`quotes`)

| Prerequisite | Seed Scope | Required For |
|--------------|------------|--------------|
| Catalog setup | `catalog` | Quote items |
| Customer user | `users` | Quote submission |
| Sales rep user | `users` | Quote approval |

```typescript
// test/setup/quotes.setup.ts
beforeAll(async () => {
  await seedCatalog();
  await seedUsers(['customer', 'sales_rep']);
});
```

### Contracts Module (`contracts`)

| Prerequisite | Seed Scope | Required For |
|--------------|------------|--------------|
| Tenant setup | `tenants` | Contract creation |
| Partner setup | `partners` | Partner contracts |
| Admin user | `users` | Contract management |

```typescript
// test/setup/contracts.setup.ts
beforeAll(async () => {
  await seedTenant();
  await seedPartner();
  await seedUsers(['customer', 'admin']);
  await seedContracts(3);
});
```

### Dashboard Module (`dashboard`)

| Prerequisite | Seed Scope | Required For |
|--------------|------------|--------------|
| Tenant setup | `tenants` | Dashboard access |
| Historical orders | `orders` | KPI calculations |
| Users | `users` | User metrics |

```typescript
// test/setup/dashboard.setup.ts
beforeAll(async () => {
  await seedTenant();
  await seedUsers(['admin']);
  await seedHistoricalOrders(50); // For meaningful KPIs
});
```

---

## Module-to-Test File Mapping

### Naming Convention

```
src/
├── business/                    # Business modules
│   ├── cart/
│   │   ├── cart.service.ts
│   │   ├── cart.service.spec.ts         # Unit test
│   │   ├── cart.controller.ts
│   │   └── cart.controller.spec.ts      # Controller test
│   ├── orders/
│   │   ├── orders.service.ts
│   │   └── orders.service.spec.ts
│   └── ...
├── core/                        # Core modules
│   ├── auth/
│   │   ├── auth.service.ts
│   │   └── auth.service.spec.ts
│   └── ...
└── ...

test/
├── integration/                 # Integration tests
│   ├── auth.integration.spec.ts
│   ├── catalog.integration.spec.ts
│   ├── cart.integration.spec.ts
│   └── orders.integration.spec.ts
├── e2e/                        # E2E tests (planned)
│   ├── auth.e2e.spec.ts
│   ├── shopping-flow.e2e.spec.ts
│   └── order-management.e2e.spec.ts
├── performance/                 # Performance tests (planned)
│   ├── catalog-load.perf.ts
│   └── checkout-flow.perf.ts
├── security/                    # Security tests (planned)
│   ├── injection.security.spec.ts
│   └── auth-bypass.security.spec.ts
├── chaos/                       # Chaos tests (planned)
│   ├── database-failure.chaos.spec.ts
│   └── cache-failure.chaos.spec.ts
└── setup/                       # Setup scripts
    ├── index.ts
    ├── tenant.setup.ts
    ├── users.setup.ts
    ├── catalog.setup.ts
    └── orders.setup.ts
```

---

## Seed Script Integration

### Prisma Seed with Scopes

The `prisma/seed.ts` should support scoped seeding:

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const scope = process.argv.find(arg => arg.startsWith('--scope='))?.split('=')[1];

  switch (scope) {
    case 'tenants':
      await seedTenants();
      break;
    case 'users':
      await seedTenants();
      await seedUsers();
      break;
    case 'catalog':
      await seedTenants();
      await seedCategories();
      await seedProducts();
      break;
    case 'cart':
      await seedTenants();
      await seedUsers();
      await seedCategories();
      await seedProducts();
      await seedPricing();
      break;
    case 'orders':
      await seedTenants();
      await seedUsers();
      await seedCategories();
      await seedProducts();
      await seedPricing();
      await seedOrders();
      break;
    case 'dashboard':
      await seedTenants();
      await seedUsers();
      await seedOrders(50); // More orders for KPIs
      break;
    default:
      // Full seed
      await seedAll();
  }
}

async function seedTenants() {
  return prisma.tenant.upsert({
    where: { slug: 'test-tenant' },
    create: {
      name: 'Test Tenant',
      slug: 'test-tenant',
      settings: { currency: 'USD', locale: 'en-US' }
    },
    update: {}
  });
}

async function seedUsers() {
  // Create test users for each role
  const roles = ['ADMIN', 'USER', 'SALES_REP'];
  for (const role of roles) {
    await prisma.user.upsert({
      where: { email: `${role.toLowerCase()}@test.com` },
      create: {
        email: `${role.toLowerCase()}@test.com`,
        name: `Test ${role}`,
        role,
        tenantId: 'test-tenant-id'
      },
      update: {}
    });
  }
}

// ... more seed functions
```

---

## Feature Test Registry

```typescript
// test/features.registry.ts

export const FEATURES = {
  auth: {
    name: 'Authentication',
    unitPaths: ['src/core/auth/**/*.spec.ts'],
    integrationPaths: ['test/integration/auth*.spec.ts'],
    e2ePaths: ['test/e2e/auth*.spec.ts'],
    seedScope: 'users',
    dependencies: ['tenants', 'users'],
    priority: 'P0'
  },
  catalog: {
    name: 'Catalog',
    unitPaths: ['src/business/master-catalog/**/*.spec.ts', 'src/business/tenant-catalog/**/*.spec.ts'],
    integrationPaths: ['test/integration/catalog*.spec.ts'],
    seedScope: 'catalog',
    dependencies: ['tenants', 'categories', 'products'],
    priority: 'P0'
  },
  cart: {
    name: 'Shopping Cart',
    unitPaths: ['src/business/cart/**/*.spec.ts'],
    integrationPaths: ['test/integration/cart*.spec.ts'],
    seedScope: 'cart',
    dependencies: ['catalog', 'pricing', 'users'],
    priority: 'P0'
  },
  orders: {
    name: 'Orders',
    unitPaths: ['src/business/orders/**/*.spec.ts'],
    integrationPaths: ['test/integration/orders*.spec.ts'],
    e2ePaths: ['test/e2e/order*.spec.ts'],
    seedScope: 'orders',
    dependencies: ['cart'],
    priority: 'P0'
  },
  quotes: {
    name: 'Quotes',
    unitPaths: ['src/business/quotes/**/*.spec.ts'],
    integrationPaths: ['test/integration/quotes*.spec.ts'],
    seedScope: 'quotes',
    dependencies: ['catalog', 'users'],
    priority: 'P1'
  },
  contracts: {
    name: 'Contracts',
    unitPaths: ['src/business/contracts/**/*.spec.ts'],
    integrationPaths: ['test/integration/contracts*.spec.ts'],
    seedScope: 'contracts',
    dependencies: ['tenants', 'partners', 'users'],
    priority: 'P1'
  },
  dashboard: {
    name: 'Dashboard',
    unitPaths: ['src/business/dashboard/**/*.spec.ts'],
    integrationPaths: ['test/integration/dashboard*.spec.ts'],
    seedScope: 'dashboard',
    dependencies: ['tenants', 'users', 'orders'],
    priority: 'P1'
  }
};
```

---

## Running Tests by Feature

### Command Pattern

```bash
# Run all tests for a feature
/test feature:catalog           # All catalog tests (unit + integration)
/test feature:cart              # All cart tests
/test feature:orders            # All orders tests

# Run with automatic setup
/test feature:cart --setup      # Seed data, then run tests

# Run specific test type for a feature
npm run test -- --testPathPattern="cart"           # Unit tests only
npm run test:integration -- --testPathPattern="cart"  # Integration only
```

### Test Execution Flow

```
/test feature:cart --setup

1. Parse arguments: feature=cart, setup=true
2. Look up FEATURES['cart']
3. Resolve dependencies: tenants → users → categories → products → pricing
4. Run seed with scope: npx prisma db seed -- --scope=cart
5. Execute tests:
   - npm run test -- --testPathPattern="cart" --coverage
   - npm run test:integration -- --testPathPattern="cart"
6. Report results
```

---

## Quick Reference

### Feature → Test Mapping

| Feature | Unit Tests | Integration Tests | Seed Scope |
|---------|------------|-------------------|------------|
| `auth` | `src/core/auth/**/*.spec.ts` | `test/integration/auth*` | `users` |
| `catalog` | `src/business/*-catalog/**/*.spec.ts` | `test/integration/catalog*` | `catalog` |
| `cart` | `src/business/cart/**/*.spec.ts` | `test/integration/cart*` | `cart` |
| `orders` | `src/business/orders/**/*.spec.ts` | `test/integration/orders*` | `orders` |
| `quotes` | `src/business/quotes/**/*.spec.ts` | `test/integration/quotes*` | `quotes` |
| `contracts` | `src/business/contracts/**/*.spec.ts` | `test/integration/contracts*` | `contracts` |
| `dashboard` | `src/business/dashboard/**/*.spec.ts` | `test/integration/dashboard*` | `dashboard` |

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
/test integration:orders

# Run specific module unit tests
npm run test -- --testPathPattern="cart"
npm run test -- --testPathPattern="orders"
```
