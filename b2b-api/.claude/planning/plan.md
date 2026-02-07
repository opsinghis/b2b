# Implementation Plan (Backend API)

> The "how" document — technical decisions, patterns, conventions for the NestJS backend.

---

## Methodology: Hybrid Lisa/Ralph

See `METHODOLOGY.md` for full execution guide.

### Phase Weights (Backend)

| Phase | Lisa | Ralph | Reason |
|-------|------|-------|--------|
| Phase 0: Foundation | 70% | 30% | Architecture decisions |
| Phase 1: Core Infra | 50% | 50% | Security-critical |
| Phase 2: Core Modules | 30% | 70% | Patterns established |
| Phase 3: Business | 40% | 60% | Workflow design needed |
| Phase 4: Platform | 30% | 70% | Follow patterns |
| Phase 5: Agentic | 60% | 40% | New domain |

---

## Project Structure

```
b2b-api/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── common/                 # Shared utilities
│   │   ├── decorators/         # Custom decorators
│   │   ├── filters/            # Exception filters
│   │   ├── guards/             # Auth guards
│   │   ├── interceptors/       # Interceptors
│   │   ├── pipes/              # Validation pipes
│   │   └── testing/            # Test utilities
│   ├── core/                   # Core modules
│   │   ├── auth/
│   │   ├── tenants/
│   │   ├── organizations/
│   │   ├── users/
│   │   └── audit/
│   ├── business/               # Business modules
│   │   ├── contracts/
│   │   ├── quotes/
│   │   ├── catalog/
│   │   └── approvals/
│   ├── platform/               # Platform modules
│   │   ├── notifications/
│   │   ├── files/
│   │   └── dashboard/
│   ├── agentic/                # AI agent layer
│   │   ├── tools/
│   │   └── orchestrator/
│   └── infrastructure/         # Infrastructure
│       ├── database/
│       ├── cache/
│       └── queue/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── test/
│   ├── integration/
│   ├── e2e/
│   └── factories/
└── docker/
    ├── docker-compose.yml
    └── docker-compose.observability.yml
```

---

## Testing Strategy

**Testing is the foundation. No code without tests.**

### Test Pyramid

```
        /\
       /  \        E2E (10%)
      /----\       Critical flows only
     /      \
    /--------\     Integration (30%)
   /          \    API endpoints, DB queries
  /------------\
 /              \  Unit (60%)
/________________\ Services, utilities, guards
```

### Commands

```bash
npm run test               # Unit tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:integration   # Integration tests
npm run test:e2e           # E2E tests
npm run test:all           # All tests
```

### Coverage Requirements

| Module Type | Unit | Integration |
|-------------|------|-------------|
| Core (auth, tenants) | 90% | 80% |
| Business (contracts) | 85% | 70% |
| Platform (notifications) | 80% | 60% |
| Agentic | 80% | 70% |

---

## Dockerized Infrastructure

### Core Stack (docker/docker-compose.yml)

```yaml
services:
  postgres:        # PostgreSQL 15+ - App database
  redis:           # Redis 7+ - Cache + BullMQ
  minio:           # MinIO - S3-compatible storage
  elasticsearch:   # Elasticsearch 8+ - Search
  temporal:        # Temporal - Workflow orchestration
  temporal-ui:     # Temporal Web UI
  keycloak:        # Keycloak - Identity + SSO
```

### Port Allocations

| Service | Port |
|---------|------|
| API | 3000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
| Elasticsearch | 9200 |
| Temporal gRPC | 7233 |
| Temporal UI | 8080 |
| Keycloak | 8180 |

---

## Module Structure Convention

```
src/core/auth/
├── auth.module.ts          # Module definition
├── auth.controller.ts      # HTTP endpoints
├── auth.controller.spec.ts # Controller tests
├── auth.service.ts         # Business logic
├── auth.service.spec.ts    # Service tests
├── dto/
│   ├── login.dto.ts
│   └── register.dto.ts
├── entities/
├── guards/
└── interfaces/
```

---

## API Conventions

### REST Endpoints

```
GET    /api/v1/{resource}         # List (paginated)
GET    /api/v1/{resource}/:id     # Get one
POST   /api/v1/{resource}         # Create
PATCH  /api/v1/{resource}/:id     # Update
DELETE /api/v1/{resource}/:id     # Soft delete
```

### Response Format

