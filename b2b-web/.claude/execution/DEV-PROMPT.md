# Implement: FE-028 - Admin - Discount Tiers Management (Iteration 1)

You are building a B2B e-commerce frontend application.

## Project Structure
- apps/admin - Next.js 14 Admin Portal (port 3002)
- apps/portal - Next.js 14 Customer Portal (port 3003)
- packages/ui - Shared React components (@b2b/ui)
- packages/api-client - Generated API client (@b2b/api-client)
- packages/config - Shared configs

## Tech Stack
- Next.js 14+ with App Router
- TypeScript (strict mode)
- Tailwind CSS
- Radix UI primitives
- React Query (TanStack Query)
- pnpm workspaces + Turborepo

## Current Feature
**ID:** FE-028
**Title:** Admin - Discount Tiers Management
**Module:** apps/admin

## Completion Criteria (ALL must be met)
- Discount tiers list
- Create/edit discount tier form
- Tier levels (Bronze, Silver, Gold, Platinum)
- Percentage discount per tier
- Eligibility rules editor
- Assign users/organizations to tiers
- Tier validity period settings
- Bulk tier assignment

## API Dependencies
- GET /api/v1/admin/discount-tiers - List all discount tiers
- POST /api/v1/admin/discount-tiers - Create discount tier
- PATCH /api/v1/admin/discount-tiers/:id - Update discount tier
- DELETE /api/v1/admin/discount-tiers/:id - Delete discount tier
- POST /api/v1/admin/discount-tiers/:id/assign - Assign tier to users/orgs

Backend API: http://localhost:3000
Swagger Docs: http://localhost:3000/docs

## Plan
# Plan: FE-028 - Admin - Discount Tiers Management

## Module: apps/admin

## Completion Criteria
- [ ] Discount tiers list
- [ ] Create/edit discount tier form
- [ ] Tier levels (Bronze, Silver, Gold, Platinum)
- [ ] Percentage discount per tier
- [ ] Eligibility rules editor
- [ ] Assign users/organizations to tiers
- [ ] Tier validity period settings
- [ ] Bulk tier assignment

## API Dependencies
- GET /api/v1/admin/discount-tiers [available]
- POST /api/v1/admin/discount-tiers [available]
- PATCH /api/v1/admin/discount-tiers/:id [available]
- DELETE /api/v1/admin/discount-tiers/:id [available]
- POST /api/v1/admin/discount-tiers/:id/assign [available]

## Implementation Plan
<!-- Claude: Fill this section during Lisa phase -->

### Components to Create
- 

### State Management
- 

### Testing Strategy
- 

## Ready for Ralph: [ ]

## Previous Iteration Output


## Instructions
1. Implement ALL completion criteria for this feature
2. Create necessary files, components, pages
3. Follow Next.js 14 App Router patterns
4. Use TypeScript strict mode
5. Write basic tests if time permits
6. Ensure pnpm build passes

## IMPORTANT
When you have implemented ALL completion criteria, output:
```
<promise>COMPLETE:FE-028</promise>
```

If you cannot complete (blocked/error), explain why.

BEGIN IMPLEMENTATION:
