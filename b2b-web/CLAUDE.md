# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Hybrid Lisa/Ralph Loop** - See `.claude/planning/METHODOLOGY.md`

**Phase Weights (Frontend):**
```
Phase 6 (Foundation):     70% Lisa / 30% Ralph
Phase 7 (Admin Portal):   50% Lisa / 50% Ralph
Phase 8 (Customer Portal): 40% Lisa / 60% Ralph
```

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

## PRD Items (Frontend Only)

This repository covers PRD-029 through PRD-043:
- Phase 6: Foundation (PRD-029 to PRD-033)
- Phase 7: Admin Portal (PRD-034 to PRD-038)
- Phase 8: Customer Portal (PRD-039 to PRD-043)

## State Management (Ralph Loop)

```
.claude/execution/state.json      → Current PRD, iteration
.claude/execution/blockers.json   → Blockers with retries
git log                           → Previous iteration work
```

**Memory = Files + Git, NOT context window.**
