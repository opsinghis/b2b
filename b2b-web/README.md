# B2B Web Platform

Frontend applications for the B2B Operations Platform built with Next.js 14, Turborepo, and TypeScript.

## Architecture

```
b2b-web/
├── apps/
│   ├── admin/          # Admin Portal (localhost:3002)
│   └── portal/         # Customer Portal (localhost:3003)
├── packages/
│   ├── ui/             # Shared UI components (@b2b/ui)
│   ├── api-client/     # Generated API client (@b2b/api-client)
│   ├── auth/           # Authentication package (@b2b/auth)
│   └── config/         # Shared configurations (@b2b/config)
└── turbo.json          # Turborepo configuration
```

## Prerequisites

- Node.js 18+
- pnpm 8+
- Backend API running (`b2b-api` on port 3000)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Start Backend API (Required)

```bash
cd ../b2b-api
npm run start:dev
```

Backend runs on: http://localhost:3000

### 3. Seed the Database (First Time Only)

```bash
cd ../b2b-api
npx prisma db seed
```

### 4. Start Frontend Applications

```bash
# Start both apps
pnpm dev

# Or start individually
pnpm --filter admin dev    # Admin Portal only
pnpm --filter portal dev   # Customer Portal only
```

## Application URLs

| Application | URL | Description |
|-------------|-----|-------------|
| Admin Portal | http://localhost:3002 | Tenant, user, catalog, order management |
| Customer Portal | http://localhost:3003 | Shopping, checkout, quotes, contracts |
| API Documentation | http://localhost:3000/docs | Swagger API docs |
| Storybook | http://localhost:6006 | UI component library |

## Test Users

All users use the same password: `Admin123!`

| Email | Password | Role | Use For |
|-------|----------|------|---------|
| `admin@b2b.local` | `Admin123!` | SUPER_ADMIN | Admin Portal - Full access |
| `manager@b2b.local` | `Admin123!` | MANAGER | Admin Portal - Limited admin |
| `customer@b2b.local` | `Admin123!` | USER | Customer Portal - Shopping |
| `partner@b2b.local` | `Admin123!` | USER | Customer Portal - Partner features |

## Available Scripts

```bash
# Development
pnpm dev                    # Start all apps in dev mode
pnpm --filter admin dev     # Start admin only
pnpm --filter portal dev    # Start portal only

# Build
pnpm build                  # Build all apps
pnpm --filter admin build   # Build admin only

# Linting & Testing
pnpm lint                   # Lint all packages
pnpm test                   # Run unit/feature tests

# E2E Tests (requires apps running)
pnpm test:e2e               # Run all E2E tests
pnpm test:e2e:portal        # Run portal E2E tests only
pnpm test:e2e:admin         # Run admin E2E tests only

# Accessibility Tests (requires apps running)
pnpm test:a11y              # Run all accessibility tests
pnpm test:a11y:portal       # Run portal a11y tests only
pnpm test:a11y:admin        # Run admin a11y tests only

# Run All Tests
pnpm test:all               # Unit + E2E + Accessibility

# UI Components
pnpm --filter ui storybook  # Start Storybook

# API Client
pnpm --filter api-client generate  # Regenerate API client from OpenAPI spec
```

## Environment Variables

Create `.env.local` files in each app directory:

### apps/portal/.env.local
```env
AUTH_SECRET=your-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3003
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_TENANT=default
```

### apps/admin/.env.local
```env
AUTH_SECRET=your-secret-key-min-32-chars
NEXTAUTH_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_TENANT=default
```

## Features

### Admin Portal (apps/admin)
- Tenant Management
- User Management
- Organization Management
- Master Catalog Management
- Order Management
- Discount Tiers & Promotions
- Salary Deduction Management
- Audit Logs
- Dashboard with KPIs

### Customer Portal (apps/portal)
- Product Catalog Browser
- Shopping Cart
- Multi-step Checkout
- Payment Methods (Invoice, PO, Credit Card, Salary Deduction)
- Order Tracking & History
- Quotes & Quote Builder
- Contracts Management
- Approvals Inbox
- Partner Dashboard
- Notifications
- File Attachments

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI Primitives
- **State Management**: React Query (TanStack Query)
- **Authentication**: NextAuth.js v5
- **Forms**: React Hook Form + Zod
- **Monorepo**: Turborepo + pnpm Workspaces
- **API Client**: Auto-generated from OpenAPI spec

## Troubleshooting

### "MissingSecret" Error
Create `.env.local` files with `AUTH_SECRET` in both `apps/admin` and `apps/portal`.

### API Connection Failed
Ensure the backend API is running on http://localhost:3000.

### Login Not Working
1. Check backend is running
2. Verify database is seeded: `cd ../b2b-api && npx prisma db seed`
3. Check `.env.local` has correct `NEXT_PUBLIC_API_URL`

### Build Errors
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```
