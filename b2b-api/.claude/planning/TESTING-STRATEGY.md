# Backend API Testing Strategy

> **Team:** Backend API
> **Last Updated:** 2024-01-20
> **Owner:** Backend Team Lead

## Overview

This document outlines the testing strategy for the B2B API backend service built with NestJS.

---

## Test Types

| Test Type | Tool | Purpose | Location |
|-----------|------|---------|----------|
| Unit | Jest | Test services/modules in isolation | `*.spec.ts` (co-located) |
| Integration | Jest + Testcontainers | Test with real database | `test/integration/` |
| E2E | Jest + Supertest | Test complete API flows | `test/e2e/` |
| Performance | k6 | Load/stress testing | `test/performance/` |
| Security | Custom + npm audit | Vulnerability testing | `test/security/` |
| Chaos | Custom | Failure resilience | `test/chaos/` |

---

## Test Infrastructure

### Technology Stack

| Tool | Purpose |
|------|---------|
| Jest | Test runner |
| Supertest | HTTP assertions |
| Testcontainers | Containerized PostgreSQL for integration tests |
| k6 | Load testing |
| OWASP ZAP | Security scanning (optional) |

### Configuration Files

| File | Purpose |
|------|---------|
| `jest.config.js` | Unit test configuration |
| `test/integration/jest.integration.config.js` | Integration test configuration |
| `test/e2e/jest.e2e.config.js` | E2E test configuration |
| `test/setup.ts` | Global test setup |

---

## Test File Organization

### Directory Structure

```
b2b-api/
├── src/
│   ├── business/
│   │   ├── cart/
│   │   │   ├── cart.service.ts
│   │   │   ├── cart.service.spec.ts      # Unit test (co-located)
│   │   │   └── cart.controller.spec.ts
│   │   ├── orders/
│   │   │   ├── orders.service.ts
│   │   │   └── orders.service.spec.ts
│   │   └── ...
│   ├── core/
│   │   ├── auth/
│   │   │   ├── auth.service.ts
│   │   │   └── auth.service.spec.ts
│   │   └── ...
│   └── platform/
│       └── ...
├── test/
│   ├── setup.ts                           # Global setup
│   ├── factories/                         # Test data factories
│   │   ├── index.ts
│   │   ├── tenant.factory.ts
│   │   ├── user.factory.ts
│   │   └── master-product.factory.ts
│   ├── integration/                       # Integration tests
│   │   ├── jest.integration.config.js
│   │   ├── setup-global.ts
│   │   ├── setup-after-env.ts
│   │   ├── teardown-global.ts
│   │   ├── auth/
│   │   │   └── auth.integration.spec.ts
│   │   ├── cart/
│   │   │   └── cart.integration.spec.ts
│   │   ├── catalog/
│   │   │   └── catalog.integration.spec.ts
│   │   └── orders/
│   │       └── orders.integration.spec.ts
│   ├── e2e/                               # E2E tests
│   │   ├── jest.e2e.config.js
│   │   ├── setup-after-env.ts
│   │   └── helpers/
│   │       └── auth.helper.ts
│   ├── seed/                              # Test data seeding
│   │   └── test-seed.ts
│   ├── performance/                       # Performance tests
│   │   └── scenarios/
│   ├── security/                          # Security tests
│   └── chaos/                             # Chaos tests
```

### Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Unit test | `[name].spec.ts` | `cart.service.spec.ts` |
| Integration test | `[module].integration.spec.ts` | `cart.integration.spec.ts` |
| E2E test | `[flow].e2e-spec.ts` | `checkout.e2e-spec.ts` |
| Performance test | `[scenario].perf.ts` | `catalog-load.perf.ts` |

---

## Test Commands

```bash
# Unit tests
npm run test                              # Run all unit tests
npm run test:watch                        # Watch mode
npm run test:cov                          # With coverage
npm run test -- --testPathPattern="cart"  # Specific module

# Integration tests
npm run test:integration                  # Run all integration tests
npm run test:integration -- --testPathPattern="cart"

# E2E tests
npm run test:e2e                          # Run all E2E tests

# Performance tests
k6 run test/performance/scenarios/load.js

# Security tests
npm audit                                 # Dependency audit
npm run test:security                     # Security test suite

# Seed test data
npx ts-node test/seed/test-seed.ts --scope=cart
npx ts-node test/seed/test-seed.ts --scope=orders
```

---

## Writing Tests

