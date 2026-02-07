# Feature Specifications (Backend API)

> The "what" document — user stories, acceptance criteria, and business requirements for the backend API.

---

## System-Wide Requirements

### SW-001: Multi-Tenancy
**As a** platform operator
**I want** complete tenant isolation
**So that** customer data never leaks between tenants

**Acceptance Criteria**:
- [ ] Every API request must have a tenant context
- [ ] Database queries automatically filter by tenant
- [ ] PostgreSQL RLS prevents cross-tenant access even with SQL injection
- [ ] Tenant ID cannot be spoofed via headers if JWT is present
- [ ] Super admin can access all tenants; others cannot

### SW-002: API-First Design
**As a** frontend developer / integration partner
**I want** comprehensive API documentation
**So that** I can integrate without reading backend code

**Acceptance Criteria**:
- [ ] All endpoints documented via OpenAPI/Swagger
- [ ] Swagger UI available at `/api/docs`
- [ ] Response schemas include examples
- [ ] Error codes documented with descriptions
- [ ] API versioning via URL prefix (`/api/v1/`)
- [ ] OpenAPI spec exportable for frontend team

### SW-003: Audit Trail
**As a** compliance officer
**I want** immutable audit logs of all changes
**So that** we can meet regulatory requirements

**Acceptance Criteria**:
- [ ] All CREATE, UPDATE, DELETE operations logged
- [ ] Audit records include: who, what, when, before, after
- [ ] Audit logs cannot be modified or deleted
- [ ] Audit logs queryable via API (read-only)
- [ ] Retention policy configurable per tenant

---

## Phase 0: Foundation

### F-001: Project Structure
**As a** developer
**I want** a well-organized NestJS project
**So that** I can navigate and extend the codebase easily

**Acceptance Criteria**:
- [ ] Directory structure matches CLAUDE.md specification
- [ ] TypeScript strict mode enabled
- [ ] Path aliases configured (@core, @business, @common)
- [ ] Environment variables validated on startup
- [ ] Graceful shutdown handling

### F-002: Unit Testing Infrastructure
**As a** developer
**I want** a robust unit testing setup
**So that** I can write and run tests efficiently

**Acceptance Criteria**:
- [ ] Jest configured with TypeScript support
- [ ] Module path aliases work in tests
- [ ] Coverage reporting enabled (HTML + LCOV)
- [ ] Coverage thresholds enforced (80% minimum)
- [ ] Watch mode works correctly
- [ ] Test utilities for mocking NestJS providers

### F-003: Integration Testing Infrastructure
**As a** developer
**I want** integration tests against real database
**So that** I can verify database interactions

**Acceptance Criteria**:
- [ ] Testcontainers spins up PostgreSQL for tests
- [ ] Each test file gets isolated database state
- [ ] Prisma client available in test context
- [ ] Factory pattern for generating test data
- [ ] Transactions rollback after each test

### F-004: E2E Testing Infrastructure
**As a** developer
**I want** end-to-end tests for API flows
**So that** I can verify complete user journeys

**Acceptance Criteria**:
- [ ] Supertest configured for HTTP assertions
- [ ] Full NestJS app bootstrapped for tests
- [ ] Test authentication helpers (get token for role)
- [ ] Docker Compose for test dependencies
- [ ] Parallel test execution supported

### F-005: Database Setup
**As a** developer
**I want** Prisma ORM configured
**So that** I can interact with PostgreSQL safely

**Acceptance Criteria**:
- [ ] Prisma schema with base models (User, Tenant)
- [ ] Migration workflow documented
- [ ] Seed script for development data
- [ ] Prisma Studio accessible
- [ ] Connection pooling configured
- [ ] Multi-tenancy fields on all models

### F-006: Local Development Environment
**As a** developer
**I want** Docker Compose for local services
**So that** I can run the full stack locally

