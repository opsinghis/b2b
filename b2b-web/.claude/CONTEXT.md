# Frontend Application Context Summary

> **Living document** — Updated after every feature, bug fix, or improvement. Provides Claude with immediate context, reducing codebase exploration and token usage.

**Last Updated:** 2026-02-07
**Build Status:** Not Started (FE-001 pending)
**Test Status:** No tests yet
**Total PRD Items:** 34 (FE-001 to FE-034)

---

## PRD Phases Overview

| Phase | Name | Items | Status |
|-------|------|-------|--------|
| 1 | Frontend Foundation | FE-001 to FE-006 | Pending |
| 2 | Admin Portal | FE-007 to FE-012 | Pending |
| 3 | Customer Portal | FE-013 to FE-020 | Pending |
| 4 | Shopping & Orders | FE-021 to FE-027 | Pending (API Blockers) |
| 5 | Discounts & Partner Features | FE-028 to FE-034 | Pending (API Blockers) |

---

## Backend API Reference

| Resource | Base URL | Status |
|----------|----------|--------|
| B2B API | http://localhost:3000 | Available |
| Swagger Docs | http://localhost:3000/docs | Available |
| Postman Collection | ../b2b-api/docs/postman/ | Available |

### Available Endpoints (Phase 1-3)

| Module | Endpoints | Used By |
|--------|-----------|---------|
| auth | login, register, refresh, logout | Both apps |
| users | CRUD, /me | Both apps |
| tenants | CRUD | Admin |
| organizations | CRUD, hierarchy | Admin |
| contracts | CRUD, workflow | Portal |
| quotes | CRUD, workflow | Portal |
| master-catalog | Products | Admin |
| catalog/products | Tenant pricing | Portal |
| approvals | Submit, actions | Portal |
| notifications | CRUD | Both apps |
| files | Upload, download | Both apps |
| dashboard | KPIs | Both apps |
| audit | Logs | Admin |

### Missing Endpoints (Phase 4-5) - See API Blockers

| Module | Description | Blocker ID |
|--------|-------------|------------|
| orders | Order management | API-001 |
| cart | Shopping cart | API-002 |
| salary-deduction | Employee salary deduction | API-003 |
| discount-tiers | Discount & promotions | API-004 |
| payment/delivery | Payment & delivery methods | API-005 |
| partners | Partner features | API-006 |
| catalog (enhanced) | Categories, search suggestions | API-007 |

---

## 🚀 Recent Changes (Last 5)

| Date | Type | Summary | Files Changed |
|------|------|---------|---------------|
| 2026-02-07 | Setup | PRD created with 34 items across 5 phases | prd.json |
| 2026-02-07 | Setup | API blockers created for Phase 4-5 | API-001 to API-007 |

---

## 🔄 In Progress

| Task | Started | Assignee | Notes |
|------|---------|----------|-------|
| _None_ | - | - | Project not started |

---

## 🚫 API Blockers

| ID | Feature | Missing Module | Blocking | Status |
|----|---------|----------------|----------|--------|
| API-001 | Orders | orders CRUD, tracking, reorder | FE-023,025,026,030 | Open |
| API-002 | Cart | cart CRUD, apply coupon | FE-022,023 | Open |
| API-003 | Salary Deduction | employee deduction limits, history | FE-024,027,031 | Open |
| API-004 | Discounts | tiers, promotions, coupons | FE-021,028,029,032 | Open |
| API-005 | Payment/Delivery | payment methods, addresses | FE-023,024 | Open |
| API-006 | Partners | partner profile, team, commission | FE-033,034 | Open |
| API-007 | Catalog | categories, product detail | FE-021 | Open |

**Note:** Phases 1-3 can be built with existing APIs. Phase 4-5 require backend work first.

---

## 🐛 Known Issues / Tech Debt

| ID | Type | Description | Priority | Module |
|----|------|-------------|----------|--------|
| _None yet_ | - | - | - | - |

---

## Key Features Summary

### Employee Features (Portal)
- Browse product catalog with personalized pricing
- Add to cart and checkout
- **Salary deduction payment** - deduct from next month's salary
- Order tracking and history
- View discount tier and savings

### Partner Features (Portal)
- Partner dashboard with commission tracking
- Team member management
- Order on behalf of team members
- Partner-specific discount tiers
- Partner resources access

### Admin Features
- Tenant, user, organization management
- Master catalog management
- **Discount tier management** - create and assign tiers
- **Promotion/coupon management**
- Order management and refunds
- **Salary deduction administration** - set limits, approve requests

---

## Module Inventory

### Apps

| App | Status | Port | Purpose |
|-----|--------|------|---------|
| admin | 🔴 Not Started | 3002 | Internal admin portal |
| portal | 🔴 Not Started | 3003 | Customer/partner/employee portal |

### Packages

| Package | Status | Purpose |
|---------|--------|---------|
| ui | 🔴 Not Started | Shared React components |
| api-client | 🔴 Not Started | Auto-generated from OpenAPI |
| config | 🔴 Not Started | Shared ESLint, TS, Tailwind |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS |
| Components | Radix UI primitives |
| Data Fetching | React Query (TanStack) |
| Auth | NextAuth.js v5 |
| Testing | Vitest + Playwright |
| Docs | Storybook |
| Monorepo | Turborepo + pnpm |

---

## Common Patterns

### API Hook Pattern
```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '@b2b/api-client';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  });
}
```

### Page Component Pattern
```typescript
// apps/admin/src/app/users/page.tsx
export default async function UsersPage() {
  return (
    <div>
      <h1>Users</h1>
      <UsersList />
    </div>
  );
}
```

### Form Pattern
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
});

export function UserForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });
  // ...
}
```

---

## 📋 Changelog

| Date | Change |
|------|--------|
| 2026-02-07 | Initial PRD with 34 items created |
| 2026-02-07 | API blockers API-001 to API-007 documented |
