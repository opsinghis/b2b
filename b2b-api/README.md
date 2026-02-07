# B2B API

Backend API for the B2B Operations Platform.

## Quick Start

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

Application runs at: http://localhost:3000
Swagger docs at: http://localhost:3000/docs

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

# Seed database
npm run prisma:seed

# Open Prisma Studio (GUI)
npx prisma studio

# Generate Prisma client
npx prisma generate
```

---

## Test Commands

```bash
# Run unit tests
npm run test

# Run unit tests with coverage
npm run test:cov

# Run unit tests in watch mode
npm run test:watch

# Run integration tests (requires Docker)
npm run test:integration

# Run e2e tests (requires Docker)
npm run test:e2e
```

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
