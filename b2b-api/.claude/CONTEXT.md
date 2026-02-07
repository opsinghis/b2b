# Application Context Summary

> **Living document** — Updated after every feature, bug fix, or improvement. Provides Claude with immediate context, reducing codebase exploration and token usage.

**Last Updated:** 2026-02-07
**Build Status:** Complete (PRD-000 through PRD-029)
**Test Status:** 433 unit tests passing (85.86% coverage)

---

## 🚀 Recent Changes (Last 5)

| Date | Type | Summary | Files Changed |
|------|------|---------|---------------|
| 2026-02-07 | Feature | PRD-029: Postman collection generator | scripts/, docs/postman/, README.md |
| 2026-02-07 | Bug Fix | BUG-004: Fixed Swagger asset paths (/api/docs → /docs) | src/main.ts |
| 2026-02-07 | Bug Fix | BUG-003: Fixed Swagger blank page & root 404 | src/main.ts |
| 2026-02-07 | Bug Fix | BUG-002: Fixed seed.ts field mapping for 9,488 products | prisma/seed.ts |
| 2026-02-07 | Bug Fix | BUG-001: Clear error when JWT_SECRET missing | jwt.strategy.ts, auth.module.ts |

---

## 🔄 In Progress

| Task | Started | Assignee | Notes |
|------|---------|----------|-------|
| _None_ | - | - | Rebuild complete |

---

## 🐛 Known Issues / Tech Debt

| ID | Type | Description | Priority | Module |
|----|------|-------------|----------|--------|
| TD-001 | Tests | Integration tests not yet created | P1 | test/ |
| TD-002 | Tests | E2E tests not yet created | P1 | test/ |

---

## Module Inventory

### Core Modules (`src/core/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| audit | ✅ Complete | audit.service.ts, audit.module.ts | Audit logging for all operations |
| auth | ✅ Complete | auth.service.ts, jwt.strategy.ts | Authentication (JWT, Keycloak ready) |
| authorization | ✅ Complete | casl-ability.factory.ts | CASL-based authorization |
| organizations | ✅ Complete | organizations.service.ts | Organization management |
| tenants | ✅ Complete | tenants.service.ts, tenant.middleware.ts | Multi-tenant isolation |
| users | ✅ Complete | users.service.ts | User management |

### Business Modules (`src/business/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| master-catalog | ✅ Complete | master-catalog.service.ts, dto/* | Platform-wide product catalog |
| tenant-catalog | ✅ Complete | tenant-catalog.service.ts | Tenant-specific pricing & access |
| contracts | ✅ Complete | contracts.service.ts | B2B contract management |
| quotes | ✅ Complete | quotes.service.ts | Quote creation & workflow |
| approvals | ✅ Complete | approvals.service.ts | Approval chains & routing |

### Platform Modules (`src/platform/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| dashboard | ✅ Complete | dashboard.service.ts | Analytics & reporting |
| files | ✅ Complete | files.service.ts | File upload/download (MinIO) |
| notifications | ✅ Complete | notifications.service.ts | Notification delivery |

### Agentic Layer (`src/agentic/`)

| Module | Status | Key Files | Purpose |
|--------|--------|-----------|---------|
| orchestrator | ✅ Complete | orchestrator.service.ts | Agent execution orchestration |
| tools | ✅ Complete | tools-registry.service.ts | Agent tool registry |

---

## Database Schema Summary

### Core Models
- `Tenant` - Multi-tenant isolation
- `Organization` - Organizations within tenants
- `User` - User accounts
- `AuditLog` - Audit trail

### Business Models
- `MasterProduct` - Platform product catalog (SKU, pricing, status)
- `TenantProductAccess` - Tenant-specific pricing & access
- `Contract` - B2B contracts
- `Quote` / `QuoteLineItem` - Quotes with line items
- `ApprovalChain` / `ApprovalStep` / `ApprovalRequest` - Approval workflow

### Enums
- `MasterProductStatus` - ACTIVE, DISCONTINUED, ARCHIVED
- `ApprovalEntity` - QUOTE, CONTRACT, etc.
- `ApprovalAction` - APPROVE, REJECT, REQUEST_CHANGES