```typescript
// Success
{ data: T, meta?: { pagination } }

// Error
{ error: { code: string, message: string, details?: any } }
```

### OpenAPI Export (for Frontend Team)

```bash
npm run openapi:export
# Output: openapi.json
```

Frontend team uses this to generate their API client.

---

## Multi-Tenancy

### Middleware Pattern

```typescript
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.user?.tenantId || req.headers['x-tenant-id'];
    if (!tenantId) throw new UnauthorizedException('Tenant required');
    req.tenantContext = { id: tenantId };
    next();
  }
}
```

### Prisma Middleware

```typescript
prisma.$use(async (params, next) => {
  if (params.model && tenantScopedModels.includes(params.model)) {
    params.args.where = { ...params.args.where, tenantId };
  }
  return next(params);
});
```

### PostgreSQL RLS

```sql
CREATE POLICY tenant_isolation ON contracts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## Authentication

### JWT Structure

```typescript
{
  sub: string;        // User ID
  tenantId: string;   // Tenant ID
  orgId: string;      // Organization ID
  roles: string[];    // RBAC roles
  iat: number;
  exp: number;
}
```

### Token Lifecycle

- Access token: 15 minutes
- Refresh token: 7 days (with rotation)

---

## Authorization (CASL)

```typescript
const ability = defineAbility((can, cannot) => {
  if (user.role === 'admin') {
    can('manage', 'all');
  } else if (user.role === 'manager') {
    can('read', 'Contract');
    can('update', 'Contract', { ownerId: user.id });
    can('approve', 'Quote', { amount: { $lte: 50000 } });
  }
});
```

---

## Master Catalog Architecture

### Overview

The Master Catalog is a platform-level product repository that:
- Stores products centrally (no tenant duplication)
- Provides tenant-specific pricing via TenantProductAccess
- Supports discontinued products for existing partners
- Integrates with quotes for automatic pricing

### Schema

```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER CATALOG                           │
│  MasterProduct (platform-wide, no tenantId)                 │
│  - SKU globally unique                                      │
│  - List price (MSRP)                                        │
│  - Status: ACTIVE / DISCONTINUED / ARCHIVED                 │
└─────────────────────┬───────────────────────────────────────┘
                      │ 1:N
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              TENANT PRODUCT ACCESS                          │
│  - Links tenant to master product                           │
│  - agreedPrice (fixed price override)                       │
│  - discountPercent (% off list price)                       │
│  - Quantity limits (minOrderQty, maxOrderQty)               │
│  - Validity period (validFrom, validUntil)                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  QUOTE LINE ITEMS                           │
│  - References masterProductId                               │
│  - Price from TenantProductAccess for that tenant           │
│  - Falls back to listPrice if no agreed price               │
└─────────────────────────────────────────────────────────────┘
```

### Pricing Hierarchy

```typescript
function calculateEffectivePrice(
  listPrice: number,
  agreedPrice: number | null,
  discountPercent: number | null,
): number {
  // 1. Agreed price takes precedence (fixed negotiated price)
  if (agreedPrice !== null) return agreedPrice;

  // 2. Discount percent applied to list price
  if (discountPercent !== null) {
    return listPrice * (1 - discountPercent / 100);
  }

  // 3. Fall back to list price
  return listPrice;
}
```

### Module Structure

```
src/business/master-catalog/
├── master-catalog.module.ts
├── master-catalog.service.ts
├── master-catalog.controller.ts
├── master-catalog-admin.controller.ts
├── import.service.ts
└── dto/
    ├── create-master-product.dto.ts
    ├── update-master-product.dto.ts
    └── import.dto.ts

src/business/tenant-catalog/
├── tenant-catalog.module.ts
├── tenant-catalog.service.ts
├── tenant-catalog.controller.ts
└── dto/
    ├── tenant-product-response.dto.ts
    ├── list-tenant-products.dto.ts
    ├── grant-product-access.dto.ts
    └── update-product-pricing.dto.ts