### Unit Test Example

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '@common/prisma/prisma.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: PrismaService;

  const mockPrisma = {
    cart: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getCart', () => {
    it('should return cart for user', async () => {
      const mockCart = { id: '1', items: [] };
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);

      const result = await service.getCart('user-1', 'tenant-1');

      expect(result).toEqual(mockCart);
      expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith({
        where: { userId_tenantId: { userId: 'user-1', tenantId: 'tenant-1' } },
      });
    });
  });
});
```

### Integration Test Example

```typescript
/**
 * @module cart
 * @feature shopping-cart
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { TenantFactory, UserFactory, MasterProductFactory } from '../../factories';

describe('Cart Integration Tests', () => {
  let app: INestApplication;
  let tenantFactory: TenantFactory;
  let userFactory: UserFactory;
  let productFactory: MasterProductFactory;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Initialize factories
    const prisma = moduleFixture.get(PrismaService);
    tenantFactory = new TenantFactory(prisma);
    userFactory = new UserFactory(prisma);
    productFactory = new MasterProductFactory(prisma);
  });

  beforeEach(async () => {
    // Create test data
    const tenant = await tenantFactory.create();
    const user = await userFactory.create({ tenantId: tenant.id });
    const product = await productFactory.createWithTenantAccess({ tenantId: tenant.id });

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Password123!' });
    authToken = loginResponse.body.accessToken;
  });

  describe('POST /api/v1/cart/items', () => {
    it('should add item to cart', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ productId: product.id, quantity: 2 })
        .expect(201);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items).toHaveLength(1);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
```

### Using Test Factories

```typescript
import { TenantFactory, UserFactory, MasterProductFactory } from '../factories';

// Create a tenant
const tenant = await tenantFactory.create();
const tenant2 = await tenantFactory.create({ slug: 'custom-slug' });

// Create users
const user = await userFactory.create({ tenantId: tenant.id });
const admin = await userFactory.createAdmin({ tenantId: tenant.id });

// Create products
const product = await productFactory.create();
const productWithAccess = await productFactory.createWithTenantAccess({
  tenantId: tenant.id
});
```

---

## Test Data Seeding

### Scoped Seeding

The `test/seed/test-seed.ts` supports scoped seeding:

```bash
# Seed for auth tests (tenant + users)
npx ts-node test/seed/test-seed.ts --scope=auth

# Seed for catalog tests (tenant + categories + products)
npx ts-node test/seed/test-seed.ts --scope=catalog

# Seed for cart tests (catalog + users + pricing)
npx ts-node test/seed/test-seed.ts --scope=cart

# Seed for orders tests (cart + historical orders)
npx ts-node test/seed/test-seed.ts --scope=orders

# Seed all test data
npx ts-node test/seed/test-seed.ts
```

### Dependency Chain

```
Platform → Tenant → Users → Categories → Products → Pricing → Cart → Orders
                  ↓
                Partner → Contracts
```

---

## Test Coverage Requirements

### Coverage Thresholds

Configured in `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
},
```

### Excluded from Coverage

- `*.module.ts` (NestJS modules)
- `*.dto.ts` (Data transfer objects)
- `*.entity.ts` (Database entities)
- `*.interface.ts` (TypeScript interfaces)
- `*.constants.ts` (Constants)
- `*.decorator.ts` (Custom decorators)
- `*.strategy.ts` (Auth strategies)
- `*.guard.ts` (Auth guards)
- `*.controller.ts` (Controllers - tested via integration)
- `*.interceptor.ts` (Interceptors)

---

## CI/CD Integration

### Test Execution Pipeline

```yaml
# .github/workflows/test.yml
name: Backend Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:cov
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: b2b_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test:e2e

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
```

### Quality Gates

| Gate | Requirement |
|------|-------------|
| Unit test coverage | ≥ 80% |
| All tests passing | 100% |
| No high/critical vulnerabilities | 0 |
| Integration tests passing | 100% |

---

## Performance Testing with k6

### Example Load Test

```javascript
// test/performance/scenarios/load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up
    { duration: '1m', target: 50 },   // Stay at 50
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/v1/catalog/products');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

---

## Related Documentation

- [TEST-COVERAGE-MATRIX.md](./TEST-COVERAGE-MATRIX.md) - Detailed coverage tracking
- [TEST-DEPENDENCIES.md](./TEST-DEPENDENCIES.md) - Test prerequisites and setup
- [test.md](../commands/test.md) - Test command reference

---

## Extending the Strategy

### Adding Tests for a New Module

1. Create unit tests in `src/[domain]/[module]/[module].service.spec.ts`
2. Create integration tests in `test/integration/[module]/`
3. Add factory if new entity type
4. Update TEST-COVERAGE-MATRIX.md
5. Add to scoped seeding if needed

### Adding a New Test Type

1. Update this document
2. Create configuration file
3. Add npm script to package.json
4. Add to CI/CD pipeline
5. Document in test commands