---

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| Master Catalog architecture | Centralized products, tenant-specific pricing via TenantProductAccess |
| CASL for authorization | Flexible attribute-based access control |
| Multi-tenant middleware | Request-scoped tenant isolation |
| Prisma ORM | Type-safe database access |
| Docker Compose | PostgreSQL, Redis, MinIO, Elasticsearch |

---

## Test Infrastructure

| Type | Framework | Location | Status |
|------|-----------|----------|--------|
| Unit | Jest | `src/**/*.spec.ts` | 433 tests passing |
| Integration | Jest + Testcontainers | `test/integration/` | Config ready, no tests yet |
| E2E | Jest + Supertest | `test/e2e/` | Not yet created |

---

## Seed Data

### Location
`.claude/planning/data/cleaned_products.json` (9,488 products, 23MB)

### Import
Run `npm run prisma:seed` after database is running.

---

## Common Patterns

### Service Pattern
```typescript
@Injectable()
export class MyService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.myModel.findMany({ where: { tenantId } });
  }
}
```

### Controller Pattern
```typescript
@Controller('my-resource')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiTags('my-resource')
export class MyController {
  @Get()
  @CheckAbility({ action: 'read', subject: 'MyModel' })
  @ApiOperation({ summary: 'List resources' })
  async findAll(@CurrentTenant() tenant: Tenant) { ... }
}
```

---

## 📋 Changelog

### 2026-02-07 - PRD-029 Complete (Postman Collection)

- ✅ Created `scripts/generate-postman.ts` using openapi-to-postmanv2
- ✅ Generated `docs/postman/b2b-api.postman_collection.json` (691KB, 17 API folders)
- ✅ Generated `docs/postman/b2b-api.postman_environment.json` (5 variables)
- ✅ Collection-level pre-request script for automatic token refresh
- ✅ Login test script saves accessToken, refreshToken to environment
- ✅ All protected endpoints use `{{accessToken}}` and `{{tenantId}}` variables
- ✅ Added `npm run generate:postman` script
- ✅ Added Postman section to README.md
- ✅ All 433 unit tests still passing
- Files: `scripts/generate-postman.ts`, `docs/postman/*`, `package.json`, `README.md`, `.eslintignore`

### 2026-02-07 - BUG-004 Fixed

- ✅ Changed Swagger path from `/api/docs` to `/docs` to fix asset loading
- ✅ Disabled CSP in development mode (helmet) to allow Swagger UI scripts
- ✅ Root `/` now redirects to `/docs`
- ✅ Updated PRD-000 to reflect correct Swagger implementation
- ✅ All 433 unit tests still passing
- Files: `src/main.ts`, `.claude/execution/prd.json`

### 2026-02-07 - BUG-003 Fixed

- ✅ Fixed Swagger blank page by configuring helmet CSP to allow inline scripts
- ✅ Added root `/` redirect to `/api/docs`
- ✅ All 433 unit tests still passing
- Files: `src/main.ts`

### 2026-02-07 - BUG-002 Fixed

- ✅ Fixed seed.ts field mapping (product_id→sku, product_name→name, price→listPrice)
- ✅ Successfully imported 9,488 products into MasterProduct table
- ✅ All 433 unit tests still passing
- Files: `prisma/seed.ts`

### 2026-02-07 - BUG-001 Fixed

- ✅ Added clear error message when JWT_SECRET env var is missing
- ✅ Error now shows: "Copy .env.example to .env" instructions
- ✅ All 433 unit tests still passing
- Files: `src/core/auth/strategies/jwt.strategy.ts`, `src/core/auth/auth.module.ts`

### 2026-02-07 - Full Rebuild Complete

- ✅ All 32 PRD items completed (PRD-000 through PRD-028)
- ✅ 433 unit tests passing at 85.86% coverage
- ✅ Master Catalog with 9,488 products ready for seeding
- ✅ Docker infrastructure (PostgreSQL, Redis, MinIO, ES)
- ✅ CI/CD pipeline configured
- ⏳ Integration and E2E tests pending