**Acceptance Criteria**:
- [ ] PostgreSQL, Redis, MinIO, Elasticsearch containers
- [ ] Temporal, Keycloak containers
- [ ] Health checks on all services
- [ ] Volumes for data persistence
- [ ] `.env.example` with all required variables

---

## Phase 1: Core Infrastructure

### AUTH-001: User Registration
**Acceptance Criteria**:
- [ ] POST `/api/v1/auth/register` accepts email, password, name
- [ ] Email validated (RFC 5322 format)
- [ ] Password minimum 8 chars, 1 uppercase, 1 number
- [ ] Password hashed with bcrypt (cost factor 12)
- [ ] Duplicate email returns 409 Conflict
- [ ] Success returns user object (no password)
- [ ] Unit tests: validation, hashing, duplicate check
- [ ] Integration tests: full registration flow

### AUTH-002: User Login
**Acceptance Criteria**:
- [ ] POST `/api/v1/auth/login` accepts email, password
- [ ] Invalid credentials return 401 Unauthorized
- [ ] Success returns access token + refresh token
- [ ] Access token expires in 15 minutes
- [ ] Refresh token expires in 7 days
- [ ] Tokens contain: sub, tenantId, orgId, roles

### AUTH-003: Token Refresh
**Acceptance Criteria**:
- [ ] POST `/api/v1/auth/refresh` accepts refresh token
- [ ] Invalid/expired refresh token returns 401
- [ ] Success returns new access token + new refresh token
- [ ] Old refresh token invalidated (rotation)

### AUTH-004: Logout
**Acceptance Criteria**:
- [ ] POST `/api/v1/auth/logout` invalidates refresh token
- [ ] Token removed from database
- [ ] Subsequent refresh attempts fail

### AUTHZ-001: Role-Based Access Control
**Acceptance Criteria**:
- [ ] CASL configured with ability definitions
- [ ] Roles: super_admin, tenant_admin, manager, operator, viewer, partner
- [ ] `@Authorize()` decorator for controllers
- [ ] Denied access returns 403 Forbidden

### TENANT-001: Tenant Context Middleware
**Acceptance Criteria**:
- [ ] Middleware extracts tenant from JWT claim
- [ ] Falls back to X-Tenant-ID header (for API keys)
- [ ] Missing tenant returns 401
- [ ] Tenant context available via `@TenantContext()` decorator

### TENANT-002: Row-Level Security
**Acceptance Criteria**:
- [ ] RLS policies on all tenant-scoped tables
- [ ] Direct SQL cannot bypass tenant filter
- [ ] Super admin can access all data

---

## Phase 2: Core Modules

