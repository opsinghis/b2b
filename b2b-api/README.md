# B2B API

Backend API for the B2B Operations Platform.

## Quick Start

### One Command Setup (Recommended)

```bash
# Copy environment file (first time only)
cp .env.example .env

# Start everything: Docker + Migrations + Seed + Server
npm run dev
```

### Manual Setup

```bash
# 1. Start Docker infrastructure
cd docker && docker-compose up -d && cd ..

# 2. Copy environment file
cp .env.example .env

# 3. Run database migrations
npx prisma migrate dev

# 4. (Optional) Seed database with products
npm run prisma:seed

# 5. Start the application
npm run start:dev
```

### Startup Script Options

| Command | Description |
|---------|-------------|
| `npm run dev` | Full startup (Docker + Seed + Server) |
| `npm run dev:skip-docker` | Skip Docker (if already running) |
| `npm run dev:seed-only` | Only seed database, don't start server |
| `./scripts/start-dev.sh --help` | Show all options |

```bash
# Direct script usage with multiple flags
./scripts/start-dev.sh --skip-docker --skip-seed
```

Application runs at: http://localhost:3000
Swagger docs at: http://localhost:3000/docs

---

## Startup Script

The `scripts/start-dev.sh` script automates the entire development environment setup.

### What It Does

| Step | Action | Description |
|------|--------|-------------|
| 1 | Start Docker | Launches all infrastructure services |
| 2 | Health Check | Waits for PostgreSQL and Redis to be ready |
| 3 | Migrations | Runs Prisma migrations |
| 4 | Seed Check | Seeds database only if empty (idempotent) |
| 5 | Start Server | Launches NestJS dev server with hot reload |

### Commands

```bash
# Full startup (recommended for first time)
npm run dev

# Skip Docker (if containers already running)
npm run dev:skip-docker

# Only seed database, don't start server
npm run dev:seed-only

# Direct script with custom flags
./scripts/start-dev.sh --skip-docker --skip-seed
```

### Available Flags

| Flag | Description |
|------|-------------|
| `--skip-docker` | Skip starting Docker services (use if already running) |
| `--skip-seed` | Skip database seeding |
| `--seed-only` | Only run seed, exit without starting server |
| `--help` | Show help message |

### Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  B2B API Development Startup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1/5] Starting Docker services...
✓ Docker services started

[2/5] Waiting for services to be healthy...
  PostgreSQL: ready
  Redis: ready

[3/5] Running database migrations...
✓ Migrations complete

[4/5] Checking database seed status...
✓ Database already seeded (1 tenant(s) found)

[5/5] Starting development server...

  API:     http://localhost:3000
  Swagger: http://localhost:3000/docs

  Test Credentials:
    Admin:    admin@b2b.local / Admin123!
    Customer: customer@b2b.local / Admin123!
```

---

## Docker Commands

```bash
# Start all services
cd docker && docker-compose up -d

# Check status
cd docker && docker-compose ps

# View logs
cd docker && docker-compose logs -f

# Stop services
cd docker && docker-compose down

# Stop and remove all data
cd docker && docker-compose down -v
```

### Services

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Main database |
| Redis | 6379 | Cache |
| MinIO | 9000, 9001 | File storage |
| Elasticsearch | 9200 | Search |
| Temporal | 7233 | Workflows |
| Temporal UI | 8080 | Workflow dashboard |
| Keycloak | 8180 | Identity provider |

---

## Development Commands

```bash
# Start dev server (with hot reload)
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod

# Lint code
npm run lint

# Format code
npm run format

# Type check
npx tsc --noEmit
```

---

## Database Commands

```bash
# Run migrations
npx prisma migrate dev

# Create new migration
npx prisma migrate dev --name migration-name

# Reset database
npx prisma migrate reset

# Seed database (idempotent - safe to run multiple times)
npm run prisma:seed

# Check if database is seeded
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.tenant.count().then(c=>{console.log(c>0?'✅ Seeded':'⚠️ Empty');p.\$disconnect()});"

# Open Prisma Studio (GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate
```

---

## Testing

### Test Commands

```bash
# Run unit tests
npm run test

# Run unit tests with coverage
npm run test:cov

# Run unit tests in watch mode
npm run test:watch

# Run integration tests (uses Testcontainers - spins up its own DB)
npm run test:integration

# Run integration tests using existing local database (faster, recommended)
npm run test:integration:local

  # Run only Auth tests
  npm run test:integration:local -- --testPathPattern="auth.integration"

  # Run only Cart tests
  npm run test:integration:local -- --testPathPattern="cart.integration"

  # Run only Catalog tests
  npm run test:integration:local -- --testPathPattern="catalog.integration"

  # Run only Orders tests
  npm run test:integration:local -- --testPathPattern="orders.integration"

  # Run only Payments tests
  npm run test:integration:local -- --testPathPattern="payments.integration"

# Run e2e tests (requires server running)
npm run test:e2e

# Run ALL tests
npm run test:all