```

### API Endpoints

**Master Catalog (Admin)**
```
GET    /api/v1/master-catalog/products        # List all products
GET    /api/v1/master-catalog/products/:id    # Get by ID
GET    /api/v1/master-catalog/products/sku/:sku  # Get by SKU
POST   /api/v1/master-catalog/products        # Create
PATCH  /api/v1/master-catalog/products/:id    # Update
POST   /api/v1/master-catalog/products/:id/discontinue  # Mark discontinued
POST   /api/v1/admin/master-catalog/import    # Bulk import (file upload)
POST   /api/v1/admin/master-catalog/grant-tenant-access  # Bulk grant
```

**Tenant Catalog (Tenant-scoped)**
```
GET    /api/v1/catalog/products               # List tenant's accessible products
GET    /api/v1/catalog/products/:id           # Get product with tenant pricing
POST   /api/v1/catalog/products/:id/access    # Grant access (admin)
PUT    /api/v1/catalog/products/:id/pricing   # Update pricing (admin)
DELETE /api/v1/catalog/products/:id/access    # Revoke access (admin)
```

### Import Service

```typescript
// Batch import configuration
const BATCH_SIZE = 500;

// Import from JSON file
async importProducts(
  data: ImportProductDto[],
  options: ImportOptionsDto,
): Promise<ImportResultDto> {
  // Process in batches with createMany
  // skipDuplicates for idempotency
  // Return statistics: created, skipped, failed
}
```

### Seed Data Location

Product catalog seed data is stored in `.claude/planning/data/`:

```
.claude/planning/data/
├── README.md                 # Documentation
└── cleaned_products.json     # 9,488 products (23MB)
```

The seed script (`prisma/seed.ts`) automatically imports this data during setup:

```bash
npm run prisma:seed
```

---

## API Documentation

### Swagger/OpenAPI Setup

All API endpoints are documented and available at `/api/docs`:

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('B2B API')
  .setDescription('B2B Operations Platform API')
  .setVersion('1.0')
  .addBearerAuth()
  .addApiKey({ type: 'apiKey', name: 'X-Tenant-ID', in: 'header' }, 'tenant-id')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Accessing Documentation

- **Swagger UI**: `http://localhost:3000/api/docs`
- **OpenAPI JSON**: `http://localhost:3000/api/docs-json`
- **OpenAPI YAML**: `http://localhost:3000/api/docs-yaml`

### Export for Frontend Team

```bash
npm run openapi:export
# Output: openapi.json
```

---

## Implementation Order (PRD Sequence)

```
Phase 0: Foundation
├── PRD-000: Project scaffold
├── PRD-001: Unit testing infrastructure
├── PRD-002: Integration testing infrastructure
├── PRD-003: E2E testing infrastructure
├── PRD-004: Database setup (Prisma)
├── PRD-005: Docker Compose - Core
├── PRD-006: Docker Compose - Workflow & Auth
├── PRD-007: Docker Compose - Observability
└── PRD-008: CI Pipeline

Phase 1: Core Infrastructure
├── PRD-009: Multi-tenancy middleware
├── PRD-010: PostgreSQL RLS
├── PRD-011: Auth - Registration & Login
├── PRD-012: Auth - Token Refresh & Logout
├── PRD-013: Authorization (CASL)
├── PRD-014: Audit logging
└── PRD-015: Global error handling

Phase 2: Core Modules
├── PRD-016: Tenants module
├── PRD-017: Organizations module
└── PRD-018: Users module

Phase 3: Business Modules
├── PRD-019: Contracts - CRUD
├── PRD-020: Contracts - Workflow
├── PRD-021: Quotes module
├── PRD-022: Master Catalog - Schema & Module
├── PRD-022a: Master Catalog - Admin Import
├── PRD-022b: Tenant Catalog - Access & Pricing
├── PRD-022c: Quote Integration - Master Catalog
└── PRD-023: Approvals module

Phase 4: Platform Modules
├── PRD-024: Notifications module
├── PRD-025: Files module
└── PRD-026: Dashboard module

Phase 5: Agentic Layer
├── PRD-027: Tool registry
└── PRD-028: Agent orchestrator
```

---

## Code Conventions

### TypeScript

- Strict mode enabled
- No `any` types
- Use named exports (not default)
- One class per file

### Naming

- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`

### Error Handling

```typescript
// Custom exceptions
throw new BusinessException('QUOTE_EXPIRED', 'Quote has expired');

// Global filter transforms to standard response
{
  error: {
    code: 'QUOTE_EXPIRED',
    message: 'Quote has expired',
    timestamp: '...',
    path: '/api/v1/quotes/123/accept'
  }
}
```

### Logging

```typescript
// Structured logging with Pino
this.logger.info({ userId, action: 'quote_created', quoteId }, 'Quote created');
```
