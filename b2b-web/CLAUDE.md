# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Quick Start:** Read `.claude/CONTEXT.md` first for immediate application understanding (modules, patterns, API dependencies). This reduces context-building time significantly.

## Project Overview

**B2B Web** — Frontend applications for the B2B Operations Platform. Built with Next.js, consuming APIs from the backend service (`b2b-api`).

This is the **frontend team's repository**. Backend API lives in a separate repository (`b2b-api`).

## Applications

| App | Purpose | Port |
|-----|---------|------|
| `apps/admin` | Internal admin portal | 3002 |
| `apps/portal` | Customer/partner portal | 3003 |

## Repository Structure

```
b2b-web/
├── .claude/
│   ├── planning/          # Lisa phase artifacts
│   └── execution/         # Ralph phase artifacts
├── apps/
│   ├── admin/             # Next.js Admin Portal
│   │   └── src/
│   │       ├── app/       # App Router pages
│   │       ├── components/
│   │       ├── lib/
│   │       └── hooks/
│   └── portal/            # Next.js Customer Portal
│       └── src/
│           ├── app/
│           ├── components/
│           ├── lib/
│           └── hooks/
├── packages/
│   ├── ui/                # Shared React components
│   ├── api-client/        # Generated from backend OpenAPI
│   └── config/            # Shared ESLint, TS, Tailwind
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Development Methodology

This project uses the **Hybrid Lisa/Ralph Loop** approach.

**Key Files:**
- **`.claude/CONTEXT.md`** — **READ THIS FIRST** - Application context summary
- `.claude/planning/METHODOLOGY.md` — Full methodology documentation
- `.claude/execution/prd.json` — PRD items with completion criteria
- `.claude/execution/dev-state.json` — Current development state
- `.claude/settings.json` — Project settings and API references

**Phase Weights (Frontend):**
```
Phase 1 (Foundation):      70% Lisa / 30% Ralph
Phase 2 (Admin Portal):    50% Lisa / 50% Ralph
Phase 3 (Customer Portal): 40% Lisa / 60% Ralph
```

## Workflow Commands

### `/feature FE-XXX` — Implement a PRD Feature
Execute a PRD item using Lisa/Ralph methodology:
1. Reads PRD item from `.claude/execution/prd.json`
2. Checks API dependencies against backend
3. Runs Lisa phase (planning) based on phase weight
4. Runs Ralph iterations until completion criteria met
5. Updates `dev-state.json` and `CONTEXT.md`

### `/fix-bug BUG-XXX` — Fix a Bug
Bug-first workflow (Ralph-heavy):
1. Reads bug definition from `.claude/planning/backlog/bugs/`
2. Creates reproduction test
3. Identifies root cause
4. Implements fix
5. Verifies all tests pass

### `/enhance ENH-XXX` — Implement Enhancement
Balanced workflow for improvements:
1. Reads enhancement from `.claude/planning/backlog/enhancements/`
2. Plans changes with existing code review
3. Implements with backward compatibility
4. Updates tests and documentation

## API Blockers

When a feature requires a backend API that is missing or insufficient:
1. Create blocker in `.claude/planning/backlog/api-blockers/API-XXX-description.json`
2. Document in `.claude/CONTEXT.md` under API Blockers section
3. Mark feature as blocked in `dev-state.json`
4. Continue with other non-blocked features

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **Components**: Radix UI primitives
- **Data Fetching**: React Query (TanStack Query)
- **Auth**: NextAuth.js v5 (Keycloak provider)
- **Testing**: Vitest + Playwright
- **Docs**: Storybook

## Common Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev                    # All apps
pnpm --filter admin dev     # Admin only (port 3002)
pnpm --filter portal dev    # Portal only (port 3003)

# Build
pnpm build                  # All apps
turbo run build             # With caching

# Testing
pnpm test                   # Unit tests
pnpm test:e2e               # E2E tests
pnpm --filter ui storybook  # Component docs (port 6006)

# API Client
pnpm --filter api-client generate  # Regenerate from OpenAPI

# Linting
pnpm lint
pnpm format
```

## API Contract

This frontend consumes the OpenAPI spec from `b2b-api`:

```bash
# Get latest spec from backend team
cp ../b2b-api/openapi.json packages/api-client/

# Regenerate client
pnpm --filter api-client generate
```

## Packages

### packages/ui
Shared React component library used by both apps.

```typescript
import { Button, Card, Input } from '@b2b/ui';
```

### packages/api-client
Auto-generated typed API client from backend OpenAPI spec.

```typescript
import { api } from '@b2b/api-client';

const users = await api.users.list();
```

### packages/config
Shared configurations for ESLint, TypeScript, Tailwind.

## PRD Items (Frontend)

This repository uses FE-XXX numbering (separate from backend PRD-XXX):

| Phase | Items | Description |
|-------|-------|-------------|
| Phase 1: Foundation | FE-001 to FE-006 | Turborepo, scaffolds, shared packages, auth |
| Phase 2: Admin Portal | FE-007 to FE-012 | Tenant, user, org management, catalog, audit, dashboard |
| Phase 3: Customer Portal | FE-013 to FE-020 | Dashboard, contracts, quotes, approvals, files, notifications |

**Naming Convention:**
- Features: `FE-XXX` (PRD items)
- Bugs: `BUG-XXX`
- Enhancements: `ENH-XXX`
- API Blockers: `API-XXX`

**Backlog Location:** `.claude/planning/backlog/`

## State Management (Ralph Loop)

```
.claude/execution/dev-state.json  → Current PRD, phase, iteration
.claude/execution/prd.json        → All PRD items with status
.claude/CONTEXT.md                → Living context summary
.claude/planning/backlog/         → Bugs, enhancements, API blockers
git log                           → Previous iteration work
```

**Memory = Files + Git, NOT context window.**

## Backend API Reference

| Resource | URL |
|----------|-----|
| B2B API | http://localhost:3000 |
| Swagger Docs | http://localhost:3000/docs |
| Postman Collection | ../b2b-api/docs/postman/ |

Before implementing features, verify API availability at the Swagger docs or Postman collection.
