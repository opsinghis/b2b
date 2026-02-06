# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**B2B API** — Backend API service for the B2B Operations Platform. Built with NestJS, providing REST and GraphQL APIs consumed by frontend applications (Admin Portal, Customer Portal).

This is the **backend team's repository**. Frontend applications live in a separate repository (`b2b-web`).

## Repository Structure

```
b2b-api/
├── .claude/
│   ├── planning/          # Lisa phase artifacts
│   │   ├── architecture.md
│   │   ├── spec.md
│   │   ├── plan.md
│   │   └── METHODOLOGY.md
│   ├── execution/         # Ralph phase artifacts
│   │   ├── prd.json
│   │   ├── state.json
│   │   ├── blockers.json
│   │   ├── progress.txt
│   │   └── PROMPT.md
│   ├── ralph.sh           # Loop execution script
│   └── logs/              # Execution logs
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/            # Shared utilities
│   ├── core/              # Auth, tenants, users, audit
│   ├── business/          # Contracts, quotes, catalog, approvals
│   ├── platform/          # Notifications, files, dashboard
│   ├── agentic/           # AI agent orchestration
│   └── infrastructure/    # Database, cache, queue configs
├── prisma/
│   └── schema.prisma
├── test/
│   ├── integration/
│   ├── e2e/
│   └── factories/
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.observability.yml
└── package.json
```

## Development Methodology

This project uses the **Hybrid Lisa/Ralph Loop** approach.

**Key Files:**
- `.claude/planning/METHODOLOGY.md` — Execution guide
- `.claude/execution/state.json` — Current state (machine-readable)
- `.claude/execution/prd.json` — PRD items with completion criteria

**Phase Weights (Backend):**
```
Phase 0 (Foundation):    70% Lisa / 30% Ralph
Phase 1 (Core Infra):    50% Lisa / 50% Ralph
Phase 2 (Core Modules):  30% Lisa / 70% Ralph
Phase 3 (Business):      40% Lisa / 60% Ralph
Phase 4 (Platform):      30% Lisa / 70% Ralph
Phase 5 (Agentic):       60% Lisa / 40% Ralph
```

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript (strict mode)
- **Framework**: NestJS 10+
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Cache**: Redis 7+
- **Queue**: BullMQ (Redis-based)
- **Workflows**: Temporal.io
- **Auth**: Keycloak 23+ + JWT + CASL
- **API**: REST (OpenAPI/Swagger) + GraphQL (Apollo)
- **Storage**: MinIO (S3-compatible)
- **Search**: Elasticsearch 8+

## Infrastructure (All Dockerized)

```bash
# Start all infrastructure
docker-compose -f docker/docker-compose.yml up -d

# With observability stack
docker-compose -f docker/docker-compose.yml -f docker/docker-compose.observability.yml up -d
```

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Application database |
| Redis | 6379 | Cache + BullMQ queues |
| MinIO | 9000/9001 | File storage (API/Console) |
| Elasticsearch | 9200 | Search engine |
| Temporal | 7233/8080 | Workflows (gRPC/UI) |
| Keycloak | 8180 | Identity + SSO |

## Common Commands

```bash
# Development
npm run start:dev          # Start with hot reload
npm run build              # Build for production

# Testing
npm run test               # Unit tests
npm run test:cov           # With coverage
npm run test:integration   # Integration tests
npm run test:e2e           # End-to-end tests
npm run test:all           # All tests

# Database
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:seed        # Seed database
npm run prisma:studio      # Open Prisma Studio

# API Documentation
npm run openapi:export     # Export OpenAPI spec (for frontend team)

# Code Quality
npm run lint               # ESLint
npm run format             # Prettier
npm run typecheck          # TypeScript check

# Ralph Loop Execution
./.claude/ralph.sh         # Start autonomous execution
./.claude/ralph.sh --resume # Resume after human intervention
```

## Testing Stack

| Level | Tool | Location | Command |
|-------|------|----------|---------|
| Unit | Jest | `*.spec.ts` | `npm run test` |
| Integration | Jest + Testcontainers | `test/integration/` | `npm run test:integration` |
| E2E | Jest + Supertest | `test/e2e/` | `npm run test:e2e` |

**Coverage Requirements:** 80% minimum for all modules.

## API Contract (for Frontend Team)

This API exposes OpenAPI specification that the frontend team consumes:

```bash
# Export OpenAPI spec
npm run openapi:export

# Output: openapi.json (share with b2b-web team)
```

Frontend team generates their API client from this spec.

## Module Structure Convention

```
src/core/auth/
├── auth.module.ts          # Module definition
├── auth.controller.ts      # HTTP endpoints
├── auth.controller.spec.ts # Controller tests
├── auth.service.ts         # Business logic
├── auth.service.spec.ts    # Service tests
├── dto/                    # Data transfer objects
├── entities/               # Prisma types
├── guards/                 # Auth guards
└── interfaces/             # TypeScript interfaces
```

## Multi-Tenancy

- Tenant context from `X-Tenant-ID` header or JWT claim
- All queries auto-filtered by tenant (Prisma middleware)
- Row-Level Security (RLS) at PostgreSQL level

## State Management (Ralph Loop)

```
.claude/execution/state.json      → Current PRD item, iteration
.claude/execution/blockers.json   → Blockers with retry counts
.claude/execution/progress.txt    → Human-readable history
git log                           → What previous iterations did
```

**Memory = Files + Git, NOT context window.**

## PRD Items (Backend Only)

This repository covers PRD-000 through PRD-027:
- Phase 0: Foundation (PRD-000 to PRD-007)
- Phase 1: Core Infrastructure (PRD-008 to PRD-014)
- Phase 2: Core Modules (PRD-015 to PRD-017)
- Phase 3: Business Modules (PRD-018 to PRD-022)
- Phase 4: Platform Modules (PRD-023 to PRD-025)
- Phase 5: Agentic Layer (PRD-026 to PRD-027)