# Run tests for a specific module
npm run test -- --testPathPattern="cart"
npm run test:integration -- --testPathPattern="auth"
```

### Test Types

| Test Type | Command | Server Required? | Description |
|-----------|---------|------------------|-------------|
| Unit | `npm run test` | No | Tests services/modules in isolation with mocks |
| Unit + Coverage | `npm run test:cov` | No | Unit tests with code coverage report |
| Integration | `npm run test:integration` | No | Tests with real database (Testcontainers) |
| E2E | `npm run test:e2e` | Yes | Tests complete API flows |

### Coverage Reports

Running `npm run test:cov` shows **both test results AND coverage**:

**Test Results:**
```
 PASS  src/business/cart/cart.service.spec.ts
 PASS  src/core/auth/auth.service.spec.ts

Test Suites: 433 passed, 433 total
Tests:       850 passed, 850 total
```

**Coverage Report:**
```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.2  |   78.4   |   89.1  |   84.8  |
 src/business/cart    |   92.3  |   85.0   |   95.0  |   91.5  |
 src/core/auth        |   95.5  |   90.0   |   98.0  |   95.0  |
----------------------|---------|----------|---------|---------|
```

**HTML Report (visual, line-by-line):**
```bash
# After running test:cov, open:
open coverage/lcov-report/index.html
```

### Coverage Metrics Explained

| Metric | What It Measures |
|--------|------------------|
| Statements | % of code statements executed by tests |
| Branches | % of if/else branches covered |
| Functions | % of functions called |
| Lines | % of lines executed |

### Test File Locations

```
src/
├── business/
│   ├── cart/
│   │   ├── cart.service.ts
│   │   └── cart.service.spec.ts      # Unit test (co-located)
│   └── ...
test/
├── integration/                       # Integration tests
│   ├── auth/
│   │   └── auth.integration.spec.ts
│   ├── cart/
│   │   └── cart.integration.spec.ts
│   └── ...
├── e2e/                               # E2E tests
│   └── ...
├── factories/                         # Test data factories
│   ├── tenant.factory.ts
│   ├── user.factory.ts
│   └── master-product.factory.ts
└── seed/                              # Test data seeding
    └── test-seed.ts
```

### Running E2E Tests

E2E tests require the server to be running:

```bash
# Terminal 1: Start the server
npm run start:dev

# Terminal 2: Run E2E tests
npm run test:e2e
```

### Test Credentials (from seed)

| User | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@b2b.local | Admin123! | SUPER_ADMIN |
| Manager | manager@b2b.local | Admin123! | MANAGER |
| Customer | customer@b2b.local | Admin123! | USER |
| Partner | partner@b2b.local | Admin123! | USER |

### Seeded Test Data

The seed script (`npm run prisma:seed`) creates:
- 1 Default Tenant
- 4 Users (admin, manager, customer, partner)
- 1 Demo Organization
- 9,488 Products (from catalog data)
- 108 Categories
- Tenant-Product access mappings

The seed is **idempotent** - safe to run multiple times without creating duplicates.

---

## Development Workflow Commands

Claude slash commands for different work types:

### Bug Fix
```
/fix-bug <description of the bug>
```
Example: `/fix-bug Login returns 500 error when email has special characters`

### New Feature
```
/feature <description or PRD ID>
```
Example: `/feature PRD-029` or `/feature Add export to CSV functionality`

### Enhancement
```
/enhance <description of improvement>
```
Example: `/enhance Improve query performance for product search`

### Manual Method

1. Create PRD in `.claude/planning/backlog/{bugs,features,enhancements}/`
2. Update `.claude/execution/dev-state.json`
3. Tell Claude: "Implement PRD-XXX using dev.sh workflow"

See `.claude/planning/backlog/TEMPLATES.md` for PRD templates.

---

## Project Structure

```
src/
├── core/           # Auth, tenants, users, organizations
├── business/       # Contracts, quotes, catalog, approvals
├── platform/       # Files, notifications, dashboard
├── agentic/        # AI orchestration, tools
└── common/         # Shared utilities, middleware

docker/             # Docker compose and init scripts
prisma/             # Database schema and migrations
test/               # Integration and e2e tests
.claude/            # Development workflow and planning
```

---

## Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://postgres:postgres@localhost:5432/b2b_dev` |
| `JWT_SECRET` | JWT signing key | (required) |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `PORT` | API port | `3000` |

---

## Postman Collection

A Postman collection is available for testing the API.

### Generate Collection

```bash
npm run generate:postman
```

This generates two files in `docs/postman/`:
- `b2b-api.postman_collection.json` - All API endpoints
- `b2b-api.postman_environment.json` - Environment variables

### Import into Postman

1. Open Postman
2. Click **Import** > **Upload Files**
3. Select both files from `docs/postman/`
4. Select the **"B2B API - Local"** environment from the environment dropdown

### Usage

1. **Login first**: Run the "Login with email and password" request in the Authentication folder
2. Tokens are automatically saved to environment variables
3. All other requests will use the saved token automatically
4. Token refresh is handled automatically via pre-request scripts

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `baseUrl` | `http://localhost:3000` | API base URL |
| `tenantId` | `default` | Tenant ID for multi-tenancy |
| `accessToken` | (auto-set) | JWT access token |
| `refreshToken` | (auto-set) | JWT refresh token |

---

## Useful Links

- Swagger Docs: http://localhost:3000/docs
- Prisma Studio: http://localhost:5555 (after `npx prisma studio`)
- MinIO Console: http://localhost:9001
- Temporal UI: http://localhost:8080
- Keycloak Admin: http://localhost:8180