### TENANT-003: Tenant Management
**Acceptance Criteria**:
- [ ] CRUD endpoints for tenants (super_admin only)
- [ ] Tenant config: features, limits, branding
- [ ] Soft delete (deactivate, don't remove)

### ORG-001: Organization Management
**Acceptance Criteria**:
- [ ] CRUD endpoints for organizations
- [ ] Hierarchical structure (parent/child)
- [ ] Types: company, department, business_unit
- [ ] Hierarchy endpoint returns tree structure

### USER-001: User Management
**Acceptance Criteria**:
- [ ] CRUD endpoints for users
- [ ] Users belong to tenant + organization
- [ ] Role assignment via PATCH
- [ ] `GET /me` returns current user
- [ ] Password change requires current password

---

## Phase 3: Business Modules

### CONTRACT-001: Contract CRUD
**Acceptance Criteria**:
- [ ] CRUD endpoints for contracts
- [ ] Status: draft, review, negotiation, approved, active, expired
- [ ] Version history on updates
- [ ] Soft delete

### CONTRACT-002: Contract Workflow
**Acceptance Criteria**:
- [ ] Submit, approve, reject, activate endpoints
- [ ] State machine prevents invalid transitions
- [ ] Audit log on all transitions
- [ ] Notification sent on status change

### QUOTE-001: Quote CRUD
**Acceptance Criteria**:
- [ ] CRUD endpoints for quotes
- [ ] Line items with products/services
- [ ] Pricing rules applied automatically
- [ ] Validity period (expires after date)

### QUOTE-002: Quote Workflow
**Acceptance Criteria**:
- [ ] Submit, approve, reject endpoints
- [ ] Approval thresholds (e.g., >$50k needs director)
- [ ] Convert approved quote to contract

### APPROVAL-001: Approval Chains
**Acceptance Criteria**:
- [ ] Configure multi-level approval chains
- [ ] Conditions: amount thresholds, categories
- [ ] Delegation support (out of office)
- [ ] Escalation on SLA breach

### CATALOG-001: Master Catalog
**As a** platform administrator
**I want** a centralized product catalog
**So that** products are managed once and shared across tenants

**Acceptance Criteria**:
- [ ] MasterProduct model with SKU, name, description, listPrice
- [ ] MasterProductStatus: ACTIVE, DISCONTINUED, ARCHIVED
- [ ] Global SKU uniqueness enforced
- [ ] Admin-only CRUD endpoints for master products
- [ ] JSON attributes and metadata fields
- [ ] Bulk import via file upload (POST /admin/master-catalog/import)
- [ ] Batch processing (500 products per transaction)
- [ ] Import statistics returned (created, updated, failed counts)
- [ ] Seed script to load initial product catalog

### CATALOG-002: Tenant Product Access
**As a** tenant administrator
**I want** to control which products my organization can access
**So that** we only see relevant products with negotiated pricing

**Acceptance Criteria**:
- [ ] TenantProductAccess links tenant to master products
- [ ] Pricing options: agreedPrice (fixed) or discountPercent (% off list)
- [ ] Pricing hierarchy: agreedPrice > discountPercent > listPrice
- [ ] Quantity limits: minOrderQty, maxOrderQty
- [ ] Validity period: validFrom, validUntil dates
- [ ] isEnabled flag to temporarily disable access
- [ ] GET /catalog/products returns only accessible products
- [ ] GET /catalog/products/:id returns product with tenant pricing
- [ ] Bulk access grant for multiple products
- [ ] Discontinued products visible to existing partners

### CATALOG-003: Quote-Catalog Integration
**As a** sales representative
**I want** to add products from catalog to quotes
**So that** pricing is automatically calculated

**Acceptance Criteria**:
- [ ] CreateQuoteLineItemDto accepts masterProductId
- [ ] Product name, SKU, description auto-populated from catalog
- [ ] Unit price resolved from tenant's effective price
- [ ] Validation: tenant must have access to product
- [ ] Validation: product must not be ARCHIVED
- [ ] Backward compatible: manual line items still supported
- [ ] Quantities validated against min/max limits

---

## Phase 4: Platform Modules

### NOTIF-001: Notification System
**Acceptance Criteria**:
- [ ] In-app notifications (stored in DB)
- [ ] Email notifications (via queue)
- [ ] Preference management per user
- [ ] Mark as read / mark all read

### FILE-001: File Management
**Acceptance Criteria**:
- [ ] Upload to MinIO (S3-compatible)
- [ ] File metadata stored in database
- [ ] Tenant-scoped file access
- [ ] Signed URLs for downloads

---

## Phase 5: Agentic Layer

### AGENT-001: Tool Registry
**Acceptance Criteria**:
- [ ] `GET /api/v1/agent/tools` lists all tools
- [ ] Each tool has: name, description, parameters schema
- [ ] Tools registered via decorator
- [ ] Permission checks on tool execution

### AGENT-002: Task Execution
**Acceptance Criteria**:
- [ ] `POST /api/v1/agent/execute` runs tool
- [ ] Input validated against tool schema
- [ ] Execution logged for observability
- [ ] Timeout and retry policies
- [ ] Rate limiting per agent
